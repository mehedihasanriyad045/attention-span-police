import { useState } from 'react';
import { motion } from 'motion/react';
import { send, useNow } from '@/lib/hooks';
import { Store, elapsedMs, endsAt, fmtClock, fmtTime, activityOf, statsOf, reasonOf, CaseEvent, prettySite } from '@/lib/model';
import { Frame, Row } from '@/components/kit';
import { go } from './App';

function line(e: CaseEvent): [string, string] {
  switch (e.kind) {
    case 'started': return ['Operation opened. Subject in position.', 'text-light'];
    case 'paused': return ['Operation suspended. Interception off.', 'text-steel'];
    case 'resumed': return ['Operation resumed.', 'text-light'];
    case 'attempt': return [`Deviation detected — ${e.domain}`, 'text-signal'];
    case 'returned': return [`Returned to mission — “${reasonOf(e.reason)?.label ?? 'no reason given'}”`, 'text-bone'];
    case 'proceeded': return [`Ignored the officer — proceeded to ${e.domain}`, 'text-signal'];
    case 'allowed_visit': return [`Cleared asset visited — ${e.domain}`, 'text-steel'];
    default: return [e.kind, 'text-steel'];
  }
}

export default function Active({ store }: { store: Store }) {
  const c = store.active!;
  const now = useNow();
  const [confirmEnd, setConfirmEnd] = useState(false);
  const el = elapsedMs(c, now);
  const left = Math.max(0, endsAt(c) - (c.pausedAt ?? now));
  const pct = Math.min(100, (el / c.durationMs) * 100);
  const st = statsOf(c);
  const paused = c.status === 'paused';

  const end = async () => {
    const id = await send<string | null>({ type: 'end' });
    if (id) go(`/report/${id}`);
  };

  return (
    <div className="pt-12 px-4 md:px-8 pb-16 max-w-[1500px]">
      <div className="pt-6 flex flex-wrap justify-between gap-3 code">
        <span className="flex gap-6"><span className="text-bone">OP {c.caseNumber}</span><span>Opened {fmtTime(c.startedAt)}</span><span className="hidden sm:inline">Cover: {activityOf(c.activity).label}</span></span>
        <span className={paused ? '' : 'text-signal'}>{paused ? 'Suspended — clock stopped' : 'Live — interception armed'}</span>
      </div>

      {/* Feed */}
      <motion.div initial={{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }} animate={{ opacity: 1, clipPath: 'inset(0 0 0% 0)' }} transition={{ duration: 0.9, ease: [0.7, 0, 0.2, 1] }}>
        <Frame src="corridor.webp" className="mt-5 h-[34vh] min-h-[220px]" imgClass={`object-[62%_45%] transition-[filter] duration-700 ${paused ? 'grayscale brightness-50' : ''}`}
          caption={<><span>Cam 04 — Corridor B, field office</span><span>{new Date(now).toLocaleTimeString()}</span></>}>
          <div className="absolute inset-0 scan" />
          <div className="absolute left-4 top-3 z-10 code-sm text-bone flex items-center gap-2">
            <span className={`size-1.5 ${paused ? 'bg-steel' : 'bg-signal blink'}`} />{paused ? 'Feed paused' : 'Rec'}
          </div>
          <div className="absolute right-4 top-3 z-10 code-sm text-bone">{Math.round(pct)}% of operation</div>
        </Frame>
      </motion.div>

      <div className="mt-12 grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-x-14 gap-y-12">
        <div className="min-w-0">
          <div className="code">Objective</div>
          <h1 className="headline text-[clamp(40px,5.6vw,88px)] mt-3 break-words">{c.name}</h1>
          {c.description && <p className="mt-4 text-steel max-w-[56ch]">{c.description}</p>}

          <div className="mt-10 flex flex-wrap items-end gap-x-12 gap-y-6 border-t hair pt-6">
            <div>
              <div className="code">Elapsed</div>
              <div className={`headline text-[clamp(84px,10vw,150px)] tabular-nums mt-1 ${paused ? 'text-steel' : ''}`}>{fmtClock(el)}</div>
            </div>
            <div className="pb-3">
              <div className="code">Remaining</div>
              <div className="font-mono text-[26px] text-light tabular-nums mt-1">{fmtClock(left)}</div>
            </div>
          </div>
          <div className="mt-4 h-[3px] bg-iron relative">
            <div className="absolute inset-y-0 left-0 bg-bone transition-[width] duration-1000" style={{ width: `${pct}%` }} />
            {[25, 50, 75].map((t) => <span key={t} className="absolute -top-1 h-[11px] w-px bg-steel/50" style={{ left: `${t}%` }} />)}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button className="btn btn-primary min-w-[220px]" onClick={() => send({ type: paused ? 'resume' : 'pause' })}>
              {paused ? 'Resume operation' : 'Pause'} <span className="arrow">{paused ? '▶' : '❚❚'}</span>
            </button>
            {confirmEnd ? (
              <div className="flex flex-wrap items-center gap-4">
                <span className="code">Abort at {Math.round(pct)}%?</span>
                <button className="btn btn-critical" onClick={end}>Yes, close the case</button>
                <button className="link" onClick={() => setConfirmEnd(false)}>Keep going</button>
              </div>
            ) : (
              <button className="btn btn-ghost" onClick={() => setConfirmEnd(true)}>End investigation</button>
            )}
          </div>
          {paused && <p className="mt-4 code-sm normal-case tracking-normal">While suspended, restricted destinations open normally and the clock is stopped.</p>}
        </div>

        <aside className="min-w-0">
          <div className="grid grid-cols-3 border-y hair">
            {[[st.attempts, 'Deviations', st.attempts ? 'text-signal' : ''], [st.returned, 'Returned', ''], [st.proceeded, 'Proceeded', st.proceeded ? 'text-signal' : '']].map(([n, l, cls], i) => (
              <div key={l as string} className={`py-4 ${i ? 'pl-5 border-l hair' : ''}`}>
                <div className={`headline text-[56px] tabular-nums ${cls}`}>{String(n).padStart(2, '0')}</div>
                <div className="code-sm mt-1">{l}</div>
              </div>
            ))}
          </div>
          <div className="code text-bone mt-7">Evidence log</div>
          <ol className="mt-2 font-mono text-[12px] max-h-[230px] overflow-auto pr-2">
            {[...c.events].reverse().slice(0, 40).map((e, i) => {
              const [t, cls] = line(e);
              return (
                <motion.li key={c.events.length - i} initial={i === 0 ? { opacity: 0, x: -6 } : false} animate={{ opacity: 1, x: 0 }}
                  className="grid grid-cols-[64px_1fr] gap-3 py-1.5 border-b hair">
                  <span className="text-steel">{fmtTime(e.t)}</span><span className={cls}>{t}</span>
                </motion.li>
              );
            })}
          </ol>
          <div className="mt-6">
            <Row k="Restricted" v={c.restricted.map(prettySite).join(' · ')} accent />
            <Row k="Cleared" v={c.allowed.length ? c.allowed.map(prettySite).join(' · ') : '—'} />
          </div>
        </aside>
      </div>
    </div>
  );
}
