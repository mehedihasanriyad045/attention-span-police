import { useState } from 'react';
import { motion } from 'motion/react';
import { Store, statsOf, verdictOf, activityOf, fmtDur, fmtDate, fmtTime, REASONS, reasonOf, aiReport, prettySite } from '@/lib/model';
import { renderPoster } from '@/lib/poster';
import { Frame, Row } from '@/components/kit';
import { go } from './App';

export default function Report({ store, id }: { store: Store; id?: string }) {
  const c = store.cases.find((x) => x.id === id);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!c) return (
    <div className="pt-28 px-4 md:px-8">
      <div className="code">File not found</div>
      <h1 className="headline text-[80px] mt-3">Case expunged.</h1>
      <a href="#/history" className="btn btn-ghost mt-8">Back to archive</a>
    </div>
  );
  const s = statsOf(c), v = verdictOf(c);
  const red = v.tone === 'red';
  const log = c.events.filter((e) => ['attempt', 'returned', 'proceeded', 'paused', 'resumed', 'started', 'completed', 'abandoned'].includes(e.kind));
  const maxReason = Math.max(1, ...Object.values(s.reasons));

  const download = async () => {
    setBusy(true);
    try {
      const blob = await renderPoster(c);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${c.caseNumber}-${v.key}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } finally { setBusy(false); }
  };
  const copy = async () => {
    await navigator.clipboard.writeText(aiReport(c));
    setCopied(true); setTimeout(() => setCopied(false), 2200);
  };
  const reveal = (d: number) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.55, delay: d, ease: [0.2, 0.7, 0.2, 1] as const } });

  return (
    <article className="pt-12 px-4 md:px-8 pb-20 max-w-[1500px]">
      <div className="pt-6 flex flex-wrap justify-between gap-3 code">
        <span className="flex gap-6"><span className="text-bone">Debrief · {c.caseNumber}</span><span>{fmtDate(c.startedAt)}</span></span>
        <span className={c.status === 'completed' ? 'text-bone' : 'text-signal'}>{c.status === 'completed' ? 'Operation completed' : `Operation aborted at ${s.completionPct}%`}</span>
      </div>

      {/* Verdict */}
      <header className="mt-10 grid lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] gap-10 items-end">
        <div className="grid grid-cols-[8px_1fr] gap-6">
          <motion.span className={red ? 'bg-signal' : 'bg-bone'} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} style={{ originY: 0 }} transition={{ duration: 0.6, ease: [0.7, 0, 0.2, 1] }} />
          <div>
            <motion.div {...reveal(0.1)} className="code">Final verdict</motion.div>
            <motion.h1 {...reveal(0.18)} className={`headline text-[clamp(72px,11vw,184px)] mt-3 ${red ? 'text-signal' : ''}`}>{v.title}</motion.h1>
            <motion.p {...reveal(0.3)} className="mt-6 text-[clamp(18px,1.8vw,24px)] text-bone max-w-[40ch] leading-snug">{v.line}</motion.p>
          </div>
        </div>
        <motion.div {...reveal(0.4)}>
          <Frame src="interrogation.webp" className="h-[260px]" imgClass="object-[30%_60%] grayscale-[.3]"
            caption={<><span>Subject photographed</span><span>{fmtTime(c.startedAt)}</span></>} />
        </motion.div>
      </header>

      {/* Numbers */}
      <motion.dl {...reveal(0.5)} className="mt-16 grid grid-cols-2 md:grid-cols-4 border-y hair">
        {[
          [String(s.attempts).padStart(2, '0'), 'Deviations', s.attempts > 0],
          [String(s.returned).padStart(2, '0'), 'Returned to mission', false],
          [String(s.proceeded).padStart(2, '0'), 'Proceeded anyway', s.proceeded > 0],
          [`${s.completionPct}%`, `Of ${fmtDur(c.durationMs)} committed`, false],
        ].map(([n, l, hot], i) => (
          <div key={l as string} className={`py-6 ${i % 2 ? 'pl-6 border-l hair' : ''} ${i >= 2 ? 'md:pl-6 md:border-l hair' : ''}`}>
            <dd className={`headline text-[clamp(64px,7vw,108px)] tabular-nums ${hot ? 'text-signal' : ''}`}>{n}</dd>
            <dt className="code mt-2">{l}</dt>
          </div>
        ))}
      </motion.dl>

      {/* Dossier */}
      <section className="mt-14 grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-x-16 gap-y-12">
        <div>
          <div className="code text-bone">Operation file</div>
          <div className="title text-[34px] mt-3 break-words">{c.name}</div>
          {c.description && <p className="text-steel mt-2 text-[14px]">{c.description}</p>}
          <div className="mt-5">
            <Row k="Cover activity" v={activityOf(c.activity).label} />
            <Row k="Committed" v={fmtDur(c.durationMs)} />
            <Row k="Actual elapsed" v={fmtDur(s.elapsed)} />
            <Row k="Opened" v={`${fmtDate(c.startedAt)} ${fmtTime(c.startedAt)}`} />
            <Row k="Closed" v={c.endedAt ? fmtTime(c.endedAt) : '—'} />
            <Row k="Status" v={c.status === 'completed' ? 'Completed' : 'Ended early'} accent={c.status !== 'completed'} />
            <Row k="Interrogations" v={String(s.attempts)} />
            <Row k="Pauses" v={String(s.pauses)} />
            <Row k="Cleared-asset visits" v={String(s.allowedVisits)} />
            <Row k="Left without deciding" v={String(s.undecided)} />
            <Row k="Restricted" v={c.restricted.map(prettySite).join(', ')} accent />
          </div>
        </div>

        <div>
          <div className="code text-bone">Officer's statement</div>
          <blockquote className="mt-4 text-[clamp(20px,2vw,26px)] leading-snug text-bone max-w-[44ch]">“{v.statement}”</blockquote>
          <div className="code mt-4">— Duty officer, Bureau of Attention</div>

          <div className="code text-bone mt-12">Alibis on record</div>
          <ul className="mt-3">
            {REASONS.map((r, i) => (
              <li key={r.id} className="grid grid-cols-[36px_1fr_40px] items-center gap-2 py-2.5 border-b hair">
                <span className="code-sm">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <div className={`text-[14px] ${s.reasons[r.id] ? 'text-bone' : 'text-steel'}`}>{r.label}</div>
                  <div className="h-[2px] bg-iron mt-2"><div className={`h-full ${r.id === 'unknown' || r.id === 'break' ? 'bg-signal' : 'bg-bone'}`} style={{ width: `${(s.reasons[r.id] / maxReason) * 100}%` }} /></div>
                </div>
                <span className="font-mono text-[13px] text-right">{s.reasons[r.id]}</span>
              </li>
            ))}
          </ul>
          {Object.keys(s.domains).length > 0 && (
            <p className="mt-5 code normal-case tracking-normal">Destinations involved: <span className="text-signal">{Object.entries(s.domains).sort((a, b) => b[1] - a[1]).map(([d, n]) => `${prettySite(d)} ×${n}`).join(' · ')}</span></p>
          )}
        </div>
      </section>

      {/* Export */}
      <section className="mt-16 border-y hair py-6 flex flex-wrap items-center gap-3">
        <button className="btn btn-primary min-w-[260px]" onClick={download} disabled={busy}>{busy ? 'Printing dossier…' : 'Download case poster'} <span className="arrow">↓</span></button>
        <button className="btn btn-ghost min-w-[260px]" onClick={copy}>{copied ? 'Copied — paste into your AI' : 'Copy report for AI analysis'} <span className="arrow">⧉</span></button>
        <span className="flex-1" />
        <button className="link" onClick={() => go(store.active ? '/active' : '/new')}>{store.active ? 'Back to live operation →' : 'Open a new operation →'}</button>
      </section>

      {/* Timeline */}
      <section className="mt-14">
        <div className="code text-bone">Evidence log · observed browser activity</div>
        <ol className="mt-4">
          {log.map((e, i) => {
            const hot = e.kind === 'attempt' || e.kind === 'proceeded';
            return (
              <li key={i} className="grid grid-cols-[70px_110px_1fr] sm:grid-cols-[90px_150px_1fr] gap-4 py-2.5 border-b hair font-mono text-[12px]">
                <span className="text-steel">{fmtTime(e.t)}</span>
                <span className={`uppercase tracking-[.06em] ${hot ? 'text-signal' : e.kind === 'returned' || e.kind === 'completed' ? 'text-bone' : 'text-steel'}`}>{e.kind === 'attempt' ? 'deviation' : e.kind.replace('_', ' ')}</span>
                <span className="text-light">{e.domain ?? ''}{e.reason ? ` — “${reasonOf(e.reason)?.label}”` : ''}{e.note ? ` — ${e.note}` : ''}</span>
              </li>
            );
          })}
        </ol>
        <p className="mt-8 code-sm normal-case tracking-normal max-w-[70ch] leading-relaxed">
          The verdict is a deterministic joke built from the counts above. It is not a measure of attention — the extension only sees navigation to the sites you listed.
        </p>
      </section>
    </article>
  );
}
