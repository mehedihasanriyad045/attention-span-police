// Renders a shareable 1080×1350 case poster on a canvas. No dependencies, no network.
import { browser } from 'wxt/browser';
import { Investigation, statsOf, verdictOf, activityOf, fmtDur, fmtDate, REASONS, prettySite } from './model';

const C = { ink: '#0a0606', red: '#c0261a', amber: '#f2b53c', paper: '#efe6d8', mute: '#8f8682', smoke: '#2a2120' };

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
function fitFont(ctx: CanvasRenderingContext2D, lines: string[], family: string, maxW: number, start: number) {
  let size = start;
  for (; size > 40; size -= 4) {
    ctx.font = `${size}px ${family}`;
    if (lines.every((l) => ctx.measureText(l).width <= maxW)) break;
  }
  return size;
}

export async function renderPoster(c: Investigation): Promise<Blob> {
  await Promise.all([
    document.fonts.load('100px Anton'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('20px "JetBrains Mono"'),
    document.fonts.load('400 30px "Archivo Variable"'), document.fonts.load('italic 400 30px "Archivo Variable"'),
  ]);
  const W = 1080, H = 1350, P = 72;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!;
  const s = statsOf(c), v = verdictOf(c);
  const accent = v.tone === 'amber' ? C.amber : C.red;

  ctx.fillStyle = C.ink; ctx.fillRect(0, 0, W, H);
  // Image band
  const room = await loadImg(browser.runtime.getURL('/img/room-wide.webp' as any));
  const bandH = 560, scale = Math.max(W / room.width, bandH / room.height);
  const iw = room.width * scale, ih = room.height * scale;
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, bandH); ctx.clip();
  ctx.globalAlpha = 0.85;
  ctx.drawImage(room, (W - iw) / 2, (bandH - ih) / 2 + 40, iw, ih);
  ctx.globalAlpha = 1; ctx.restore();
  let g = ctx.createLinearGradient(0, 0, 0, bandH);
  g.addColorStop(0, 'rgba(10,6,6,.75)'); g.addColorStop(0.45, 'rgba(10,6,6,.15)'); g.addColorStop(1, C.ink);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, bandH);

  // Header
  ctx.fillStyle = C.paper; ctx.font = '44px Anton'; ctx.textBaseline = 'top';
  ctx.fillText('ATTENTION SPAN POLICE', P, P - 8);
  ctx.font = '20px "JetBrains Mono"'; ctx.fillStyle = C.mute;
  ctx.fillText(`CASE ${c.caseNumber}`, P, P + 48);
  ctx.textAlign = 'right';
  ctx.fillText(fmtDate(c.startedAt).toUpperCase(), W - P, P + 48);
  ctx.fillStyle = accent; ctx.font = '700 20px "JetBrains Mono"';
  ctx.fillText(c.status === 'completed' ? 'CASE CLOSED · COMPLETED' : 'CASE CLOSED · ENDED EARLY', W - P, P);
  ctx.textAlign = 'left';

  // Verdict
  ctx.font = '700 20px "JetBrains Mono"'; ctx.fillStyle = C.paper;
  ctx.fillText('FINAL VERDICT', P, 470);
  const words = v.title.toUpperCase().split(' ');
  const vLines = words.length > 2 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : words.length === 2 ? words : [v.title.toUpperCase()];
  const vs = fitFont(ctx, vLines, 'Anton', W - P * 2, 190);
  ctx.font = `${vs}px Anton`; ctx.fillStyle = accent;
  let y = 505;
  for (const l of vLines) { ctx.fillText(l, P - 4, y); y += vs * 0.92; }

  // Verdict line
  y += 18;
  ctx.font = 'italic 400 30px "Archivo Variable"'; ctx.fillStyle = C.paper;
  for (const l of wrap(ctx, `“${v.line}”`, W - P * 2)) { ctx.fillText(l, P, y); y += 40; }

  // Mission
  y += 30;
  ctx.fillStyle = C.smoke; ctx.fillRect(P, y, W - P * 2, 1); y += 26;
  ctx.font = '18px "JetBrains Mono"'; ctx.fillStyle = C.mute;
  ctx.fillText(`MISSION · ${activityOf(c.activity).label.toUpperCase()}`, P, y); y += 32;
  ctx.font = '44px Anton'; ctx.fillStyle = C.paper;
  for (const l of wrap(ctx, c.name.toUpperCase(), W - P * 2).slice(0, 2)) { ctx.fillText(l, P, y); y += 48; }

  // Stats row
  y = Math.max(y + 24, 1010);
  const cols = [
    [String(s.attempts), 'ATTEMPTS', C.red], [String(s.returned), 'RETURNED', C.amber], [String(s.proceeded), 'WENT ANYWAY', C.paper],
    [`${s.completionPct}%`, `OF ${fmtDur(c.durationMs).toUpperCase()}`, C.paper],
  ] as const;
  const cw = (W - P * 2) / cols.length;
  cols.forEach(([n, l, col], i) => {
    ctx.font = '96px Anton'; ctx.fillStyle = col; ctx.fillText(n, P + i * cw, y);
    ctx.font = '17px "JetBrains Mono"'; ctx.fillStyle = C.mute; ctx.fillText(l, P + i * cw, y + 108);
  });

  // Footer: top reason + site
  y += 160;
  ctx.fillStyle = C.smoke; ctx.fillRect(P, y, W - P * 2, 1); y += 22;
  const topReason = REASONS.filter((r) => s.reasons[r.id]).sort((a, b) => s.reasons[b.id] - s.reasons[a.id])[0];
  const topSite = Object.entries(s.domains).sort((a, b) => b[1] - a[1])[0]?.[0];
  ctx.font = '18px "JetBrains Mono"'; ctx.fillStyle = C.mute;
  ctx.fillText(`PRIME SUSPECT: ${topSite ? prettySite(topSite).toUpperCase() : 'NONE'}`, P, y);
  ctx.textAlign = 'right';
  ctx.fillText(topReason ? `ALIBI: “${topReason.label.toUpperCase()}”`.slice(0, 48) : 'ALIBI: NOT REQUIRED', W - P, y);
  ctx.textAlign = 'left';
  ctx.font = '15px "JetBrains Mono"'; ctx.fillStyle = '#5d5553';
  ctx.fillText('ENTERTAINMENT VERDICT BASED ON BROWSER ACTIVITY. NOT A MEASURE OF FOCUS.', P, H - P + 10);

  return new Promise((res) => cv.toBlob((b) => res(b!), 'image/png'));
}
