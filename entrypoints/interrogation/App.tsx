import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { motion, AnimatePresence } from 'motion/react';
import { useStore, send, appUrl } from '@/lib/hooks';
import { REASONS, Reason, activityOf, prettySite, matchRule, Investigation, fmtClock, elapsedMs } from '@/lib/model';
import { Frame } from '@/components/kit';

const target = (() => { const h = location.hash.slice(1); try { return new URL(h).href; } catch { return ''; } })();
const host = (() => { try { return new URL(target).hostname.replace(/^www\./, ''); } catch { return 'unknown'; } })();

const JABS: Record<string, string> = {
  'facebook.com': 'Or did you just remember that someone posted a picture of their lunch?',
  'instagram.com': "Or does a stranger's holiday urgently need your approval?",
  'reddit.com': "Or is there a thread you'll read, never reply to, and forget by dinner?",
  'tiktok.com': 'Or were you planning to watch just one video? Historically, it is never one.',
  'x.com': 'Or do people you have never met need your opinion right now?',
  'twitter.com': 'Or do people you have never met need your opinion right now?',
  'youtube.com/shorts': 'Or were you planning to watch just one Short? Historically, it is never one.',
  'netflix.com': 'Or did your show suddenly become more important than the plan you made an hour ago?',
};
const QUESTIONS: Record<string, string> = {
  studying: 'Is your assignment finished? Did your textbook suddenly become boring?',
  reading: 'Did the book end? Did the chapter get hard?',
  watching: 'Did the film stop? Or did you just pick up the second screen?',
  coding: 'Did the build pass? Or did the bug get too real?',
  working: 'Is the work done? Or did it just get uncomfortable?',
  writing: 'Is the page full? Or did the next sentence get difficult?',
  other: 'Is the mission complete? Or did it just get boring?',
};

const BOOT = (n: number) => [
  `ASP // INTERCEPT 0x${(Date.now() % 0xffffff).toString(16).toUpperCase().padStart(6, '0')}`,
  `REQUEST ........ ${host}`,
  `CLASSIFICATION . RESTRICTED`,
  `PRIOR DEVIATIONS ${String(n).padStart(2, '0')}`,
  `ROUTING TO INTERROGATION`,
];

export default function App() {
  const store = useStore();
  const [phase, setPhase] = useState<'intro' | 'question'>(() => (sessionStorage.getItem('asp-seen:' + target) ? 'question' : 'intro'));
  const [attempt, setAttempt] = useState<{ attemptId: string | null; caseActive: boolean; prior?: number } | null>(null);
  const [reason, setReason] = useState<Reason | null>(null);
  const [note, setNote] = useState('');
  const [leaving, setLeaving] = useState(false);

  // Record the attempt once per tab + destination (reloads don't double count).
  useEffect(() => {
    if (!target) return;
    const key = 'asp-attempt:' + target;
    const cached = sessionStorage.getItem(key);
    if (cached) { setAttempt(JSON.parse(cached)); return; }
    send<{ attemptId: string | null; caseActive: boolean; prior?: number }>({ type: 'attempt', url: target }).then((r) => {
      setAttempt(r);
      if (r.attemptId) sessionStorage.setItem(key, JSON.stringify(r));
    });
  }, []);
  useEffect(() => {
    if (phase !== 'intro') return;
    sessionStorage.setItem('asp-seen:' + target, '1');
    const t = setTimeout(() => setPhase('question'), 1150);
    return () => clearTimeout(t);
  }, [phase]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'TEXTAREA') return;
      const n = Number(e.key);
      if (n >= 1 && n <= REASONS.length) setReason(REASONS[n - 1].id);
      if (phase === 'intro') setPhase('question');
    };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [phase]);

  const c: Investigation | null = store?.active ?? null;
  const rule = c ? matchRule(target, c.restricted) ?? host : host;
  const site = prettySite(rule);

  const decide = async (decision: 'returned' | 'proceeded') => {
    setLeaving(true);
    const tab = await browser.tabs.getCurrent();
    if (attempt?.attemptId && c) await send({ type: 'decide', attemptId: attempt.attemptId, decision, reason: reason ?? undefined, note: note.trim() || undefined, url: target, tabId: tab?.id });
    else if (decision === 'proceeded') await send({ type: 'decide', attemptId: 'none', decision, url: target, tabId: tab?.id });
    sessionStorage.removeItem('asp-seen:' + target);
    if (decision === 'proceeded') location.replace(target);
    else if (history.length > 1) history.back();
    else location.replace(appUrl('/active'));
  };

  if (!target) return <Shell><h1 className="headline text-[72px]">No destination on file.</h1></Shell>;
  if (store && (!c || c.status !== 'active')) {
    return (
      <Shell>
        <div className="code">Standby</div>
        <h1 className="headline text-[clamp(56px,8vw,112px)] mt-4">No operation<br />is running.</h1>
        <p className="mt-5 text-steel max-w-[44ch]">{c ? 'The operation is suspended, so the door is open.' : 'The case was closed.'} You are free to go.</p>
        <button className="btn btn-primary mt-8 min-w-[280px]" onClick={() => location.replace(target)}>Continue to {host} <span className="arrow">→</span></button>
      </Shell>
    );
  }

  const reply = REASONS.find((r) => r.id === reason)?.reply;
  const prior = attempt?.prior ?? 0;
  const show = phase === 'question';
  const reveal = (d: number) => ({ initial: { opacity: 0, y: 10 }, animate: show ? { opacity: 1, y: 0 } : {}, transition: { duration: 0.5, delay: d, ease: [0.2, 0.7, 0.2, 1] as const } });

  return (
    <div className="min-h-screen bg-obsidian">
      <AnimatePresence>
        {phase === 'intro' && (
          <motion.div key="intro" className="fixed inset-0 z-50 bg-obsidian cursor-pointer flex flex-col justify-center px-6 md:px-16"
            onClick={() => setPhase('question')} exit={{ clipPath: 'inset(0 0 0 100%)' }} transition={{ duration: 0.45, ease: [0.7, 0, 0.2, 1] }}>
            <div className="font-mono text-[13px] text-light space-y-1.5">
              {BOOT(prior).map((l, i) => (
                <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 + i * 0.12, duration: 0.05 }}
                  className={i === 2 || i === 4 ? 'text-signal' : ''}>{l}</motion.div>
              ))}
            </div>
            <motion.div className="h-[6px] bg-signal mt-8 origin-left" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.5, duration: 0.55, ease: [0.7, 0, 0.2, 1] }} />
            <motion.div className="headline text-[clamp(48px,9vw,140px)] mt-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}>{host}</motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alert strip */}
      <div className="h-9 bg-signal text-bone flex items-center justify-between px-4 md:px-8 font-mono text-[11px] tracking-[.12em] uppercase">
        <span className="flex items-center gap-3"><span className="size-1.5 bg-bone blink" />Target deviation detected</span>
        <span className="hidden sm:inline">ASP · OP {c?.caseNumber ?? '—'} · Deviation #{String(prior + 1).padStart(2, '0')}</span>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] min-h-[calc(100vh-36px)]">
        <main className="px-4 md:px-8 lg:px-12 pt-8 pb-16 min-w-0">
          <motion.div {...reveal(0)} className="flex flex-wrap gap-x-8 gap-y-1 code">
            <span className="text-bone">Interrogation room 2</span>
            <span>Subject: you</span>
            {c && <span>Time on mission {fmtClock(elapsedMs(c))}</span>}
          </motion.div>

          <motion.h1 {...reveal(0.05)} className="headline text-[clamp(60px,8.4vw,140px)] mt-6">
            Target<br />deviation<br /><span className="text-signal">detected.</span>
          </motion.h1>

          <motion.div {...reveal(0.15)} className="mt-8 grid grid-cols-[6px_1fr] gap-5 items-stretch">
            <span className="bg-signal" />
            <div className="min-w-0">
              <div className="code">Requested destination</div>
              <div className="title text-[clamp(34px,4.4vw,64px)] break-all mt-1">{host}</div>
              <div className="font-mono text-[11px] text-steel mt-1 truncate">{target}</div>
            </div>
          </motion.div>

          <motion.p {...reveal(0.25)} className="mt-8 text-[clamp(17px,1.5vw,20px)] leading-relaxed text-light max-w-[54ch]">
            You were supposed to be {c ? activityOf(c.activity).verb : 'working'}{c ? <> — <span className="text-bone font-semibold">{c.name}</span></> : ''}. We caught you attempting to visit {site}.{' '}
            {QUESTIONS[c?.activity ?? 'other']} {JABS[rule] ?? 'Or did you assume the internet changed while you were gone? It did not.'}
          </motion.p>
          {prior > 0 && <motion.p {...reveal(0.3)} className="mt-3 code !text-signal">Deviation #{prior + 1} this operation. The officer is keeping count.</motion.p>}

          <motion.section {...reveal(0.35)} className="mt-12 max-w-[680px]">
            <div className="flex items-baseline justify-between border-b border-bone/70 pb-2">
              <h2 className="title text-[28px]">State your reason, <span className="text-signal">suspect.</span></h2>
              <span className="code-sm hidden sm:inline">Keys 1–5</span>
            </div>
            <ol role="radiogroup" aria-label="Your reason">
              {REASONS.map((r, i) => {
                const on = reason === r.id;
                return (
                  <li key={r.id}>
                    <button role="radio" aria-checked={on} onClick={() => setReason(r.id)}
                      className={`w-full grid grid-cols-[44px_1fr_16px] items-center text-left h-[52px] border-b hair transition-colors ${on ? 'bg-graphite text-bone' : 'text-light hover:bg-graphite/50'}`}>
                      <span className={`font-mono text-[11px] pl-3 ${on ? 'text-signal' : 'text-steel'}`}>{String(i + 1).padStart(2, '0')}</span>
                      <span className="text-[16px] font-medium">{r.label}</span>
                      <span className={`size-2.5 border ${on ? 'bg-signal border-signal' : 'border-steel/60'}`} />
                    </button>
                  </li>
                );
              })}
            </ol>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={280} rows={1}
              placeholder="Statement for the record (optional)" className="field mt-2 text-[14px] resize-none" />

            <AnimatePresence mode="wait">
              {reply && (
                <motion.div key={reason} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
                  className="mt-8 grid grid-cols-[2px_1fr] gap-5">
                  <span className="bg-bone" />
                  <div>
                    <div className="code">Officer's response</div>
                    <p className="mt-2 text-[19px] leading-snug text-bone">“{reply}”</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-10 grid sm:grid-cols-2 gap-3">
              <button className="btn btn-primary !text-[20px] !py-4" disabled={leaving} onClick={() => decide('returned')}>
                Return to my mission <span className="arrow">←</span>
              </button>
              <button className="btn btn-ghost !border-signal/70 hover:!border-signal hover:!text-signal !text-[20px] !py-4" disabled={leaving || !reason} onClick={() => decide('proceeded')}
                title={reason ? '' : 'State a reason first'}>
                I'm going anyway <span className="arrow">→</span>
              </button>
            </div>
            <p className="mt-4 code-sm normal-case tracking-normal leading-relaxed">
              {reason ? `Proceeding clears this tab for ${host} for 10 minutes. It stays on your restricted list.` : 'Returning needs no explanation. Proceeding requires a stated reason.'}
            </p>
          </motion.section>
        </main>

        {/* Evidence panel */}
        <motion.aside initial={{ opacity: 0 }} animate={show ? { opacity: 1 } : {}} transition={{ duration: 0.9, delay: 0.1 }}
          className="hidden lg:flex flex-col px-8 pt-8 pb-10 border-l hair bg-graphite/40">
          <Frame src="interrogation.webp" className="flex-1 min-h-[360px]" imgClass="object-[35%_50%]"
            caption={<><span>Exhibit A — Interrogation room 2</span><span className="text-signal">Subject present</span></>}>
            <div className="absolute inset-0 scan" />
            <div className="absolute left-[54%] top-[63%] w-[34%] h-[10%] border border-bone/80 z-10">
              <span className="absolute -top-5 left-0 font-mono text-[10px] text-bone whitespace-nowrap">EVIDENCE · {host.toUpperCase()}</span>
            </div>
          </Frame>
          <dl className="mt-8 font-mono text-[11px] uppercase tracking-[.06em]">
            {[
              ['Operation', c?.caseNumber ?? '—'], ['Objective', c?.name ?? '—'], ['Cover', c ? activityOf(c.activity).label : '—'],
              ['Classification', 'Restricted'], ['Deviation', `#${String(prior + 1).padStart(2, '0')}`], ['Logged', new Date().toLocaleTimeString()],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-6 py-2 border-b hair">
                <dt className="text-steel">{k}</dt><dd className={`text-right truncate ${k === 'Classification' ? 'text-signal' : 'text-light'}`}>{v}</dd>
              </div>
            ))}
          </dl>
        </motion.aside>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-obsidian grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <div className="px-6 md:px-14 pt-24">{children}</div>
      <div className="hidden lg:block p-8"><Frame src="corridor.webp" className="h-full" imgClass="grayscale brightness-75" /></div>
    </div>
  );
}
