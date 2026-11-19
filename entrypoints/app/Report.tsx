import { useState } from 'react';
import { Download, Copy, Check, ArrowRight } from 'lucide-react';
import { img } from '@/lib/hooks';
import { Store, statsOf, verdictOf, activityOf, fmtDur, fmtDate, fmtTime, REASONS, reasonOf, aiReport, prettySite } from '@/lib/model';
import { renderPoster } from '@/lib/poster';
import { go } from './App';

export default function Report({ store, id }: { store: Store; id?: string }) {
  const c = store.cases.find((x) => x.id === id);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!c) return (
    <div className="px-5 md:px-10 pt-32">
      <h1 className="display text-[72px]">Case not found.</h1>
      <p className="text-mute mt-3">It may have been deleted. <a href="#/history" className="btn-line">Back to history</a></p>
    </div>
  );
  const s = statsOf(c), v = verdictOf(c);
  const accent = v.tone === 'amber' ? 'text-amber' : 'text-red';
  const decisions = c.events.filter((e) => ['attempt', 'returned', 'proceeded', 'paused', 'resumed', 'started', 'completed', 'abandoned'].includes(e.kind));
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

  return (
    <article>
      {/* Poster */}
      <header className="relative min-h-[88svh] overflow-hidden grain flex flex-col">
        <img src={img('room-wide.webp')} alt="" className="absolute inset-0 w-full h-full object-cover object-[50%_70%]" style={{ filter: v.tone === 'red' ? 'saturate(1.2) brightness(.6)' : 'brightness(.7)' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/70" />
        <div className="relative px-5 md:px-10 pt-24 flex flex-wrap justify-between gap-3 meta">
          <span>Case {c.caseNumber} · {fmtDate(c.startedAt)}</span>
          <span className={accent}>{c.status === 'completed' ? 'Closed · mission completed' : `Closed · ended early at ${s.completionPct}%`}</span>
        </div>
        <div className="relative mt-auto px-5 md:px-10 pb-14 max-w-[1400px]">
          <div className="meta text-paper">Final verdict</div>
          <h1 className={`display text-[clamp(72px,14vw,220px)] mt-3 ${accent}`}>{v.title}</h1>
          <p className="mt-6 text-[clamp(20px,2.2vw,28px)] italic max-w-[36ch] text-paper/90 leading-snug">“{v.line}”</p>
        </div>
      </header>

      {/* Case file */}
      <section className="px-5 md:px-10 py-16 max-w-[1400px] grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-16">
        <div>
          <div className="meta">The mission · {activityOf(c.activity).label}</div>
          <h2 className="display text-[clamp(40px,5vw,76px)] mt-3 break-words">{c.name}</h2>
          {c.description && <p className="mt-4 text-paper/70 max-w-[56ch]">{c.description}</p>}

          <dl className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-y-10">
            {[[s.attempts, 'Attempts', 'text-red'], [s.returned, 'Returned', 'text-amber'], [s.proceeded, 'Went anyway', ''], [`${s.completionPct}%`, 'Of committed time', '']].map(([n, l, cls]) => (
              <div key={l as string}><dd className={`display text-[clamp(56px,6vw,96px)] ${cls}`}>{n}</dd><dt className="meta mt-2">{l}</dt></div>
            ))}
          </dl>

          <div className="mt-14 grid sm:grid-cols-2 gap-x-12 font-mono text-[13px]">
            {[
              ['Committed', fmtDur(c.durationMs)], ['Actual elapsed', fmtDur(s.elapsed)],
              ['Opened', `${fmtDate(c.startedAt)} ${fmtTime(c.startedAt)}`], ['Closed', c.endedAt ? fmtTime(c.endedAt) : '—'],
              ['Interrogations', String(s.attempts)], ['Pauses', String(s.pauses)],
              ['Cleared-site visits', String(s.allowedVisits)], ['Left without deciding', String(s.undecided)],
            ].map(([k, val]) => (
              <div key={k} className="flex justify-between py-2.5 border-b border-smoke"><span className="text-mute">{k}</span><span>{val}</span></div>
            ))}
          </div>
        </div>

        <aside className="lg:pt-8">
          <div className="relative aspect-[16/10] overflow-hidden grain">
            <img src={img('suspect.webp')} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="meta mt-8">Officer's statement</div>
          <blockquote className="mt-3 text-xl leading-relaxed text-paper/90">{v.statement}</blockquote>
          <div className="meta mt-3">— Duty Officer, Attention Span Police</div>

          <div className="meta mt-12">Alibis given</div>
          <ul className="mt-3">
            {REASONS.map((r) => (
              <li key={r.id} className="py-2">
                <div className="flex justify-between text-sm"><span className={s.reasons[r.id] ? '' : 'text-dim'}>{r.label}</span><span className="font-mono">{s.reasons[r.id]}</span></div>
                <div className="h-px bg-smoke mt-2"><div className="h-px bg-amber" style={{ width: `${(s.reasons[r.id] / maxReason) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
          {Object.keys(s.domains).length > 0 && (
            <p className="mt-6 text-sm text-mute">Sites involved: <span className="text-paper">{Object.entries(s.domains).sort((a, b) => b[1] - a[1]).map(([d, n]) => `${prettySite(d)} ×${n}`).join(', ')}</span></p>
          )}
        </aside>
      </section>

      {/* Actions */}
      <section className="px-5 md:px-10 py-12 border-y border-smoke">
        <div className="max-w-[1400px] flex flex-wrap items-center gap-x-8 gap-y-5">
          <button className="btn-primary" onClick={download} disabled={busy}><Download size={18} /> {busy ? 'Printing…' : 'Download case poster'}</button>
          <button className="btn-line" onClick={copy}>{copied ? <><Check size={15} /> Copied — paste it into your AI assistant</> : <><Copy size={15} /> Copy report for AI analysis</>}</button>
          <span className="flex-1" />
          <button className="btn-line" onClick={() => go(store.active ? '/active' : '/new')}>{store.active ? 'Back to active case' : 'Open a new case'} <ArrowRight size={15} /></button>
        </div>
      </section>

      {/* Timeline */}
      <section className="px-5 md:px-10 py-16 max-w-[1400px]">
        <div className="meta">Evidence log · observed browser activity</div>
        <ol className="mt-6 font-mono text-[13px]">
          {decisions.map((e, i) => (
            <li key={i} className="grid grid-cols-[64px_80px_1fr] sm:grid-cols-[80px_140px_1fr] gap-4 py-2.5 border-b border-smoke/70">
              <span className="text-dim">{fmtTime(e.t)}</span>
              <span className={e.kind === 'proceeded' || e.kind === 'attempt' ? 'text-red' : e.kind === 'returned' || e.kind === 'completed' ? 'text-amber' : 'text-mute'}>{e.kind.replace('_', ' ')}</span>
              <span className="text-paper/80">
                {e.domain ?? ''}{e.reason ? ` — “${reasonOf(e.reason)?.label}”` : ''}{e.note ? ` — ${e.note}` : ''}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-xs text-dim max-w-[70ch]">The verdict is a deterministic joke built from counts above. It is not a scientific attention measurement — the extension only sees navigation to the sites you listed, not whether you were thinking about your work.</p>
      </section>
    </article>
  );
}
