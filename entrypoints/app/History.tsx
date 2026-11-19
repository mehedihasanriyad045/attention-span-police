import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { Store, mutate, statsOf, verdictOf, fmtDate, fmtDur, activityOf, prettySite } from '@/lib/model';
import { Frame, Row } from '@/components/kit';
import { go } from './App';

export default function History({ store }: { store: Store }) {
  const cases = store.cases;
  const [bytes, setBytes] = useState<number | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const fn = (browser.storage.local as any).getBytesInUse;
    if (typeof fn === 'function') fn.call(browser.storage.local, null).then(setBytes).catch(() => setBytes(null));
    else setBytes(new Blob([JSON.stringify(store)]).size);
  }, [store]);

  const all = cases.map((c) => ({ c, s: statsOf(c), v: verdictOf(c) }));
  const completed = all.filter((x) => x.c.status === 'completed').length;
  const totalTime = all.reduce((a, x) => a + x.s.elapsed, 0);
  const totalAttempts = all.reduce((a, x) => a + x.s.attempts, 0);
  const totalReturned = all.reduce((a, x) => a + x.s.returned, 0);
  const suspects: Record<string, number> = {};
  all.forEach((x) => Object.entries(x.s.domains).forEach(([d, n]) => (suspects[d] = (suspects[d] ?? 0) + n)));
  const prime = Object.entries(suspects).sort((a, b) => b[1] - a[1])[0];

  const del = (id: string) => mutate((s) => { s.cases = s.cases.filter((c) => c.id !== id); });
  const clearAll = async () => {
    await browser.storage.local.clear();
    await browser.storage.local.set({ onboarded: true });
    setConfirmAll(false);
  };

  return (
    <div className="pt-12 px-4 md:px-8 pb-24 max-w-[1500px]">
      <div className="pt-6 flex flex-wrap justify-between gap-3 code">
        <span className="text-bone">ASP/ARCHIVE — Closed operations</span>
        <span>{cases.length} file{cases.length === 1 ? '' : 's'} on record</span>
      </div>

      <div className="mt-8 grid lg:grid-cols-[minmax(0,1fr)_auto] gap-10 items-end">
        <h1 className="headline text-[clamp(64px,10vw,164px)]">Case<br />archive</h1>
        {cases.length > 0 && (
          <dl className="grid grid-cols-2 sm:grid-cols-4 border-t hair min-w-0 lg:min-w-[620px]">
            {[[String(cases.length), 'Operations'], [`${completed}/${cases.length}`, 'Completed'], [fmtDur(totalTime), 'On the clock'], [totalAttempts ? `${Math.round((totalReturned / totalAttempts) * 100)}%` : '—', 'Returned when caught']].map(([n, l], i) => (
              <div key={l} className={`pt-4 pb-2 ${i ? 'sm:pl-5 sm:border-l hair' : ''}`}>
                <dd className="title text-[34px] tabular-nums">{n}</dd><dt className="code-sm mt-1">{l}</dt>
              </div>
            ))}
          </dl>
        )}
      </div>
      {prime && <p className="mt-6 code normal-case tracking-normal">Repeat offender across all operations: <span className="text-signal">{prettySite(prime[0])} — {prime[1]} deviations</span></p>}

      {cases.length === 0 ? (
        <div className="mt-14 grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-10 items-center border-t hair pt-10">
          <Frame src="corridor.webp" className="h-[320px]" imgClass="object-[62%_45%] grayscale" caption={<><span>Archive room</span><span>Empty</span></>} />
          <div>
            <h2 className="headline text-[64px]">No files yet.</h2>
            <p className="text-steel mt-3 max-w-[42ch]">Every operation you close is filed here with its verdict and the full evidence log.</p>
            <button className="btn btn-primary mt-8 min-w-[260px]" onClick={() => go('/new')}>Open the first operation <span className="arrow">→</span></button>
          </div>
        </div>
      ) : (
        <ol className="mt-12">
          <li className="hidden md:grid grid-cols-[150px_minmax(0,1fr)_minmax(0,260px)_150px_40px] gap-6 pb-2 border-b border-bone/70 code-sm">
            <span>File</span><span>Operation</span><span>Verdict</span><span>Evidence</span><span />
          </li>
          {all.map(({ c, s, v }) => (
            <li key={c.id} className="group relative border-b hair">
              <button onClick={() => go(`/report/${c.id}`)}
                className="w-full text-left grid grid-cols-1 md:grid-cols-[150px_minmax(0,1fr)_minmax(0,260px)_150px_40px] gap-x-6 gap-y-1 py-6 pl-3 -ml-3 border-l-2 border-transparent hover:border-signal hover:bg-graphite/60 transition-colors">
                <div className="font-mono text-[11px] leading-relaxed">
                  <div className="text-bone">{c.caseNumber}</div>
                  <div className="text-steel">{fmtDate(c.startedAt)}</div>
                </div>
                <div className="min-w-0">
                  <div className="title text-[clamp(24px,2.4vw,34px)] truncate">{c.name}</div>
                  <div className="code-sm mt-1">{activityOf(c.activity).label} · {fmtDur(s.elapsed)} of {fmtDur(c.durationMs)}</div>
                </div>
                <div>
                  <div className={`title text-[22px] ${v.tone === 'red' ? 'text-signal' : ''}`}>{v.title}</div>
                  <div className={`code-sm mt-1 ${c.status === 'completed' ? '' : '!text-signal'}`}>{c.status === 'completed' ? 'Completed' : `Aborted · ${s.completionPct}%`}</div>
                </div>
                <div className="font-mono text-[11px] text-steel leading-relaxed">
                  <span className={s.attempts ? 'text-signal' : 'text-light'}>{s.attempts}</span> deviations<br />{s.returned} returned · {s.proceeded} proceeded
                </div>
                <span className="hidden md:block code text-right pt-2 group-hover:text-bone">→</span>
              </button>
              <div className="absolute right-12 top-6 md:right-14">
                {confirmId === c.id ? (
                  <span className="flex gap-4 bg-obsidian pl-3 py-1">
                    <button className="link danger !text-signal" onClick={() => del(c.id)}>Delete file</button>
                    <button className="link" onClick={() => setConfirmId(null)}>Cancel</button>
                  </span>
                ) : (
                  <button aria-label={`Delete case ${c.caseNumber}`} className="link danger opacity-0 group-hover:opacity-100 focus:opacity-100" onClick={() => setConfirmId(c.id)}>Delete</button>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      <section className="mt-24 grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-x-16 gap-y-8 border-t hair pt-8">
        <div>
          <div className="code">Evidence storage</div>
          <h2 className="headline text-[52px] mt-3">Kept on this<br />device. Only.</h2>
        </div>
        <div>
          <p className="text-steel leading-relaxed max-w-[60ch] text-[14px]">
            Operations, events, preferences and site lists live in the extension's local storage in this browser. Nothing is uploaded or synced.
            The bureau stores which listed sites you tried, the reasons you chose and timestamps — never page contents, keystrokes or unrelated history.
          </p>
          <div className="mt-6 max-w-[520px]">
            <Row k="Files stored" v={String(cases.length)} />
            <Row k="Space used" v={bytes == null ? '—' : `${(bytes / 1024).toFixed(1)} KB`} />
            <Row k="Live operation" v={store.active ? store.active.caseNumber : 'None'} />
          </div>
          <div className="mt-6">
            {confirmAll ? (
              <div className="border-l-2 border-signal pl-4">
                <p className="text-[14px] text-bone">This permanently erases every file{store.active ? ', ends the live operation' : ''} and your saved site lists. It cannot be undone.</p>
                <div className="flex gap-3 mt-4">
                  <button className="btn btn-critical" onClick={clearAll}>Erase everything</button>
                  <button className="btn btn-ghost" onClick={() => setConfirmAll(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <button className="btn btn-ghost hover:!border-signal hover:!text-signal" onClick={() => setConfirmAll(true)}>Delete all local data</button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
