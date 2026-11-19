import { useState } from 'react';
import { Pause, Play, Square } from 'lucide-react';
import { motion } from 'motion/react';
import { img, send, useNow } from '@/lib/hooks';
import { Store, elapsedMs, endsAt, fmtClock, fmtTime, activityOf, statsOf, reasonOf, CaseEvent, prettySite } from '@/lib/model';
import { go } from './App';

function line(e: CaseEvent) {
  switch (e.kind) {
    case 'started': return ['Suspect entered the room.', 'text-paper'];
    case 'paused': return ['Interview paused. Interception suspended.', 'text-mute'];
    case 'resumed': return ['Interview resumed.', 'text-paper'];
    case 'attempt': return [`Attempted entry: ${e.domain}`, 'text-red'];
    case 'returned': return [`Returned to mission — “${reasonOf(e.reason)?.label ?? 'no reason given'}”`, 'text-amber'];
    case 'proceeded': return [`Ignored the officer. Proceeded to ${e.domain}.`, 'text-red'];
    case 'allowed_visit': return [`Cleared site visited: ${e.domain}`, 'text-mute'];
    default: return [e.kind, 'text-mute'];
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
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 grain">
        <motion.img src={img('room-wide.webp')} alt="" className="w-full h-full object-cover object-[50%_60%]"
          initial={{ scale: 1.08, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1.4, ease: 'easeOut' }}
          style={{ filter: paused ? 'grayscale(.85) brightness(.45)' : 'brightness(.75)' }} />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-ink/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/60" />
      </div>

      <div className="relative px-5 md:px-10 pt-24 pb-16 min-h-screen flex flex-col max-w-[1400px]">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 meta">
          <span className={`flex items-center gap-2 ${paused ? 'text-mute' : 'text-amber'}`}>
            <span className={`size-2 rounded-full ${paused ? 'bg-mute' : 'bg-amber pulse'}`} />
            {paused ? 'On duty · interview paused' : 'On duty · interview in progress'}
          </span>
          <span>Case {c.caseNumber}</span>
          <span>Opened {fmtTime(c.startedAt)}</span>
        </div>

        <div className="mt-10 md:mt-16">
          <div className="meta text-paper/70">{activityOf(c.activity).label}</div>
          <h1 className="display text-[clamp(48px,8vw,128px)] mt-3 max-w-[14ch] break-words">{c.name}</h1>
          {c.description && <p className="mt-5 text-lg text-paper/70 max-w-[50ch]">{c.description}</p>}
        </div>

        <div className="mt-auto pt-16 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] gap-12 items-end">
          <div>
            <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
              <div>
                <div className="meta">Elapsed</div>
                <div className={`font-mono font-bold text-[clamp(56px,7vw,96px)] leading-none tabular-nums tracking-tight mt-2 ${paused ? 'text-mute' : ''}`}>{fmtClock(el)}</div>
              </div>
              <div className="pb-2">
                <div className="meta">Remaining</div>
                <div className="font-mono text-[28px] leading-none tabular-nums mt-2 text-amber">{fmtClock(left)}</div>
              </div>
            </div>
            <div className="mt-6 h-[2px] bg-paper/10 max-w-[640px]"><div className="h-full bg-amber transition-[width] duration-1000" style={{ width: `${pct}%` }} /></div>
            <div className="mt-8 flex flex-wrap items-center gap-8">
              <button className="btn-primary" onClick={() => send({ type: paused ? 'resume' : 'pause' })}>
                {paused ? <><Play size={18} /> Resume the interview</> : <><Pause size={18} /> Pause</>}
              </button>
              {confirmEnd ? (
                <span className="flex items-center gap-5 text-sm">
                  <span className="text-mute">End now at {Math.round(pct)}%?</span>
                  <button className="btn-line danger" onClick={end}>Yes, close the case</button>
                  <button className="btn-line" onClick={() => setConfirmEnd(false)}>Keep going</button>
                </span>
              ) : (
                <button className="btn-line danger text-sm" onClick={() => setConfirmEnd(true)}><Square size={13} /> End investigation</button>
              )}
            </div>
            {paused && <p className="mt-5 text-sm text-mute max-w-[50ch]">While paused, restricted sites open normally and the clock is stopped.</p>}
          </div>

          <aside>
            <div className="flex items-baseline gap-8 border-b border-paper/15 pb-4">
              <div><div className="display text-[56px] text-red">{st.attempts}</div><div className="meta">attempts</div></div>
              <div><div className="display text-[56px] text-amber">{st.returned}</div><div className="meta">returned</div></div>
              <div><div className="display text-[56px]">{st.proceeded}</div><div className="meta">escaped</div></div>
            </div>
            <div className="meta mt-5">Evidence log</div>
            <ol className="mt-2 font-mono text-[12px] leading-relaxed max-h-[180px] overflow-auto pr-2">
              {[...c.events].reverse().slice(0, 30).map((e, i) => {
                const [t, cls] = line(e);
                return <li key={i} className="flex gap-3 py-0.5"><span className="text-dim shrink-0">{fmtTime(e.t)}</span><span className={cls}>{t}</span></li>;
              })}
            </ol>
            <div className="meta mt-5 leading-relaxed normal-case tracking-normal">
              Watching: <span className="text-paper/80">{c.restricted.map(prettySite).join(' · ')}</span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
