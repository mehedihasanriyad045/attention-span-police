import type { ReactNode } from 'react';
import { img } from '@/lib/hooks';

export const Marks = () => (<><i className="mk tl" /><i className="mk tr" /><i className="mk bl" /><i className="mk br" /></>);

/** Framed artwork with registration marks and a figure caption. */
export function Frame({ src, caption, className = '', imgClass = '', children }: { src: string; caption?: ReactNode; className?: string; imgClass?: string; children?: ReactNode }) {
  return (
    <figure className={className}>
      <div className="marks h-full">
        <Marks />
        <div className="relative h-full overflow-hidden grain">
          <img src={img(src)} alt="" className={`w-full h-full object-cover ${imgClass}`} />
          {children}
        </div>
      </div>
      {caption && <figcaption className="code-sm mt-3 flex justify-between gap-4">{caption}</figcaption>}
    </figure>
  );
}

/** Numbered section with a fixed index column. */
export function Section({ n, label, children, className = '' }: { n: string; label: string; children: ReactNode; className?: string }) {
  return (
    <section className={`grid grid-cols-[52px_1fr] md:grid-cols-[88px_1fr] border-t hair pt-6 ${className}`}>
      <div className="code text-bone">{n}</div>
      <div>
        <div className="code mb-4">{label}</div>
        {children}
      </div>
    </section>
  );
}

export function Row({ k, v, accent = false }: { k: ReactNode; v: ReactNode; accent?: boolean }) {
  return (
    <div className="flex justify-between gap-6 py-2 border-b hair">
      <span className="code">{k}</span>
      <span className={`font-mono text-[12px] text-right ${accent ? 'text-signal' : 'text-light'}`}>{v}</span>
    </div>
  );
}

export const Status = ({ live, paused }: { live: boolean; paused?: boolean }) => (
  <span className={`code flex items-center gap-2 ${live && !paused ? 'text-signal' : ''}`}>
    <span className={`size-1.5 ${live ? (paused ? 'bg-steel' : 'bg-signal blink') : 'bg-steel/50'}`} />
    {live ? (paused ? 'Operation suspended' : 'Operation live') : 'Standby · off duty'}
  </span>
);
