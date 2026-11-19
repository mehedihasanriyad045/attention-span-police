import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { load, Store } from './model';
import type { Msg } from '@/entrypoints/background';

export function useStore(): Store | null {
  const [s, setS] = useState<Store | null>(null);
  useEffect(() => {
    let alive = true;
    const refresh = () => load().then((v) => alive && setS(v));
    refresh();
    const l = (_: unknown, area: string) => { if (area === 'local') refresh(); };
    browser.storage.onChanged.addListener(l);
    return () => { alive = false; browser.storage.onChanged.removeListener(l); };
  }, []);
  return s;
}

/** Re-render on a clock. Time itself is always derived from stored timestamps. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    const vis = () => setNow(Date.now());
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis); };
  }, [ms]);
  return now;
}

export const send = <T = unknown>(m: Msg) => browser.runtime.sendMessage(m) as Promise<T>;
export const appUrl = (route: string) => browser.runtime.getURL(`/app.html#${route}`);
export const img = (name: string) => browser.runtime.getURL(`/img/${name}` as any);
