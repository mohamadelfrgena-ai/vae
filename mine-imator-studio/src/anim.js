/* ============================================================
   anim.js — keyframe store, interpolation, easing + presets
   ============================================================ */
import * as THREE from 'three';
import { BONES, emptyPose } from './rig.js';

export const EASES = ['smooth', 'linear', 'step'];

/* ---------------- easing ---------------- */
const smooth = (t) => t * t * (3 - 2 * t);
function ease(mode, t) {
  if (mode === 'step') return 0;
  if (mode === 'linear') return t;
  return smooth(t);
}

/* ---------------- store ---------------- */
export function createAnim() {
  return { tracks: {} };
}
export function cloneAnim(a) {
  return JSON.parse(JSON.stringify(a));
}
function track(anim, bone, prop, create = false) {
  if (!anim.tracks[bone]) { if (!create) return null; anim.tracks[bone] = {}; }
  const b = anim.tracks[bone];
  if (!b[prop]) { if (!create) return null; b[prop] = []; }
  return b[prop];
}

/** write a key for every prop the bone supports (or just the given ones) */
export function setKey(anim, bone, frame, values, easeMode = 'smooth', onlyProps = null) {
  const def = BONES.find((b) => b.key === bone) || (bone === 'camera' ? { props: ['px', 'py', 'pz', 'tx', 'ty', 'tz'] } : null);
  if (!def) return;
  const props = onlyProps || def.props;
  for (const p of props) {
    if (!(p in values)) continue;
    const arr = track(anim, bone, p, true);
    const i = arr.findIndex((k) => k.f === frame);
    const key = { f: frame, v: +values[p], e: easeMode };
    if (i >= 0) arr[i] = key; else arr.push(key);
    arr.sort((a, b) => a.f - b.f);
  }
}

export function removeKey(anim, bone, frame) {
  const b = anim.tracks[bone]; if (!b) return false;
  let done = false;
  for (const p of Object.keys(b)) {
    const i = b[p].findIndex((k) => k.f === frame);
    if (i >= 0) { b[p].splice(i, 1); done = true; }
    if (!b[p].length) delete b[p];
  }
  if (!Object.keys(b).length) delete anim.tracks[bone];
  return done;
}

export function clearBone(anim, bone) { delete anim.tracks[bone]; }
export function clearAll(anim) { anim.tracks = {}; }

/** every distinct keyed frame of a bone (used by the timeline diamonds) */
export function boneFrames(anim, bone) {
  const b = anim.tracks[bone]; if (!b) return [];
  const s = new Set();
  for (const p of Object.keys(b)) b[p].forEach((k) => s.add(k.f));
  return [...s].sort((a, b) => a - b);
}

export function keyedProps(anim, bone, frame) {
  const b = anim.tracks[bone]; if (!b) return [];
  return Object.keys(b).filter((p) => b[p].some((k) => k.f === frame));
}

export function firstFrame(anim) {
  let m = Infinity;
  for (const b of Object.keys(anim.tracks))
    for (const p of Object.keys(anim.tracks[b]))
      for (const k of anim.tracks[b][p]) m = Math.min(m, k.f);
  return m === Infinity ? 0 : m;
}
export function lastFrame(anim) {
  let m = 0;
  for (const b of Object.keys(anim.tracks))
    for (const p of Object.keys(anim.tracks[b]))
      for (const k of anim.tracks[b][p]) m = Math.max(m, k.f);
  return m;
}

/** move a whole bone key from one frame to another (timeline dragging) */
export function moveKey(anim, bone, from, to, newFrameClamp = null) {
  if (from === to) return;
  const b = anim.tracks[bone]; if (!b) return;
  const target = newFrameClamp != null ? newFrameClamp : to;
  for (const p of Object.keys(b)) {
    const arr = b[p];
    const i = arr.findIndex((k) => k.f === from);
    if (i < 0) continue;
    const existing = arr.findIndex((k) => k.f === target);
    if (existing >= 0 && existing !== i) arr.splice(existing, 1);
    const idx = arr.findIndex((k) => k.f === from);
    if (idx >= 0) arr[idx] = { ...arr[idx], f: target };
    arr.sort((a, c) => a.f - c.f);
  }
}

export function sampleProp(anim, bone, prop, frame, fallback = 0) {
  const arr = track(anim, bone, prop);
  if (!arr || !arr.length) return fallback;
  if (frame <= arr[0].f) return arr[0].v;
  const last = arr[arr.length - 1];
  if (frame >= last.f) return last.v;
  for (let i = 0; i < arr.length - 1; i++) {
    const a = arr[i], b = arr[i + 1];
    if (frame >= a.f && frame <= b.f) {
      const span = b.f - a.f || 1;
      const t = (frame - a.f) / span;
      return a.v + (b.v - a.v) * ease(a.e, t);
    }
  }
  return last.v;
}

/** evaluate all animated bones at `frame`, starting from `base` */
export function evaluate(anim, frame, base) {
  const out = JSON.parse(JSON.stringify(base || emptyPose()));
  for (const bone of Object.keys(anim.tracks)) {
    if (!out[bone]) out[bone] = {};
    for (const prop of Object.keys(anim.tracks[bone])) {
      out[bone][prop] = sampleProp(anim, bone, prop, frame, out[bone][prop] ?? 0);
    }
  }
  return out;
}

/* ============================================================
   Presets — each one writes keyframes through the K() helper
   ============================================================ */
export const MOTION_PRESETS = [
  {
    id: 'idle', ar: 'وقوف / تنفس', en: 'Idle breathing', icon: '🧍', len: 96,
    keys: (K) => {
      K('body', 0, { rx: 0 }); K('body', 48, { rx: 1.5 }); K('body', 96, { rx: 0 });
      K('armR', 0, { rz: -2, rx: 2 }); K('armR', 48, { rz: -4, rx: -1 }); K('armR', 96, { rz: -2, rx: 2 });
      K('armL', 0, { rz: 2, rx: 2 }); K('armL', 48, { rz: 4, rx: -1 }); K('armL', 96, { rz: 2, rx: 2 });
      K('head', 0, { rx: 0 }); K('head', 40, { rx: 3, ry: 6 }); K('head', 70, { rx: 0, ry: -4 }); K('head', 96, { rx: 0, ry: 0 });
      K('root', 0, { py: 0 }); K('root', 48, { py: 0.6 }); K('root', 96, { py: 0 });
    },
  },
  {
    id: 'walk', ar: 'مشي', en: 'Walk cycle', icon: '🚶', len: 48,
    keys: (K) => {
      const s = [0, 12, 24, 36, 48];
      K('legR', 0, { rx: -26 }); K('legR', 12, { rx: 0 }); K('legR', 24, { rx: 26 }); K('legR', 36, { rx: 0 }); K('legR', 48, { rx: -26 });
      K('legL', 0, { rx: 26 }); K('legL', 12, { rx: 0 }); K('legL', 24, { rx: -26 }); K('legL', 36, { rx: 0 }); K('legL', 48, { rx: 26 });
      K('armR', 0, { rx: 26, rz: -4 }); K('armR', 24, { rx: -26, rz: -4 }); K('armR', 48, { rx: 26, rz: -4 });
      K('armL', 0, { rx: -26, rz: 4 }); K('armL', 24, { rx: 26, rz: 4 }); K('armL', 48, { rx: -26, rz: 4 });
      K('body', 0, { rx: 3, ry: -3 }); K('body', 24, { rx: 3, ry: 3 }); K('body', 48, { rx: 3, ry: -3 });
      K('root', 0, { py: 0 }); K('root', 12, { py: 1 }); K('root', 24, { py: 0 }); K('root', 36, { py: 1 }); K('root', 48, { py: 0 });
      K('head', 0, { rx: -2 }); K('head', 48, { rx: -2 });
    },
  },
  {
    id: 'run', ar: 'جري', en: 'Run cycle', icon: '🏃', len: 28,
    keys: (K) => {
      K('legR', 0, { rx: -58 }); K('legR', 7, { rx: -4 }); K('legR', 14, { rx: 52 }); K('legR', 21, { rx: 0 }); K('legR', 28, { rx: -58 });
      K('legL', 0, { rx: 52 }); K('legL', 7, { rx: 0 }); K('legL', 14, { rx: -58 }); K('legL', 21, { rx: -4 }); K('legL', 28, { rx: 52 });
      K('armR', 0, { rx: 62, rz: -12 }); K('armR', 14, { rx: -62, rz: -12 }); K('armR', 28, { rx: 62, rz: -12 });
      K('armL', 0, { rx: -62, rz: 12 }); K('armL', 14, { rx: 62, rz: 12 }); K('armL', 28, { rx: -62, rz: 12 });
      K('body', 0, { rx: 16 }); K('body', 28, { rx: 16 });
      K('head', 0, { rx: -14 }); K('head', 28, { rx: -14 });
      K('root', 0, { py: 0 }); K('root', 7, { py: 2 }); K('root', 14, { py: 0 }); K('root', 21, { py: 2 }); K('root', 28, { py: 0 });
    },
  },
  {
    id: 'jump', ar: 'قفز', en: 'Jump', icon: '⤴️', len: 60,
    keys: (K) => {
      K('root', 0, { py: 0 }); K('root', 8, { py: -2 }); K('root', 14, { py: 0 }); K('root', 24, { py: 16 });
      K('root', 36, { py: 0 }); K('root', 42, { py: -3 }); K('root', 52, { py: 0 }); K('root', 60, { py: 0 });
      K('legR', 0, { rx: 0 }); K('legR', 8, { rx: -34 }); K('legR', 24, { rx: 30 }); K('legR', 36, { rx: -20 }); K('legR', 52, { rx: 0 });
      K('legL', 0, { rx: 0 }); K('legL', 8, { rx: -34 }); K('legL', 24, { rx: 30 }); K('legL', 36, { rx: -20 }); K('legL', 52, { rx: 0 });
      K('armR', 0, { rz: -3 }); K('armR', 8, { rx: 30, rz: -6 }); K('armR', 20, { rx: -120, rz: -14 }); K('armR', 36, { rx: -40, rz: -30 }); K('armR', 52, { rx: 0, rz: -3 });
      K('armL', 0, { rz: 3 }); K('armL', 8, { rx: 30, rz: 6 }); K('armL', 20, { rx: -120, rz: 14 }); K('armL', 36, { rx: -40, rz: 30 }); K('armL', 52, { rx: 0, rz: 3 });
      K('body', 0, { rx: 0 }); K('body', 8, { rx: 14 }); K('body', 24, { rx: -6 }); K('body', 42, { rx: 12 }); K('body', 60, { rx: 0 });
      K('head', 0, { rx: 0 }); K('head', 8, { rx: 8 }); K('head', 24, { rx: -8 }); K('head', 60, { rx: 0 });
    },
  },
  {
    id: 'wave', ar: 'تلويح', en: 'Wave', icon: '👋', len: 60,
    keys: (K) => {
      K('armR', 0, { rx: 0, rz: -3 }); K('armR', 12, { rz: -155, ry: -10 }); K('armR', 22, { rz: -150, ry: 24 });
      K('armR', 32, { rz: -152, ry: -22 }); K('armR', 42, { rz: -150, ry: 20 }); K('armR', 60, { rz: -3, ry: 0 });
      K('head', 0, { ry: 0, rz: 0 }); K('head', 20, { ry: -8, rz: 5 }); K('head', 45, { ry: -6, rz: 3 }); K('head', 60, { ry: 0, rz: 0 });
      K('body', 0, { ry: 0 }); K('body', 25, { ry: -6 }); K('body', 60, { ry: 0 });
      K('armL', 0, { rz: 3 }); K('armL', 60, { rz: 3 });
    },
  },
  {
    id: 'dance', ar: 'رقص', en: 'Dance', icon: '🕺', len: 64,
    keys: (K) => {
      K('root', 0, { py: 0, ry: 0 }); K('root', 16, { py: 2, ry: 12 }); K('root', 32, { py: 0, ry: 0 }); K('root', 48, { py: 2, ry: -12 }); K('root', 64, { py: 0, ry: 0 });
      K('armR', 0, { rx: -40, rz: -110 }); K('armR', 16, { rx: 20, rz: -30 }); K('armR', 32, { rx: -40, rz: -110 }); K('armR', 48, { rx: -10, rz: -60 }); K('armR', 64, { rx: -40, rz: -110 });
      K('armL', 0, { rx: 20, rz: 30 }); K('armL', 16, { rx: -40, rz: 110 }); K('armL', 32, { rx: -10, rz: 60 }); K('armL', 48, { rx: -40, rz: 110 }); K('armL', 64, { rx: 20, rz: 30 });
      K('body', 0, { ry: 14, rx: 4 }); K('body', 32, { ry: -14, rx: 4 }); K('body', 64, { ry: 14, rx: 4 });
      K('legR', 0, { rx: -14, rz: -6 }); K('legR', 32, { rx: 14, rz: 6 }); K('legR', 64, { rx: -14, rz: -6 });
      K('legL', 0, { rx: 14, rz: 6 }); K('legL', 32, { rx: -14, rz: -6 }); K('legL', 64, { rx: 14, rz: 6 });
      K('head', 0, { ry: -12, rz: -4 }); K('head', 32, { ry: 12, rz: 4 }); K('head', 64, { ry: -12, rz: -4 });
    },
  },
  {
    id: 'sit', ar: 'جلوس', en: 'Sit down', icon: '🪑', len: 48,
    keys: (K) => {
      K('root', 0, { py: 0, pz: 0 }); K('root', 20, { py: -8, pz: -2 }); K('root', 48, { py: -8, pz: -2 });
      K('legR', 0, { rx: 0 }); K('legR', 20, { rx: -92 }); K('legR', 48, { rx: -92 });
      K('legL', 0, { rx: 0 }); K('legL', 20, { rx: -92 }); K('legL', 48, { rx: -92 });
      K('body', 0, { rx: 0 }); K('body', 20, { rx: -6 }); K('body', 48, { rx: -6 });
      K('armR', 0, { rx: 0 }); K('armR', 20, { rx: 26, rz: -10 }); K('armR', 48, { rx: 26, rz: -10 });
      K('armL', 0, { rx: 0 }); K('armL', 20, { rx: 26, rz: 10 }); K('armL', 48, { rx: 26, rz: 10 });
    },
  },
  {
    id: 'punch', ar: 'لكمة', en: 'Punch', icon: '🥊', len: 40,
    keys: (K) => {
      K('armR', 0, { rx: 0, ry: 0 }); K('armR', 8, { rx: 46, rz: -10 }); K('armR', 16, { rx: -96, ry: -4, rz: -6 }); K('armR', 26, { rx: -70, rz: -8 }); K('armR', 40, { rx: 0, rz: -3 });
      K('armL', 0, { rz: 3 }); K('armL', 8, { rx: -30, rz: 8 }); K('armL', 16, { rx: 26, rz: 10 }); K('armL', 40, { rz: 3 });
      K('body', 0, { ry: 0 }); K('body', 8, { ry: 22 }); K('body', 16, { ry: -26 }); K('body', 40, { ry: 0 });
      K('root', 0, { pz: 0 }); K('root', 14, { pz: 3 }); K('root', 40, { pz: 0 });
      K('head', 0, { ry: 0 }); K('head', 16, { ry: -8 }); K('head', 40, { ry: 0 });
    },
  },
  {
    id: 'bow', ar: 'انحناء', en: 'Bow', icon: '🙇', len: 60,
    keys: (K) => {
      K('body', 0, { rx: 0 }); K('body', 20, { rx: 52 }); K('body', 34, { rx: 48 }); K('body', 60, { rx: 0 });
      K('head', 0, { rx: 0 }); K('head', 20, { rx: 10 }); K('head', 60, { rx: 0 });
      K('armR', 0, { rz: -3 }); K('armR', 20, { rx: -22, rz: -12 }); K('armR', 60, { rz: -3 });
      K('armL', 0, { rz: 3 }); K('armL', 20, { rx: -22, rz: 12 }); K('armL', 60, { rz: 3 });
    },
  },
  {
    id: 'nod', ar: 'إيماءة بالرأس', en: 'Nod', icon: '🙂', len: 48,
    keys: (K) => {
      K('head', 0, { rx: 0 }); K('head', 12, { rx: 22 }); K('head', 24, { rx: -6 }); K('head', 36, { rx: 16 }); K('head', 48, { rx: 0 });
    },
  },
  {
    id: 'look', ar: 'نظرة حول', en: 'Look around', icon: '👀', len: 96,
    keys: (K) => {
      K('head', 0, { ry: 0 }); K('head', 20, { ry: 40, rx: -4 }); K('head', 50, { ry: -40, rx: 4 }); K('head', 80, { ry: 10 }); K('head', 96, { ry: 0 });
      K('body', 0, { ry: 0 }); K('body', 20, { ry: 10 }); K('body', 50, { ry: -10 }); K('body', 96, { ry: 0 });
    },
  },
  {
    id: 'spin', ar: 'دوران ٣٦٠', en: 'Spin', icon: '🌀', len: 48,
    keys: (K) => {
      K('root', 0, { ry: 0, py: 0 }); K('root', 24, { ry: 180, py: 4 }); K('root', 48, { ry: 360, py: 0 });
      K('armR', 0, { rz: -3 }); K('armR', 24, { rz: -60, rx: -20 }); K('armR', 48, { rz: -3 });
      K('armL', 0, { rz: 3 }); K('armL', 24, { rz: 60, rx: -20 }); K('armL', 48, { rz: 3 });
    },
  },
  {
    id: 'flip', ar: 'شقلبة خلفية', en: 'Backflip', icon: '🤸', len: 70,
    keys: (K) => {
      K('root', 0, { rx: 0, py: 0, pz: 0 }); K('root', 12, { rx: -30, py: -2, pz: -2 });
      K('root', 34, { rx: -230, py: 26, pz: 0 }); K('root', 56, { rx: -360, py: 0, pz: 2 }); K('root', 70, { rx: -360, py: 0, pz: 0 });
      K('body', 0, { rx: 0 }); K('body', 20, { rx: -14 }); K('body', 70, { rx: 0 });
      K('legR', 0, { rx: 0 }); K('legR', 14, { rx: -40 }); K('legR', 34, { rx: -70 }); K('legR', 60, { rx: -10 }); K('legR', 70, { rx: 0 });
      K('legL', 0, { rx: 0 }); K('legL', 14, { rx: -40 }); K('legL', 34, { rx: -70 }); K('legL', 60, { rx: -10 }); K('legL', 70, { rx: 0 });
      K('armR', 0, { rz: -3 }); K('armR', 14, { rx: 40, rz: -20 }); K('armR', 34, { rx: -80, rz: -30 }); K('armR', 70, { rz: -3 });
      K('armL', 0, { rz: 3 }); K('armL', 14, { rx: 40, rz: 20 }); K('armL', 34, { rx: -80, rz: 30 }); K('armL', 70, { rz: 3 });
    },
  },
];

/* ---------------- camera presets ---------------- */
/** each returns keyframes for the camera track (px,py,pz = position, tx,ty,tz = look-at) */
export const CAMERA_PRESETS = [
  {
    id: 'orbit', ar: 'دوران حول الشخصية', en: 'Orbit around', icon: '🔄', len: 120,
    keys: (K, ctx) => {
      const r = ctx.radius || 6, h = ctx.height || 2.2, t = ctx.target;
      for (let i = 0; i <= 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        K(i * 30, {
          px: t.x + Math.sin(a) * r, py: h, pz: t.z + Math.cos(a) * r,
          tx: t.x, ty: t.y, tz: t.z,
        }, i === 0 || i === 4 ? 'smooth' : 'linear');
      }
    },
  },
  {
    id: 'dollyin', ar: 'زوم داخل', en: 'Dolly in', icon: '🎯', len: 90,
    keys: (K, ctx) => {
      const t = ctx.target, p = ctx.pos;
      const d = new THREE.Vector3(p.x - t.x, 0, p.z - t.z);
      const far = d.clone().normalize().multiplyScalar(ctx.radius || 7);
      const near = d.clone().normalize().multiplyScalar(2.2);
      K(0, { px: t.x + far.x, py: ctx.height, pz: t.z + far.z, tx: t.x, ty: t.y, tz: t.z });
      K(90, { px: t.x + near.x, py: ctx.height - 0.5, pz: t.z + near.z, tx: t.x, ty: t.y + 0.2, tz: t.z });
    },
  },
  {
    id: 'pan', ar: 'مسار جانبي', en: 'Side track', icon: '🎞️', len: 120,
    keys: (K, ctx) => {
      const t = ctx.target, r = ctx.radius || 6;
      K(0, { px: t.x - r, py: ctx.height || 2, pz: t.z + r, tx: t.x, ty: t.y, tz: t.z });
      K(120, { px: t.x + r, py: ctx.height || 2, pz: t.z + r, tx: t.x, ty: t.y, tz: t.z });
    },
  },
  {
    id: 'crane', ar: 'رافعة تصعد', en: 'Crane up', icon: '🏗️', len: 120,
    keys: (K, ctx) => {
      const t = ctx.target, r = ctx.radius || 6;
      K(0, { px: t.x + r * .6, py: 0.6, pz: t.z + r * .8, tx: t.x, ty: t.y, tz: t.z });
      K(120, { px: t.x + r * .8, py: (ctx.height || 2) + 6, pz: t.z + r * .9, tx: t.x, ty: t.y + 1, tz: t.z });
    },
  },
];

/** run a preset, writing keys from `start` */
export function applyPreset(preset, anim, start = 0, easeMode = 'smooth') {
  const K = (bone, frame, values) => setKey(anim, bone, start + frame, values, easeMode);
  preset.keys(K, undefined);
  return preset.len ?? 48;
}
export function applyCameraPreset(preset, anim, ctx, start = 0, easeMode = 'smooth') {
  const K = (frame, values) => setKey(anim, 'camera', start + frame, values, easeMode);
  preset.keys(K, ctx);
  return preset.len ?? 120;
}
