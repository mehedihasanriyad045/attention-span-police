import { motion } from 'motion/react';
import { Store, mutate } from '@/lib/model';
import { Frame } from '@/components/kit';
import { go } from './App';

const RULES = [
  ['Open an operation', 'Name the objective, set the clock, list the destinations you need and the ones that compromise you.'],
  ['Deviations are intercepted', 'While the operation is live, opening a restricted destination routes you to an interrogation instead.'],
  ['You decide', 'Give a reason, hear the officer out, then return to the mission or proceed anyway. The bureau never locks you out.'],
  ['Evidence stays on this device', 'Attempts, reasons and decisions are logged locally. No account, no server, no page contents, no keystrokes.'],
  ['Stand down at any time', 'Pause or end an operation whenever you want. On standby nothing is intercepted and nothing is recorded.'],
];

const rise = (d: number) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay: d, ease: [0.2, 0.7, 0.2, 1] as const } });

export default function Welcome({ store }: { store: Store }) {
  const start = async () => { await mutate((s) => { s.onboarded = true; }); go('/new'); };
  return (
    <div className="pt-12">
      <section className="px-4 md:px-8 pt-10 md:pt-16 pb-16 grid lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] gap-12 lg:gap-16 max-w-[1500px]">
        <div className="flex flex-col">
          <motion.div {...rise(0)} className="flex flex-wrap gap-x-8 gap-y-1 code">
            <span className="text-bone">ASP/DOC-000</span><span>Orientation</span><span>Clearance: civilian</span>
          </motion.div>
          <motion.h1 {...rise(0.08)} className="headline text-[clamp(60px,9vw,150px)] mt-8">
            Your attention<br />span has been<br />reported <span className="text-signal">missing.</span>
          </motion.h1>
          <motion.div {...rise(0.2)} className="mt-10 grid sm:grid-cols-[1fr_auto] gap-8 items-end border-t hair pt-6">
            <p className="text-light/80 text-[16px] leading-relaxed max-w-[46ch]">
              Attention Span Police is a free focus extension run like an intelligence operation. Set an objective and a clock.
              Visit a site you marked as a distraction, and you will be brought in for questioning.
            </p>
            <button className="btn btn-primary min-w-[240px]" onClick={start}>{store.onboarded ? 'Open a new operation' : 'Report for duty'} <span className="arrow">→</span></button>
          </motion.div>
        </div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.25 }}>
          <Frame src="surveillance.webp" className="h-[46vh] lg:h-[72vh]" imgClass="object-[50%_40%]"
            caption={<><span>Fig. 01 — Field office surveillance wall</span><span className="text-signal">Feed 10 flagged</span></>} />
        </motion.div>
      </section>

      <section className="px-4 md:px-8 py-16 max-w-[1500px] grid lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] gap-10 border-t hair">
        <div>
          <div className="code">Section 2 · Rules of engagement</div>
          <h2 className="headline text-[clamp(44px,5vw,80px)] mt-4">Standard<br />procedure</h2>
        </div>
        <ol>
          {RULES.map(([h, p], i) => (
            <li key={h} className="grid grid-cols-[52px_minmax(0,1fr)] sm:grid-cols-[52px_minmax(0,280px)_minmax(0,1fr)] gap-x-6 gap-y-1 py-5 border-b hair">
              <span className="code text-signal pt-1">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="title text-[24px]">{h}</h3>
              <p className="col-start-2 sm:col-start-3 text-steel leading-relaxed text-[14px]">{p}</p>
            </li>
          ))}
          <li className="pt-6 sm:pl-[76px] text-[13px] text-steel max-w-[70ch] leading-relaxed">
            Permissions are requested for the sites you list, when you start an operation. Elapsed browser time is not proof of
            concentration — the debrief reports what the browser observed, nothing more.
          </li>
        </ol>
      </section>
    </div>
  );
}
