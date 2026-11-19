import { browser } from 'wxt/browser';
import { useStore, useNow, send, appUrl, img } from '@/lib/hooks';
import { elapsedMs, endsAt, fmtClock, activityOf, statsOf, verdictOf, fmtDate } from '@/lib/model';
import { Marks, Status } from '@/components/kit';

const open = (route: string) => { browser.tabs.create({ url: appUrl(route) }); window.close(); };

export default function App() {
  const s = useStore();
  const now = useNow();
  if (!s) return <div className="w-[340px] h-[440px] bg-obsidian" />;
  const c = s.active;
  const last = s.cases[0];

  return (
    <div className="w-[340px] bg-obsidian select-none">
      <header className="flex items-center justify-between px-4 h-11 border-b hair">
        <div className="flex items-center gap-2.5">
          <span className="size-3 bg-signal" />
          <span className="title text-[19px] tracking-[.08em]">ASP</span>        </div>
        <Status live={!!c} paused={c?.status === 'paused'} />
      </header>

      {c ? (() => {
        const el = elapsedMs(c, now), st = statsOf(c);
        return (
          <div className="px-4 pt-4 pb-4">
            <div className="flex justify-between code-sm"><span>OP {c.caseNumber}</span><span>{activityOf(c.activity).label}</span></div>
            <div className="title text-[26px] mt-2 line-clamp-2">{c.name}</div>
            <div className="mt-4 flex items-end justify-between">
              <div className={`headline text-[64px] tabular-nums ${c.status === 'paused' ? 'text-steel' : ''}`}>{fmtClock(el)}</div>
              <div className="text-right pb-1.5">
                <div className="code-sm">Remaining</div>
                <div className="font-mono text-[15px] text-light tabular-nums mt-0.5">{fmtClock(Math.max(0, endsAt(c) - (c.pausedAt ?? now)))}</div>
              </div>
            </div>
            <div className="h-px bg-iron mt-2"><div className="h-px bg-bone" style={{ width: `${Math.min(100, (el / c.durationMs) * 100)}%` }} /></div>
            <div className="grid grid-cols-3 mt-3 code-sm">
              <span><b className={`font-mono text-[13px] ${st.attempts ? 'text-signal' : 'text-light'}`}>{st.attempts}</b> deviations</span>
              <span className="text-center"><b className="font-mono text-[13px] text-light">{st.returned}</b> returned</span>
              <span className="text-right"><b className="font-mono text-[13px] text-light">{c.restricted.length}</b> targets</span>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2 mt-5">
              <button className="btn btn-primary !text-[15px] !py-2.5" onClick={() => open('/active')}>Open operation <span className="arrow">→</span></button>
              <button className="btn btn-ghost !text-[15px] !py-2.5" onClick={() => send({ type: c.status === 'paused' ? 'resume' : 'pause' })}>
                {c.status === 'paused' ? 'Resume' : 'Pause'}
              </button>
            </div>
          </div>
        );
      })() : (
        <div className="px-4 pt-4 pb-4">
          <div className="marks h-[104px]">
            <Marks />
            <div className="relative h-full overflow-hidden grain scan">
              <img src={img('surveillance.webp')} alt="" className="w-full h-full object-cover opacity-80" />
              <span className="absolute left-2 top-2 code-sm text-bone z-10">Feed 00 · no subject</span>
            </div>
          </div>
          <div className="headline text-[38px] mt-5">No active<br />operation.</div>
          <p className="text-[13px] text-steel mt-2 leading-snug">Nothing is intercepted or recorded while the bureau is on standby.</p>
          <button className="btn btn-primary w-full mt-4" onClick={() => open(s.onboarded ? '/new' : '/welcome')}>New investigation <span className="arrow">→</span></button>
          {last && (
            <button className="w-full text-left mt-4 pt-3 border-t hair group" onClick={() => open(`/report/${last.id}`)}>
              <div className="flex justify-between code-sm"><span>Last debrief · {last.caseNumber}</span><span>{fmtDate(last.startedAt)}</span></div>
              <div className="flex items-baseline justify-between mt-1">
                <span className={`title text-[20px] ${verdictOf(last).tone === 'red' ? 'text-signal' : ''}`}>{verdictOf(last).title}</span>
                <span className="code-sm group-hover:text-bone">Open →</span>
              </div>
            </button>
          )}
        </div>
      )}

      <footer className="flex justify-between px-4 h-10 items-center border-t hair">
        <button className="link" onClick={() => open('/history')}>Archive · {s.cases.length}</button>
        <button className="link" onClick={() => open('/welcome')}>Protocol</button>
      </footer>
    </div>
  );
}
