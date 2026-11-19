// Original cinematic artwork for ASP, drawn as vector scenes and rasterised at high resolution.
// Run: node scripts/art.mjs
import sharp from 'sharp';
import fs from 'node:fs';

const OUT = 'public/img/';
fs.mkdirSync(OUT, { recursive: true });
const blur = (id, s) => `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${s}"/></filter>`;

// 1. Interrogation room: lamp, table, empty chair, subject silhouette from behind, red rim light.
const interrogation = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="1600" height="1000">
<defs>
  <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a0c0f"/><stop offset=".62" stop-color="#15191e"/><stop offset=".63" stop-color="#0d0f12"/><stop offset="1" stop-color="#07080a"/></linearGradient>
  <linearGradient id="cone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3efe6" stop-opacity=".55"/><stop offset=".7" stop-color="#e8e5de" stop-opacity=".10"/><stop offset="1" stop-color="#e8e5de" stop-opacity="0"/></linearGradient>
  <radialGradient id="pool" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#e8e5de" stop-opacity=".55"/><stop offset=".55" stop-color="#9a9a96" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  <radialGradient id="red" cx="100%" cy="45%" r="60%"><stop offset="0" stop-color="#c52b32" stop-opacity=".55"/><stop offset=".5" stop-color="#7a1418" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  <linearGradient id="table" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5b5d5f"/><stop offset=".15" stop-color="#2a2d31"/><stop offset="1" stop-color="#101215"/></linearGradient>
  <linearGradient id="rim" x1="0" y1="0" x2="1" y2="0"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#c52b32" stop-opacity=".9"/></linearGradient>
  ${blur('b4', 4)}${blur('b14', 14)}${blur('b40', 40)}${blur('b2', 1.6)}
</defs>
<rect width="1600" height="1000" fill="url(#wall)"/>
<g stroke="#20252b" stroke-width="2" opacity=".7">${Array.from({ length: 15 }, (_, i) => `<line x1="${60 + i * 110}" y1="0" x2="${60 + i * 110}" y2="620"/>`).join('')}</g>
<rect width="1600" height="1000" fill="url(#red)"/>
<polygon points="770,140 830,140 1120,760 480,760" fill="url(#cone)" filter="url(#b14)"/>
<ellipse cx="800" cy="720" rx="420" ry="110" fill="url(#pool)" filter="url(#b14)"/>
<line x1="800" y1="0" x2="800" y2="104" stroke="#1d2126" stroke-width="3"/>
<path d="M740 140 L860 140 L838 104 L762 104 Z" fill="#1a1d21"/>
<ellipse cx="800" cy="142" rx="46" ry="6" fill="#fffaf0" filter="url(#b4)"/>
<ellipse cx="800" cy="142" rx="120" ry="30" fill="#f3efe6" opacity=".25" filter="url(#b40)"/>
<!-- empty chair behind table -->
<g fill="#08090b"><rect x="930" y="520" width="10" height="150"/><rect x="1010" y="520" width="10" height="150"/><rect x="930" y="520" width="90" height="10"/><rect x="930" y="560" width="90" height="6"/></g>
<!-- table -->
<polygon points="520,640 1080,640 1170,720 430,720" fill="url(#table)"/>
<rect x="430" y="720" width="740" height="16" fill="#0c0e10"/>
<rect x="470" y="736" width="14" height="230" fill="#08090b"/><rect x="1116" y="736" width="14" height="230" fill="#08090b"/>
<!-- evidence on table -->
<polygon points="700,668 790,662 798,690 706,697" fill="#d8dadd" opacity=".85"/>
<polygon points="716,672 776,668 781,686 721,690" fill="#777e87" opacity=".6"/>
<polygon points="830,664 900,667 896,684 826,681" fill="#c52b32" opacity=".8"/>
<!-- subject silhouette, from behind -->
<g>
  <path d="M120 1000 C130 860 200 800 300 784 C330 760 340 740 340 712 C318 700 306 670 306 636 C306 584 344 548 392 548 C440 548 478 584 478 636 C478 670 466 700 444 712 C444 740 454 760 484 784 C584 800 654 860 664 1000 Z" fill="#050607"/>
  <path d="M478 636 C478 670 466 700 444 712 C444 740 454 760 484 784 C584 800 654 860 664 1000" fill="none" stroke="url(#rim)" stroke-width="5" filter="url(#b2)"/>
</g>
<rect width="1600" height="1000" fill="url(#red)" opacity=".35"/>
</svg>`;

// 2. Corridor: one-point perspective, cold light strips, red signal at the end.
const corridor = (() => {
  const vx = 1040, vy = 470;
  const strips = Array.from({ length: 9 }, (_, i) => {
    const t = Math.pow(i / 9, 1.6);
    const y = 0 + (vy - 60) * t, w = 560 * (1 - t) + 18;
    return `<rect x="${vx - w / 2}" y="${y}" width="${w}" height="${Math.max(3, 26 * (1 - t))}" fill="#e8e5de" opacity="${0.85 - t * 0.5}"/>`;
  }).join('');
  const doors = Array.from({ length: 7 }, (_, i) => {
    const t = Math.pow((i + 1) / 8, 1.5);
    const xl = 0 + (vx - 90) * t, xr = 1600 - (1600 - vx - 90) * t, h = 700 * (1 - t) + 90, y = vy + 40 - h * 0.55;
    return `<rect x="${xl}" y="${y}" width="${10 * (1 - t) + 2}" height="${h}" fill="#000" opacity=".6"/><rect x="${xr}" y="${y}" width="${10 * (1 - t) + 2}" height="${h}" fill="#000" opacity=".6"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="1600" height="1000">
<defs>
  <linearGradient id="lw" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1b2026"/><stop offset="1" stop-color="#0b0d10"/></linearGradient>
  <linearGradient id="rw" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#14181d"/><stop offset="1" stop-color="#0b0d10"/></linearGradient>
  <linearGradient id="fl" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#121519"/><stop offset="1" stop-color="#07080a"/></linearGradient>
  <radialGradient id="sig" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ff5a5f"/><stop offset=".25" stop-color="#c52b32" stop-opacity=".8"/><stop offset="1" stop-color="#c52b32" stop-opacity="0"/></radialGradient>
  ${blur('b3', 3)}${blur('b30', 30)}${blur('b80', 80)}
</defs>
<rect width="1600" height="1000" fill="#07080a"/>
<polygon points="0,0 ${vx - 60},${vy - 60} ${vx - 60},${vy + 60} 0,1000" fill="url(#lw)"/>
<polygon points="1600,0 ${vx + 60},${vy - 60} ${vx + 60},${vy + 60} 1600,1000" fill="url(#rw)"/>
<polygon points="0,1000 ${vx - 60},${vy + 60} ${vx + 60},${vy + 60} 1600,1000" fill="url(#fl)"/>
<polygon points="0,0 ${vx - 60},${vy - 60} ${vx + 60},${vy - 60} 1600,0" fill="#050608"/>
<rect x="${vx - 60}" y="${vy - 60}" width="120" height="120" fill="#0e1013"/>
<g filter="url(#b3)">${strips}</g>
<g opacity=".35" filter="url(#b30)" transform="translate(0 ${2 * vy + 120}) scale(1 -1)">${strips}</g>
${doors}
<rect x="${vx - 22}" y="${vy - 38}" width="44" height="12" fill="#ff6b70"/>
<circle cx="${vx}" cy="${vy - 32}" r="160" fill="url(#sig)" filter="url(#b30)"/>
<ellipse cx="${vx}" cy="${vy + 200}" rx="60" ry="220" fill="#c52b32" opacity=".22" filter="url(#b80)"/>
<!-- lone figure at the end of the corridor -->
<path d="M${vx - 12} ${vy + 58} l2 -46 c-6 -4 -8 -12 -6 -22 c1 -8 7 -12 12 -12 s11 4 12 12 c2 10 0 18 -6 22 l2 46 z" fill="#030304"/>
</svg>`;
})();

// 3. Briefing wall: venetian-blind light falling across a wall, doorway silhouette.
const blinds = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1500" width="1200" height="1500">
<defs>
  <linearGradient id="wl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1a1e23"/><stop offset="1" stop-color="#090a0c"/></linearGradient>
  <linearGradient id="slat" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e8e5de" stop-opacity="0"/><stop offset=".25" stop-color="#e8e5de" stop-opacity=".55"/><stop offset=".8" stop-color="#d8dadd" stop-opacity=".22"/><stop offset="1" stop-color="#d8dadd" stop-opacity="0"/></linearGradient>
  <radialGradient id="rd" cx="15%" cy="95%" r="70%"><stop offset="0" stop-color="#c52b32" stop-opacity=".45"/><stop offset="1" stop-color="#c52b32" stop-opacity="0"/></radialGradient>
  ${blur('s', 5)}${blur('d', 2)}
</defs>
<rect width="1200" height="1500" fill="url(#wl)"/>
<g transform="rotate(-14 600 700) skewX(-18)" filter="url(#s)">
  ${Array.from({ length: 13 }, (_, i) => `<rect x="80" y="${250 + i * 58}" width="1150" height="${30 - i * 0.8}" fill="url(#slat)"/>`).join('')}
</g>
<rect width="1200" height="1500" fill="url(#rd)"/>
<!-- doorway with standing figure -->
<rect x="150" y="520" width="260" height="980" fill="#050607"/>
<rect x="150" y="520" width="260" height="980" fill="none" stroke="#2a3038" stroke-width="3"/>
<g filter="url(#d)"><path d="M280 1500 L282 1120 C240 1110 222 1060 220 1000 L214 860 C214 820 236 800 262 794 C252 784 246 770 246 752 C246 726 262 708 280 708 C298 708 314 726 314 752 C314 770 308 784 298 794 C324 800 346 820 346 860 L340 1000 C338 1060 320 1110 278 1120 Z" fill="#000"/></g>
<line x1="410" y1="520" x2="410" y2="1500" stroke="#c52b32" stroke-opacity=".5" stroke-width="2"/>
</svg>`;

// 4. Surveillance wall: monitor grid, one feed flagged.
const surveillance = (() => {
  const cells = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) {
    const x = 60 + c * 250, y = 80 + r * 210, flagged = r === 1 && c === 3;
    const lum = 18 + ((r * 7 + c * 13) % 5) * 5;
    cells.push(`<rect x="${x}" y="${y}" width="230" height="190" fill="rgb(${lum},${lum + 3},${lum + 6})"/>
      <rect x="${x + 20}" y="${y + 110}" width="${60 + ((r + c) % 3) * 40}" height="${40 + (c % 2) * 20}" fill="#0b0d10" opacity=".8"/>
      <circle cx="${x + 150}" cy="${y + 80}" r="${16 + (r % 2) * 6}" fill="#0b0d10" opacity=".7"/>
      <rect x="${x}" y="${y}" width="230" height="190" fill="url(#gl)"/>
      ${flagged ? `<rect x="${x - 4}" y="${y - 4}" width="238" height="198" fill="none" stroke="#c52b32" stroke-width="4"/><rect x="${x}" y="${y}" width="230" height="190" fill="#c52b32" opacity=".22"/>` : ''}
      <rect x="${x + 12}" y="${y + 12}" width="${flagged ? 60 : 36}" height="8" fill="${flagged ? '#c52b32' : '#777e87'}" opacity=".9"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="1600" height="1000">
<defs><linearGradient id="gl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d8dadd" stop-opacity=".12"/><stop offset=".5" stop-color="#d8dadd" stop-opacity="0"/></linearGradient>
<radialGradient id="v" cx="50%" cy="45%" r="70%"><stop offset=".4" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".85"/></radialGradient></defs>
<rect width="1600" height="1000" fill="#060708"/>${cells.join('')}
<rect width="1600" height="1000" fill="url(#v)"/></svg>`;
})();

const jobs = [
  ['interrogation', interrogation, 2400],
  ['corridor', corridor, 2400],
  ['briefing', blinds, 1400],
  ['surveillance', surveillance, 2000],
];
for (const [name, svg, w] of jobs) {
  await sharp(Buffer.from(svg), { density: 144 }).resize(w).webp({ quality: 84 }).toFile(`${OUT}${name}.webp`);
}

// Extension icon: signal-red bar + monogram on obsidian.
const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
<rect width="128" height="128" fill="#0b0d10"/><rect x="12" y="12" width="104" height="104" fill="none" stroke="#e8e5de" stroke-width="5"/>
<rect x="12" y="84" width="104" height="32" fill="#c52b32"/>
<circle cx="64" cy="50" r="17" fill="none" stroke="#e8e5de" stroke-width="6"/><circle cx="64" cy="50" r="5" fill="#c52b32"/>
<line x1="64" y1="22" x2="64" y2="31" stroke="#e8e5de" stroke-width="5"/><line x1="64" y1="69" x2="64" y2="78" stroke="#e8e5de" stroke-width="5"/>
<line x1="36" y1="50" x2="45" y2="50" stroke="#e8e5de" stroke-width="5"/><line x1="83" y1="50" x2="92" y2="50" stroke="#e8e5de" stroke-width="5"/></svg>`;
for (const s of [16, 32, 48, 96, 128]) await sharp(Buffer.from(icon)).resize(s, s).png().toFile(`public/icon/${s}.png`);
console.log('art ok');
