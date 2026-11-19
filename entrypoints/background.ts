import { browser } from 'wxt/browser';
import {
  CaseEvent, Investigation, Reason, load, mutate, endsAt, newCaseNumber, restrictedRuleFor, matchRule,
  hostOf, pathOf, Activity,
} from '@/lib/model';

const FIREFOX = import.meta.env.FIREFOX;
const COMPLETE_ALARM = 'asp-complete';
const BYPASS_MS = 10 * 60 * 1000;
const INTERROGATION = () => browser.runtime.getURL('/interrogation.html');

export type Msg =
  | { type: 'start'; config: { activity: Activity; name: string; description: string; durationMs: number; allowed: string[]; restricted: string[] } }
  | { type: 'pause' } | { type: 'resume' } | { type: 'end' }
  | { type: 'attempt'; url: string }
  | { type: 'decide'; attemptId: string; decision: 'returned' | 'proceeded'; reason?: Reason; note?: string; url: string; tabId?: number };

export default defineBackground(() => {
  // ---------- state cache (critical state always lives in storage) ----------
  let active: Investigation | null = null;
  let ready = load().then((s) => { active = s.active; });
  browser.storage.onChanged.addListener((ch, area) => {
    if (area === 'local' && 'active' in ch) {
      active = (ch.active.newValue as Investigation) ?? null;
      void syncRules();
    }
  });

  // Firefox keeps bypasses in memory (persistent MV2 background page).
  const ffBypass = new Map<number, { host: string; until: number }>();
  const isBypassed = (tabId: number, url: string) => {
    const b = ffBypass.get(tabId);
    if (!b || b.until < Date.now()) return false;
    try { const h = new URL(url).hostname; return h === b.host || h.endsWith('.' + b.host); } catch { return false; }
  };
  const interrogationUrl = (target: string) => `${INTERROGATION()}#${target}`;

  // ---------- interception ----------
  if (FIREFOX) {
    browser.webRequest.onBeforeRequest.addListener(
      (d) => {
        if (!active || active.status !== 'active' || d.tabId < 0) return {};
        if (!restrictedRuleFor(d.url, active)) return {};
        if (isBypassed(d.tabId, d.url)) return {};
        return { redirectUrl: interrogationUrl(d.url) };
      },
      { urls: ['*://*/*'], types: ['main_frame'] },
      ['blocking'],
    );
  }

  async function syncRules() {
    if (FIREFOX) return;
    const dnr = (browser as any).declarativeNetRequest ?? (globalThis as any).chrome?.declarativeNetRequest;
    const existing = await dnr.getDynamicRules();
    const removeRuleIds = existing.map((r: any) => r.id);
    const addRules: any[] = [];
    if (active && active.status === 'active') {
      const sub = `${INTERROGATION()}#\\0`;
      let id = 1;
      for (const rule of active.restricted) {
        const host = hostOf(rule), path = pathOf(rule);
        const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        addRules.push({
          id: id++, priority: path ? 2 : 1,
          action: { type: 'redirect', redirect: { regexSubstitution: sub } },
          condition: {
            requestDomains: [host], resourceTypes: ['main_frame'],
            regexFilter: path ? `^https?://[^/]+${esc(path)}([/?#].*)?$` : '^https?://.*$',
          },
        });
      }
      // More specific allowed rules (e.g. allow youtube.com/watch while youtube.com is restricted).
      for (const rule of active.allowed) {
        if (!pathOf(rule) || !active.restricted.some((r) => hostOf(r) === hostOf(rule) && !pathOf(r))) continue;
        addRules.push({
          id: id++, priority: 3, action: { type: 'allow' },
          condition: { requestDomains: [hostOf(rule)], resourceTypes: ['main_frame'], regexFilter: `^https?://[^/]+${pathOf(rule).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` },
        });
      }
    } else {
      const sess = await dnr.getSessionRules();
      if (sess.length) await dnr.updateSessionRules({ removeRuleIds: sess.map((r: any) => r.id) });
    }
    await dnr.updateDynamicRules({ removeRuleIds, addRules });
  }

  async function addBypass(tabId: number, url: string) {
    // Bypass the whole restricted rule's domain, so server redirects (m.facebook.com → www.facebook.com) don't loop.
    const rule = active ? restrictedRuleFor(url, active) : null;
    const host = rule ? hostOf(rule) : new URL(url).hostname.replace(/^www\./, '');
    if (FIREFOX) { ffBypass.set(tabId, { host, until: Date.now() + BYPASS_MS }); return; }
    const dnr = (browser as any).declarativeNetRequest;
    const sess = await dnr.getSessionRules();
    const old = sess.filter((r: any) => r.condition.tabIds?.includes(tabId)).map((r: any) => r.id);
    const id = 1000 + Math.floor(Math.random() * 1_000_000);
    await dnr.updateSessionRules({
      removeRuleIds: old,
      addRules: [{ id, priority: 10, action: { type: 'allow' }, condition: { tabIds: [tabId], requestDomains: [host], resourceTypes: ['main_frame'] } }],
    });
    browser.alarms.create(`asp-bypass-${id}`, { when: Date.now() + BYPASS_MS });
  }

  // SPA navigations (e.g. YouTube → Shorts) never hit the network as a main_frame request.
  // With host permission for the listed sites we can see URL changes and redirect, and log allowed visits.
  const lastAllowed = new Map<number, string>();
  browser.tabs.onUpdated.addListener(async (tabId, info) => {
    if (!info.url) return;
    await ready;
    if (!active || active.status !== 'active') return;
    const r = restrictedRuleFor(info.url, active);
    if (r && pathOf(r) && !isBypassed(tabId, info.url) && !(await chromeBypassed(tabId, info.url))) {
      await browser.tabs.update(tabId, { url: interrogationUrl(info.url) });
      return;
    }
    const a = matchRule(info.url, active.allowed);
    if (a && lastAllowed.get(tabId) !== a) {
      lastAllowed.set(tabId, a);
      await mutate((s) => { s.active?.events.push({ t: Date.now(), kind: 'allowed_visit', domain: a }); });
    } else if (!a) lastAllowed.delete(tabId);
  });
  async function chromeBypassed(tabId: number, url: string) {
    if (FIREFOX) return false;
    const host = new URL(url).hostname;
    const sess = await (browser as any).declarativeNetRequest.getSessionRules();
    return sess.some((r: any) => r.condition.tabIds?.includes(tabId) && r.condition.requestDomains?.some((d: string) => host === d || host.endsWith('.' + d)));
  }
  browser.tabs.onRemoved.addListener((tabId) => { ffBypass.delete(tabId); lastAllowed.delete(tabId); });

  // ---------- lifecycle ----------
  async function finish(kind: 'completed' | 'abandoned') {
    const done = await mutate((s) => {
      const c = s.active;
      if (!c) return null;
      const now = Date.now();
      if (c.pausedAt) { c.pausedTotalMs += now - c.pausedAt; c.pausedAt = null; }
      c.endedAt = kind === 'completed' ? Math.min(now, endsAt(c)) : now;
      c.status = kind;
      c.events.push({ t: c.endedAt, kind });
      s.cases = [c, ...s.cases.filter((x) => x.id !== c.id)];
      s.active = null;
      return c;
    });
    await browser.alarms.clear(COMPLETE_ALARM);
    ffBypass.clear();
    return done;
  }

  async function checkDue() {
    const s = await load();
    const c = s.active;
    if (!c || c.status !== 'active') return;
    if (Date.now() >= endsAt(c)) {
      const done = await finish('completed');
      if (done) await browser.tabs.create({ url: browser.runtime.getURL(`/app.html#/report/${done.id}`) });
    } else browser.alarms.create(COMPLETE_ALARM, { when: endsAt(c) });
  }

  browser.alarms.onAlarm.addListener(async (a) => {
    if (a.name === COMPLETE_ALARM) return checkDue();
    if (a.name.startsWith('asp-bypass-') && !FIREFOX) {
      const id = Number(a.name.slice(11));
      await (browser as any).declarativeNetRequest.updateSessionRules({ removeRuleIds: [id] });
    }
  });

  browser.runtime.onStartup.addListener(() => { void checkDue(); });
  browser.runtime.onInstalled.addListener(async ({ reason }) => {
    const s = await load();
    if (reason === 'install' && !s.onboarded) await browser.tabs.create({ url: browser.runtime.getURL('/app.html#/welcome') });
    await syncRules();
  });
  ready.then(() => { void syncRules(); void checkDue(); });

  // ---------- messages ----------
  browser.runtime.onMessage.addListener((msg: Msg, sender) => handle(msg, sender.tab?.id) as any);

  async function handle(msg: Msg, senderTab?: number): Promise<unknown> {
    await ready;
    switch (msg.type) {
      case 'start': {
        const c = await mutate((s) => {
          if (s.active) return s.active;
          const now = Date.now();
          const inv: Investigation = {
            id: crypto.randomUUID(), caseNumber: newCaseNumber(s.cases), ...msg.config,
            startedAt: now, pausedAt: null, pausedTotalMs: 0, endedAt: null, status: 'active',
            events: [{ t: now, kind: 'started' }],
          };
          s.active = inv;
          s.prefs = { ...s.prefs, allowed: msg.config.allowed, restricted: msg.config.restricted, activity: msg.config.activity, durationMin: Math.round(msg.config.durationMs / 60000) };
          return inv;
        });
        active = c;
        await syncRules();
        browser.alarms.create(COMPLETE_ALARM, { when: endsAt(c) });
        return c;
      }
      case 'pause':
        await mutate((s) => {
          const c = s.active;
          if (!c || c.status !== 'active') return;
          c.status = 'paused'; c.pausedAt = Date.now(); c.events.push({ t: c.pausedAt, kind: 'paused' });
        });
        await browser.alarms.clear(COMPLETE_ALARM);
        return true;
      case 'resume':
        await mutate((s) => {
          const c = s.active;
          if (!c || c.status !== 'paused' || !c.pausedAt) return;
          const now = Date.now();
          c.pausedTotalMs += now - c.pausedAt; c.pausedAt = null; c.status = 'active';
          c.events.push({ t: now, kind: 'resumed' });
        });
        await checkDue();
        return true;
      case 'end': {
        const c = await finish('abandoned');
        return c?.id ?? null;
      }
      case 'attempt': {
        let domain = '';
        try { domain = new URL(msg.url).hostname.replace(/^www\./, ''); } catch {}
        if (active) { const rr = restrictedRuleFor(msg.url, active); if (rr) domain = rr; }
        return mutate((s) => {
          const c = s.active;
          if (!c) return { attemptId: null, caseActive: false };
          const ev: CaseEvent = { t: Date.now(), kind: 'attempt', domain, attemptId: crypto.randomUUID().slice(0, 8) };
          c.events.push(ev);
          const prior = c.events.filter((e) => e.kind === 'attempt').length - 1;
          return { attemptId: ev.attemptId, caseActive: true, prior };
        });
      }
      case 'decide': {
        let domain = '';
        try { domain = new URL(msg.url).hostname.replace(/^www\./, ''); } catch {}
        if (active) { const rr = restrictedRuleFor(msg.url, active); if (rr) domain = rr; }
        await mutate((s) => {
          const c = s.active;
          if (!c) return;
          if (c.events.some((e) => e.attemptId === msg.attemptId && (e.kind === 'returned' || e.kind === 'proceeded'))) return;
          c.events.push({ t: Date.now(), kind: msg.decision, domain, reason: msg.reason, note: msg.note?.slice(0, 280) || undefined, attemptId: msg.attemptId });
        });
        const tabId = msg.tabId ?? senderTab;
        if (msg.decision === 'proceeded' && tabId != null) await addBypass(tabId, msg.url);
        return true;
      }
    }
  }
});
