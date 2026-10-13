/* ============================================================
   skin.js — paints a standard 64x64 Minecraft skin atlas
   from a small palette, plus an optional 64x32 cape atlas.
   ============================================================ */

export const DEFAULT_SKIN = {
  type: 'classic',        // classic | slim
  skin: '#e9b98e',
  hair: '#3a2a1c',
  shirt: '#2f80c4',
  pants: '#38415f',
  shoes: '#241c15',
  eyes: '#2f6fd0',
  belt: '#5b452c',
  pattern: 'plain',       // plain | stripes | creeper | hoodie
  sleeveLong: true,
  cape: false,
  capeA: '#c0392b',
  capeB: '#8e2418',
  band: false,
  beard: false,
};

/* ---- atlas rects (x, y, w, h) in the 64x64 skin ---- */
const R = {
  head: {
    top: [8, 0, 8, 8], bottom: [16, 0, 8, 8],
    right: [0, 8, 8, 8], front: [8, 8, 8, 8], left: [16, 8, 8, 8], back: [24, 8, 8, 8],
  },
  body: {
    top: [20, 16, 8, 4], bottom: [28, 16, 8, 4],
    right: [16, 20, 4, 12], front: [20, 20, 8, 12], left: [28, 20, 4, 12], back: [32, 20, 8, 12],
  },
  armR: {
    top: [44, 16, 4, 4], bottom: [48, 16, 4, 4],
    right: [40, 20, 4, 12], front: [44, 20, 4, 12], left: [48, 20, 4, 12], back: [52, 20, 4, 12],
  },
  armL: {
    top: [44, 48, 4, 4], bottom: [48, 48, 4, 4],
    right: [40, 52, 4, 12], front: [44, 52, 4, 12], left: [48, 52, 4, 12], back: [52, 52, 4, 12],
  },
  legR: {
    top: [4, 16, 4, 4], bottom: [8, 16, 4, 4],
    right: [0, 20, 4, 12], front: [4, 20, 4, 12], left: [8, 20, 4, 12], back: [12, 20, 4, 12],
  },
  legL: {
    top: [4, 48, 4, 4], bottom: [8, 48, 4, 4],
    right: [0, 52, 4, 12], front: [4, 52, 4, 12], left: [8, 52, 4, 12], back: [12, 52, 4, 12],
  },
};
/* slim arms use a 3px-wide texture on the inner/outer strips */
const SLIM = {
  front: [44, 20, 3, 12], back: [51, 20, 3, 12], left: [47, 20, 3, 12], right: [40, 20, 4, 12],
  top: [44, 16, 3, 4], bottom: [47, 16, 3, 4],
};
const SLIM_L = {
  front: [44, 52, 3, 12], back: [51, 52, 3, 12], left: [47, 52, 3, 12], right: [40, 52, 4, 12],
  top: [44, 48, 3, 4], bottom: [47, 48, 3, 4],
};

const isSlim = (s) => s.type === 'slim';

/* ------------------------------------------------------------------ */
export function buildSkinAtlas(skin) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;

  const fill = (r, color) => { g.fillStyle = color; g.fillRect(r[0], r[1], r[2], r[3]); };
  const shade = (r, a) => { g.fillStyle = `rgba(0,0,0,${a})`; g.fillRect(r[0], r[1], r[2], r[3]); };
  const light = (r, a) => { g.fillStyle = `rgba(255,255,255,${a})`; g.fillRect(r[0], r[1], r[2], r[3]); };
  const px = (x, y, w, h, color) => { g.fillStyle = color; g.fillRect(x, y, w, h); };

  /* ---------------- HEAD ---------------- */
  const H = R.head;
  fill(H.front, skin.skin);
  fill(H.back, skin.skin);
  fill(H.left, skin.skin);
  fill(H.right, skin.skin);
  fill(H.top, skin.skin);
  fill(H.bottom, skin.skin);

  // hair on the top / back / upper sides
  fill(H.top, skin.hair);
  fill(H.back, skin.hair);
  g.fillStyle = skin.hair;
  g.fillRect(H.left[0], H.left[1], 8, 3);
  g.fillRect(H.right[0], H.right[1], 8, 3);
  g.fillRect(H.front[0], H.front[1], 8, 2);
  // a couple of hair strands hanging on the front
  px(H.front[0] + 1, H.front[1] + 2, 1, 1, skin.hair);
  px(H.front[0] + 6, H.front[1] + 2, 1, 2, skin.hair);

  // face: eyes + brows + mouth (front rect local coords, 8x8)
  const fx = H.front[0], fy = H.front[1];
  const eyeY = fy + 4;
  px(fx + 1, eyeY, 2, 1, '#ffffff');
  px(fx + 5, eyeY, 2, 1, '#ffffff');
  px(fx + 1, eyeY, 1, 1, skin.eyes);              // pupils on the inner corners
  px(fx + 6, eyeY, 1, 1, skin.eyes);
  px(fx + 1, eyeY - 1, 2, 1, skin.hair);          // brows
  px(fx + 5, eyeY - 1, 2, 1, skin.hair);
  px(fx + 3, fy + 3, 2, 1, 'rgba(0,0,0,.07)');    // nose hint
  px(fx + 3, fy + 6, 2, 1, 'rgba(90,45,35,.85)'); // mouth
  if (skin.beard) {
    px(fx + 2, fy + 5, 4, 3, skin.hair);
    px(fx + 3, fy + 6, 2, 1, 'rgba(90,45,35,.9)');
  }
  if (skin.band) {
    const bc = '#e0463c';
    g.fillStyle = bc;
    g.fillRect(H.front[0], H.front[1] + 2, 8, 1);
    g.fillRect(H.left[0], H.left[1] + 2, 8, 1);
    g.fillRect(H.right[0], H.right[1] + 2, 8, 1);
    g.fillRect(H.back[0], H.back[1] + 2, 8, 1);
  }
  shade(H.right, 0.13); light(H.left, 0.05);
  shade(H.bottom, 0.35);

  /* ---------------- BODY ---------------- */
  const B = R.body;
  for (const k of ['front', 'back', 'left', 'right', 'top', 'bottom']) fill(B[k], skin.shirt);
  if (skin.pattern === 'stripes') {
    g.fillStyle = 'rgba(255,255,255,.85)';
    for (let y = 1; y < 12; y += 3) {
      g.fillRect(B.front[0], B.front[1] + y, 8, 1);
      g.fillRect(B.back[0], B.back[1] + y, 8, 1);
      g.fillRect(B.left[0], B.left[1] + y, 4, 1);
      g.fillRect(B.right[0], B.right[1] + y, 4, 1);
    }
  } else if (skin.pattern === 'creeper') {
    const cx = B.front[0] + 2, cy = B.front[1] + 3;
    g.fillStyle = '#2b2b2b';
    g.fillRect(cx, cy, 1, 1); g.fillRect(cx + 3, cy, 1, 1);
    g.fillRect(cx + 1, cy + 1, 1, 2); g.fillRect(cx + 2, cy + 1, 1, 2);
    g.fillRect(cx, cy + 2, 3, 1);
    g.fillRect(cx - 1, cy + 3, 2, 1); g.fillRect(cx + 2, cy + 3, 2, 1);
    g.fillRect(cx, cy + 4, 1, 1); g.fillRect(cx + 2, cy + 4, 1, 1);
  } else if (skin.pattern === 'hoodie') {
    g.fillStyle = 'rgba(0,0,0,.30)';
    g.fillRect(B.front[0] + 2, B.front[1], 4, 1);
    g.fillRect(B.front[0] + 3, B.front[1] + 1, 2, 1);
    g.fillRect(B.front[0] + 3, B.front[1] + 2, 2, 5);
    light(B.front, 0.05);
  }
  // belt / waistband
  g.fillStyle = skin.belt;
  g.fillRect(B.front[0], B.front[1] + 10, 8, 1);
  g.fillRect(B.back[0], B.back[1] + 10, 8, 1);
  g.fillRect(B.left[0], B.left[1] + 10, 4, 1);
  g.fillRect(B.right[0], B.right[1] + 10, 4, 1);
  if (skin.pattern === 'plain') light(B.front, 0.04);
  shade(B.right, 0.14); light(B.left, 0.05); shade(B.back, 0.08); shade(B.bottom, 0.4);

  /* ---------------- ARMS ---------------- */
  const paintArm = (A, slim) => {
    for (const k of ['front', 'back', 'left', 'right', 'top', 'bottom']) {
      if (!A[k]) continue;                    // never crash the whole studio over one face
      fill(A[k], skin.shirt);
    }
    const sleeve = skin.sleeveLong ? 9 : 5;
    for (const k of ['front', 'back', 'left', 'right']) {
      const r = A[k];
      px(r[0], r[1] + sleeve, r[2], 12 - sleeve, skin.skin);   // bare forearm + hand
    }
    // cuff line
    g.fillStyle = 'rgba(0,0,0,.25)';
    g.fillRect(A.front[0], A.front[1] + sleeve, A.front[2], 1);
    g.fillRect(A.back[0], A.back[1] + sleeve, A.back[2], 1);
    g.fillRect(A.left[0], A.left[1] + sleeve, A.left[2], 1);
    g.fillRect(A.right[0], A.right[1] + sleeve, A.right[2], 1);
    // shoulder shading
    g.fillStyle = 'rgba(0,0,0,.16)';
    g.fillRect(A.front[0], A.front[1], A.front[2], 1);
    shade(A.right, 0.14); light(A.left, 0.06); shade(A.bottom, 0.4);
  };
  if (isSlim(skin)) {
    paintArm(SLIM, true);
    paintArm(SLIM_L, true);
  } else {
    paintArm(R.armR, false);
    paintArm(R.armL, false);
  }

  /* ---------------- LEGS ---------------- */
  const paintLeg = (L) => {
    for (const k of ['front', 'back', 'left', 'right', 'top', 'bottom']) fill(L[k], skin.pants);
    for (const k of ['front', 'back', 'left', 'right']) {
      const r = L[k];
      px(r[0], r[1] + 9, r[2], 3, skin.shoes);   // shoes
    }
    shade(L.right, 0.14); light(L.left, 0.05); shade(L.bottom, 0.45);
    g.fillStyle = 'rgba(255,255,255,.06)';
    g.fillRect(L.front[0], L.front[1] + 5, L.front[2], 1);
  };
  paintLeg(R.legR);
  paintLeg(R.legL);

  return c;
}

/* ------------------------------------------------------------------ */
export function buildCapeAtlas(skin) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 32;
  const g = c.getContext('2d');
  const rects = { side0: [0, 0, 1, 16], front: [1, 0, 10, 16], side1: [11, 0, 1, 16], back: [12, 0, 10, 16], top: [1, 16, 10, 1], bottom: [11, 16, 10, 1] };
  for (const k in rects) { const r = rects[k]; g.fillStyle = skin.capeA; g.fillRect(r[0], r[1], r[2], r[3]); }
  // two-tone diagonal pattern on the back face
  const b = rects.back;
  g.fillStyle = skin.capeB;
  for (let i = 0; i < 16; i++) {
    const w = Math.max(0, Math.min(10, i - 3));
    if (w > 0) g.fillRect(b[0] + 10 - w, b[1] + i, w, 1);
  }
  g.fillStyle = skin.capeA;
  g.fillRect(b[0], b[1], 10, 2);                        // collar
  g.fillStyle = 'rgba(0,0,0,.25)';
  g.fillRect(b[0], b[1] + 15, 10, 1);
  const f = rects.front;
  g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(f[0], f[1], 10, 16);
  g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(f[0], f[1], 10, 2);
  return c;
}

/** full skin printable to PNG (so it can be used inside the game too) */
export function skinDataURL(skin) {
  return buildSkinAtlas(skin).toDataURL('image/png');
}
