import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { img } from '@/lib/hooks';
import { Store, mutate } from '@/lib/model';
import { go } from './App';

const RULES = [
  ['You open a case.', 'Pick what you are doing, for how long, and which sites are suspects. Sites you need for the mission stay allowed.'],
  ['We watch the door.', 'While the case is on duty, visiting a restricted site brings you to the interrogation room instead.'],
  ['You explain yourself.', 'Choose a reason, hear what the officer thinks of it, then decide. Go back to work, or go anyway. Your call, always.'],
  ['We keep the evidence. Locally.', 'Attempts, reasons and decisions are stored in this browser only. No account, no server, no page contents, no keystrokes.'],
  ['You can walk out.', 'Pause or end any investigation whenever you like. Off duty means nothing is intercepted and nothing is recorded.'],
];

export default function Welcome({ store }: { store: Store }) {
  const start = async () => { await mutate((s) => { s.onboarded = true; }); go('/new'); };
  return (
    <div className="relative">
      <section className="relative min-h-[100svh] overflow-hidden grain">
        <img src={img('room-wide.webp')} alt="" className="absolute inset-0 w-full h-full object-cover object-[60%_50%]" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/75 to-ink/0" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/40" />
        <div className="relative px-5 md:px-10 pt-28 pb-16 max-w-[1400px]">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="meta text-amber">Department of Attention · Missing Persons Unit</motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
            className="display text-[clamp(56px,10.5vw,168px)] mt-5 max-w-[11ch]">
            Your attention span has been reported <span className="text-red">missing.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-8 max-w-[44ch] text-lg text-paper/80 leading-relaxed">
            Attention Span Police is a focus mission with a detective problem. Pick your distractions. Start the clock.
            When you wander off, you'll be brought in for questioning.
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-10 flex flex-wrap items-center gap-6">
            <button className="btn-primary" onClick={start}>{store.onboarded ? 'Open a new case' : 'Report for duty'} <ArrowRight size={18} /></button>
            <span className="meta">Free · Local-only · You stay in control</span>
          </motion.div>
        </div>
      </section>

      <section className="px-5 md:px-10 py-20 md:py-28 max-w-[1400px] grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-12 md:gap-20">
        <div>
          <div className="meta">Standard procedure</div>
          <h2 className="display text-[clamp(44px,6vw,92px)] mt-4">How the<br />department<br /><span className="text-amber">operates.</span></h2>
          <div className="relative mt-10 aspect-[4/3] max-w-[420px] overflow-hidden grain hidden md:block">
            <img src={img('evidence.webp')} alt="" className="w-full h-full object-cover" />
          </div>
        </div>
        <ol className="md:pt-24">
          {RULES.map(([h, p], i) => (
            <li key={h} className="grid grid-cols-[56px_1fr] gap-4 py-7 border-t border-smoke first:border-t-0">
              <span className="font-mono text-amber text-sm pt-1.5">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3 className="text-2xl md:text-[28px] font-semibold tracking-tight">{h}</h3>
                <p className="text-mute mt-2 max-w-[52ch] leading-relaxed">{p}</p>
              </div>
            </li>
          ))}
          <li className="pt-8 pl-[72px] text-sm text-mute max-w-[56ch] leading-relaxed">
            On permissions: the extension asks for access only to the sites you list, at the moment you start a case. Elapsed browser time is
            not proof of concentration — the report shows what the browser saw, nothing more.
          </li>
        </ol>
      </section>
    </div>
  );
}
