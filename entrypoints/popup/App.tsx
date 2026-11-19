import { browser } from 'wxt/browser';
import { Pause, Play, ArrowUpRight } from 'lucide-react';
import { useStore, useNow, send, appUrl, img } from '@/lib/hooks';
import { elapsedMs, fmtClock, activityOf, statsOf, verdictOf, fmtDate, endsAt } from '@/lib/model';

const open = (route: string) => { browser.tabs.create({ url: appUrl(route) }); window.close(); };

export default function App() {
  const s = useStore();
  const now = useNow();
  if (!s) return <div className="w-[340px] h-[420px] bg-ink" />;
  const c = s.active;
  const last = s.cases[0];

  return (
    <div className="w-[340px] bg-ink text-paper select-none">
      <header className="flex items-baseline justify-between px-5 pt-4 pb-3">
        <div className="display text-[22px] leading-none">Attention<br />Span <span className="text-red">Police</span></div>
        <div className="flex items-center gap-2 meta">
          <span className={`inline-block size-2 rounded-full ${c ? (c.status === 'active' ? 'bg-amber pulse' : 'bg-amber/50') : 'bg-dim'}`} />
          <span className={c ? 'text-amber' : ''}>{c ? (c.status === 'paused' ? 'On duty · paused' : 'On duty') : 'Off duty'}</span>
        </div>
      </header>

      {c ? (
        <>
          <div className="relative h-[150px] overflow-hidden grain">
            <img src={img('room-chair.webp')} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: c.status === 'paused' ? 'grayscale(.8) brightness(.6)' : 'brightness(.85)' }} />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
            <div className="absolute left-5 bottom-3 right-5 flex items-end justify-between">
              <div className="font-mono text-[44px] font-bold leading-none tracking-tight tabular-nums">{fmtClock(elapsedMs(c, now))}</div>
              <div className="meta text-right pb-1">left<br /><span className="text-paper">{fmtClock(Math.max(0, endsAt(c) - (c.pausedAt ?? now)))}</span></div>
            </div>
          </div>
          <div className="h-px bg-smoke"><div className="h-px bg-amber" style={{ width: `${Math.min(100, (elapsedMs(c, now) / c.durationMs) * 100)}%` }} /></div>
          <div className="px-5 pt-4 pb-5">
            <div className="meta">{c.caseNumber} · {activityOf(c.activity).label}</div>
            <div className="display text-[30px] mt-1 break-words">{c.name}</div>
            <div className="meta mt-2">{statsOf(c).attempts} attempts on record · {c.restricted.length} sites watched</div>
            <div className="flex items-center justify-between mt-5">
              <button className="btn-primary !text-[15px] !py-2.5 !px-4" onClick={() => open('/active')}>Open the case <ArrowUpRight size={16} /></button>
              <button className="btn-line text-sm" onClick={() => send({ type: c.status === 'paused' ? 'resume' : 'pause' })}>
                {c.status === 'paused' ? <><Play size={14} /> Resume</> : <><Pause size={14} /> Pause</>}
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="relative h-[130px] overflow-hidden grain">
            <img src={img('room-spotlight.webp')} alt="" className="absolute inset-0 w-full h-full object-cover object-[50%_30%] opacity-70" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink to-transparent" />
            <div className="absolute left-5 bottom-3 display text-[34px]">The chair<br />is empty.</div>
          </div>
          <div className="px-5 pt-3 pb-5">
            <p className="text-sm text-mute leading-snug">No investigation running. No sites are being questioned and nothing is recorded.</p>
            <button className="btn-primary w-full justify-between mt-5" onClick={() => open(s.onboarded ? '/new' : '/welcome')}>
              New investigation <ArrowUpRight size={18} />
            </button>
            {last && (
              <button className="w-full text-left mt-5 pt-3 border-t border-smoke group" onClick={() => open(`/report/${last.id}`)}>
                <div className="meta">Last case · {fmtDate(last.startedAt)}</div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className={`display text-[19px] mt-1 ${verdictOf(last).tone === 'amber' ? 'text-amber' : 'text-red'}`}>{verdictOf(last).title}</span>
                  <span className="text-xs text-mute group-hover:text-amber">View →</span>
                </div>
              </button>
            )}
          </div>
        </>
      )}
      <footer className="flex justify-between px-5 py-3 border-t border-smoke meta">
        <button className="hover:text-amber" onClick={() => open('/history')}>Case history ({s.cases.length})</button>
        <button className="hover:text-amber" onClick={() => open('/welcome')}>How it works</button>
      </footer>
    </div>
  );
}
