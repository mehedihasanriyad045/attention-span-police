// Renders a shareable 1080×1350 mission-debrief poster on a canvas. No dependencies, no network.
import { browser } from 'wxt/browser';
import { Investigation, statsOf, verdictOf, activityOf, fmtDur, fmtDate, REASONS, prettySite } from './model';

const C = { obsidian: '#0b0d10', graphite: '#171b20', steel: '#777e87', light: '#d8dadd', bone: '#e8e5de', signal: '#c52b32', hair: 'rgba(119,126,135,.3)' };
const D = '"Barlow Condensed"', M = '"IBM Plex Mono"', S = '"Inter Variable"';

function loadImg(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const words = text.split(' '), lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}
function marks(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.strokeStyle = C.bone; ctx.lineWidth = 2; const k = 18;
  for (const [px, py, dx, dy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
    ctx.beginPath(); ctx.moveTo(px - dx * 9, py - dy * 9 + dy * k); ctx.lineTo(px - dx * 9, py - dy * 9); ctx.lineTo(px - dx * 9 + dx * k, py - dy * 9); ctx.stroke();
  }
}

export async function renderPoster(c: Investigation): Promise<Blob> {
  await Promise.all([
    document.fonts.load(`700 120px ${D}`), document.fonts.load(`600 40px ${D}`),
    document.fonts.load(`400 20px ${M}`), document.fonts.load(`500 20px ${M}`), document.fonts.load(`400 28px ${S}`),
  ]);
  const W = 1080, H = 1350, P = 72;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!;
  const s = statsOf(c), v = verdictOf(c);
  const accent = v.tone === 'red' ? C.signal : C.bone;
  ctx.textBaseline = 'top';
  ctx.fillStyle = C.obsidian; ctx.fillRect(0, 0, W, H);

  // Alert strip
  ctx.fillStyle = C.signal; ctx.fillRect(0, 0, W, 44);
  ctx.fillStyle = C.bone; ctx.font = `500 16px ${M}`;
  ctx.fillText('ATTENTION SPAN POLICE  ·  MISSION DEBRIEF', P, 14);
  ctx.textAlign = 'right'; ctx.fillText(`FILE ${c.caseNumber}`, W - P, 14); ctx.textAlign = 'left';

  // Framed image
  const art = await loadImg(browser.runtime.getURL('/img/interrogation.webp' as any));
  const ix = P, iy = 100, iw = W - P * 2, ih = 380;
  const sc = Math.max(iw / art.width, ih / art.height);
  ctx.save(); ctx.beginPath(); ctx.rect(ix, iy, iw, ih); ctx.clip();
  ctx.drawImage(art, ix + (iw - art.width * sc) / 2, iy + (ih - art.height * sc) / 2 + 40, art.width * sc, art.height * sc);
  ctx.fillStyle = 'rgba(0,0,0,.12)'; for (let y = iy; y < iy + ih; y += 3) ctx.fillRect(ix, y, iw, 1);
  ctx.restore();
  marks(ctx, ix, iy, iw, ih);
  ctx.font = `400 15px ${M}`; ctx.fillStyle = C.steel;
  ctx.fillText('EXHIBIT A — INTERROGATION ROOM 2', ix, iy + ih + 16);
  ctx.textAlign = 'right'; ctx.fillText(fmtDate(c.startedAt).toUpperCase(), ix + iw, iy + ih + 16); ctx.textAlign = 'left';

  // Verdict
  let y = 560;
  ctx.fillStyle = accent; ctx.fillRect(P, y, 10, 250);
  ctx.font = `500 17px ${M}`; ctx.fillStyle = C.steel; ctx.fillText('FINAL VERDICT', P + 34, y);
  const title = v.title.toUpperCase();
  let size = 170;
  for (; size > 60; size -= 6) { ctx.font = `700 ${size}px ${D}`; if (wrap(ctx, title, W - P * 2 - 34).length <= 2) break; }
  const vl = wrap(ctx, title, W - P * 2 - 34);
  ctx.fillStyle = accent; y += 34;
  for (const l of vl) { ctx.fillText(l, P + 30, y); y += size * 0.86; }
  y += 34;
  ctx.font = `400 25px ${S}`; ctx.fillStyle = C.bone;
  for (const l of wrap(ctx, v.line, W - P * 2 - 34).slice(0, 3)) { ctx.fillText(l, P + 34, y); y += 34; }

  // Mission line
  y = Math.max(y + 26, 900);
  ctx.fillStyle = C.hair; ctx.fillRect(P, y, W - P * 2, 1); y += 18;
  ctx.font = `400 15px ${M}`; ctx.fillStyle = C.steel;
  ctx.fillText(`OPERATION · ${activityOf(c.activity).label.toUpperCase()} · ${c.status === 'completed' ? 'COMPLETED' : 'ABORTED'}`, P, y); y += 28;
  ctx.font = `600 44px ${D}`; ctx.fillStyle = C.bone;
  ctx.fillText(wrap(ctx, c.name.toUpperCase(), W - P * 2)[0], P, y);

  // Stats
  y = 1060;
  ctx.fillStyle = C.hair; ctx.fillRect(P, y, W - P * 2, 1);
  const cols = [
    [String(s.attempts).padStart(2, '0'), 'DEVIATIONS', s.attempts ? C.signal : C.bone],
    [String(s.returned).padStart(2, '0'), 'RETURNED', C.bone],
    [String(s.proceeded).padStart(2, '0'), 'PROCEEDED', s.proceeded ? C.signal : C.bone],
    [`${s.completionPct}%`, `OF ${fmtDur(c.durationMs).toUpperCase()}`, C.bone],
  ] as const;
  const cw = (W - P * 2) / 4;
  cols.forEach(([n, l, col], i) => {
    const x = P + i * cw;
    if (i) { ctx.fillStyle = C.hair; ctx.fillRect(x, y, 1, 150); }
    ctx.font = `700 100px ${D}`; ctx.fillStyle = col; ctx.fillText(n, x + (i ? 22 : 0), y + 22);
    ctx.font = `400 14px ${M}`; ctx.fillStyle = C.steel; ctx.fillText(l, x + (i ? 22 : 0), y + 128);
  });

  // Footer
  y = 1240;
  ctx.fillStyle = C.hair; ctx.fillRect(P, y, W - P * 2, 1); y += 18;
  const topReason = REASONS.filter((r) => s.reasons[r.id]).sort((a, b) => s.reasons[b.id] - s.reasons[a.id])[0];
  const topSite = Object.entries(s.domains).sort((a, b) => b[1] - a[1])[0]?.[0];
  ctx.font = `500 15px ${M}`; ctx.fillStyle = C.light;
  ctx.fillText(`PRIME SUSPECT: ${topSite ? prettySite(topSite).toUpperCase() : 'NONE'}`, P, y);
  ctx.textAlign = 'right';
  ctx.fillText((topReason ? `ALIBI: “${topReason.label.toUpperCase()}”` : 'ALIBI: NOT REQUIRED').slice(0, 52), W - P, y);
  ctx.textAlign = 'left';
  ctx.font = `400 13px ${M}`; ctx.fillStyle = C.steel;
  ctx.fillText('ENTERTAINMENT VERDICT BASED ON BROWSER ACTIVITY. NOT A MEASURE OF FOCUS.', P, H - 46);

  return new Promise((res) => cv.toBlob((b) => res(b!), 'image/png'));
}
