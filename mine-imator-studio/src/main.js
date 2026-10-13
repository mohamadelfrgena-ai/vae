/* ============================================================
   main.js — Mine-Imator Studio
   scene + world builder + rig + timeline + export wiring
   ============================================================ */
import './style.css';

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { BLOCKS, blockMaterials, blockIconCanvas } from './blocks.js';
import {
  buildCharacter, applyPose, emptyPose, BONES, BONE_BY_KEY,
  PROP_LIMITS, propLabel,
} from './rig.js';
import { DEFAULT_SKIN, skinDataURL, buildSkinAtlas } from './skin.js';
import {
  createAnim, setKey, removeKey, clearAll, boneFrames, evaluate, keyedProps,
  MOTION_PRESETS, CAMERA_PRESETS, applyPreset, applyCameraPreset, moveKey,
} from './anim.js';
import { recordVideo, exportFrames, downloadBlob, targetSize, snapshot, pickVideoMime } from './export.js';
import { makeT, DICT } from './i18n.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ============================================================
   1. STATE
   ============================================================ */
const state = {
  lang: 'ar',
  projectName: 'مشروعي الأول',
  fps: 24,
  duration: 96,
  frame: 0,
  playing: false,
  loop: true,
  autoKey: true,
  ease: 'smooth',
  blockId: 'grass',
  mode: 'build',
  style: 'plains',
  skin: { ...DEFAULT_SKIN },
  customAtlas: null,
  pose: emptyPose(),
  anim: createAnim(),
  bone: 'armR',
  selectedKey: null,          // { bone, frame }
  camAnim: false,
  tlPx: 7,
  exporting: false,
  exportMode: 'video',
  cancelExport: false,
};
const t = makeT(() => state.lang);

/* ============================================================
   2. THREE SCENE
   ============================================================ */
const canvas = $('#c');
const viewport = $('#viewport');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8ec7ef);

const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.05, 600);
camera.position.set(6, 4.2, 8);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.09;
controls.target.set(0, 1.1, 0);
controls.minDistance = 1.2;
controls.maxDistance = 90;
controls.maxPolarAngle = Math.PI * 0.495;
controls.update();

/* lights */
const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x4a5a44, 0.75);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff3d6, 1.5);
sun.position.set(9, 14, 7);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 70;
sun.shadow.camera.left = -22;
sun.shadow.camera.right = 22;
sun.shadow.camera.top = 22;
sun.shadow.camera.bottom = -22;
sun.shadow.bias = -0.0008;
scene.add(sun);
scene.add(new THREE.AmbientLight(0xffffff, 0.25));

/* sky gradient */
function setSky(top, bottom, fogColor, fogNear = 40, fogFar = 130) {
  const c = document.createElement('canvas');
  c.width = 2; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  g.fillStyle = grad; g.fillRect(0, 0, 2, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  scene.background?.dispose?.();
  scene.background = tex;
  scene.fog = new THREE.Fog(new THREE.Color(fogColor), fogNear, fogFar);
  renderer.setClearColor(0x000000, 0);
}

const SKY = {
  plains: { top: '#7dbdec', bottom: '#d8eefb', fog: '#cfe6f5', sun: 1.5, hemi: 0.75 },
  hills: { top: '#6fb0e6', bottom: '#cfe4f4', fog: '#c6dced', sun: 1.45, hemi: 0.7 },
  desert: { top: '#8fc9e8', bottom: '#f3e2b8', fog: '#e9d9b0', sun: 1.6, hemi: 0.8 },
  snow: { top: '#a9c6e0', bottom: '#eef6fb', fog: '#e3eef7', sun: 1.35, hemi: 0.85 },
  nether: { top: '#3b1116', bottom: '#8a2b17', fog: '#5d1a12', sun: 1.25, hemi: 0.55 },
  studio: { top: '#131c2c', bottom: '#2b3a52', fog: '#1a2438', sun: 1.5, hemi: 0.6 },
  void: { top: '#05070d', bottom: '#131c2b', fog: '#0a0f18', sun: 1.3, hemi: 0.45 },
  islands: { top: '#5aa6e0', bottom: '#cfe6f8', fog: '#bcd8ef', sun: 1.5, hemi: 0.8 },
};
function applySky(style) {
  const s = SKY[style] || SKY.plains;
  setSky(s.top, s.bottom, s.fog);
  sun.intensity = s.sun;
  hemi.intensity = s.hemi;
}

/* ============================================================
   3. WORLD (blocks)
   ============================================================ */
const world = { blocks: new Map(), meshes: new Map(), cellIndex: new Map(), style: 'plains', dirty: true };
const bkey = (x, y, z) => `${x},${y},${z}`;

function setBlock(x, y, z, type, silent = false) {
  if (y < 0 || y > 48 || Math.abs(x) > 48 || Math.abs(z) > 48) return;
  world.blocks.set(bkey(x, y, z), { x, y, z, t: type });
  if (!silent) world.dirty = true;
}
function delBlock(x, y, z, silent = false) {
  const had = world.blocks.delete(bkey(x, y, z));
  if (had && !silent) world.dirty = true;
  return had;
}
function surfaceY(x, z) {
  for (let y = 48; y >= 0; y--) if (world.blocks.has(bkey(x, y, z))) return y + 1;
  return 0;
}

/* deterministic noise for terrain */
function makeNoise(seed = 1337) {
  const p = new Uint8Array(512);
  let s = seed;
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const perm = [...Array(256).keys()].sort(() => rnd() - 0.5);
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const fade = (x) => x * x * (3 - 2 * x);
  const lerp = (a, b, x) => a + (b - a) * x;
  const grad = (h, x, y) => ((h & 1) ? x : -x) + ((h & 2) ? y : -y);
  const noise2 = (x, y) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x), yf = y - Math.floor(y);
    const u = fade(xf), v = fade(yf);
    const aa = p[p[X] + Y], ab = p[p[X] + Y + 1], ba = p[p[X + 1] + Y], bb = p[p[X + 1] + Y + 1];
    const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
    const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
    return (lerp(x1, x2, v) + 1) / 2;
  };
  return { noise2, rnd };
}

function placeTree(x, y, z, rnd) {
  const h = 4 + ((rnd() * 3) | 0);
  for (let i = 0; i < h; i++) setBlock(x, y + i, z, 'log', true);
  const top = y + h;
  for (let dx = -2; dx <= 2; dx++)
    for (let dz = -2; dz <= 2; dz++)
      for (let dy = -1; dy <= 1; dy++) {
        const d = Math.abs(dx) + Math.abs(dz) + Math.abs(dy);
        if (d > 3) continue;
        if (dx === 0 && dz === 0 && dy < 1) continue;
        if (!world.blocks.has(bkey(x + dx, top + dy, z + dz))) setBlock(x + dx, top + dy, z + dz, 'leaves', true);
      }
}

function placeHut(x, y, z) {
  const w = 5, d = 5, hh = 4;
  for (let i = 0; i < w; i++)
    for (let j = 0; j < d; j++)
      for (let k = 0; k < hh; k++) {
        const edge = i === 0 || j === 0 || i === w - 1 || j === d - 1;
        if (k === 0) setBlock(x + i, y + k, z + j, 'planks', true);
        else if (edge) {
          const isDoor = j === 0 && i === 2 && k <= 2;
          if (isDoor) continue;
          const isWin = k === 2 && ((i === 0 || i === w - 1) && (j === 2)) || (k === 2 && (j === 0 || j === d - 1) && i === 2 && !isDoor);
          setBlock(x + i, y + k, z + j, isWin ? 'glass' : 'planks', true);
        } else if (k === hh - 1) setBlock(x + i, y + k, z + j, 'planks', true);
      }
  for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) setBlock(x + i, y + hh, z + j, 'brick', true);
  setBlock(x + 1, y + 1, z + 1, 'chest', true);
  setBlock(x + w - 2, y + 3, z + d - 2, 'glow', true);
  setBlock(x + 2, y + hh + 1, z + 2, 'hay', true);
}

function clearWorld() { world.blocks.clear(); world.dirty = true; }

const WORLD_BUILDERS = {
  plains() {
    const { noise2, rnd } = makeNoise(11);
    const R = 15;
    for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) {
      const n = noise2(x * 0.09, z * 0.09);
      const h = Math.max(0, Math.round(n * 2.2 - 0.6));
      for (let y = 0; y <= h; y++) {
        const top = y === h;
        setBlock(x, y, z, top ? 'grass' : (y > h - 3 ? 'dirt' : 'stone'), true);
      }
    }
    for (let i = 0; i < 7; i++) {
      const x = ((rnd() * 26) | 0) - 13, z = ((rnd() * 26) | 0) - 13;
      if (Math.hypot(x, z) < 4) continue;
      placeTree(x, surfaceY(x, z), z, rnd);
    }
  },
  hills() {
    const { noise2, rnd } = makeNoise(77);
    const R = 16;
    for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) {
      const n = noise2(x * 0.07, z * 0.07) * 0.7 + noise2(x * 0.19, z * 0.19) * 0.3;
      const h = Math.max(0, Math.round(n * 9 - 1.5));
      for (let y = 0; y <= h; y++) setBlock(x, y, z, y === h ? 'grass' : (y > h - 3 ? 'dirt' : 'stone'), true);
    }
    for (let i = 0; i < 9; i++) {
      const x = ((rnd() * 28) | 0) - 14, z = ((rnd() * 28) | 0) - 14;
      placeTree(x, surfaceY(x, z), z, rnd);
    }
  },
  desert() {
    const { noise2, rnd } = makeNoise(23);
    const R = 15;
    for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) {
      const n = noise2(x * 0.1, z * 0.1);
      const h = Math.max(0, Math.round(n * 3.4 - 1.1));
      for (let y = 0; y <= h; y++) setBlock(x, y, z, y === h ? 'sand' : 'sandstone', true);
    }
    for (let i = 0; i < 12; i++) {
      const x = ((rnd() * 26) | 0) - 13, z = ((rnd() * 26) | 0) - 13;
      const y = surfaceY(x, z);
      for (let k = 0; k < 2 + ((rnd() * 3) | 0); k++) setBlock(x, y + k, z, 'cactus', true);
    }
  },
  snow() {
    const { noise2, rnd } = makeNoise(5);
    const R = 15;
    for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) {
      const n = noise2(x * 0.08, z * 0.08);
      const h = Math.max(0, Math.round(n * 5 - 0.8));
      for (let y = 0; y <= h; y++) {
        const top = y === h;
        if (top && h > 0 && noise2(x * 0.3, z * 0.3) > 0.72) setBlock(x, y, z, 'glass', true);
        else setBlock(x, y, z, top ? 'snow' : (y > h - 3 ? 'dirt' : 'stone'), true);
      }
    }
    for (let i = 0; i < 8; i++) {
      const x = ((rnd() * 26) | 0) - 13, z = ((rnd() * 26) | 0) - 13;
      const y = surfaceY(x, z);
      const h = 4;
      for (let k = 0; k < h; k++) setBlock(x, y + k, z, 'log', true);
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++)
        for (let dy = 0; dy <= 1; dy++) if (Math.abs(dx) + Math.abs(dz) < 2 || dy === 0) setBlock(x + dx, y + h + dy, z + dz, 'leaves', true);
    }
  },
  nether() {
    const { noise2, rnd } = makeNoise(66);
    const R = 14;
    for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) {
      const n = noise2(x * 0.11, z * 0.11);
      const h = Math.max(0, Math.round(n * 3.5 - 1));
      for (let y = 0; y <= h; y++) setBlock(x, y, z, y === h ? 'nether' : 'bedrock', true);
    }
    for (let i = 0; i < 10; i++) {
      const x = ((rnd() * 24) | 0) - 12, z = ((rnd() * 24) | 0) - 12;
      const y = surfaceY(x, z);
      setBlock(x, y - 1, z, 'lava', true);
      for (let k = 0; k < 3 + ((rnd() * 3) | 0); k++) setBlock(x, y + k, z, rnd() > 0.6 ? 'glow' : 'nether', true);
    }
  },
  studio() {
    const R = 9;
    for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) {
      const light = (x + z) % 2 === 0;
      setBlock(x, 0, z, light ? 'woolW' : 'woolB', true);
    }
    for (let x = -R; x <= R; x++) for (let y = 1; y <= 5; y++) setBlock(x, y, -R, 'planks', true);
    for (let i = -2; i <= 2; i++) for (let y = 6; y <= 6; y++) setBlock(i, y, -R, 'glow', true);
  },
  void() {
    for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) {
      setBlock(x, 0, z, 'stone', true);
      setBlock(x, -1, z, 'bedrock', true);
      if (Math.abs(x) <= 2 && Math.abs(z) <= 2) setBlock(x, 1, z, 'grass', true);
    }
  },
  islands() {
    const { rnd } = makeNoise(9);
    const mk = (cx, cy, cz, r) => {
      for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) {
        const d = Math.hypot(x, z);
        if (d > r - 0.2) continue;
        setBlock(cx + x, cy, cz + z, 'grass', true);
        const depth = Math.round((r - d) * 1.1) + 1;
        for (let k = 1; k <= depth; k++) setBlock(cx + x, cy - k, cz + z, k > depth - 2 ? 'dirt' : 'stone', true);
      }
    };
    mk(0, 6, 0, 5);
    mk(-11, 3, -8, 3);
    mk(10, 8, -6, 3);
    mk(-8, 10, 9, 2);
    placeTree(1, 7, 1, rnd);
    placeTree(-11, 4, -8, rnd);
  },
};

function buildWorld(style = 'plains') {
  clearWorld();
  (WORLD_BUILDERS[style] || WORLD_BUILDERS.plains)();
  world.style = style;
  world.dirty = true;
  applySky(style);
}

/* ---------- instanced meshes ---------- */
function rebuildWorldMeshes() {
  world.dirty = false;
  // tear down
  for (const mesh of world.meshes.values()) {
    mesh.geometry.dispose();
    scene.remove(mesh);
  }
  world.meshes.clear();
  world.cellIndex.clear();

  const byType = new Map();
  for (const b of world.blocks.values()) {
    if (!byType.has(b.t)) byType.set(b.t, []);
    byType.get(b.t).push(b);
  }
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const m4 = new THREE.Matrix4();
  for (const [type, cells] of byType) {
    const mesh = new THREE.InstancedMesh(geo.clone(), blockMaterials(type), cells.length);
    cells.forEach((c, i) => {
      m4.makeTranslation(c.x + 0.5, c.y + 0.5, c.z + 0.5);
      mesh.setMatrixAt(i, m4);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere?.();
    mesh.userData.type = type;
    scene.add(mesh);
    world.meshes.set(type, mesh);
    world.cellIndex.set(type, cells);
  }
}

/* ============================================================
   4. CHARACTER
   ============================================================ */
let rig = null;
function rebuildCharacter() {
  if (rig) rig.dispose();
  rig = buildCharacter(state.skin, state.customAtlas);
  scene.add(rig.group);
  applyPose(rig, currentPose());
}

const SKIN_PRESETS = [
  { id: 'steve', c: { skin: '#c68a62', hair: '#3b2a1d', shirt: '#28a5a0', pants: '#3b4a80', shoes: '#4a4a4a', eyes: '#3a6ea5', belt: '#4a4a4a', pattern: 'plain' } },
  { id: 'alex', c: { type: 'slim', skin: '#f0c39a', hair: '#c76b22', shirt: '#5fa84a', pants: '#8c6a3f', shoes: '#57402a', eyes: '#4a8f4a', belt: '#6f5433', pattern: 'plain' } },
  { id: 'ninja', c: { skin: '#d9a273', hair: '#1b1b22', shirt: '#22262e', pants: '#1a1d24', shoes: '#101216', eyes: '#e8e8e8', belt: '#c0392b', pattern: 'plain', beard: false, band: true } },
  { id: 'knight', c: { skin: '#d8ab84', hair: '#5a4128', shirt: '#9aa7b5', pants: '#5e6b7a', shoes: '#3a4350', eyes: '#3f6fa8', belt: '#c9a227', pattern: 'plain', cape: true, capeA: '#8e2b2b', capeB: '#5f1c1c' } },
  { id: 'creeper', c: { skin: '#6fbf67', hair: '#4f9c48', shirt: '#57ab4f', pants: '#3f7f39', shoes: '#2f5f2b', eyes: '#1d2b1c', belt: '#2f5f2b', pattern: 'creeper' } },
  { id: 'zombie', c: { skin: '#4f7a4a', hair: '#2f4a2c', shirt: '#3f6f9a', pants: '#42506b', shoes: '#3a3a3a', eyes: '#101610', belt: '#33405a', pattern: 'plain' } },
  { id: 'robot', c: { skin: '#c9d3dc', hair: '#8f9bab', shirt: '#dfe6ec', pants: '#8e99a6', shoes: '#616c7a', eyes: '#27e0ff', belt: '#5c6674', pattern: 'stripes' } },
  { id: 'king', c: { skin: '#e9b98e', hair: '#f2d27a', shirt: '#7b2d8e', pants: '#4a2a6b', shoes: '#c9a227', eyes: '#3a6ea5', belt: '#c9a227', pattern: 'plain', cape: true, capeA: '#6b1f8a', capeB: '#3f1052', beard: true } },
];

/* ============================================================
   5. ANIMATION PLUMBING
   ============================================================ */
const cameraProps = () => ({
  px: +camera.position.x.toFixed(3), py: +camera.position.y.toFixed(3), pz: +camera.position.z.toFixed(3),
  tx: +controls.target.x.toFixed(3), ty: +controls.target.y.toFixed(3), tz: +controls.target.z.toFixed(3),
});
const CAM_LIMITS = { px: [-80, 80], py: [-20, 90], pz: [-80, 80], tx: [-80, 80], ty: [-20, 90], tz: [-80, 80] };
const CAM_LABELS = {
  ar: { px: 'الكاميرا: يمين/يسار', py: 'الكاميرا: ارتفاع', pz: 'الكاميرا: أمام/خلف', tx: 'الهدف: يمين/يسار', ty: 'الهدف: ارتفاع', tz: 'الهدف: أمام/خلف' },
  en: { px: 'Camera X', py: 'Camera Y', pz: 'Camera Z', tx: 'Target X', ty: 'Target Y', tz: 'Target Z' },
};

function currentPose() {
  const p = evaluate(state.anim, state.frame, state.pose);
  if (!state.camAnim) p.camera = cameraProps();
  return p;
}
function applyPoseToScene(pose) {
  if (rig) applyPose(rig, pose);
  if (state.camAnim && pose.camera) {
    const c = pose.camera;
    camera.position.set(c.px || 0, c.py || 0, c.pz || 0);
    controls.target.set(c.tx || 0, c.ty || 0, c.tz || 0);
    camera.lookAt(controls.target);
    controls.enabled = false;
  } else {
    controls.enabled = true;
  }
}

function writeKey(bone, props = null) {
  const frame = Math.round(state.frame);
  let values;
  if (bone === 'camera') values = { ...cameraProps() };
  else {
    const evaluated = evaluate(state.anim, frame, state.pose)[bone] || {};
    values = { ...evaluated };
    if (props) for (const p of props) values[p] = state.pose[bone][p] ?? evaluated[p] ?? 0;
  }
  setKey(state.anim, bone, frame, values, state.ease, props || undefined);
  state.selectedKey = { bone, frame };
  renderTimeline();
  updateKeyInfo();
}

/* ============================================================
   6. PLAYBACK LOOP
   ============================================================ */
let last = performance.now();
function tick() {
  requestAnimationFrame(tick);
  const now = performance.now();
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;

  if (state.playing && !state.exporting) {
    state.frame += dt * state.fps;
    if (state.frame > state.duration) {
      if (state.loop) state.frame = 0;
      else { state.frame = state.duration; setPlaying(false); }
    }
    syncFrameUI();
  }
  if (world.dirty) rebuildWorldMeshes();

  const pose = currentPose();
  applyPoseToScene(pose);
  if (!state.camAnim) controls.update();

  renderer.render(scene, camera);
}

function setPlaying(v) {
  state.playing = v;
  $('#btnPlay').textContent = v ? '❚❚' : '▶';
}
function syncFrameUI() {
  const f = Math.floor(state.frame);
  $('#clock').textContent = `${f} / ${state.duration}`;
  $('#vpBadge').textContent = `${state.fps} FPS · ${(f / state.fps).toFixed(2)}s`;
  $('#tlPlayhead').style.transform = `translateX(${state.frame * state.tlPx}px)`;
  followPlayhead();
  refreshSliderValues();
}
let lastFollow = 0;
function followPlayhead() {
  const now = performance.now();
  if (now - lastFollow < 120) return;
  lastFollow = now;
  const sc = $('#tlScroll');
  const x = state.frame * state.tlPx;
  const pad = 80;
  if (x < sc.scrollLeft + pad || x > sc.scrollLeft + sc.clientWidth - pad) {
    sc.scrollLeft = Math.max(0, x - sc.clientWidth / 2);
  }
}
function setFrame(f) {
  state.frame = Math.max(0, Math.min(state.duration, f));
  syncFrameUI();
  refreshSliderValues();
}

/* ============================================================
   7. TIMELINE
   ============================================================ */
const TL_ROWS = [...BONES.map((b) => b.key), 'camera'];

function renderTimeline() {
  const px = state.tlPx;
  const total = state.duration + 1;
  $('#tlInner').style.width = `${total * px + 40}px`;
  $('#tlInner').style.minHeight = '100%';

  /* ruler */
  const ruler = $('#tlRuler');
  ruler.innerHTML = '';
  const stepPx = px * 5;
  const frameStep = stepPx < 26 ? 10 : 5;
  for (let f = 0; f <= state.duration; f += frameStep) {
    const tick = document.createElement('div');
    tick.className = 'tl-tick' + (f % (frameStep * 2) === 0 ? ' major' : '');
    tick.style.left = `${f * px}px`;
    tick.style.height = '100%';
    if (f % (frameStep * 2) === 0) tick.innerHTML = `<span>${f}</span>`;
    ruler.appendChild(tick);
  }

  /* names + tracks */
  const names = $('#tlNames');
  const tracks = $('#tlTracks');
  names.innerHTML = '';
  tracks.innerHTML = '';
  TL_ROWS.forEach((bone) => {
    const def = BONE_BY_KEY[bone];
    const label = bone === 'camera' ? (state.lang === 'ar' ? '🎥 الكاميرا' : '🎥 Camera') : (state.lang === 'ar' ? def.ar : def.en);
    const n = document.createElement('div');
    n.className = 'tl-name' + (state.bone === bone ? ' active' : '') + (boneFrames(state.anim, bone).length ? ' hasKey' : '');
    n.textContent = label;
    n.onclick = () => selectBone(bone);
    names.appendChild(n);

    const row = document.createElement('div');
    row.className = 'tl-row' + (state.bone === bone ? ' active' : '');
    row.style.backgroundSize = `${px * 5}px 100%`;
    row.onclick = (e) => { if (e.target === row) { selectBone(bone); setFrame(frameFromClientX(e.clientX)); } };
    boneFrames(state.anim, bone).forEach((f) => {
      const k = document.createElement('button');
      k.className = 'tl-key' + (state.selectedKey && state.selectedKey.bone === bone && state.selectedKey.frame === f ? ' selected' : '');
      k.style.left = `${f * px}px`;
      k.title = `${bone} @ ${f}`;
      k.onpointerdown = (ev) => {
        ev.stopPropagation();
        selectBone(bone);
        state.selectedKey = { bone, frame: f };
        setFrame(f);
        renderTimeline(); updateKeyInfo();
        startKeyDrag(ev, bone, f, k);
      };
      row.appendChild(k);
    });
    tracks.appendChild(row);
  });
  let keys = 0;
  for (const b of Object.keys(state.anim.tracks))
    for (const p of Object.keys(state.anim.tracks[b])) keys += state.anim.tracks[b][p].length;
  const info = $('#tlInfo');
  if (info) {
    info.textContent = state.lang === 'ar'
      ? `${state.duration} فريم · ${keys} كي · ${state.anim.tracks.camera ? 'كاميرا ✓' : 'كاميرا —'}`
      : `${state.duration} frames · ${keys} keys · camera ${state.anim.tracks.camera ? '✓' : '—'}`;
  }
  syncFrameUI();
}

function startKeyDrag(ev, bone, from, el) {
  ev.preventDefault();
  let moved = false;
  const move = (e) => {
    const nf = Math.max(0, Math.min(state.duration, Math.round(frameFromClientX(e.clientX))));
    if (nf !== from) moved = true;
    el.style.left = `${nf * state.tlPx}px`;
    el.dataset.nf = String(nf);
    $('#tlPlayhead').style.transform = `translateX(${nf * state.tlPx}px)`;
  };
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    const nf = Number(el.dataset.nf ?? from);
    if (moved && nf !== from) {
      moveKey(state.anim, bone, from, nf, nf);
      state.selectedKey = { bone, frame: nf };
      setFrame(nf);
    }
    renderTimeline(); updateKeyInfo();
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

function frameFromClientX(clientX) {
  const r = $('#tlTracks').getBoundingClientRect();
  return Math.max(0, Math.min(state.duration, (clientX - r.left) / state.tlPx));
}

/* ruler scrubbing */
{
  const ruler = $('#tlRuler');
  let dragging = false;
  ruler.addEventListener('pointerdown', (e) => {
    dragging = true;
    ruler.setPointerCapture?.(e.pointerId);
    setFrame(Math.round(frameFromClientX(e.clientX)));
    if (state.playing) setPlaying(false);
  });
  ruler.addEventListener('pointermove', (e) => { if (dragging) setFrame(Math.round(frameFromClientX(e.clientX))); });
  ruler.addEventListener('pointerup', () => { dragging = false; });
  ruler.addEventListener('pointercancel', () => { dragging = false; });
}

/* ============================================================
   8. INSPECTOR (bone + sliders)
   ============================================================ */
function selectBone(bone) {
  state.bone = bone;
  buildBoneSelect();
  buildSliders();
  renderTimeline();
}
function boneProps(bone) {
  if (bone === 'camera') return ['px', 'py', 'pz', 'tx', 'ty', 'tz'];
  return BONE_BY_KEY[bone].props;
}
function buildBoneSelect() {
  const sel = $('#boneSelect');
  sel.innerHTML = '';
  BONES.forEach((b) => {
    const o = document.createElement('option');
    o.value = b.key;
    o.textContent = state.lang === 'ar' ? b.ar : b.en;
    sel.appendChild(o);
  });
  const cam = document.createElement('option');
  cam.value = 'camera';
  cam.textContent = state.lang === 'ar' ? '🎥 الكاميرا' : '🎥 Camera';
  sel.appendChild(cam);
  sel.value = state.bone;
}
let sliderRefs = [];
function buildSliders() {
  const box = $('#poseSliders');
  box.innerHTML = '';
  sliderRefs = [];
  const props = boneProps(state.bone);
  props.forEach((p) => {
    const limits = state.bone === 'camera' ? CAM_LIMITS[p] : PROP_LIMITS[p];
    const wrap = document.createElement('div');
    wrap.className = 'slider-row';
    const label = state.bone === 'camera'
      ? CAM_LABELS[state.lang][p]
      : propLabel(p, state.lang);
    wrap.innerHTML = `<div class="lbl"><span>${label}</span><b data-v="${p}">0</b></div>`;
    const inp = document.createElement('input');
    inp.type = 'range';
    inp.min = limits[0]; inp.max = limits[1]; inp.step = 1;
    inp.dataset.prop = p;
    wrap.appendChild(inp);
    box.appendChild(wrap);
    sliderRefs.push({ p, inp, out: wrap.querySelector('b') });
    inp.addEventListener('pointerdown', () => { if (state.playing) setPlaying(false); });
    inp.addEventListener('input', () => {
      const v = +inp.value;
      wrap.querySelector('b').textContent = v;
      const pose = currentPose();
      const target = state.bone === 'camera' ? { ...cameraProps() } : { ...(pose[state.bone] || {}) };
      target[p] = v;
      if (state.bone === 'camera') {
        if (p === 'px' || p === 'py' || p === 'pz') camera.position[p[1]] = v;
        else { controls.target[p[1]] = v; camera.lookAt(controls.target); }
      } else {
        state.pose[state.bone][p] = v;
      }
      if (state.autoKey) writeKey(state.bone, [p]);
      else { renderTimeline(); }
    });
  });
  refreshSliderValues();
}
function refreshSliderValues() {
  if (!sliderRefs.length) return;
  const pose = currentPose();
  const src = state.bone === 'camera' ? cameraProps() : (pose[state.bone] || {});
  for (const { p, inp, out } of sliderRefs) {
    const v = Math.round(src[p] ?? 0);
    if (document.activeElement !== inp && +inp.value !== v) inp.value = v;
    if (out.textContent !== String(v)) out.textContent = v;
  }
}

function updateKeyInfo() {
  const el = $('#keyInfo');
  const k = state.selectedKey;
  if (!k || !boneFrames(state.anim, k.bone).includes(k.frame)) {
    el.textContent = t('noKey');
    el.style.color = '';
    return;
  }
  const props = keyedProps(state.anim, k.bone, k.frame);
  const name = k.bone === 'camera' ? (state.lang === 'ar' ? 'الكاميرا' : 'Camera')
    : (state.lang === 'ar' ? BONE_BY_KEY[k.bone].ar : BONE_BY_KEY[k.bone].en);
  el.style.color = 'var(--key)';
  el.textContent = `${name} · f${k.frame} · ${props.join(', ')}`;
}

/* ============================================================
   9. VIEWPORT INTERACTION (orbit views + building)
   ============================================================ */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const pickPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hoverBox = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002)),
  new THREE.LineBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.9 }),
);
hoverBox.visible = false;
scene.add(hoverBox);

function pointerNDC(ev) {
  const r = canvas.getBoundingClientRect();
  pointer.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
}
function pick(ev) {
  pointerNDC(ev);
  raycaster.setFromCamera(pointer, camera);
  const meshes = [...world.meshes.values()];
  const hits = raycaster.intersectObjects(meshes, false);
  if (hits.length) {
    const h = hits[0];
    const type = h.object.userData.type;
    const cell = world.cellIndex.get(type)?.[h.instanceId];
    const n = h.face.normal.clone();
    // snap the normal to the dominant axis
    const ax = ['x', 'y', 'z'].reduce((a, b) => (Math.abs(n[a]) >= Math.abs(n[b]) ? a : b));
    const normal = new THREE.Vector3();
    normal[ax] = Math.sign(n[ax]);
    return { cell, normal, point: h.point };
  }
  const p = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(pickPlane, p)) {
    return { cell: { x: Math.floor(p.x), y: -1, z: Math.floor(p.z) }, normal: new THREE.Vector3(0, 1, 0), point: p, ground: true };
  }
  return null;
}

/* world edit undo stack */
const history = [];
function pushHistory(cells, erased) { history.push({ cells, erased }); if (history.length > 200) history.shift(); }
function undo() {
  const op = history.pop();
  if (!op) return;
  for (const c of op.cells) {
    if (op.erased) setBlock(c.x, c.y, c.z, c.t, true);
    else delBlock(c.x, c.y, c.z, true);
  }
  world.dirty = true;
  toast(t('toastUndo'));
}

let hoverCell = null;
canvas.addEventListener('pointermove', (ev) => {
  if (state.exporting) return;
  const hit = pick(ev);
  if (!hit) { hoverBox.visible = false; hoverCell = null; return; }
  const c = hit.cell;
  const target = hit.ground ? { x: c.x, y: 0, z: c.z } : { x: c.x + hit.normal.x, y: c.y + hit.normal.y, z: c.z + hit.normal.z };
  if (state.mode === 'erase' && !hit.ground && hit.cell.y >= -1) {
    hoverBox.position.set(hit.cell.x + 0.5, hit.cell.y + 0.5, hit.cell.z + 0.5);
  } else {
    hoverBox.position.set(target.x + 0.5, target.y + 0.5, target.z + 0.5);
  }
  hoverCell = { hit, target };
  hoverBox.visible = true;
});
canvas.addEventListener('pointerleave', () => { hoverBox.visible = false; hoverCell = null; });

let downPos = null;
canvas.addEventListener('pointerdown', (ev) => { downPos = { x: ev.clientX, y: ev.clientY, b: ev.button }; });
canvas.addEventListener('pointerup', (ev) => {
  if (state.exporting || !downPos || downPos.b !== 0) { downPos = null; return; }
  const dist = Math.hypot(ev.clientX - downPos.x, ev.clientY - downPos.y);
  downPos = null;
  if (dist > 6) return;                       // that was an orbit drag
  const hit = pick(ev);
  if (!hit) return;
  if (state.mode === 'erase') {
    if (hit.ground) return;
    const c = hit.cell;
    const existing = world.blocks.get(bkey(c.x, c.y, c.z));
    if (existing && delBlock(c.x, c.y, c.z)) {
      pushHistory([{ ...existing }], true);
      toast(t('toastErased'), 700);
    }
    return;
  }
  const target = hit.ground ? { x: hit.cell.x, y: 0, z: hit.cell.z }
    : { x: hit.cell.x + hit.normal.x, y: hit.cell.y + hit.normal.y, z: hit.cell.z + hit.normal.z };
  if (world.blocks.has(bkey(target.x, target.y, target.z))) return;
  setBlock(target.x, target.y, target.z, state.blockId);
  pushHistory([{ ...target }], false);
  toast(t('toastPlaced'), 700);
});

/* camera view presets */
function setView(name) {
  const tgt = controls.target.clone();
  if (name === 'front') camera.position.set(tgt.x, 1.4, tgt.z + 7);
  if (name === 'side') camera.position.set(tgt.x + 7, 1.4, tgt.z);
  if (name === 'top') camera.position.set(tgt.x, 12, tgt.z + 0.01);
  if (name === 'iso') camera.position.set(tgt.x + 5.5, 4, tgt.z + 7);
  if (name === 'face') { camera.position.set(tgt.x + 0.6, tgt.y + 0.42, tgt.z + 1.5); controls.target.set(tgt.x, tgt.y + 0.35, tgt.z); }
  controls.update();
  if (state.camAnim && state.autoKey) writeKey('camera');
  $$('#camViews button').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
}

/* ============================================================
   10. UI WIRING
   ============================================================ */
function toast(msg, ms = 1400) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), ms);
}
function setLabelEl(el, key) { el.innerHTML = t(key); }

function renderPalette() {
  const box = $('#blockPalette');
  box.innerHTML = '';
  BLOCKS.forEach((b) => {
    const btn = document.createElement('button');
    btn.className = 'blockBtn' + (state.blockId === b.id ? ' active' : '');
    btn.title = state.lang === 'ar' ? b.ar : b.en;
    const icon = blockIconCanvas(b.id, 46);
    btn.appendChild(icon);
    const s = document.createElement('span');
    s.textContent = state.lang === 'ar' ? b.ar : b.en;
    btn.appendChild(s);
    btn.onclick = () => {
      state.blockId = b.id;
      setMode('build');
      $$('#blockPalette .blockBtn').forEach((x) => x.classList.remove('active'));
      btn.classList.add('active');
    };
    box.appendChild(btn);
  });
}
function setMode(m) {
  state.mode = m;
  $('#btnModePlace').classList.toggle('active', m === 'build');
  $('#btnModeErase').classList.toggle('active', m === 'erase');
  document.body.classList.toggle('building', m === 'build');
}
function renderWorldChips() {
  const box = $('#worldPresets');
  box.innerHTML = '';
  Object.keys(WORLD_BUILDERS).forEach((id) => {
    const c = document.createElement('button');
    c.className = 'chip' + (state.style === id ? ' active' : '');
    c.textContent = t('worldNames.' + id);
    c.onclick = () => {
      state.style = id;
      buildWorld(id);
      renderWorldChips();
      toast(t('worldNames.' + id));
    };
    box.appendChild(c);
  });
}
function renderSkinPresets() {
  const box = $('#skinPresets');
  box.innerHTML = '';
  SKIN_PRESETS.forEach((p) => {
    const c = document.createElement('button');
    c.className = 'chip';
    c.textContent = t('skinPresets.' + p.id);
    c.onclick = () => {
      state.customAtlas = null;
      state.skin = { ...DEFAULT_SKIN, ...p.c };
      rebuildCharacter();
      renderColorInputs();
      toast(t('toastSkin'));
    };
    box.appendChild(c);
  });
}
const COLOR_KEYS = ['skin', 'hair', 'shirt', 'pants', 'shoes', 'eyes', 'belt'];
function renderColorInputs() {
  const box = $('#colorGrid');
  box.innerHTML = '';
  COLOR_KEYS.forEach((k) => {
    const wrap = document.createElement('label');
    wrap.className = 'colItem';
    const inp = document.createElement('input');
    inp.type = 'color';
    inp.value = state.skin[k] || '#ffffff';
    inp.oninput = () => {
      state.customAtlas = null;
      state.skin[k] = inp.value;
      rebuildCharacter();
    };
    const s = document.createElement('span');
    s.textContent = t('skinColors.' + k);
    wrap.appendChild(inp); wrap.appendChild(s);
    box.appendChild(wrap);
  });
  // pattern selector
  const pat = document.createElement('select');
  pat.className = 'select';
  pat.style.marginTop = '8px';
  ['plain', 'stripes', 'creeper', 'hoodie'].forEach((p) => {
    const o = document.createElement('option');
    o.value = p; o.textContent = t('patterns.' + p);
    pat.appendChild(o);
  });
  pat.value = state.skin.pattern;
  pat.onchange = () => { state.customAtlas = null; state.skin.pattern = pat.value; rebuildCharacter(); };
  box.appendChild(pat);
  const extras = document.createElement('div');
  extras.style.gridColumn = 'span 2';
  extras.style.display = 'flex';
  extras.style.flexWrap = 'wrap';
  extras.style.gap = '6px';
  const mkToggle = (key, labelKey) => {
    const b = document.createElement('button');
    b.className = 'chip' + (state.skin[key] ? ' active' : '');
    b.textContent = t(labelKey);
    b.onclick = () => {
      state.customAtlas = null;
      state.skin[key] = !state.skin[key];
      b.classList.toggle('active', !!state.skin[key]);
      rebuildCharacter();
    };
    return b;
  };
  extras.appendChild(mkToggle('cape', 'cape'));
  extras.appendChild(mkToggle('band', 'band'));
  extras.appendChild(mkToggle('beard', 'beard'));
  box.appendChild(extras);

  const io = document.createElement('div');
  io.style.gridColumn = 'span 2';
  io.style.display = 'flex';
  io.style.gap = '6px';
  io.style.flexWrap = 'wrap';
  const imp = document.createElement('button');
  imp.className = 'btn tiny';
  imp.textContent = t('importSkin');
  imp.onclick = () => { pendingSkinImport = true; $('#fileInput').click(); };
  const dl = document.createElement('button');
  dl.className = 'btn tiny';
  dl.textContent = t('downloadSkin');
  dl.onclick = () => {
    const cv = state.customAtlas || buildSkinAtlas(state.skin);
    cv.toBlob((b) => downloadBlob(b, `${state.projectName || 'skin'}.png`), 'image/png');
  };
  io.appendChild(imp); io.appendChild(dl);
  box.appendChild(io);
}
function renderMotionPresets() {
  const box = $('#motionPresets');
  box.innerHTML = '';
  MOTION_PRESETS.forEach((p) => {
    const b = document.createElement('button');
    b.className = 'presetBtn';
    b.innerHTML = `<b>${p.icon}</b><span>${state.lang === 'ar' ? p.ar : p.en}</span>`;
    b.onclick = () => {
      const hasKeys = Object.keys(state.anim.tracks).length > 0;
      const start = hasKeys ? Math.round(state.frame) : 0;
      applyPreset(p, state.anim, start, state.ease);
      state.duration = Math.max(state.duration, Math.round(state.frame) + (p.len || 48));
      $('#inpDur').value = state.duration;
      setPlaying(false);
      setFrame(0);
      renderTimeline();
      toast(t('toastPreset'));
    };
    box.appendChild(b);
  });
  const cam = document.createElement('div');
  cam.style.gridColumn = 'span 2';
  cam.style.marginTop = '10px';
  const h = document.createElement('h4');
  h.textContent = t('camOrbitSection');
  cam.appendChild(h);
  const row = document.createElement('div');
  row.style.display = 'grid';
  row.style.gridTemplateColumns = '1fr 1fr';
  row.style.gap = '6px';
  CAMERA_PRESETS.forEach((p) => {
    const b = document.createElement('button');
    b.className = 'presetBtn';
    b.innerHTML = `<b>${p.icon}</b><span>${state.lang === 'ar' ? p.ar : p.en}</span>`;
    b.onclick = () => {
      const tgt = controls.target.clone();
      const ctx = {
        target: tgt,
        pos: camera.position.clone(),
        radius: camera.position.distanceTo(tgt),
        height: camera.position.y,
      };
      const len = applyCameraPreset(p, state.anim, ctx, Math.round(state.frame), state.ease);
      state.camAnim = true;
      $('#btnCamEnable').classList.add('active');
      state.duration = Math.max(state.duration, Math.round(state.frame) + len);
      $('#inpDur').value = state.duration;
      setPlaying(false);
      setFrame(0);
      renderTimeline();
      toast(t('toastCamPreset'));
    };
    row.appendChild(b);
  });
  cam.appendChild(row);
  box.appendChild(cam);
}

/* ============================================================
   11. PROJECT (save / open / autosave)
   ============================================================ */
function projectData() {
  return {
    app: 'mine-imator-studio',
    version: 1,
    name: state.projectName,
    fps: state.fps,
    duration: state.duration,
    style: state.style,
    skin: state.skin,
    pose: state.pose,
    anim: state.anim,
    camAnim: state.camAnim,
    camera: cameraProps(),
    blocks: [...world.blocks.values()],
  };
}
function applyProject(d) {
  if (!d || d.app !== 'mine-imator-studio') { toast('ملف غير معروف'); return; }
  state.projectName = d.name || 'مشروعي الأول';
  state.fps = d.fps || 24;
  state.duration = d.duration || 96;
  state.style = d.style || 'plains';
  state.skin = { ...DEFAULT_SKIN, ...(d.skin || {}) };
  state.customAtlas = null;
  state.pose = { ...emptyPose(), ...(d.pose || {}) };
  state.anim = d.anim || createAnim();
  state.camAnim = !!d.camAnim;
  state.frame = 0;
  clearWorld();
  (d.blocks || []).forEach((b) => setBlock(b.x, b.y, b.z, b.t, true));
  world.dirty = true;
  // pose entries coming from older files may miss the camera slot
  BONES.forEach((b) => { if (!state.pose[b.key]) state.pose[b.key] = { rx: 0, ry: 0, rz: 0, ...(b.key === 'root' ? { px: 0, py: 0, pz: 0 } : {}) }; });
  $('#projectName').value = state.projectName;
  $('#inpFps').value = state.fps;
  $('#inpDur').value = state.duration;
  $('#btnCamEnable').classList.toggle('active', state.camAnim);
  rebuildCharacter();
  applySky(state.style);
  renderWorldChips();
  renderColorInputs();
  renderTimeline();
  buildSliders();
  if (d.camera) { camera.position.set(d.camera.px, d.camera.py, d.camera.pz); controls.target.set(d.camera.tx, d.camera.ty, d.camera.tz); }
  toast(t('toastLoaded'));
}
function saveProjectFile() {
  const blob = new Blob([JSON.stringify(projectData())], { type: 'application/json' });
  downloadBlob(blob, `${(state.projectName || 'project').replace(/\s+/g, '_')}.mim.json`);
  toast(t('toastSaved'));
}
function autosave() {
  try { localStorage.setItem('mine-imator-studio:auto', JSON.stringify(projectData())); } catch { /* quota */ }
}

/* ============================================================
   12. EXPORT MODAL
   ============================================================ */
function setExportMode(m) {
  state.exportMode = m;
  $$('[data-exp]').forEach((b) => b.classList.toggle('active', b.dataset.exp === m));
  $('#expOptsVideo').hidden = m !== 'video';
  $('#expOptsFrames').hidden = m !== 'frames';
}
async function runExport() {
  if (state.exporting) return;
  state.cancelExport = false;
  const total = Math.round(state.duration) + 1;
  const wasFrame = state.frame;
  const bar = $('#expBar'), pct = $('#expPct');
  const prog = (f) => { bar.style.width = `${Math.round(f * 100)}%`; pct.textContent = `${Math.round(f * 100)}%`; };
  $('#expProgress').hidden = false;
  $('#btnExpRun').disabled = true;
  state.exporting = true;
  setPlaying(false);

  const prevSize = { w: viewport.clientWidth, h: viewport.clientHeight };
  const oldCamAspect = camera.aspect;

  try {
    if (state.exportMode === 'json') { saveProjectFile(); }
    else {
      const { w, h } = targetSize(canvas, $('#expRes').value);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      world.dirty = true; rebuildWorldMeshes();
      renderer.render(scene, camera);

      if (state.exportMode === 'video') {
        const fps = +$('#expFps').value || state.fps;
        const { blob, ext } = await recordVideo({
          canvas, fps, totalFrames: total,
          setFrame: (f) => { state.frame = f; applyPoseToScene(currentPose()); renderer.render(scene, camera); syncFrameUI(); },
          onProgress: prog,
          cancelled: () => state.cancelExport,
        });
        if (blob && blob.size) downloadBlob(blob, `${(state.projectName || 'animation').replace(/\s+/g, '_')}.${ext}`);
        toast(state.cancelExport ? t('exportCancel') : t('exportDone'));
      } else {
        const blob = await exportFrames({
          canvas, renderer, from: 0, to: Math.round(state.duration), step: 1,
          name: (state.projectName || 'animation').replace(/\s+/g, '_'),
          coverFrame: Math.round(state.duration * 0.25),
          onProgress: prog,
          cancelled: () => state.cancelExport,
          renderScene: (f) => { state.frame = f; applyPoseToScene(currentPose()); renderer.render(scene, camera); },
        });
        if (blob) downloadBlob(blob, `${(state.projectName || 'animation').replace(/\s+/g, '_')}_frames.zip`);
        toast(state.cancelExport ? t('exportCancel') : t('exportDone'));
      }
    }
  } catch (err) {
    console.error(err);
    toast(err?.message?.includes('record') ? t('exportVideoFail') : t('exportVideoFail'), 2600);
  } finally {
    state.exporting = false;
    state.cancelExport = false;
    $('#btnExpRun').disabled = false;
    $('#expProgress').hidden = true;
    prog(0);
    // restore the viewport rendering size
    camera.aspect = oldCamAspect;
    camera.updateProjectionMatrix();
    renderer.setSize(prevSize.w, prevSize.h, false);
    state.frame = wasFrame;
    resize();
    setFrame(wasFrame);
  }
}

/* ============================================================
   13. LANGUAGE / HELP
   ============================================================ */
function applyLang() {
  const l = state.lang;
  document.documentElement.lang = l;
  document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
  $('#btnLang').textContent = l === 'ar' ? 'EN' : 'ع';
  $$('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    el.innerHTML = t(key);
  });
  // dynamic bits
  renderPalette();
  renderWorldChips();
  renderSkinPresets();
  renderColorInputs();
  renderMotionPresets();
  buildBoneSelect();
  buildSliders();
  renderTimeline();
  updateKeyInfo();
  $('#helpList').innerHTML = (l === 'ar' ? DICT.ar.help : DICT.en.help).map((s) => `<li>${s}</li>`).join('');
}

/* ============================================================
   14. EVENT WIRING
   ============================================================ */
let pendingSkinImport = false;

function wire() {
  /* top bar */
  $('#projectName').oninput = (e) => { state.projectName = e.target.value; };
  $('#btnNew').onclick = () => {
    if (!confirm(state.lang === 'ar' ? 'بدء مشروع جديد؟ التغييرات غير المحفوظة ستضيع.' : 'Start a new project? Unsaved changes are lost.')) return;
    localStorage.removeItem('mine-imator-studio:auto');
    applyProject({
      app: 'mine-imator-studio', name: 'مشروعي الأول', fps: 24, duration: 96,
      style: 'plains', skin: DEFAULT_SKIN, pose: emptyPose(), anim: createAnim(), blocks: [],
      camera: { px: 6, py: 4.2, pz: 8, tx: 0, ty: 1.1, tz: 0 },
    });
    buildWorld('plains');
    toast(t('toastNew'));
  };
  $('#btnSave').onclick = saveProjectFile;
  $('#btnOpen').onclick = () => { pendingSkinImport = false; $('#fileInput').click(); };
  $('#btnExport').onclick = () => { $('#modalExport').hidden = false; setExportMode(state.exportMode); };
  $('#btnHelp').onclick = () => { $('#modalHelp').hidden = false; };
  $('#btnHelpClose').onclick = () => { $('#modalHelp').hidden = true; };
  $('#btnLang').onclick = () => { state.lang = state.lang === 'ar' ? 'en' : 'ar'; applyLang(); };

  $('#fileInput').onchange = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (pendingSkinImport && f.type.startsWith('image/')) {
      const img = new Image();
      img.onload = () => {
        const cv = document.createElement('canvas');
        cv.width = cv.height = 64;
        const g = cv.getContext('2d');
        g.imageSmoothingEnabled = false;
        if (img.height >= 64) g.drawImage(img, 0, 0, 64, 64, 0, 0, 64, 64);
        else {
          // legacy 64x32 skin → mirror the limbs into the modern slots
          g.drawImage(img, 0, 0);
          const mirror = (sx, sy, sw, sh, dx, dy) => {
            const tmp = document.createElement('canvas');
            tmp.width = sw; tmp.height = sh;
            const tg = tmp.getContext('2d');
            tg.imageSmoothingEnabled = false;
            tg.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
            g.save(); g.translate(dx + sw, dy); g.scale(-1, 1);
            g.drawImage(tmp, 0, 0); g.restore();
          };
          mirror(0, 20, 4, 12, 0, 52);   // leg R → leg L
          mirror(4, 20, 4, 12, 4, 52);
          mirror(8, 20, 4, 12, 8, 52);
          mirror(12, 20, 4, 12, 12, 52);
          mirror(40, 20, 4, 12, 40, 52); // arm R → arm L
          mirror(44, 20, 4, 12, 44, 52);
          mirror(48, 20, 4, 12, 48, 52);
          mirror(52, 20, 4, 12, 52, 52);
        }
        state.customAtlas = cv;
        rebuildCharacter();
        toast(t('toastImported'));
      };
      img.onerror = () => toast(state.lang === 'ar' ? 'تعذّر قراءة الصورة' : 'Could not read the image');
      img.src = URL.createObjectURL(f);
      pendingSkinImport = false;
      return;
    }
    const text = await f.text();
    try { applyProject(JSON.parse(text)); } catch { toast(state.lang === 'ar' ? 'ملف مشروع غير صالح' : 'Invalid project file'); }
  };

  /* export modal */
  $$('[data-exp]').forEach((b) => { b.onclick = () => setExportMode(b.dataset.exp); });
  $('#btnExpCancel').onclick = () => {
    if (state.exporting) state.cancelExport = true;
    else $('#modalExport').hidden = true;
  };
  $('#btnExpRun').onclick = runExport;

  /* left panel */
  $('#btnModePlace').onclick = () => setMode('build');
  $('#btnModeErase').onclick = () => setMode('erase');
  $$('.tab').forEach((tabEl) => {
    tabEl.onclick = () => {
      $$('.tab').forEach((x) => x.classList.remove('active'));
      $$('.pane').forEach((x) => x.classList.remove('active'));
      tabEl.classList.add('active');
      $(`.pane[data-pane="${tabEl.dataset.pane}"]`).classList.add('active');
    };
  });
  $('#btnTree').onclick = () => {
    const { rnd } = makeNoise(Date.now() & 0xffff);
    const x = Math.round(controls.target.x), z = Math.round(controls.target.z);
    placeTree(x, surfaceY(x, z), z, rnd);
    world.dirty = true;
    renderTimeline();
  };
  $('#btnRing').onclick = () => {
    const x = Math.round(controls.target.x) - 2, z = Math.round(controls.target.z) - 2;
    const y = surfaceY(x, z);
    pushHistory([], false);
    const before = new Map(world.blocks);
    placeHut(x, y, z);
    const added = [];
    for (const [k, v] of world.blocks) if (!before.has(k)) added.push(v);
    history[history.length - 1] = { cells: added, erased: false };
    world.dirty = true;
  };
  $('#btnClearBlocks').onclick = () => { pushHistory([...world.blocks.values()], true); clearWorld(); toast(t('toastCleared')); };
  $('#btnResetWorld').onclick = () => { history.length = 0; buildWorld(state.style); toast(t('worldNames.' + state.style)); };

  /* character panel */
  $('#btnClassic').onclick = () => { state.skin.type = 'classic'; $('#btnClassic').classList.add('active'); $('#btnSlim').classList.remove('active'); rebuildCharacter(); };
  $('#btnSlim').onclick = () => { state.skin.type = 'slim'; $('#btnSlim').classList.add('active'); $('#btnClassic').classList.remove('active'); rebuildCharacter(); };
  $('#btnRestPose').onclick = () => { restPose(); };
  $('#btnTpose').onclick = () => { tPose(); };
  $('#btnFlip').onclick = () => { mirrorPose(); };

  /* motion panel */
  $('#btnClearAnim').onclick = () => {
    if (!confirm(state.lang === 'ar' ? 'حذف كل الكي فريمات؟' : 'Delete every keyframe?')) return;
    clearAll(state.anim);
    state.camAnim = false;
    $('#btnCamEnable').classList.remove('active');
    renderTimeline();
  };

  /* viewport */
  $$('#camViews button').forEach((b) => { b.onclick = () => setView(b.dataset.view); });
  $('#btnCamKey').onclick = () => {
    state.camAnim = true;
    $('#btnCamEnable').classList.add('active');
    writeKey('camera');
    toast(t('toastKey'));
  };
  $('#btnCamEnable').onclick = () => {
    state.camAnim = !state.camAnim;
    $('#btnCamEnable').classList.toggle('active', state.camAnim);
  };
  $('#btnCamClear').onclick = () => {
    delete state.anim.tracks.camera;
    state.camAnim = false;
    $('#btnCamEnable').classList.remove('active');
    renderTimeline();
  };
  $('#btnLeftDrawer').onclick = () => document.body.classList.toggle('drawer');

  /* playbar */
  $('#btnPlay').onclick = () => setPlaying(!state.playing);
  $('#btnStart').onclick = () => setFrame(0);
  $('#btnEnd').onclick = () => setFrame(state.duration);
  $('#btnPrev').onclick = () => { setPlaying(false); setFrame(Math.round(state.frame) - 1); };
  $('#btnNext').onclick = () => { setPlaying(false); setFrame(Math.round(state.frame) + 1); };
  $('#btnLoop').onclick = (e) => {
    state.loop = !state.loop;
    e.currentTarget.dataset.on = state.loop ? '1' : '0';
  };
  $('#inpFps').onchange = (e) => { state.fps = Math.max(1, Math.min(60, +e.target.value || 24)); syncFrameUI(); };
  $('#inpDur').onchange = (e) => { state.duration = Math.max(8, Math.min(1200, +e.target.value || 96)); renderTimeline(); };
  $('#chkAutoKey').onchange = (e) => { state.autoKey = e.target.checked; };
  $('#btnShot').onclick = () => {
    const old = { w: viewport.clientWidth, h: viewport.clientHeight };
    const { w, h } = targetSize(canvas, $('#expRes').value === 'src' ? 'src' : $('#expRes').value);
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    snapshot(canvas, `${(state.projectName || 'shot').replace(/\s+/g, '_')}_f${Math.round(state.frame)}.png`);
    renderer.setSize(old.w, old.h, false);
    resize();
    toast(t('snapshot'));
  };

  /* inspector */
  $('#boneSelect').onchange = (e) => selectBone(e.target.value);
  $('#btnKeyPose').onclick = () => { writeKey(state.bone); toast(t('toastKey'), 800); };
  $('#btnResetBone').onclick = () => {
    if (state.bone === 'camera') return;
    const props = BONE_BY_KEY[state.bone].props;
    props.forEach((p) => { state.pose[state.bone][p] = 0; });
    if (state.autoKey) writeKey(state.bone, props);
    refreshSliderValues();
  };
  $('#btnKeyPrev').onclick = () => gotoKey(-1);
  $('#btnKeyNext').onclick = () => gotoKey(1);
  $('#btnKeyDel').onclick = () => {
    if (!state.selectedKey) return;
    removeKey(state.anim, state.selectedKey.bone, state.selectedKey.frame);
    state.selectedKey = null;
    renderTimeline(); updateKeyInfo();
    toast(t('toastDelKey'));
  };

  /* timeline */
  $('#btnTlKey').onclick = () => { writeKey(state.bone); toast(t('toastKey'), 800); };
  $('#btnTlDel').onclick = () => $('#btnKeyDel').click();
  $('#btnTlZoomIn').onclick = () => { state.tlPx = Math.min(40, state.tlPx * 1.25); renderTimeline(); };
  $('#btnTlZoomOut').onclick = () => { state.tlPx = Math.max(2, state.tlPx / 1.25); renderTimeline(); };
  $('#btnTlToggle').onclick = (e) => {
    const tl = $('#timeline');
    tl.classList.toggle('collapsed');
    e.currentTarget.textContent = tl.classList.contains('collapsed') ? '▴' : '▾';
    resize();
  };
  $('#easeSel').onchange = (e) => { state.ease = e.target.value; };

  /* keyboard */
  window.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
      if (!(e.ctrlKey && e.key.toLowerCase() === 's')) return;
    }
    const k = e.key.toLowerCase();
    if (e.ctrlKey || e.metaKey) {
      if (k === 's') { e.preventDefault(); saveProjectFile(); }
      if (k === 'z') { e.preventDefault(); undo(); }
      if (k === 'e') { e.preventDefault(); $('#modalExport').hidden = false; setExportMode(state.exportMode); }
      return;
    }
    if (k === ' ') { e.preventDefault(); setPlaying(!state.playing); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); setPlaying(false); setFrame(Math.round(state.frame) + (e.shiftKey ? 10 : 1)); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); setPlaying(false); setFrame(Math.round(state.frame) - (e.shiftKey ? 10 : 1)); }
    else if (k === 'k') { writeKey(state.bone); toast(t('toastKey'), 700); }
    else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (state.selectedKey) $('#btnKeyDel').click();
    } else if (k === 'home') setFrame(0);
    else if (k === 'end') setFrame(state.duration);
  });

  window.addEventListener('beforeunload', autosave);
  setInterval(autosave, 30000);
}
function gotoKey(dir) {
  const frames = boneFrames(state.anim, state.bone);
  if (!frames.length) return;
  const cur = state.selectedKey?.frame ?? Math.round(state.frame);
  let next = dir > 0 ? frames.find((f) => f > cur) : [...frames].reverse().find((f) => f < cur);
  if (next === undefined) next = dir > 0 ? frames[0] : frames[frames.length - 1];
  state.selectedKey = { bone: state.bone, frame: next };
  setFrame(next);
  renderTimeline();
  updateKeyInfo();
}
function restPose() {
  BONES.forEach((b) => {
    const p = state.pose[b.key];
    p.rx = p.ry = p.rz = 0;
    if (b.key === 'root') p.px = p.py = p.pz = 0;
  });
  if (state.autoKey) BONES.forEach((b) => writeKey(b.key, b.props));
  refreshSliderValues();
}
function tPose() {
  BONES.forEach((b) => {
    const p = state.pose[b.key];
    p.rx = p.ry = p.rz = 0;
    if (b.key === 'root') p.px = p.py = p.pz = 0;
  });
  state.pose.armR.rz = -90;
  state.pose.armL.rz = 90;
  if (state.autoKey) BONES.forEach((b) => writeKey(b.key, b.props));
  refreshSliderValues();
}
/** true mirror across the body axis: rx keeps its sign, ry/rz flip */
function mirrorPose() {
  const flip = (p) => ({ rx: p.rx, ry: -p.ry, rz: -p.rz, ...(p.px !== undefined ? { px: -p.px, py: p.py, pz: p.pz } : {}) });
  const swap = (a, b) => {
    const A = state.pose[a], B = state.pose[b];
    const na = flip(B), nb = flip(A);
    Object.assign(A, na); Object.assign(B, nb);
  };
  swap('armR', 'armL');
  swap('legR', 'legL');
  for (const k of ['body', 'head']) {
    state.pose[k].ry = -state.pose[k].ry;
    state.pose[k].rz = -state.pose[k].rz;
  }
  state.pose.root.ry = -state.pose.root.ry;
  state.pose.root.rz = -state.pose.root.rz;
  state.pose.root.px = -state.pose.root.px;
  if (state.autoKey) ['armR', 'armL', 'legR', 'legL', 'body', 'head', 'root'].forEach((b) => writeKey(b, BONE_BY_KEY[b].props));
  refreshSliderValues();
  toast(t('mirror'), 700);
}

/* ============================================================
   15. SIZE + BOOT
   ============================================================ */
function resize() {
  const w = viewport.clientWidth, h = viewport.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
if (window.ResizeObserver) new ResizeObserver(resize).observe(viewport);

function boot() {
  wire();
  applyLang();

  // world + character
  const saved = (() => { try { return JSON.parse(localStorage.getItem('mine-imator-studio:auto') || 'null'); } catch { return null; } })();
  if (saved && (saved.blocks?.length || saved.anim)) {
    applyProject(saved);
    if (!saved.blocks?.length) buildWorld(saved.style || 'plains');
    toast(state.lang === 'ar' ? 'تم استرجاع مشروعك السابق ↩' : 'Restored your last session ↩', 2200);
  } else {
    buildWorld('plains');
    rebuildCharacter();
    renderTimeline();
  }
  setMode('build');
  selectBone('armR');
  resize();
  setFrame(0);
  tick();
}
boot();
window.__studio = { state, world, scene, camera, controls, rig: () => rig, t, pick, setFrame, writeKey, renderTimeline };
