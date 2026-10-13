/* ============================================================
   blocks.js — block library + procedural 16x16 textures
   Everything is drawn at runtime, so there are zero asset files.
   ============================================================ */
import * as THREE from 'three';

export const TEX = 16;

/* deterministic pseudo-random so textures never change between runs */
function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
function newCanvas(size = TEX) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return { c, ctx };
}
const px = (ctx, x, y, w = 1, h = 1, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };

/* paint a noise field of coloured pixels over the whole tile */
function noise(ctx, rnd, palette, alpha = 1, step = 1) {
  ctx.globalAlpha = alpha;
  for (let y = 0; y < TEX; y += step) {
    for (let x = 0; x < TEX; x += step) {
      ctx.fillStyle = palette[(rnd() * palette.length) | 0];
      ctx.fillRect(x, y, step, step);
    }
  }
  ctx.globalAlpha = 1;
}
function speckle(ctx, rnd, color, count, size = 1) {
  for (let i = 0; i < count; i++) {
    px(ctx, (rnd() * TEX) | 0, (rnd() * TEX) | 0, size, size, color);
  }
}

/* ---------- individual tile painters ---------- */
const paint = {
  grassTop: (ctx, r) => { ctx.fillStyle = '#5d9c3c'; ctx.fillRect(0, 0, 16, 16); noise(ctx, r, ['#6cb045', '#548f36', '#63a33f', '#71b84a']); },
  grassSide: (ctx, r) => {
    ctx.fillStyle = '#8a6440'; ctx.fillRect(0, 0, 16, 16);
    noise(ctx, r, ['#7d5a39', '#95704a', '#84603d']);
    ctx.fillStyle = '#5d9c3c'; ctx.fillRect(0, 0, 16, 4);
    noise(ctx, r, ['#6cb045', '#548f36'], 1);
    ctx.fillRect(0, 0, 16, 4);
    for (let x = 0; x < 16; x++) { const h = 3 + ((r() * 3) | 0); px(ctx, x, 4, 1, h - 3, r() > .5 ? '#5d9c3c' : '#63a33f'); }
  },
  dirt: (ctx, r) => { ctx.fillStyle = '#8a6440'; ctx.fillRect(0, 0, 16, 16); noise(ctx, r, ['#7d5a39', '#95704a', '#84603d', '#6f4f31']); speckle(ctx, r, '#5f4329', 14); },
  stone: (ctx, r) => { ctx.fillStyle = '#8d8d8d'; ctx.fillRect(0, 0, 16, 16); noise(ctx, r, ['#828282', '#989898', '#8a8a8a', '#767676']); speckle(ctx, r, '#6d6d6d', 10); },
  cobble: (ctx, r) => {
    ctx.fillStyle = '#767676'; ctx.fillRect(0, 0, 16, 16);
    for (let i = 0; i < 22; i++) {
      const w = 3 + ((r() * 3) | 0), h = 3 + ((r() * 2) | 0);
      px(ctx, (r() * (16 - w)) | 0, (r() * (16 - h)) | 0, w, h, ['#9c9c9c', '#8b8b8b', '#a8a8a8', '#7d7d7d'][(r() * 4) | 0]);
    }
    speckle(ctx, r, '#5f5f5f', 12);
  },
  sand: (ctx, r) => { ctx.fillStyle = '#dfd6a5'; ctx.fillRect(0, 0, 16, 16); noise(ctx, r, ['#e8dfae', '#d5cb9a', '#eee5b7']); speckle(ctx, r, '#c8bd8b', 10); },
  sandstone: (ctx, r) => { ctx.fillStyle = '#dcd3a0'; ctx.fillRect(0, 0, 16, 16); noise(ctx, r, ['#e5dca9', '#d2c996']); ctx.fillStyle = 'rgba(160,148,102,.55)'; ctx.fillRect(0, 4, 16, 1); ctx.fillRect(0, 11, 16, 1); },
  planks: (ctx, r) => {
    ctx.fillStyle = '#b58b4e'; ctx.fillRect(0, 0, 16, 16);
    noise(ctx, r, ['#ab8248', '#c19657', '#a87f47']);
    ctx.fillStyle = 'rgba(90,60,25,.75)';
    for (const y of [3, 7, 11, 15]) ctx.fillRect(0, y, 16, 1);
    ctx.fillStyle = 'rgba(90,60,25,.5)'; ctx.fillRect(5, 0, 1, 3); ctx.fillRect(11, 4, 1, 3); ctx.fillRect(3, 8, 1, 3); ctx.fillRect(9, 12, 1, 3);
  },
  logSide: (ctx, r) => {
    ctx.fillStyle = '#6b5330'; ctx.fillRect(0, 0, 16, 16);
    for (let x = 0; x < 16; x++) { ctx.fillStyle = ['#5d4828', '#78603a', '#6b5330', '#55411f'][(r() * 4) | 0]; ctx.fillRect(x, 0, 1, 16); }
    speckle(ctx, r, '#4a381b', 8);
  },
  logTop: (ctx, r) => {
    ctx.fillStyle = '#b79154'; ctx.fillRect(0, 0, 16, 16);
    noise(ctx, r, ['#ac8750', '#c19a5c']);
    ctx.strokeStyle = '#8a6a38'; ctx.lineWidth = 1;
    for (const rad of [2.5, 4.5, 6.5]) { ctx.beginPath(); ctx.arc(8, 8, rad, 0, Math.PI * 2); ctx.stroke(); }
  },
  leaves: (ctx, r) => {
    ctx.fillStyle = '#2f6b2a'; ctx.fillRect(0, 0, 16, 16);
    noise(ctx, r, ['#3c8034', '#27591f', '#458f38', '#336f2b']); speckle(ctx, r, '#1d4517', 26);
  },
  planksDark: null,
  glass: (ctx, r) => {
    ctx.clearRect(0, 0, 16, 16);
    ctx.fillStyle = 'rgba(190,230,240,.30)'; ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = 'rgba(225,245,252,.85)'; ctx.fillRect(0, 0, 16, 1); ctx.fillRect(0, 15, 16, 1); ctx.fillRect(0, 0, 1, 16); ctx.fillRect(15, 0, 1, 16);
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(2, 2, 5, 1); ctx.fillRect(2, 3, 1, 4);
  },
  brick: (ctx, r) => {
    ctx.fillStyle = '#a3a3a3'; ctx.fillRect(0, 0, 16, 16);
    const bh = 4, bw = 8;
    for (let row = 0; row < 4; row++) {
      const off = (row % 2) * 4;
      for (let i = -1; i < 3; i++) {
        const x = i * bw + off, y = row * bh;
        ctx.fillStyle = ['#9b4a36', '#a85340', '#8f4230', '#b05a45'][(r() * 4) | 0];
        ctx.fillRect(x, y, bw - 1, bh - 1);
      }
    }
    noise(ctx, r, ['rgba(0,0,0,.10)', 'rgba(255,255,255,.06)'], .6);
  },
  water: (ctx, r) => {
    ctx.clearRect(0, 0, 16, 16);
    ctx.fillStyle = 'rgba(48,110,220,.72)'; ctx.fillRect(0, 0, 16, 16);
    for (let i = 0; i < 26; i++) px(ctx, (r() * 16) | 0, (r() * 16) | 0, 2, 1, 'rgba(110,175,255,.5)');
  },
  tnt: (ctx, r) => {
    ctx.fillStyle = '#c0392b'; ctx.fillRect(0, 0, 16, 16); noise(ctx, r, ['#b3352a', '#cc4232']);
    ctx.fillStyle = '#f2f2f2'; ctx.fillRect(0, 5, 16, 6);
    ctx.fillStyle = '#8b1f14';
    ctx.font = 'bold 6px monospace'; ctx.textBaseline = 'top';
    ctx.fillText('TNT', 1.5, 5.5);
    ctx.fillStyle = '#4a4a4a'; ctx.fillRect(0, 0, 16, 3); ctx.fillRect(0, 13, 16, 3);
  },
  diamond: (ctx, r) => {
    ctx.fillStyle = '#7c8b8f'; ctx.fillRect(0, 0, 16, 16); noise(ctx, r, ['#71808a', '#87969a']);
    for (let i = 0; i < 5; i++) { const x = (r() * 12) | 0, y = (r() * 12) | 0; px(ctx, x + 2, y + 2, 2, 2, '#5ff0e0'); px(ctx, x + 2, y + 2, 1, 1, '#c9fffb'); }
  },
  gold: (ctx, r) => {
    ctx.fillStyle = '#8f8f8f'; ctx.fillRect(0, 0, 16, 16); noise(ctx, r, ['#848484', '#9a9a9a']);
    for (let i = 0; i < 5; i++) { const x = (r() * 12) | 0, y = (r() * 12) | 0; px(ctx, x + 2, y + 2, 2, 2, '#f5cd3a'); px(ctx, x + 2, y + 2, 1, 1, '#fff4b8'); }
  },
  obsidian: (ctx, r) => { ctx.fillStyle = '#1a1026'; ctx.fillRect(0, 0, 16, 16); noise(ctx, r, ['#150c1f', '#241634', '#1d1129']); speckle(ctx, r, '#4b2a6b', 12); },
  snow: (ctx, r) => { ctx.fillStyle = '#f4fbff'; ctx.fillRect(0, 0, 16, 16); noise(ctx, r, ['#eaf6ff', '#ffffff', '#e2eff9']); },
  bedrock: (ctx, r) => { ctx.fillStyle = '#5a5a5a'; ctx.fillRect(0, 0, 16, 16); noise(ctx, r, ['#4a4a4a', '#6b6b6b', '#3d3d3d', '#7a7a7a'], 1, 2); speckle(ctx, r, '#2f2f2f', 16, 2); },
  nether: (ctx, r) => { ctx.fillStyle = '#6d2b2b'; ctx.fillRect(0, 0, 16, 16); noise(ctx, r, ['#7a3030', '#5f2424', '#8a3a3a']); speckle(ctx, r, '#481818', 18, 2); },
  wool: (color, shade) => (ctx, r) => { ctx.fillStyle = color; ctx.fillRect(0, 0, 16, 16); noise(ctx, r, [color, shade, color]); speckle(ctx, r, shade, 16); },
  pumpkin: (ctx, r) => {
    ctx.fillStyle = '#d68019'; ctx.fillRect(0, 0, 16, 16); noise(ctx, r, ['#c97616', '#e08a20']);
    ctx.fillStyle = 'rgba(120,60,10,.45)'; for (const x of [3, 7, 11]) ctx.fillRect(x, 0, 1, 16);
  },
  melon: (ctx, r) => { ctx.fillStyle = '#5c9132'; ctx.fillRect(0, 0, 16, 16); noise(ctx, r, ['#52842c', '#68a038']); ctx.fillStyle = '#3f6a21'; for (const x of [2, 6, 10, 14]) ctx.fillRect(x, 0, 1, 16); },
  hay: (ctx, r) => { ctx.fillStyle = '#c9a227'; ctx.fillRect(0, 0, 16, 16); noise(ctx, r, ['#bd9923', '#d6b02e']); ctx.fillStyle = 'rgba(120,90,10,.55)'; ctx.fillRect(0, 3, 16, 1); ctx.fillRect(0, 9, 16, 1); },
  chest: (ctx, r) => {
    ctx.fillStyle = '#8b5a2b'; ctx.fillRect(0, 0, 16, 16); noise(ctx, r, ['#7f5226', '#96632f']);
    ctx.fillStyle = '#4a2f14'; ctx.fillRect(0, 6, 16, 1); ctx.fillRect(0, 0, 16, 1); ctx.fillRect(0, 15, 16, 1);
    ctx.fillStyle = '#c9a227'; ctx.fillRect(6, 5, 4, 4);
  },
  glow: (ctx, r) => { ctx.fillStyle = '#8fd7f0'; ctx.fillRect(0, 0, 16, 16); noise(ctx, r, ['#7fc9e6', '#a8e6ff']); speckle(ctx, r, '#d9f6ff', 18); },
  cactus: (ctx, r) => {
    ctx.fillStyle = '#3f7f31'; ctx.fillRect(0, 0, 16, 16);
    noise(ctx, r, ['#3a7529', '#478a37', '#356d26']);
    ctx.fillStyle = '#2c5a1e';
    ctx.fillRect(0, 0, 1, 16); ctx.fillRect(15, 0, 1, 16);
    ctx.fillStyle = '#d8e6c0';
    for (let i = 0; i < 8; i++) px(ctx, 2 + ((r() * 12) | 0), (r() * 16) | 0, 1, 1, '#d8e6c0');
  },
  lava: (ctx, r) => {
    ctx.fillStyle = '#d9501a'; ctx.fillRect(0, 0, 16, 16);
    noise(ctx, r, ['#f07a1a', '#c8420f', '#ffa62b', '#b8330a']);
    speckle(ctx, r, '#ffe08a', 14, 2);
  },
};

/* ---------- block definitions ---------- */
/* tex: { top, side, bottom } ; every value is a painter id              */
export const BLOCKS = [
  { id: 'grass', ar: 'عشب', en: 'Grass', tex: { top: 'grassTop', side: 'grassSide', bottom: 'dirt' } },
  { id: 'dirt', ar: 'تراب', en: 'Dirt', tex: { top: 'dirt', side: 'dirt', bottom: 'dirt' } },
  { id: 'stone', ar: 'حجر', en: 'Stone', tex: { top: 'stone', side: 'stone', bottom: 'stone' } },
  { id: 'cobble', ar: 'حجر مرصوف', en: 'Cobblestone', tex: { top: 'cobble', side: 'cobble', bottom: 'cobble' } },
  { id: 'sand', ar: 'رمل', en: 'Sand', tex: { top: 'sand', side: 'sand', bottom: 'sand' } },
  { id: 'sandstone', ar: 'حجر رملي', en: 'Sandstone', tex: { top: 'sandstone', side: 'sandstone', bottom: 'sandstone' } },
  { id: 'planks', ar: 'خشب', en: 'Planks', tex: { top: 'planks', side: 'planks', bottom: 'planks' } },
  { id: 'log', ar: 'جذع', en: 'Log', tex: { top: 'logTop', side: 'logSide', bottom: 'logTop' } },
  { id: 'leaves', ar: 'أوراق', en: 'Leaves', tex: { top: 'leaves', side: 'leaves', bottom: 'leaves' } },
  { id: 'brick', ar: 'طوب', en: 'Bricks', tex: { top: 'brick', side: 'brick', bottom: 'brick' } },
  { id: 'glass', ar: 'زجاج', en: 'Glass', tex: { top: 'glass', side: 'glass', bottom: 'glass' }, transparent: true },
  { id: 'water', ar: 'ماء', en: 'Water', tex: { top: 'water', side: 'water', bottom: 'water' }, transparent: true, opacity: .82 },
  { id: 'tnt', ar: 'تي إن تي', en: 'TNT', tex: { top: 'tnt', side: 'tnt', bottom: 'tnt' } },
  { id: 'diamond', ar: 'ألماس', en: 'Diamond ore', tex: { top: 'diamond', side: 'diamond', bottom: 'diamond' } },
  { id: 'gold', ar: 'ذهب', en: 'Gold ore', tex: { top: 'gold', side: 'gold', bottom: 'gold' } },
  { id: 'obsidian', ar: 'أوبسيديان', en: 'Obsidian', tex: { top: 'obsidian', side: 'obsidian', bottom: 'obsidian' } },
  { id: 'snow', ar: 'ثلج', en: 'Snow', tex: { top: 'snow', side: 'snow', bottom: 'snow' } },
  { id: 'bedrock', ar: 'صخر الأساس', en: 'Bedrock', tex: { top: 'bedrock', side: 'bedrock', bottom: 'bedrock' } },
  { id: 'nether', ar: 'نذرك', en: 'Netherrack', tex: { top: 'nether', side: 'nether', bottom: 'nether' } },
  { id: 'pumpkin', ar: 'قرع', en: 'Pumpkin', tex: { top: 'pumpkin', side: 'pumpkin', bottom: 'pumpkin' } },
  { id: 'melon', ar: 'بطيخ', en: 'Melon', tex: { top: 'melon', side: 'melon', bottom: 'melon' } },
  { id: 'hay', ar: 'قش', en: 'Hay bale', tex: { top: 'hay', side: 'hay', bottom: 'hay' } },
  { id: 'chest', ar: 'صندوق', en: 'Chest', tex: { top: 'chest', side: 'chest', bottom: 'chest' } },
  { id: 'glow', ar: 'حجر مضيء', en: 'Glowstone', tex: { top: 'glow', side: 'glow', bottom: 'glow' }, emissive: true },
  { id: 'cactus', ar: 'صبّار', en: 'Cactus', tex: { top: 'cactus', side: 'cactus', bottom: 'cactus' } },
  { id: 'lava', ar: 'حمم', en: 'Lava', tex: { top: 'lava', side: 'lava', bottom: 'lava' }, emissive: true, transparent: true, opacity: 0.95 },
  { id: 'woolW', ar: 'صوف أبيض', en: 'White wool', tex: { top: 'woolW', side: 'woolW', bottom: 'woolW' } },
  { id: 'woolR', ar: 'صوف أحمر', en: 'Red wool', tex: { top: 'woolR', side: 'woolR', bottom: 'woolR' } },
];
BLOCKS.push({ id: 'woolB', ar: 'صوف أزرق', en: 'Blue wool', tex: { top: 'woolB', side: 'woolB', bottom: 'woolB' } });

/* register the generated tile painters for the wool entries */
paint.woolW = paint.wool('#e9eef2', '#d3dae0');
paint.woolR = paint.wool('#b6362c', '#9c2b23');
paint.woolB = paint.wool('#3457a8', '#2a4789');

export const BLOCK_BY_ID = Object.fromEntries(BLOCKS.map((b) => [b.id, b]));

/* ---------- texture cache ---------- */
const tileCache = new Map();
export function blockTile(id, face) {
  const key = `${id}:${face}`;
  if (tileCache.has(key)) return tileCache.get(key);
  const def = BLOCK_BY_ID[id] || BLOCK_BY_ID.stone;
  const painterId = def.tex[face] || def.tex.side;
  const fn = paint[painterId] || paint.stone;
  const { c, ctx } = newCanvas();
  fn(ctx, rng(id.length * 7919 + face.length * 104729 + 13));
  c.__painterId = painterId;
  tileCache.set(key, c);
  return c;
}

/* ---------- three materials ---------- */
const matCache = new Map();
function tileTexture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestMipmapNearestFilter;
  t.generateMipmaps = true;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
/** returns material array in BoxGeometry order: +x, -x, +y, -y, +z, -z */
export function blockMaterials(id) {
  if (matCache.has(id)) return matCache.get(id);
  const def = BLOCK_BY_ID[id] || BLOCK_BY_ID.stone;
  const side = tileTexture(blockTile(id, 'side'));
  const top = tileTexture(blockTile(id, 'top'));
  const bottom = tileTexture(blockTile(id, 'bottom'));
  const mk = (map) => new THREE.MeshLambertMaterial({
    map,
    transparent: !!def.transparent,
    opacity: def.opacity ?? 1,
    alphaTest: def.transparent && id === 'glass' ? 0.02 : 0,
    emissive: def.emissive ? new THREE.Color(0xbfe9ff) : new THREE.Color(0x000000),
    emissiveIntensity: def.emissive ? 0.55 : 0,
    side: THREE.FrontSide,
  });
  const mats = [mk(side), mk(side), mk(top), mk(bottom), mk(side), mk(side)];
  matCache.set(id, mats);
  return mats;
}

/** small isometric preview drawn on a canvas — used for the palette buttons */
export function blockIconCanvas(id, size = 64) {
  const { c, ctx } = newCanvas(size);
  const s = size * 0.52, h = size * 0.42;
  const cx = size / 2, y0 = size * 0.10;
  const drawFace = (tile, ax, ay, bx, by, ox, oy, shade) => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + ax, oy + ay);
    ctx.lineTo(ox + ax + bx, oy + ay + by);
    ctx.lineTo(ox + bx, oy + by);
    ctx.closePath();
    ctx.clip();
    ctx.setTransform(ax / TEX, ay / TEX, bx / TEX, by / TEX, ox, oy);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tile, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = shade;
    ctx.fill();
    ctx.restore();
  };
  // top face
  drawFace(blockTile(id, 'top'), s, s * 0.5, -s, s * 0.5, cx, y0, 'rgba(255,255,255,.16)');
  // right face
  drawFace(blockTile(id, 'side'), s, s * 0.5, 0, h, cx, y0 + s * 0.5, 'rgba(0,0,0,.22)');
  // left face
  drawFace(blockTile(id, 'side'), s, -s * 0.5, 0, h, cx - s, y0 + s * 0.5, 'rgba(0,0,0,.42)');
  return c;
}
