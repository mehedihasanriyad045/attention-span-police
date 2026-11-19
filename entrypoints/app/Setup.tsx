import { useState } from 'react';
import { browser } from 'wxt/browser';
import { X, Plus, ArrowRight } from 'lucide-react';
import { img, send } from '@/lib/hooks';
import { ACTIVITIES, Activity, Store, normalizeDomain, originPatterns, activityOf, prettySite, Investigation } from '@/lib/model';
import { go } from './App';

const DURATIONS = [15, 30, 45, 60, 90, 120];
const SUGGEST_RESTRICTED = ['facebook.com', 'instagram.com', 'reddit.com', 'tiktok.com', 'x.com', 'youtube.com/shorts', 'netflix.com', 'twitch.tv'];
const SUGGEST_ALLOWED = ['youtube.com', 'netflix.com', 'github.com', 'stackoverflow.com', 'docs.google.com', 'developer.mozilla.org'];

function DomainList({ title, note, items, setItems, suggestions, tone, other }: {
  title: string; note: string; items: string[]; setItems: (v: string[]) => void; suggestions: string[]; tone: 'red' | 'paper'; other: string[];
}) {
  const [v, setV] = useState('');
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const add = (raw: string) => {
    const d = normalizeDomain(raw);
    if (!d) return setErr('That does not look like a website. Try “instagram.com”.');
    if (items.includes(d)) return setErr('Already on the list.');
    if (other.includes(d)) return setErr('That exact site is on the other list.');
    setItems([...items, d]); setV(''); setErr('');
  };
  const rename = (i: number, raw: string) => {
    const d = normalizeDomain(raw);
    setEditing(null);
    if (!d || (items.includes(d) && items[i] !== d) || other.includes(d)) return;
    setItems(items.map((x, j) => (j === i ? d : x)));
  };
  return (
    <div>
      <h3 className={`display text-[34px] ${tone === 'red' ? 'text-red' : ''}`}>{title}</h3>
      <p className="text-sm text-mute mt-1 max-w-[38ch]">{note}</p>
      <ul className="mt-4">
        {items.map((d, i) => (
          <li key={d} className="group flex items-center justify-between border-b border-smoke py-2.5">
            {editing === i ? (
              <input autoFocus defaultValue={d} className="field !py-0 font-mono text-[15px] !border-0" onBlur={(e) => rename(i, e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditing(null); }} />
            ) : (
              <button className="font-mono text-[15px] text-left hover:text-amber" title="Click to edit" onClick={() => setEditing(i)}>{d}</button>
            )}
            <button aria-label={`Remove ${d}`} className="text-dim hover:text-red p-1" onClick={() => setItems(items.filter((x) => x !== d))}><X size={16} /></button>
          </li>
        ))}
        {!items.length && <li className="py-2.5 text-sm text-dim italic border-b border-smoke">Nothing listed.</li>}
      </ul>
      <form className="flex items-center gap-3 mt-3" onSubmit={(e) => { e.preventDefault(); add(v); }}>
        <input value={v} onChange={(e) => { setV(e.target.value); setErr(''); }} placeholder="add a site, e.g. reddit.com" className="field font-mono text-sm" />
        <button type="submit" aria-label="Add site" className="text-mute hover:text-amber p-1"><Plus size={18} /></button>
      </form>
      {err && <p className="text-xs text-red mt-2">{err}</p>}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        {suggestions.filter((x) => !items.includes(x) && !other.includes(x)).map((x) => (
          <button key={x} onClick={() => add(x)} className="text-xs text-dim hover:text-amber font-mono">+ {x}</button>
        ))}
      </div>
    </div>
  );
}

export default function Setup({ store }: { store: Store }) {
  const p = store.prefs;
  const [activity, setActivity] = useState<Activity>(p.activity);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [minutes, setMinutes] = useState(p.durationMin);
  const [custom, setCustom] = useState(!DURATIONS.includes(p.durationMin));
  const [allowed, setAllowed] = useState<string[]>(p.allowed);
  const [restricted, setRestricted] = useState<string[]>(p.restricted);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const validMin = Number.isFinite(minutes) && minutes >= 5 && minutes <= 480;
  const canStart = name.trim().length > 0 && validMin && restricted.length > 0 && !busy;

  const start = () => {
    if (!canStart) return;
    setBusy(true); setError('');
    // Must be the first call in the click handler: Firefox only allows permission prompts from a direct user gesture.
    const origins = originPatterns([...restricted, ...allowed]);
    browser.permissions.request({ origins }).then(async (granted) => {
      if (!granted) {
        setBusy(false);
        setError('Permission declined. Without access to the listed sites, the department cannot intercept them, so the case was not opened. Remove sites you don’t want to grant, or try again.');
        return;
      }
      await send<Investigation>({ type: 'start', config: { activity, name: name.trim(), description: description.trim(), durationMs: minutes * 60000, allowed, restricted } });
      go('/active');
    }).catch((e) => { setBusy(false); setError(String(e?.message ?? e)); });
  };

  return (
    <div className="md:grid md:grid-cols-[minmax(280px,34%)_1fr] min-h-screen">
      <aside className="relative h-[46vh] md:h-screen md:sticky md:top-0 overflow-hidden grain">
        <img src={img('room-spotlight.webp')} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-ink/50 md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-ink" />
        <div className="absolute left-5 md:left-10 bottom-8 right-5">
          <div className="meta text-amber">Form ASP-01 · Intake</div>
          <p className="display text-[clamp(40px,4.4vw,72px)] mt-3">Take a<br />seat.</p>
          <p className="text-sm text-paper/70 mt-3 max-w-[30ch]">State your mission. Name your weaknesses. The light stays on until the clock runs out.</p>
        </div>
      </aside>

      <div className="px-5 md:px-14 lg:px-20 pt-10 md:pt-28 pb-28 max-w-[980px]">
        <h1 className="display text-[clamp(52px,7vw,112px)]">New<br />investigation</h1>

        <section className="mt-16">
          <div className="meta">01 — Activity</div>
          <div className="mt-4 flex flex-wrap gap-x-7 gap-y-2" role="radiogroup" aria-label="Activity">
            {ACTIVITIES.map((a) => (
              <button key={a.id} role="radio" aria-checked={activity === a.id} onClick={() => setActivity(a.id)}
                className={`display text-[clamp(30px,3.6vw,46px)] transition-colors ${activity === a.id ? 'text-amber' : 'text-dim hover:text-paper'}`}>
                {a.label}{activity === a.id && <span className="text-red">.</span>}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <div className="meta">02 — The mission</div>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80}
            placeholder={activity === 'watching' ? 'Watch Interstellar without distractions' : activity === 'reading' ? 'Read 30 pages' : 'Finish Java course chapter 5'}
            className="field mt-3 text-[clamp(24px,3vw,38px)] font-semibold tracking-tight" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={300}
            placeholder="Optional details. What does done look like?" className="field mt-4 text-base resize-none" />
        </section>

        <section className="mt-16">
          <div className="meta">03 — Duration, in minutes</div>
          <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3">
            {DURATIONS.map((d) => (
              <button key={d} onClick={() => { setMinutes(d); setCustom(false); }}
                className={`font-mono text-[34px] font-bold tabular-nums leading-none pb-2 border-b-2 transition-colors ${!custom && minutes === d ? 'text-amber border-amber' : 'text-dim border-transparent hover:text-paper'}`}>
                {d}
              </button>
            ))}
            <label className={`flex items-end gap-2 pb-2 border-b-2 ${custom ? 'border-amber' : 'border-transparent'}`}>
              <span className={`text-sm pb-1 ${custom ? 'text-amber' : 'text-dim'}`}>custom</span>
              <input type="number" min={5} max={480} value={custom ? minutes : ''} placeholder="—"
                onFocus={() => setCustom(true)} onChange={(e) => { setCustom(true); setMinutes(parseInt(e.target.value, 10)); }}
                className="w-20 bg-transparent font-mono text-[34px] font-bold leading-none outline-none text-amber placeholder:text-dim [appearance:textfield]" />
            </label>
          </div>
          {custom && !validMin && <p className="text-xs text-red mt-2">Between 5 and 480 minutes.</p>}
        </section>

        <section className="mt-16">
          <div className="meta">04 — Jurisdiction</div>
          <div className="mt-5 grid sm:grid-cols-2 gap-12">
            <DomainList title="Suspects" tone="red" note="Visiting these during the case triggers an interrogation. Subdomains are included." items={restricted} setItems={setRestricted} suggestions={SUGGEST_RESTRICTED} other={allowed} />
            <DomainList title="Cleared" tone="paper" note="Sites you need for the mission. A more specific address here wins, e.g. allow youtube.com/watch while youtube.com is a suspect." items={allowed} setItems={setAllowed} suggestions={SUGGEST_ALLOWED} other={restricted} />
          </div>
        </section>

        <section className="mt-20 pt-10 border-t border-smoke">
          <div className="meta">05 — Statement for the record</div>
          <p className="mt-5 text-[clamp(22px,2.6vw,32px)] leading-snug tracking-tight max-w-[30ch] text-paper/90">
            For the next <span className="text-amber font-semibold">{validMin ? minutes : '—'} minutes</span> I will be {activityOf(activity).verb}
            {name.trim() ? <>: <span className="text-amber font-semibold">“{name.trim()}”</span></> : <span className="text-dim"> (mission name required)</span>}.
            {' '}I accept questioning on{' '}
            {restricted.length ? <span className="text-red font-semibold">{restricted.map(prettySite).join(', ')}</span> : <span className="text-dim">(add at least one suspect)</span>}.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-6">
            <button className="btn-primary !text-[22px] !px-7 !py-4" disabled={!canStart} onClick={start}>
              {busy ? 'Opening case…' : 'Start the investigation'} <ArrowRight size={20} />
            </button>
            <span className="text-xs text-mute max-w-[40ch]">Your browser will ask to let ASP access the {restricted.length + allowed.length} listed sites. That access is what lets it intercept them.</span>
          </div>
          {error && <p className="mt-5 text-sm text-red max-w-[60ch]">{error}</p>}
        </section>
      </div>
    </div>
  );
}
