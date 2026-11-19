import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useStore } from '@/lib/hooks';
import Welcome from './Welcome';
import Setup from './Setup';
import Active from './Active';
import Report from './Report';
import History from './History';

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
    document.title = ({ welcome: 'Attention Span Police', new: 'New investigation — ASP', active: 'On duty — ASP', report: 'Case report — ASP', history: 'Case history — ASP' } as Record<string, string>)[seg] ?? 'Attention Span Police';
  }, [seg]);
  if (!s) return null;

  let page;
  if (seg === 'welcome') page = <Welcome store={s} />;
  else if (seg === 'active') page = <Active store={s} />;
  else if (seg === 'report') page = <Report store={s} id={arg} />;
  else if (seg === 'history') page = <History store={s} />;
  else page = <Setup store={s} />;

  return (
    <div className="min-h-screen bg-ink">
      <nav className="fixed top-0 inset-x-0 z-40 flex items-center justify-between px-5 md:px-10 h-14 bg-gradient-to-b from-ink to-ink/0">
        <a href="#/" className="flex items-baseline gap-3">
          <span className="display text-[22px] text-paper">ASP</span>
          <span className="meta hidden sm:inline">Attention Span Police</span>
        </a>
        <div className="flex items-center gap-5 md:gap-7 text-sm">
          {s.active ? (
            <a href="#/active" className={`flex items-center gap-2 ${seg === 'active' ? 'text-amber' : 'text-paper hover:text-amber'}`}>
              <span className={`size-2 rounded-full bg-amber ${s.active.status === 'active' ? 'pulse' : 'opacity-50'}`} /> On duty
            </a>
          ) : (
            <a href="#/new" className={seg === 'new' ? 'text-amber' : 'text-mute hover:text-paper'}>New case</a>
          )}
          <a href="#/history" className={seg === 'history' ? 'text-amber' : 'text-mute hover:text-paper'}>History</a>
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
