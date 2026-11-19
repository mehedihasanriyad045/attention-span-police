import { useEffect, useMemo, useState } from 'react';
import { browser } from 'wxt/browser';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useStore, send, img, appUrl } from '@/lib/hooks';
import { REASONS, Reason, activityOf, prettySite, matchRule, Investigation } from '@/lib/model';

const target = (() => { const h = location.hash.slice(1); try { return new URL(h).href; } catch { return ''; } })();
const host = (() => { try { return new URL(target).hostname.replace(/^www\./, ''); } catch { return 'unknown'; } })();

const JABS: Record<string, string> = {
  'facebook.com': 'Or did you just remember that someone posted a picture of their lunch?',
  'instagram.com': "Or does a stranger's holiday urgently need your approval?",
  'reddit.com': "Or is there a thread you'll read, never reply to, and forget by dinner?",
  'tiktok.com': 'Or were you planning to watch just one video? Historically, it is never one.',
  'x.com': 'Or do people you have never met need to know your opinion right now?',
  'twitter.com': 'Or do people you have never met need to know your opinion right now?',
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

export default function App() {
  const store = useStore();
  const [phase, setPhase] = useState<'caught' | 'question'>(() => (sessionStorage.getItem('asp-seen:' + target) ? 'question' : 'caught'));
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
    if (phase !== 'caught') return;
    sessionStorage.setItem('asp-seen:' + target, '1');
    const t = setTimeout(() => setPhase('question'), 1100);
    return () => clearTimeout(t);
  }, [phase]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'TEXTAREA') return;
      const n = Number(e.key);
      if (n >= 1 && n <= REASONS.length) setReason(REASONS[n - 1].id);
      if (phase === 'caught') setPhase('question');
    };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [phase]);

  const c: Investigation | null = store?.active ?? null;
  const rule = c ? matchRule(target, c.restricted) ?? host : host;
  const site = prettySite(rule);
  const display = useMemo(() => host.toUpperCase(), []);

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

  if (!target) return <Shell><p className="display text-6xl">No destination on file.</p></Shell>;
  if (store && (!c || c.status !== 'active')) {
    return (
      <Shell>
        <div className="meta text-mute">Off duty</div>
        <h1 className="display text-[clamp(48px,7vw,96px)] mt-4">No investigation<br />is running.</h1>
        <p className="mt-4 text-mute max-w-[44ch]">{c ? 'The case is paused, so the door is open.' : 'The case was closed.'} You are free to go.</p>
        <button className="btn-primary mt-8" onClick={() => location.replace(target)}>Continue to {host} <ArrowRight size={18} /></button>
      </Shell>
    );
  }

  const reply = REASONS.find((r) => r.id === reason)?.reply;
  const prior = attempt?.prior ?? 0;

  return (
    <div className="relative min-h-screen bg-ink overflow-hidden">
      <AnimatePresence>
        {phase === 'caught' && (
          <motion.div key="caught" className="fixed inset-0 z-50 bg-ink flex items-center justify-center cursor-pointer" onClick={() => setPhase('question')}
            exit={{ opacity: 0 }} transition={{ duration: 0.45 }}>
            <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.7, 1] }} transition={{ duration: 0.6, times: [0, 0.2, 0.3, 1] }}
              style={{ background: 'radial-gradient(ellipse 38% 55% at 50% 18%, rgba(242,181,60,.55), rgba(192,38,26,.25) 45%, transparent 75%)' }} />
            <div className="relative text-center">
              <motion.div className="meta text-red" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0, 1] }} transition={{ duration: 0.5, delay: 0.25 }}>● Suspect detected</motion.div>
              <motion.div className="display text-[clamp(56px,11vw,180px)] mt-4" initial={{ opacity: 0, scale: 1.15 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35, duration: 0.5 }}>{display}</motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scene */}
      <div className="absolute inset-y-0 right-0 w-full lg:w-[52%] grain">
        <img src={img('room-wide.webp')} alt="" className="w-full h-full object-cover object-[52%_55%]" style={{ filter: 'saturate(1.25) contrast(1.1) brightness(.8)' }} />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/70 to-transparent lg:via-ink/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/50" />
        <div className="absolute inset-0 vignette" />
        {/* Evidence markings */}
        <div className="hidden lg:block absolute left-[46%] top-[60%] w-[18%] h-[22%] border border-amber/70">
          <span className="absolute -top-6 left-0 font-mono text-[11px] text-amber whitespace-nowrap">EXHIBIT A — THE SUSPECT'S CHAIR (EMPTY)</span>
          <span className="absolute -bottom-6 right-0 font-mono text-[11px] text-paper/60 whitespace-nowrap">{new Date().toLocaleTimeString()}</span>
        </div>
        <div className="hidden lg:block absolute right-8 bottom-10 text-right font-mono text-[11px] text-paper/50 leading-relaxed">
          Attempt #{prior + 1} this case<br />Destination held: {host}
        </div>
      </div>

      <div className="relative px-5 md:px-10 lg:px-14 pt-8 pb-16 max-w-[900px]">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="display text-[20px]">Attention Span Police</span>
          <span className="meta">Case {c?.caseNumber ?? '—'}</span>
          <span className="meta text-red flex items-center gap-2"><span className="size-2 rounded-full bg-red pulse" /> Suspect detected</span>
        </div>

        <motion.h1 className="display text-[clamp(56px,8.4vw,140px)] mt-12 md:mt-16"
          initial={{ opacity: 0, y: 24 }} animate={phase === 'question' ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }}>
          Where do you think you're <span className="text-amber">going?</span>
        </motion.h1>

        <motion.div initial={{ opacity: 0 }} animate={phase === 'question' ? { opacity: 1 } : {}} transition={{ delay: 0.15 }}>
          <div className="mt-8 flex items-baseline gap-4 flex-wrap">
            <span className="meta">Destination</span>
            <span className="display text-[clamp(36px,5vw,72px)] outline-text break-all">{display}</span>
          </div>
          <p className="mt-6 text-[clamp(18px,1.8vw,22px)] leading-relaxed text-paper/85 max-w-[46ch]">
            You were supposed to be {c ? activityOf(c.activity).verb : 'working'}{c ? <> — “<span className="text-paper">{c.name}</span>”</> : ''}. We caught you attempting to visit {site}.{' '}
            {QUESTIONS[c?.activity ?? 'other']} {JABS[rule] ?? 'Or did you assume the internet changed while you were gone? It did not.'}
          </p>
          {prior > 0 && <p className="mt-3 font-mono text-[13px] text-red">This is attempt #{prior + 1} during this case. The officer is keeping count.</p>}

          <h2 className="display text-[clamp(28px,3vw,40px)] mt-12">State your reason, <span className="text-red">suspect.</span></h2>
          <ol className="mt-4 max-w-[640px]" role="radiogroup" aria-label="Your reason">
            {REASONS.map((r, i) => (
              <li key={r.id}>
                <button role="radio" aria-checked={reason === r.id} onClick={() => setReason(r.id)}
                  className={`w-full grid grid-cols-[40px_1fr] items-baseline text-left py-3 border-b transition-colors ${reason === r.id ? 'border-amber text-amber' : 'border-smoke text-paper/80 hover:text-paper hover:border-paper/40'}`}>
                  <span className="font-mono text-[12px] text-mute">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-[19px] font-medium">{r.label}</span>
                </button>
              </li>
            ))}
          </ol>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={280} rows={1}
            placeholder="Anything to add for the record? (optional)" className="field mt-4 max-w-[640px] text-[15px] resize-none" />

          <AnimatePresence mode="wait">
            {reply && (
              <motion.blockquote key={reason} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
                className="mt-8 pl-5 border-l-2 border-amber max-w-[56ch]">
                <div className="meta text-amber">The officer responds</div>
                <p className="mt-2 text-[20px] leading-snug italic">“{reply}”</p>
              </motion.blockquote>
            )}
          </AnimatePresence>

          <div className="mt-10 flex flex-wrap items-center gap-x-10 gap-y-5">
            <button className="btn-primary !text-[22px] !px-7 !py-4" disabled={leaving} onClick={() => decide('returned')}>
              <ArrowLeft size={20} /> Return to my mission
            </button>
            <button className="btn-line danger text-[15px]" disabled={leaving || !reason} onClick={() => decide('proceeded')}
              title={reason ? '' : 'State a reason first'}>
              I'm going anyway <ArrowRight size={15} />
            </button>
          </div>
          {!reason && <p className="mt-3 text-xs text-dim">To go anyway, state a reason first. Returning needs no explanation.</p>}
          <p className="mt-10 text-xs text-dim max-w-[60ch]">Going anyway lets this tab into {host} for 10 minutes without further questioning. The site stays on your restricted list.</p>
        </motion.div>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-ink overflow-hidden grain">
      <img src={img('room-chair.webp')} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
      <div className="relative px-5 md:px-14 pt-24 max-w-[900px]">{children}</div>
    </div>
  );
}
