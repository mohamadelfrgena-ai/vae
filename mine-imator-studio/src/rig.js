/* ============================================================
   rig.js — builds the blocky character and exposes its bones
   Model space is "Minecraft pixels": 1 block = 16 units.
   ============================================================ */
import * as THREE from 'three';
import { buildSkinAtlas, buildCapeAtlas, DEFAULT_SKIN } from './skin.js';

export const PX = 1 / 16;          // one MC pixel in meters
export const CHAR_SCALE = 0.9;     // makes the whole guy ~1.8 m tall

/** bone list shared by the inspector, timeline and animation store */
export const BONES = [
  { key: 'root', ar: 'الجسم كامل', en: 'Root', props: ['rx', 'ry', 'rz', 'px', 'py', 'pz'] },
  { key: 'body', ar: 'الجذع', en: 'Torso', props: ['rx', 'ry', 'rz'] },
  { key: 'head', ar: 'الرأس', en: 'Head', props: ['rx', 'ry', 'rz'] },
  { key: 'armR', ar: 'الذراع الأيمن', en: 'Right arm', props: ['rx', 'ry', 'rz'] },
  { key: 'armL', ar: 'الذراع الأيسر', en: 'Left arm', props: ['rx', 'ry', 'rz'] },
  { key: 'legR', ar: 'الساق اليمنى', en: 'Right leg', props: ['rx', 'ry', 'rz'] },
  { key: 'legL', ar: 'الساق اليسرى', en: 'Left leg', props: ['rx', 'ry', 'rz'] },
];
export const BONE_BY_KEY = Object.fromEntries(BONES.map((b) => [b.key, b]));
export const CAMERA_KEY = 'camera';

export const PROP_LIMITS = {
  rx: [-180, 180], ry: [-180, 180], rz: [-180, 180],
  px: [-64, 64], py: [-32, 64], pz: [-64, 64],
};

const PROP_LABEL = {
  rx: { ar: 'دوران أفقي (X)', en: 'Pitch (X)' },
  ry: { ar: 'دوران طولي (Y)', en: 'Yaw (Y)' },
  rz: { ar: 'ميل جانبي (Z)', en: 'Roll (Z)' },
  px: { ar: 'حركة يمين/يسار', en: 'Move X' },
  py: { ar: 'حركة فوق/تحت', en: 'Move Y' },
  pz: { ar: 'حركة أمام/خلف', en: 'Move Z' },
};
export const propLabel = (p, lang = 'ar') => PROP_LABEL[p]?.[lang] ?? p;

export const emptyPose = () => {
  const p = {};
  for (const b of BONES) {
    p[b.key] = { rx: 0, ry: 0, rz: 0 };
    if (b.key === 'root') Object.assign(p[b.key], { px: 0, py: 0, pz: 0 });
  }
  return p;
};

/* ------------------------------------------------------------------ */
function sliceTexture(atlas, rect, size = 64, mirror = false) {
  const t = new THREE.CanvasTexture(atlas);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestMipmapLinearFilter;
  t.generateMipmaps = true;
  t.colorSpace = THREE.SRGBColorSpace;
  const [x, y, w, h] = rect;
  t.repeat.set(w / size, h / size);
  t.offset.set(x / size, 1 - (y + h) / size);
  if (mirror) { t.repeat.x = -t.repeat.x; t.offset.x = (x + w) / size; }
  t.needsUpdate = true;
  return t;
}

/** materials array in BoxGeometry order: +x, -x, +y, -y, +z, -z */
function partMaterials(atlas, faces) {
  const mk = (rect, mirror) => new THREE.MeshLambertMaterial({ map: sliceTexture(atlas, rect, 64, mirror) });
  return [
    mk(faces.px), mk(faces.nx), mk(faces.py), mk(faces.ny), mk(faces.pz), mk(faces.nz),
  ];
}

function headFaces(A) {
  return { px: A.left, nx: A.right, py: A.top, ny: A.bottom, pz: A.front, nz: A.back };
}
function bodyFaces(A) {
  return { px: A.left, nx: A.right, py: A.top, ny: A.bottom, pz: A.front, nz: A.back };
}

/* ------------------------------------------------------------------ */
export function buildCharacter(skinIn = DEFAULT_SKIN, externalAtlas = null) {
  const skin = { ...DEFAULT_SKIN, ...skinIn };
  const atlas = externalAtlas || buildSkinAtlas(skin);
  const A = {
    head: { top: [8, 0, 8, 8], bottom: [16, 0, 8, 8], right: [0, 8, 8, 8], front: [8, 8, 8, 8], left: [16, 8, 8, 8], back: [24, 8, 8, 8] },
    body: { top: [20, 16, 8, 4], bottom: [28, 16, 8, 4], right: [16, 20, 4, 12], front: [20, 20, 8, 12], left: [28, 20, 4, 12], back: [32, 20, 8, 12] },
    armR: { top: [44, 16, 4, 4], bottom: [48, 16, 4, 4], right: [40, 20, 4, 12], front: [44, 20, 4, 12], left: [48, 20, 4, 12], back: [52, 20, 4, 12] },
    armL: { top: [44, 48, 4, 4], bottom: [48, 48, 4, 4], right: [40, 52, 4, 12], front: [44, 52, 4, 12], left: [48, 52, 4, 12], back: [52, 52, 4, 12] },
    legR: { top: [4, 16, 4, 4], bottom: [8, 16, 4, 4], right: [0, 20, 4, 12], front: [4, 20, 4, 12], left: [8, 20, 4, 12], back: [12, 20, 4, 12] },
    legL: { top: [4, 48, 4, 4], bottom: [8, 48, 4, 4], right: [0, 52, 4, 12], front: [4, 52, 4, 12], left: [8, 52, 4, 12], back: [12, 52, 4, 12] },
  };
  const slim = skin.type === 'slim';
  const SLIM_R = { top: [44, 16, 3, 4], bottom: [47, 16, 3, 4], right: [40, 20, 4, 12], front: [44, 20, 3, 12], left: [47, 20, 3, 12], back: [51, 20, 3, 12] };
  const SLIM_L = { top: [44, 48, 3, 4], bottom: [47, 48, 3, 4], right: [40, 52, 4, 12], front: [44, 52, 3, 12], left: [47, 52, 3, 12], back: [51, 52, 3, 12] };
  if (slim) { A.armR = SLIM_R; A.armL = SLIM_L; }

  const group = new THREE.Group();
  group.name = 'character';
  group.scale.setScalar(PX * CHAR_SCALE);

  const mat = (m) => new THREE.MeshLambertMaterial({ map: m });
  const meshes = [];
  const mkBox = (w, h, d, materials, parent, pos) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, materials);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    meshes.push(mesh);
    return mesh;
  };

  const armW = slim ? 3 : 4;

  /* ---- root ---- */
  const root = new THREE.Group();                 // feet on the ground
  group.add(root);

  /* ---- body pivot at the waist (y = 12) ---- */
  const body = new THREE.Group();
  body.position.set(0, 12, 0);
  root.add(body);
  mkBox(8, 12, 4, partMaterials(atlas, bodyFaces(A.body)), body, [0, 6, 0]);

  /* ---- head pivot at the neck (y = 24) ---- */
  const head = new THREE.Group();
  head.position.set(0, 12, 0);                    // 12 above the waist pivot
  body.add(head);
  mkBox(8, 8, 8, partMaterials(atlas, headFaces(A.head)), head, [0, 4, 0]);

  /* ---- arms: pivot at the shoulders (y = 22) ---- */
  const armR = new THREE.Group();
  armR.position.set(-6, 10, 0);                   // -6 = character's right
  body.add(armR);
  mkBox(armW, 12, 4, partMaterials(atlas, bodyFaces(A.armR)), armR, [0, -6, 0]);

  const armL = new THREE.Group();
  armL.position.set(6, 10, 0);
  body.add(armL);
  mkBox(armW, 12, 4, partMaterials(atlas, bodyFaces(A.armL)), armL, [0, -6, 0]);

  /* ---- legs: pivot at the hips (y = 12) ---- */
  const legR = new THREE.Group();
  legR.position.set(-2, 12, 0);
  root.add(legR);
  mkBox(4, 12, 4, partMaterials(atlas, bodyFaces(A.legR)), legR, [0, -6, 0]);

  const legL = new THREE.Group();
  legL.position.set(2, 12, 0);
  root.add(legL);
  mkBox(4, 12, 4, partMaterials(atlas, bodyFaces(A.legL)), legL, [0, -6, 0]);

  /* ---- optional cape, hanging from the shoulders ---- */
  if (skin.cape) {
    const capes = [];
    const capeCanvas = buildCapeAtlas(skin);
    const cf = { right: [0, 0, 1, 16], front: [1, 0, 10, 16], left: [11, 0, 1, 16], back: [12, 0, 10, 16], top: [1, 16, 10, 1], bottom: [11, 16, 10, 1] };
    const cmats = [
      mat(sliceTexture(capeCanvas, cf.left, 64)),    // +x
      mat(sliceTexture(capeCanvas, cf.right, 64)),   // -x
      mat(sliceTexture(capeCanvas, cf.top, 64)),     // +y
      mat(sliceTexture(capeCanvas, cf.bottom, 64)),  // -y
      mat(sliceTexture(capeCanvas, cf.front, 64)),   // +z  (worn against the back)
      mat(sliceTexture(capeCanvas, cf.back, 64)),    // -z  (outer, visible)
    ];
    const capePivot = new THREE.Group();
    capePivot.position.set(0, 11.2, -2.4);
    body.add(capePivot);
    const cape = new THREE.Mesh(new THREE.BoxGeometry(10, 16, 1), cmats);
    cape.position.set(0, -8, 0);
    cape.castShadow = true;
    capePivot.add(cape);
    meshes.push(cape);
    capes.push(cape);
  }

  const pivots = { root, body, head, armR, armL, legR, legL };

  return {
    group, pivots, meshes, skin, atlas,
    dispose() {
      meshes.forEach((m) => {
        m.geometry.dispose();
        const list = Array.isArray(m.material) ? m.material : [m.material];
        list.forEach((mm) => { mm.map?.dispose(); mm.dispose(); });
      });
      group.removeFromParent();
    },
  };
}

/* ------------------------------------------------------------------ */
/** push a pose (degrees / pixels) onto the pivots */
export function applyPose(rig, pose) {
  const D = Math.PI / 180;
  for (const b of BONES) {
    const p = pose[b.key]; const o = rig.pivots[b.key];
    if (!p || !o) continue;
    o.rotation.set((p.rx || 0) * D, (p.ry || 0) * D, (p.rz || 0) * D);
    if (b.key === 'root') {
      o.position.set((p.px || 0) * PX * CHAR_SCALE, (p.py || 0) * PX * CHAR_SCALE, (p.pz || 0) * PX * CHAR_SCALE);
    }
  }
}

export function resetPose(rig) {
  for (const b of BONES) {
    const o = rig.pivots[b.key];
    o.rotation.set(0, 0, 0);
    if (b.key === 'root') o.position.set(0, 0, 0);
  }
}
