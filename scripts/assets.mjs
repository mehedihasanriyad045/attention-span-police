import sharp from 'sharp';
const out = 'public/img/';
const room = () => sharp('room-src.png');
await room().webp({ quality: 82 }).toFile(out + 'room-wide.webp');
await room().extract({ left: 300, top: 0, width: 390, height: 557 }).webp({ quality: 82 }).toFile(out + 'room-spotlight.webp');
await room().extract({ left: 360, top: 300, width: 270, height: 190 }).resize(540).webp({ quality: 80 }).toFile(out + 'room-chair.webp');
await room().extract({ left: 0, top: 60, width: 300, height: 497 }).webp({ quality: 78 }).toFile(out + 'room-wall.webp');
await sharp('board-src.png').extract({ left: 33, top: 41, width: 316, height: 248 }).webp({ quality: 84 }).toFile(out + 'suspect.webp');
await sharp('board-src.png').extract({ left: 33, top: 389, width: 316, height: 248 }).webp({ quality: 84 }).toFile(out + 'evidence.webp');
const svg = (s) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
<defs><radialGradient id="g" cx="50%" cy="10%" r="80%"><stop offset="0" stop-color="#f6c344"/><stop offset=".35" stop-color="#b8321f"/><stop offset="1" stop-color="#140707"/></radialGradient>
<linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6c344" stop-opacity=".9"/><stop offset="1" stop-color="#f6c344" stop-opacity=".15"/></linearGradient></defs>
<rect width="128" height="128" rx="26" fill="#0d0606"/><rect width="128" height="128" rx="26" fill="url(#g)" opacity=".85"/>
<path d="M54 14 L74 14 L98 104 L30 104 Z" fill="url(#b)"/>
<ellipse cx="64" cy="14" rx="18" ry="6" fill="#fff4cf"/>
<rect x="52" y="62" width="4" height="40" fill="#120707"/><rect x="72" y="62" width="4" height="40" fill="#120707"/>
<rect x="50" y="80" width="28" height="5" fill="#120707"/><rect x="52" y="62" width="24" height="4" fill="#120707"/>
<ellipse cx="64" cy="106" rx="34" ry="6" fill="#f6c344" opacity=".55"/></svg>`);
for (const s of [16, 32, 48, 96, 128]) await sharp(svg()).resize(s, s).png().toFile(`public/icon/${s}.png`);
console.log('ok');
