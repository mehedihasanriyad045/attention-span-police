// Data model, storage, and pure helpers shared by every entrypoint.
import { browser } from 'wxt/browser';

export const SCHEMA_VERSION = 1;

export type Activity = 'studying' | 'reading' | 'watching' | 'coding' | 'working' | 'writing' | 'other';
export type Reason = 'break' | 'motivation' | 'legit' | 'checking' | 'unknown';
export type CaseStatus = 'active' | 'paused' | 'completed' | 'abandoned';

export type EventKind =
  | 'started' | 'paused' | 'resumed' | 'completed' | 'abandoned'
  | 'attempt' | 'returned' | 'proceeded' | 'allowed_visit';

export interface CaseEvent {
  t: number; // epoch ms
  kind: EventKind;
  domain?: string;
  reason?: Reason;
  note?: string;
  attemptId?: string;
}

export interface Investigation {
  id: string;
  caseNumber: string;
  activity: Activity;
  name: string;
  description: string;
  durationMs: number;
  allowed: string[];
  restricted: string[];
  startedAt: number;
  pausedAt: number | null;
  pausedTotalMs: number;
  endedAt: number | null;
  status: CaseStatus;
  events: CaseEvent[];
}

export interface Prefs {
  allowed: string[];
  restricted: string[];
  activity: Activity;
  durationMin: number;
}

export interface Store {
  schemaVersion: number;
  onboarded: boolean;
  active: Investigation | null;
  cases: Investigation[];
  prefs: Prefs;
}

export const ACTIVITIES: { id: Activity; label: string; verb: string }[] = [
  { id: 'studying', label: 'Studying', verb: 'studying' },
  { id: 'reading', label: 'Reading', verb: 'reading' },
  { id: 'watching', label: 'Watching', verb: 'watching your film' },
  { id: 'coding', label: 'Coding', verb: 'coding' },
  { id: 'working', label: 'Working', verb: 'working' },
  { id: 'writing', label: 'Writing', verb: 'writing' },
  { id: 'other', label: 'Other', verb: 'on a mission' },
];
export const activityOf = (a: Activity) => ACTIVITIES.find((x) => x.id === a)!;

export const REASONS: { id: Reason; label: string; reply: string }[] = [
  { id: 'break', label: 'I just need a quick break.', reply: "A quick break? That's what they all say. The last quick break in this precinct lasted 47 minutes. We're not falling for that again." },
  { id: 'motivation', label: "I'm losing motivation.", reply: 'Motivation is not a prerequisite for doing the work. Unfortunately, neither is your willingness to cooperate. Do five more minutes. Then we talk.' },
  { id: 'legit', label: 'I have a legitimate reason.', reply: 'Noted. Every suspect has one. If it is genuinely legitimate, get in, get it, get out. The clock is still running.' },
  { id: 'checking', label: 'I was just checking something.', reply: 'Sure. And the next 47 reels are part of your research, we assume? Write it down and check it after the mission.' },
  { id: 'unknown', label: "I don't even know why I'm here.", reply: "Honesty. Rare in this room. Your hands typed it before your brain approved it. That's a reflex, not a decision. Go back." },
];
export const reasonOf = (r?: Reason) => REASONS.find((x) => x.id === r);

export const DEFAULT_PREFS: Prefs = {
  allowed: [],
  restricted: ['facebook.com', 'instagram.com', 'reddit.com', 'tiktok.com', 'x.com', 'youtube.com/shorts'],
  activity: 'studying',
  durationMin: 45,
};

const DEFAULT_STORE: Store = { schemaVersion: SCHEMA_VERSION, onboarded: false, active: null, cases: [], prefs: DEFAULT_PREFS };

// ---------- storage ----------
export async function load(): Promise<Store> {
  const raw = (await browser.storage.local.get(null)) as Partial<Store>;
  return migrate(raw);
}

function migrate(raw: Partial<Store>): Store {
  const s: Store = { ...DEFAULT_STORE, ...raw, prefs: { ...DEFAULT_PREFS, ...(raw.prefs ?? {}) } };
  // Future schema changes go here, keyed on s.schemaVersion.
  s.schemaVersion = SCHEMA_VERSION;
  return s;
}

export async function save(patch: Partial<Store>) {
  await browser.storage.local.set(patch);
}

/** Serialises read-modify-write within one JS context. */
let chain: Promise<unknown> = Promise.resolve();
export function mutate<T>(fn: (s: Store) => T | Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const s = await load();
    const before = JSON.stringify([s.active, s.cases, s.prefs, s.onboarded]);
    const r = await fn(s);
    if (JSON.stringify([s.active, s.cases, s.prefs, s.onboarded]) !== before)
      await save({ active: s.active, cases: s.cases, prefs: s.prefs, onboarded: s.onboarded, schemaVersion: SCHEMA_VERSION });
    return r;
  });
  chain = run.catch(() => {});
  return run;
}

// ---------- time ----------
export function elapsedMs(c: Investigation, now = Date.now()) {
  const end = c.endedAt ?? c.pausedAt ?? now;
  return Math.max(0, end - c.startedAt - c.pausedTotalMs);
}
export const endsAt = (c: Investigation) => c.startedAt + c.pausedTotalMs + c.durationMs;

export function fmtClock(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
}
export function fmtDur(ms: number) {
  const m = Math.round(ms / 60000);
  if (m < 1) return `${Math.round(ms / 1000)} sec`;
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 ? (m % 60) + ' min' : ''}`.trim() : `${m} min`;
}
export const fmtTime = (t: number) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
export const fmtDate = (t: number) => new Date(t).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });

// ---------- domains ----------
/** Normalises user input to "host[/path]" — lowercase, no scheme, no www. */
export function normalizeDomain(input: string): string | null {
  let v = input.trim().toLowerCase();
  if (!v) return null;
  v = v.replace(/^[a-z]+:\/\//, '').replace(/^www\./, '');
  v = v.split(/[?#]/)[0].replace(/\/+$/, '');
  const [host, ...rest] = v.split('/');
  const h = host.split(':')[0];
  if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(h)) return null;
  return rest.length ? `${h}/${rest.join('/')}` : h;
}
export const hostOf = (rule: string) => rule.split('/')[0];
export const pathOf = (rule: string) => { const i = rule.indexOf('/'); return i < 0 ? '' : rule.slice(i); };

export function hostMatches(host: string, ruleHost: string) {
  host = host.toLowerCase().replace(/^www\./, '');
  return host === ruleHost || host.endsWith('.' + ruleHost);
}
/** Returns the matching rule for a URL, or null. Path rules match path prefixes. */
export function matchRule(url: string, rules: string[]): string | null {
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  // Most specific (path) rules first.
  const sorted = [...rules].sort((a, b) => b.length - a.length);
  for (const r of sorted) {
    if (!hostMatches(u.hostname, hostOf(r))) continue;
    const p = pathOf(r);
    if (!p || u.pathname === p || u.pathname.startsWith(p + '/') || u.pathname.startsWith(p + '?')) return r;
  }
  return null;
}
/** A restricted URL that is explicitly covered by a more specific allowed rule is not restricted. */
export function restrictedRuleFor(url: string, c: Pick<Investigation, 'allowed' | 'restricted'>): string | null {
  const r = matchRule(url, c.restricted);
  if (!r) return null;
  const a = matchRule(url, c.allowed);
  if (a && a.length > r.length) return null;
  return r;
}
export const originPatterns = (rules: string[]) =>
  [...new Set(rules.map(hostOf))].flatMap((h) => [`*://${h}/*`, `*://*.${h}/*`]);

// ---------- stats & verdict ----------
export interface Stats {
  attempts: number;
  returned: number;
  proceeded: number;
  undecided: number;
  reasons: Record<Reason, number>;
  domains: Record<string, number>;
  pauses: number;
  allowedVisits: number;
  elapsed: number;
  completionPct: number;
}

export function statsOf(c: Investigation): Stats {
  const reasons = { break: 0, motivation: 0, legit: 0, checking: 0, unknown: 0 } as Record<Reason, number>;
  const domains: Record<string, number> = {};
  let attempts = 0, returned = 0, proceeded = 0, pauses = 0, allowedVisits = 0;
  for (const e of c.events) {
    if (e.kind === 'attempt') { attempts++; if (e.domain) domains[e.domain] = (domains[e.domain] ?? 0) + 1; }
    if (e.kind === 'returned') returned++;
    if (e.kind === 'proceeded') proceeded++;
    if ((e.kind === 'returned' || e.kind === 'proceeded') && e.reason) reasons[e.reason]++;
    if (e.kind === 'paused') pauses++;
    if (e.kind === 'allowed_visit') allowedVisits++;
  }
  const elapsed = elapsedMs(c);
  return {
    attempts, returned, proceeded, undecided: Math.max(0, attempts - returned - proceeded),
    reasons, domains, pauses, allowedVisits, elapsed,
    completionPct: Math.min(100, Math.round((elapsed / c.durationMs) * 100)),
  };
}

export interface Verdict { key: string; title: string; line: string; statement: string; tone: 'amber' | 'red' }

export function verdictOf(c: Investigation): Verdict {
  const s = statsOf(c);
  const top = Object.entries(s.domains).sort((a, b) => b[1] - a[1])[0]?.[0];
  const site = top ? prettySite(top) : 'the internet';
  const done = c.status === 'completed';
  if (!done && s.completionPct < 25)
    return { key: 'fled', title: 'Fled the scene', tone: 'red',
      line: `The suspect left the room after ${s.completionPct}% of the committed time.`,
      statement: 'We had barely switched the light on. The chair is still warm. The case remains open, as does the textbook, presumably.' };
  if (s.attempts === 0 && done)
    return { key: 'disciplined', title: 'Suspiciously disciplined', tone: 'amber',
      line: 'Against all available evidence, you actually stayed committed. The department is deeply confused.',
      statement: 'Not a single attempt on a restricted site. We checked twice. Either you were focused, or you have a second device. We are choosing to believe the first.' };
  if (s.attempts > 0 && s.proceeded === 0 && done)
    return { key: 'reformed', title: 'Reformed suspect', tone: 'amber',
      line: `Tempted ${s.attempts} time${s.attempts > 1 ? 's' : ''}. Walked back every time.`,
      statement: `You tried ${site}. You heard us out. You went back to work. That is the whole job. The department will allow a small, professional nod.` };
  if (s.proceeded >= 3 && s.proceeded >= s.returned)
    return { key: 'surveillance', title: 'Under surveillance', tone: 'red',
      line: 'You repeatedly ignored our warnings. We have documented everything.',
      statement: `${s.proceeded} times you looked the officer in the eye and walked straight into ${site}. Your future is looking questionable. Your file is getting thick.` };
  if (s.attempts >= 6)
    return { key: 'scroller', title: 'Professional scroller', tone: 'red',
      line: 'Your ability to find distractions is genuinely impressive. Your ability to finish tasks? Still under investigation.',
      statement: `${s.attempts} attempts. You returned ${s.returned} times, which is something. The pattern points at ${site}. Consider leaving your phone in another room, too.` };
  if (s.attempts === 0 && !done)
    return { key: 'walkout', title: 'Walked out clean', tone: 'amber',
      line: `No distractions on record, but the interview ended at ${s.completionPct}%.`,
      statement: 'Clean hands, short shift. We found nothing on you. We also found less work than promised. Come back and finish the sentence.' };
  return { key: 'distracted', title: 'Easily distracted', tone: 'red',
    line: `You had a mission. You had a plan. Then ${site} happened.`,
    statement: `${s.attempts} attempt${s.attempts > 1 ? 's' : ''}, ${s.returned} return${s.returned === 1 ? '' : 's'}, ${s.proceeded} escape${s.proceeded === 1 ? '' : 's'}. Not a criminal mastermind. Just a person with a browser and a weak moment. Do better next shift.` };
}

export function prettySite(rule: string) {
  const h = hostOf(rule);
  const known: Record<string, string> = { 'x.com': 'X', 'twitter.com': 'X', 'facebook.com': 'Facebook', 'instagram.com': 'Instagram', 'reddit.com': 'Reddit', 'tiktok.com': 'TikTok', 'youtube.com': 'YouTube', 'netflix.com': 'Netflix' };
  if (rule === 'youtube.com/shorts') return 'YouTube Shorts';
  return known[h] ?? h;
}

export function newCaseNumber(existing: Investigation[]) {
  const d = new Date();
  const seq = String(existing.length + 1).padStart(3, '0');
  const rnd = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `ASP-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}-${seq}${rnd}`;
}

// ---------- plain-text report for AI ----------
export function aiReport(c: Investigation): string {
  const s = statsOf(c), v = verdictOf(c);
  const L: string[] = [];
  L.push('ATTENTION SPAN POLICE — INVESTIGATION REPORT', '');
  L.push('I used a browser extension that intercepts websites I marked as distractions during a focus session. Please read this record and give me practical, specific advice for staying focused next time.', '');
  L.push('## Mission');
  L.push(`- Case: ${c.caseNumber}`, `- Activity: ${activityOf(c.activity).label}`, `- Mission: ${c.name}`);
  if (c.description) L.push(`- Details: ${c.description}`);
  L.push(`- Started: ${new Date(c.startedAt).toLocaleString()}`);
  L.push(`- Committed duration: ${fmtDur(c.durationMs)}`, `- Actual elapsed (excluding pauses): ${fmtDur(s.elapsed)} (${s.completionPct}%)`);
  L.push(`- Outcome: ${c.status === 'completed' ? 'Completed full duration' : 'Ended early by me'}`);
  L.push(`- Pauses: ${s.pauses}`);
  L.push(`- Allowed sites: ${c.allowed.join(', ') || 'none listed'}`, `- Restricted sites: ${c.restricted.join(', ') || 'none'}`, '');
  L.push('## Restricted-site attempts');
  L.push(`- Total attempts: ${s.attempts}`, `- Returned to mission: ${s.returned}`, `- Proceeded anyway: ${s.proceeded}`);
  if (s.undecided) L.push(`- Closed the interrogation without deciding: ${s.undecided}`);
  const dom = Object.entries(s.domains).sort((a, b) => b[1] - a[1]);
  if (dom.length) L.push(`- By site: ${dom.map(([d, n]) => `${d} (${n})`).join(', ')}`);
  const rs = REASONS.filter((r) => s.reasons[r.id]);
  if (rs.length) L.push(`- Reasons I gave: ${rs.map((r) => `"${r.label}" ×${s.reasons[r.id]}`).join(', ')}`);
  L.push('');
  L.push('## Timeline (minutes into session)');
  const decisions = c.events.filter((e) => e.kind === 'returned' || e.kind === 'proceeded' || e.kind === 'paused' || e.kind === 'resumed');
  if (!decisions.length) L.push('- No interruptions recorded.');
  for (const e of decisions) {
    const min = Math.max(0, Math.round((e.t - c.startedAt) / 60000));
    if (e.kind === 'paused' || e.kind === 'resumed') L.push(`- ${fmtTime(e.t)} (+${min}m): ${e.kind}`);
    else L.push(`- ${fmtTime(e.t)} (+${min}m): tried ${e.domain} — reason: ${reasonOf(e.reason)?.label ?? 'none'}${e.note ? ` ("${e.note}")` : ''} — ${e.kind === 'returned' ? 'went back to work' : 'went to the site anyway'}`);
  }
  L.push('');
  L.push('## Notes');
  L.push(`- The extension's playful verdict was "${v.title}". It is entertainment based on counts, not a measure of focus.`);
  L.push('- The extension only sees navigation to sites I listed. It cannot know whether I was mentally focused, or what I did on other devices.');
  L.push('', 'Based on this, what patterns do you see, and what 3 concrete changes should I try in my next session?');
  return L.join('\n');
}
