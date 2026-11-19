// End-to-end check of real navigation interception in Chromium.
// Usage: npm run e2e  (builds with ASP_E2E=1, which pre-grants host access because automation can't click the permission prompt)
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const ext = path.resolve('.output-e2e/chrome-mv3');
const shots = process.argv[2] ?? 'test-results';
fs.mkdirSync(shots, { recursive: true });
const ctx = await chromium.launchPersistentContext('', {
  channel: 'chromium', headless: true, viewport: { width: 1440, height: 900 },
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
});
let [sw] = ctx.serviceWorkers();
if (!sw) sw = await ctx.waitForEvent('serviceworker');
const base = `chrome-extension://${sw.url().split('/')[2]}`;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const shot = (p, n, full = false) => p.screenshot({ path: `${shots}/${n}.png`, fullPage: full });
const nav = (p, url) => p.goto(url, { waitUntil: 'commit', timeout: 15000 }).catch(() => {});
const intercepted = async (p) => { await p.waitForURL(/interrogation\.html/, { timeout: 8000 }).catch(() => {}); return p.url().includes('interrogation.html'); };

await new Promise((r) => setTimeout(r, 1500));
const welcome = ctx.pages().find((p) => p.url().includes('welcome'));
ok(!!welcome, 'first install opens welcome page');
if (welcome) { await welcome.waitForTimeout(900); await shot(welcome, '01-welcome', true); }

const app = await ctx.newPage();
await app.goto(`${base}/app.html#/new`);
await app.waitForSelector('text=Start the investigation');
await app.locator('input').first().fill('Finish Java course chapter 5');
await app.waitForTimeout(400);
await shot(app, '02-setup', true);
await app.click('text=Start the investigation');
await app.waitForSelector('text=Elapsed');

const t = await ctx.newPage();
await nav(t, 'https://example.com');
await nav(t, 'https://www.facebook.com/some/path?x=1');
await intercepted(t);
ok(t.url() === `${base}/interrogation.html#https://www.facebook.com/some/path?x=1`, 'facebook.com intercepted, destination preserved: ' + t.url());
await t.waitForTimeout(1900);
await shot(t, '04-interrogation');
await t.click('text=I just need a quick break.');
await t.waitForTimeout(400);
await shot(t, '05-interrogation-reason');
await t.click('text=Return to my mission');
await t.waitForURL(/example\.com/, { timeout: 8000 }).catch(() => {});
ok(t.url().startsWith('https://example.com'), 'return goes back to the previous page: ' + t.url());

await nav(t, 'https://m.facebook.com/');
ok(await intercepted(t), 'subdomain m.facebook.com intercepted');
await t.waitForTimeout(1700);
await t.click('text=I was just checking something.');
await t.click("text=I'm going anyway");
await t.waitForURL(/^https:\/\/m\.facebook\.com/, { timeout: 10000 }).catch(() => {});
ok(t.url().includes('facebook.com') && !t.url().includes('interrogation'), 'proceed reaches the destination (Facebook may redirect m. to www.): ' + t.url());
await nav(t, 'https://m.facebook.com/again');
await t.waitForTimeout(800);
ok(!t.url().includes('interrogation.html'), 'temporary bypass: no re-interrogation loop in the same tab');

const t2 = await ctx.newPage();
await nav(t2, 'https://www.facebook.com/');
ok(await intercepted(t2), 'bypass is per-tab: another tab is still intercepted');
await t2.close();

const t3 = await ctx.newPage();
await nav(t3, 'https://www.youtube.com/shorts/abc123');
ok(await intercepted(t3), 'path rule youtube.com/shorts intercepted');
await nav(t3, 'https://www.youtube.com/watch?v=x');
await t3.waitForTimeout(800);
ok(!t3.url().includes('interrogation.html'), 'youtube.com/watch not intercepted (only /shorts is restricted)');
await t3.close();

await app.bringToFront();
await app.getByRole('button', { name: /^Pause/ }).click();
await app.waitForTimeout(600);
const t4 = await ctx.newPage();
await nav(t4, 'https://www.reddit.com/');
await t4.waitForTimeout(1000);
ok(!t4.url().includes('interrogation.html'), 'paused: reddit not intercepted');
await app.bringToFront();
await app.click('text=Resume operation');
await app.waitForTimeout(600);
await nav(t4, 'https://www.reddit.com/r/x');
ok(await intercepted(t4), 'resumed: reddit intercepted again');
await t4.close();

const st = await sw.evaluate(() => chrome.storage.local.get('active'));
ok(st.active?.events.filter((e) => e.kind === 'attempt').length >= 3, 'events persisted: ' + JSON.stringify(st.active?.events.map((e) => e.kind)));

await app.bringToFront();
await app.waitForTimeout(500);
await shot(app, '03-active');
const pop = await ctx.newPage();
await pop.setViewportSize({ width: 340, height: 500 });
await pop.goto(`${base}/popup.html`);
await pop.waitForTimeout(500);
await shot(pop, '07-popup-onduty');

await app.bringToFront();
await app.getByRole('button', { name: 'End investigation' }).click();
await app.click('text=Yes, close the case');
await app.waitForURL(/#\/report\//, { timeout: 5000 }).catch(() => {});
await app.waitForTimeout(800);
await shot(app, '08-report', true);
const s = await sw.evaluate(() => chrome.storage.local.get(null));
const c = s.cases[0];
const k = (x) => c.events.filter((e) => e.kind === x).length;
ok(!s.active && c.status === 'abandoned', 'case closed as abandoned');
ok(k('returned') === 1 && k('proceeded') === 1 && k('paused') === 1 && k('resumed') === 1, `decisions recorded (returned ${k('returned')}, proceeded ${k('proceeded')}, pauses ${k('paused')})`);
const rules = await sw.evaluate(() => chrome.declarativeNetRequest.getDynamicRules());
ok(rules.length === 0, 'off duty: no redirect rules remain');

const [dl] = await Promise.all([app.waitForEvent('download'), app.click('text=Download case poster')]);
await dl.saveAs(`${shots}/09-poster.png`);
ok(fs.statSync(`${shots}/09-poster.png`).size > 50000, 'poster image downloaded');
await app.evaluate(() => { navigator.clipboard.writeText = (v) => { window.__clip = v; return Promise.resolve(); }; });
await app.click('text=Copy report for AI analysis');
await app.waitForTimeout(300);
const clip = await app.evaluate(() => window.__clip ?? '');
ok(clip.includes('ATTENTION SPAN POLICE') && clip.includes('Returned to mission: 1'), 'AI report copied to clipboard');
fs.writeFileSync(`${shots}/ai-report.txt`, clip);

await app.goto(`${base}/app.html#/history`);
await app.waitForTimeout(700);
await shot(app, '10-history', true);
await pop.goto(`${base}/popup.html`);
await pop.waitForTimeout(400);
await shot(pop, '11-popup-offduty');
const after = await ctx.newPage();
await nav(after, 'https://www.facebook.com/');
await after.waitForTimeout(800);
ok(!after.url().includes('interrogation.html'), 'off duty: facebook not intercepted');
await ctx.close();
