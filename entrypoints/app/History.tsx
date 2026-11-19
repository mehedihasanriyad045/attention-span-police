import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { Trash2 } from 'lucide-react';
import { img } from '@/lib/hooks';
import { Store, mutate, statsOf, verdictOf, fmtDate, fmtDur, activityOf, prettySite } from '@/lib/model';
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
    <div className="px-5 md:px-10 pt-28 pb-24 max-w-[1400px]">
      <div className="grid md:grid-cols-[minmax(0,1fr)_auto] gap-10 items-end">
        <h1 className="display text-[clamp(60px,10vw,160px)]">Case<br /><span className="text-red">files.</span></h1>
        {cases.length > 0 && (
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-10 gap-y-6 pb-3">
            {[[cases.length, 'cases'], [`${completed}/${cases.length}`, 'completed'], [fmtDur(totalTime), 'on the clock'], [totalAttempts ? `${Math.round((totalReturned / totalAttempts) * 100)}%` : '—', 'returned when caught']].map(([n, l]) => (
              <div key={l as string}><dd className="font-mono text-2xl font-bold">{n}</dd><dt className="meta mt-1">{l}</dt></div>
            ))}
          </dl>
        )}
      </div>
      {prime && <p className="mt-6 text-mute">Repeat offender across all cases: <span className="text-red font-semibold">{prettySite(prime[0])}</span>, {prime[1]} attempts.</p>}

      {cases.length === 0 ? (
        <div className="mt-20 grid md:grid-cols-[minmax(0,420px)_1fr] gap-10 items-center">
          <div className="relative aspect-[4/3] overflow-hidden grain"><img src={img('evidence.webp')} alt="" className="w-full h-full object-cover opacity-70" /></div>
          <div>
            <p className="display text-[48px]">No files yet.</p>
            <p className="text-mute mt-3 max-w-[40ch]">Every investigation you close lands here, with its verdict and the full evidence log.</p>
            <button className="btn-primary mt-8" onClick={() => go('/new')}>Open the first case</button>
          </div>
        </div>
      ) : (
        <ol className="mt-16 border-t border-smoke">
          {all.map(({ c, s, v }) => (
            <li key={c.id} className="group relative border-b border-smoke">
              <button onClick={() => go(`/report/${c.id}`)} className="w-full text-left grid grid-cols-1 md:grid-cols-[150px_minmax(0,1fr)_minmax(0,300px)_140px] gap-x-8 gap-y-2 py-7 pr-12 transition-colors hover:bg-char/60">
                <div className="font-mono text-[12px] text-mute leading-relaxed">{fmtDate(c.startedAt)}<br /><span className="text-dim">{c.caseNumber}</span></div>
                <div>
                  <div className="meta">{activityOf(c.activity).label} · {fmtDur(s.elapsed)} of {fmtDur(c.durationMs)}</div>
                  <div className="display text-[clamp(28px,3vw,44px)] mt-1 group-hover:text-amber transition-colors break-words">{c.name}</div>
                </div>
                <div className={`display text-[24px] md:pt-5 ${v.tone === 'amber' ? 'text-amber' : 'text-red'}`}>{v.title}</div>
                <div className="font-mono text-[12px] text-mute md:pt-6">{s.attempts} attempts<br />{s.returned} returned · {s.proceeded} left</div>
              </button>
              <div className="absolute right-0 top-7">
                {confirmId === c.id ? (
                  <span className="flex flex-col items-end gap-1 text-xs bg-ink pl-3">
                    <button className="text-red hover:underline" onClick={() => del(c.id)}>Delete case</button>
                    <button className="text-mute hover:underline" onClick={() => setConfirmId(null)}>Cancel</button>
                  </span>
                ) : (
                  <button aria-label={`Delete case ${c.caseNumber}`} className="p-2 text-dim hover:text-red" onClick={() => setConfirmId(c.id)}><Trash2 size={16} /></button>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      <section className="mt-24 pt-10 border-t border-smoke grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-10">
        <div>
          <div className="meta">Evidence storage</div>
          <h2 className="display text-[44px] mt-3">Kept in this browser. Only.</h2>
          <p className="text-mute mt-3 max-w-[52ch] leading-relaxed">
            Cases, events, preferences and your site lists live in the extension's local storage on this device. Nothing is uploaded or synced.
            We store which listed sites you tried, the reasons you picked, and timestamps — never page contents, keystrokes or unrelated history.
          </p>
        </div>
        <div className="md:pt-8">
          <div className="font-mono text-sm flex justify-between py-2.5 border-b border-smoke"><span className="text-mute">Cases stored</span><span>{cases.length}</span></div>
          <div className="font-mono text-sm flex justify-between py-2.5 border-b border-smoke"><span className="text-mute">Space used</span><span>{bytes == null ? '—' : `${(bytes / 1024).toFixed(1)} KB`}</span></div>
          <div className="font-mono text-sm flex justify-between py-2.5 border-b border-smoke"><span className="text-mute">Active case</span><span>{store.active ? store.active.caseNumber : 'none'}</span></div>
          <div className="mt-6">
            {confirmAll ? (
              <div>
                <p className="text-sm">This permanently erases every case{store.active ? ', ends the active investigation' : ''} and your saved site lists. It cannot be undone.</p>
                <div className="flex gap-6 mt-4">
                  <button className="btn-line danger" onClick={clearAll}>Erase everything</button>
                  <button className="btn-line" onClick={() => setConfirmAll(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <button className="btn-line danger" onClick={() => setConfirmAll(true)}><Trash2 size={14} /> Delete all local data</button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
