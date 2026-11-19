import { useState } from 'react';
import { browser } from 'wxt/browser';
import { send } from '@/lib/hooks';
import { ACTIVITIES, Activity, Store, normalizeDomain, originPatterns, activityOf, prettySite, Investigation } from '@/lib/model';
import { Frame, Section, Row } from '@/components/kit';
import { go } from './App';

const DURATIONS = [15, 30, 45, 60, 90, 120];
const SUGGEST_RESTRICTED = ['facebook.com', 'instagram.com', 'reddit.com', 'tiktok.com', 'x.com', 'youtube.com/shorts', 'netflix.com', 'twitch.tv'];
const SUGGEST_ALLOWED = ['youtube.com', 'netflix.com', 'github.com', 'stackoverflow.com', 'docs.google.com', 'developer.mozilla.org'];

function DomainList({ title, code, note, items, setItems, suggestions, restricted, other }: {
  title: string; code: string; note: string; items: string[]; setItems: (v: string[]) => void; suggestions: string[]; restricted?: boolean; other: string[];
}) {
  const [v, setV] = useState('');
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const add = (raw: string) => {
    const d = normalizeDomain(raw);
    if (!d) return setErr('Not a recognisable address. Try “instagram.com”.');
    if (items.includes(d)) return setErr('Already listed.');
    if (other.includes(d)) return setErr('That exact address is on the other list.');
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
      <div className="flex items-baseline justify-between border-b border-bone/70 pb-2">
        <h3 className={`title text-[26px] ${restricted ? 'text-signal' : ''}`}>{title}</h3>
        <span className="code-sm">{code} · {String(items.length).padStart(2, '0')}</span>
      </div>
      <p className="text-[13px] text-steel mt-2 leading-snug max-w-[40ch]">{note}</p>
      <ul className="mt-3">
        {items.map((d, i) => (
          <li key={d} className="group grid grid-cols-[20px_1fr_auto] items-center border-b hair h-10">
            <span className={`size-1.5 ${restricted ? 'bg-signal' : 'bg-steel'}`} />
            {editing === i ? (
              <input autoFocus defaultValue={d} className="field !py-1 !border-0 font-mono text-[13px]" onBlur={(e) => rename(i, e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditing(null); }} />
            ) : (
              <button className="font-mono text-[13px] text-left text-light hover:text-bone truncate" title="Click to edit" onClick={() => setEditing(i)}>{d}</button>
            )}
            <button aria-label={`Remove ${d}`} className="link danger opacity-60 group-hover:opacity-100 px-1" onClick={() => setItems(items.filter((x) => x !== d))}>Remove</button>
          </li>
        ))}
        {!items.length && <li className="h-10 flex items-center code-sm border-b hair">None listed</li>}
      </ul>
      <form className="grid grid-cols-[1fr_auto] items-end gap-3 mt-2" onSubmit={(e) => { e.preventDefault(); add(v); }}>
        <input value={v} onChange={(e) => { setV(e.target.value); setErr(''); }} placeholder="add address — e.g. reddit.com" className="field font-mono text-[13px]" />
        <button type="submit" className="link pb-2.5 text-bone">Add +</button>
      </form>
      {err && <p className="code-sm !text-signal mt-2 normal-case tracking-normal">{err}</p>}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3">
        {suggestions.filter((x) => !items.includes(x) && !other.includes(x)).map((x) => (
          <button key={x} onClick={() => add(x)} className="font-mono text-[11px] text-steel hover:text-bone">+{x}</button>
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
        setError('Access declined. Without permission for the listed sites the bureau cannot intercept them, so the operation was not opened. Remove sites you don’t want to grant, or try again.');
        return;
      }
      await send<Investigation>({ type: 'start', config: { activity, name: name.trim(), description: description.trim(), durationMs: minutes * 60000, allowed, restricted } });
      go('/active');
    }).catch((e) => { setBusy(false); setError(String(e?.message ?? e)); });
  };

  const missing = [!name.trim() && 'objective', !validMin && 'duration', !restricted.length && 'restricted destination'].filter(Boolean);

  return (
    <div className="pt-12 px-4 md:px-8 pb-24 max-w-[1500px] grid lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] gap-x-14 gap-y-10">
      {/* Briefing dossier column */}
      <aside className="lg:sticky lg:top-12 lg:self-start pt-8">
        <div className="flex justify-between code"><span className="text-bone">ASP/OPS — Form 01</span><span>Draft</span></div>
        <Frame src="briefing.webp" className="mt-5 h-[36vh] lg:h-[46vh]" imgClass="object-[30%_60%]"
          caption={<><span>Fig. 02 — Operative on file</span><span>Identity withheld</span></>} />
        <div className="mt-10">
          <div className="code mb-2 text-bone">Operation parameters</div>
          <Row k="Activity" v={activityOf(activity).label} />
          <Row k="Objective" v={name.trim() || '—'} />
          <Row k="Duration" v={validMin ? `${minutes} min` : '—'} />
          <Row k="Cleared destinations" v={String(allowed.length)} />
          <Row k="Restricted destinations" v={String(restricted.length)} accent />
        </div>
      </aside>

      <div className="pt-8 min-w-0">
        <div className="code">Mission briefing · prepare a new operation</div>
        <h1 className="headline text-[clamp(56px,7.5vw,124px)] mt-4">New<br />investigation</h1>

        <div className="mt-12 space-y-12">
          <Section n="01" label="Cover activity">
            <div className="flex flex-wrap" role="radiogroup" aria-label="Activity">
              {ACTIVITIES.map((a) => (
                <button key={a.id} role="radio" aria-checked={activity === a.id} onClick={() => setActivity(a.id)}
                  className={`title text-[clamp(24px,2.6vw,34px)] px-4 py-2 border-l-2 transition-colors ${activity === a.id ? 'border-signal text-bone bg-graphite' : 'border-transparent text-steel hover:text-light'}`}>
                  {a.label}
                </button>
              ))}
            </div>
          </Section>

          <Section n="02" label="Objective">
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80}
              placeholder={activity === 'watching' ? 'Watch Interstellar without distractions' : activity === 'reading' ? 'Read 30 pages' : 'Finish Java course chapter 5'}
              className="field title !text-[clamp(28px,3.2vw,44px)] !normal-case !tracking-normal" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={300}
              placeholder="Optional notes. What does done look like?" className="field mt-3 text-[14px] resize-none" />
          </Section>

          <Section n="03" label="Duration · minutes">
            <div className="flex flex-wrap items-end gap-x-1 gap-y-2">
              {DURATIONS.map((d) => (
                <button key={d} onClick={() => { setMinutes(d); setCustom(false); }}
                  className={`headline text-[44px] tabular-nums w-[84px] py-2 text-left pl-3 border-b-2 transition-colors ${!custom && minutes === d ? 'text-bone border-signal' : 'text-steel/70 border-steel/20 hover:text-light'}`}>
                  {d}
                </button>
              ))}
              <label className={`flex items-end gap-2 py-2 pl-3 border-b-2 ${custom ? 'border-signal' : 'border-steel/20'}`}>
                <span className="code-sm pb-2">Custom</span>
                <input type="number" min={5} max={480} value={custom ? (Number.isFinite(minutes) ? minutes : '') : ''} placeholder="––"
                  onFocus={() => setCustom(true)} onChange={(e) => { setCustom(true); setMinutes(parseInt(e.target.value, 10)); }}
                  className="w-[72px] bg-transparent headline !text-[44px] outline-none tabular-nums placeholder:text-steel/40 [appearance:textfield]" />
              </label>
            </div>
            {custom && !validMin && <p className="code-sm !text-signal mt-3">Between 5 and 480 minutes</p>}
          </Section>

          <Section n="04" label="Destinations">
            <div className="grid md:grid-cols-2 gap-x-12 gap-y-10">
              <DomainList title="Restricted" code="Targets" restricted
                note="Opening these during the operation triggers an interrogation. Subdomains included."
                items={restricted} setItems={setRestricted} suggestions={SUGGEST_RESTRICTED} other={allowed} />
              <DomainList title="Cleared" code="Assets"
                note="Sites the mission needs. A more specific address wins — allow youtube.com/watch while youtube.com is restricted."
                items={allowed} setItems={setAllowed} suggestions={SUGGEST_ALLOWED} other={restricted} />
            </div>
          </Section>

          <Section n="05" label="Authorisation">
            <p className="text-[clamp(18px,1.9vw,24px)] leading-snug text-light max-w-[48ch]">
              For <span className="text-bone font-semibold">{validMin ? `${minutes} minutes` : '—'}</span> I will be {activityOf(activity).verb}
              {name.trim() ? <>: <span className="text-bone font-semibold">{name.trim()}</span></> : ''}. Any visit to{' '}
              {restricted.length ? <span className="text-signal font-semibold">{restricted.map(prettySite).join(', ')}</span> : 'a restricted destination'} will be questioned.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-6">
              <button className="btn btn-primary min-w-[300px] !text-[20px] !py-4" disabled={!canStart} onClick={start}>
                {busy ? 'Opening operation…' : 'Start the investigation'} <span className="arrow">→</span>
              </button>
              <span className="code-sm max-w-[40ch] normal-case tracking-normal leading-relaxed">
                {missing.length ? `Missing: ${missing.join(', ')}.` : `Your browser will ask for access to the ${restricted.length + allowed.length} listed sites. That access is what allows interception.`}
              </span>
            </div>
            {error && <p className="mt-5 text-[14px] text-signal max-w-[60ch] border-l-2 border-signal pl-4">{error}</p>}
          </Section>
        </div>
      </div>
    </div>
  );
}
