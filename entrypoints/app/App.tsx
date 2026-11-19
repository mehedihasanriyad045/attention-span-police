import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useStore } from '@/lib/hooks';
import Welcome from './Welcome';
import Setup from './Setup';
import Active from './Active';
import Report from './Report';
import History from './History';
import { Status } from '@/components/kit';

function useRoute() {
  const get = () => location.hash.replace(/^#/, '') || '/';
  const [r, setR] = useState(get);
  useEffect(() => {
    const f = () => { setR(get()); window.scrollTo(0, 0); };
    addEventListener('hashchange', f);
    return () => removeEventListener('hashchange', f);
  }, []);
  return r;
}
export const go = (r: string) => { location.hash = r; };

export default function App() {
  const s = useStore();
  const route = useRoute();
  let path = route;
  if (s) {
    if (path === '/') path = s.active ? '/active' : s.onboarded ? '/new' : '/welcome';
    if (path === '/new' && s.active) path = '/active';
    if (path === '/active' && !s.active) {
      const last = s.cases[0];
      path = last?.endedAt && Date.now() - last.endedAt < 120_000 ? `/report/${last.id}` : '/new';
    }
  }
  const [, seg, arg] = path.split('/');

  useEffect(() => {
    document.title = ({ welcome: 'Attention Span Police', new: 'Mission briefing — ASP', active: 'Operation live — ASP', report: 'Debrief — ASP', history: 'Case archive — ASP' } as Record<string, string>)[seg] ?? 'Attention Span Police';
  }, [seg]);
  if (!s) return null;

  let page;
  if (seg === 'welcome') page = <Welcome store={s} />;
  else if (seg === 'active') page = <Active store={s} />;
  else if (seg === 'report') page = <Report store={s} id={arg} />;
  else if (seg === 'history') page = <History store={s} />;
  else page = <Setup store={s} />;

  return (
    <div className="min-h-screen bg-obsidian">
      <nav className="fixed top-0 inset-x-0 z-40 h-12 flex items-center justify-between px-4 md:px-8 bg-obsidian border-b hair">
        <a href="#/" className="flex items-center gap-3">
          <span className="size-3 bg-signal" />
          <span className="title text-[20px] tracking-[.1em]">ASP</span>
          <span className="code-sm hidden md:inline">Attention Span Police · Bureau of Attention</span>
        </a>
        <div className="flex items-center gap-5 md:gap-8">
          {[
            s.active ? ['#/active', '02', 'Operation', seg === 'active'] : ['#/new', '01', 'Briefing', seg === 'new'],
            ['#/history', '03', 'Archive', seg === 'history' || seg === 'report'],
          ].map(([href, n, label, on]) => (
            <a key={href as string} href={href as string} className={`code flex gap-2 transition-colors ${on ? 'text-bone' : 'hover:text-light'}`}>
              <span className={on ? 'text-signal' : ''}>{n as string}</span>{label as string}
            </a>
          ))}
          <span className="hidden sm:block w-px h-4 bg-steel/30" />
          <span className="hidden sm:flex"><Status live={!!s.active} paused={s.active?.status === 'paused'} /></span>
        </div>
      </nav>
      <AnimatePresence mode="wait">
        <motion.main key={seg + (arg ?? '')} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          {page}
        </motion.main>
      </AnimatePresence>
    </div>
  );
}
