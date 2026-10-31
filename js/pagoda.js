// The five-storey pagoda, built part by part the way it is really framed.
// World units are METRES of a real pagoda about 30 m tall (Hōryū-ji is 32.5 m);
// the stage scales the whole thing onto the card.
//
// Each storey is two parts that come apart: the BODY (sill, twelve pillars on a
// 3 × 3-bay plan, walls, doors, tie-beams and the three-step kumimono brackets)
// and the ROOF (parallel double rafters, the eave, the tiled sweep with its
// up-curled corners, hip ridges and a wind bell at each corner). The roofs shrink
// upward 10 : 9 : 8 : 7 : 6. The shinbashira runs free up the middle and the
// bronze sōrin sits on top in its seven traditional pieces. Sources: SOURCES.md.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { materials, inkMat } from './look.js';
import { PARTS } from './data.js';

const TAU = Math.PI * 2, Q = Math.PI / 2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export const DIM = {
  podiumHalf: 6.0, podiumH: 1.2,
  B: [3.21, 2.81, 2.41, 2.01, 1.61],     // half-width of each body: Hōryū-ji's first storey is 6.42 m, its fifth 0.503 of that
  E: [7.06, 6.35, 5.65, 4.94, 4.24],     // half-width of each eave: 2.2 × the first body, then 10 : 9 : 8 : 7 : 6
  Hc: [2.7, 1.45, 1.35, 1.25, 1.15],        // pillar height, tuned so the main part is 3.57 × the first storey's width
};

// ------------------------------------------------------------------ geometry bag
// Collects geometry per material, then merges it into one mesh per material with
// its ink hull. Sheets that can be seen from both sides skip the hull.
class Bag {
  constructor(){ this.lists = new Map(); }
  add(key, geo, ink = true){
    const k = key + (ink ? '' : '|flat');
    if (!this.lists.has(k)) this.lists.set(k, []);
    this.lists.get(k).push(geo.index ? geo.toNonIndexed() : geo);
    return geo;
  }
  build(id){
    const M = materials();
    const group = new THREE.Group();
    group.name = id;
    const ink = inkMat();
    const mats = [ink];
    for (const [k, list] of this.lists){
      const [key, flat] = k.split('|');
      for (const g of list){ for (const a of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(a)) g.deleteAttribute(a); }
      const geo = mergeGeometries(list, false);
      list.forEach((g) => g.dispose());
      // each part owns its materials (same shader program), so it can fade on its own
      const m = M[key].clone();
      m.uniforms.uRes = M[key].uniforms.uRes;
      m.uniforms.uMap.value = M[key].uniforms.uMap.value;
      mats.push(m);
      const mesh = new THREE.Mesh(geo, m);
      mesh.userData.part = id;
      group.add(mesh);
      if (!flat){
        const hull = new THREE.Mesh(geo, ink);
        hull.userData.hull = true;
        hull.raycast = () => {};
        group.add(hull);
      }
    }
    group.userData.ink = ink;
    group.userData.mats = mats;
    return group;
  }
}

function box(w, h, d, x, y, z, ry = 0){
  const g = new THREE.BoxGeometry(w, h, d);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  return g;
}
function cyl(rt, rb, h, x, y, z, seg = 14){
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}
// A square-section member from point a to point b.
function beam(a, b, w, h){
  const len = a.distanceTo(b);
  const g = new THREE.BoxGeometry(w, h, len);
  const m = new THREE.Matrix4().lookAt(b, a, Math.abs(b.y - a.y) > 0.99 * len ? V(1, 0, 0) : V(0, 1, 0));
  m.setPosition(a.clone().add(b).multiplyScalar(0.5));
  g.applyMatrix4(m);
  return g;
}
// Four copies of a side built on +Z (x runs along the side), turned round the pagoda.
function four(bag, key, make, ink = true){
  for (let k = 0; k < 4; k++){
    const g = make();
    g.rotateY(k * Q);
    bag.add(key, g, ink);
  }
}
// A square ring of four boards pinwheeled so no two overlap: outer half-size, board width, height, centre y.
function ring(bag, key, half, w, h, y){
  four(bag, key, () => box(2 * half - w, h, w, -w / 2, y, half - w / 2));
}
function uvScale(g, su, sv){
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return g;
}
// An indexed grid surface F(i, j) → [Vector3, u, v], nu × nv cells.
function grid(nu, nv, F){
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++){
    const [p, u, v] = F(i / nu, j / nv);
    pos.push(p.x, p.y, p.z); uv.push(u, v);
  }
  const row = nu + 1;
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++){
    const a = j * row + i, b = a + 1, c = a + row, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ------------------------------------------------------------------ 0 · stone platform
function podium(){
  const bag = new Bag();
  const P = DIM.podiumHalf, H = DIM.podiumH;
  bag.add('stone', uvScale(box(2 * P, H - 0.2, 2 * P, 0, (H - 0.2) / 2, 0), 8, 1.4));
  bag.add('stone', uvScale(box(2 * P + 0.36, 0.2, 2 * P + 0.36, 0, H - 0.1, 0), 9, 0.3)); // coping stones (kasaishi)
  bag.add('stone', uvScale(box(2 * P + 0.5, 0.12, 2 * P + 0.5, 0, 0.06, 0), 9, 0.2));     // plinth
  // a flight of steps in the middle of each side, between two side stones
  four(bag, 'stone', () => {
    const steps = [];
    for (let k = 0; k < 4; k++) steps.push(uvScale(box(3.0, (H / 4) * (k + 1), 0.36, 0, (H / 8) * (k + 1), P + 0.36 * (4 - k) - 0.18), 2, 0.4));
    steps.push(beam(V(-1.7, H + 0.06, P), V(-1.7, 0.2, P + 1.5), 0.4, 0.3));
    steps.push(beam(V(1.7, H + 0.06, P), V(1.7, 0.2, P + 1.5), 0.4, 0.3));
    return mergeGeometries(steps.map((s) => (s.index ? s.toNonIndexed() : s)));
  });
  // the shinso: the foundation stone under the pillar, with its relic chamber (hidden inside)
  bag.add('stone', cyl(0.9, 1.0, 0.3, 0, H - 0.35, 0, 16));
  return bag.build('kidan');
}

// ------------------------------------------------------------------ a storey's body
function body(i, y){
  const bag = new Bag();
  const B = DIM.B[i], Hc = DIM.Hc[i], sc = 0.7 + 0.3 * B / 3.21;
  const pr = 0.19 * sc;
  const xs = [-B, -B / 3, B / 3];          // pillars on each side: 3 bays, 12 round the edge
  let y0 = y;

  if (i > 0){
    // the balcony (en) and its railing (kōran), sitting on the roof below
    const deck = 0.18, Bk = B + 0.62;
    ring(bag, 'shu', B + 0.78, 0.9, deck, y + deck / 2);
    four(bag, 'shu', () => {
      const parts = [];
      for (let j = 0; j < 4; j++) parts.push(box(0.11, 0.78, 0.11, -Bk + j * (2 * Bk / 4), y + deck + 0.39, Bk));
      return mergeGeometries(parts.map((p) => p.toNonIndexed()));
    });
    for (const [h, t] of [[0.74, 0.09], [0.42, 0.06], [0.1, 0.07]]) ring(bag, 'shu', Bk + 0.05, 0.1, t, y + deck + h);
    four(bag, 'gold', () => new THREE.SphereGeometry(0.09, 10, 8).translate(-Bk, y + deck + 0.86, Bk)); // giboshi caps
    y0 = y + deck;
  } else {
    // base stones under each pillar
    four(bag, 'stone', () => mergeGeometries(xs.map((x) => cyl(pr * 1.6, pr * 1.8, 0.14, x, y + 0.07, B).toNonIndexed())));
    y0 = y + 0.14;
  }

  // sill, pillars, walls
  ring(bag, 'shu', B + 0.12, 0.24, 0.24, y0 + 0.12);
  four(bag, 'shu', () => mergeGeometries(xs.map((x) => cyl(pr, pr * 1.05, Hc, x, y0 + Hc / 2, B).toNonIndexed())));
  const bw = 2 * B / 3, wall0 = y0 + 0.24, wallH = Hc - 0.24, doorH = wallH * 0.7;
  four(bag, 'white', () => {
    const p = [];
    for (const xc of [-bw, bw]) p.push(box(bw - pr, wallH, 0.1, xc, wall0 + wallH / 2, B - 0.03));
    p.push(box(bw - pr, wallH - doorH, 0.1, 0, wall0 + doorH + (wallH - doorH) / 2, B - 0.03)); // over the door
    return mergeGeometries(p.map((g) => g.toNonIndexed()));
  });
  // double doors with gold studs (the door leaves are vermilion, the studs are bronze-gilt)
  four(bag, 'shu', () => mergeGeometries([-1, 1].map((s) => box(bw / 2 - pr - 0.02, doorH, 0.1, s * (bw / 4 - pr / 2), wall0 + doorH / 2, B).toNonIndexed())));
  four(bag, 'gold', () => {
    const p = [];
    for (const s of [-1, 1]) for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++)
      p.push(box(0.07, 0.07, 0.05, s * (0.12 + c * (bw / 2 - 0.4) / 2), wall0 + doorH * (0.18 + r * 0.22), B + 0.06).toNonIndexed());
    return mergeGeometries(p);
  });
  if (i === 0){
    // renji-mado: green slatted windows in the side bays, in vermilion frames
    four(bag, 'shu', () => mergeGeometries([-bw, bw].map((xc) => box(bw * 0.66, wallH * 0.44, 0.12, xc, wall0 + wallH * 0.52, B).toNonIndexed())));
    four(bag, 'green', () => {
      const p = [];
      for (const xc of [-bw, bw]){
        p.push(box(bw * 0.56, wallH * 0.36, 0.13, xc, wall0 + wallH * 0.52, B + 0.01).toNonIndexed());
        for (let k = 0; k < 7; k++) p.push(box(0.05, wallH * 0.36, 0.17, xc - bw * 0.24 + k * bw * 0.08, wall0 + wallH * 0.52, B + 0.01).toNonIndexed());
      }
      return mergeGeometries(p);
    });
  }
  // nageshi tie-beams wrapping the walls
  ring(bag, 'shu', B + 0.1, 0.16, 0.16, wall0 + 0.1);
  ring(bag, 'shu', B + 0.1, 0.16, 0.18, wall0 + doorH + 0.09);
  ring(bag, 'shu', B + 0.08, 0.14, 0.2, y0 + Hc - 0.12);

  // inside
  if (i === 0){
    // the altar platform (shumidan), four inner pillars and the four Buddhas facing the four directions
    bag.add('lacquer', box(2.5, 0.55, 2.5, 0, y0 + 0.28, 0));
    ring(bag, 'gold', 1.28, 0.08, 0.06, y0 + 0.58);
    for (const [x, z] of [[1.45, 1.45], [-1.45, 1.45], [1.45, -1.45], [-1.45, -1.45]]) bag.add('shu', cyl(0.15, 0.16, Hc, x, y0 + Hc / 2, z));
    four(bag, 'gold', () => {
      const p = [
        cyl(0.34, 0.3, 0.16, 0, y0 + 0.64, 0.82),                              // lotus pedestal
        new THREE.SphereGeometry(0.3, 14, 10).scale(1, 0.75, 0.85).translate(0, y0 + 0.88, 0.82), // crossed legs
        cyl(0.17, 0.25, 0.5, 0, y0 + 1.12, 0.8),                               // body
        new THREE.SphereGeometry(0.13, 14, 10).translate(0, y0 + 1.48, 0.8),   // head
        cyl(0.36, 0.36, 0.04, 0, 0, 0, 24).rotateX(Q).translate(0, y0 + 1.42, 0.6), // halo (kōhai)
      ];
      return mergeGeometries(p.map((g) => g.toNonIndexed()));
    });
  } else {
    // the upper storeys have no rooms: just crossing beams round the pillar
    for (const s of [-1, 1]){
      bag.add('wood', box(2 * B, 0.26, 0.26, 0, y0 + Hc * 0.55, s * 0.75));
      bag.add('wood', box(0.26, 0.26, 2 * B, s * 0.75, y0 + Hc * 0.55 + 0.26, 0));
    }
  }

  // kumimono: three-step brackets (mitesaki) carrying the eave out over the wall
  const d = 0.42 * sc, dh = 0.3 * sc, m = 0.2 * sc, yb = y0 + Hc;
  four(bag, 'shu', () => mergeGeometries([...xs, B].map((x) => box(0.5 * sc, 0.22 * sc, 0.5 * sc, x, yb + 0.11 * sc, B).toNonIndexed()))); // daito blocks
  const lv = (L) => yb + 0.22 * sc + L * dh;   // bottom of level L
  for (let L = 0; L <= 3; L++) ring(bag, 'shu', B + L * d + m / 2, m, m, lv(L) + m / 2);   // the stepped beams (tōmono)
  for (let L = 0; L < 3; L++) ring(bag, 'white', B + L * d - 0.02, 0.06, dh - m, lv(L) + m + (dh - m) / 2); // plastered boards between
  four(bag, 'shu', () => {
    const p = [];
    for (const x of [...xs, B]) for (let L = 1; L <= 3; L++){
      p.push(box(m, m * 0.9, L * d + 0.2 * sc, x, lv(L) + m * 0.45, B + (L * d + 0.2 * sc) / 2).toNonIndexed()); // arm (hijiki)
      p.push(box(0.3 * sc, 0.12 * sc, 0.3 * sc, x, lv(L) - 0.06 * sc, B + L * d).toNonIndexed());             // bearing block (makito)
    }
    for (const x of [-2 * B / 3, 0, 2 * B / 3]) for (let L = 0; L < 3; L++)
      p.push(box(0.22 * sc, dh - m, 0.18 * sc, x, lv(L) + m + (dh - m) / 2, B + L * d + 0.02).toNonIndexed()); // struts between (kentozuka)
    // the corner set throws a diagonal arm out at 45°
    for (let L = 1; L <= 3; L++){
      const r = L * d + 0.25 * sc;
      p.push(beam(V(-B, lv(L) + m * 0.45, B), V(-B - r, lv(L) + m * 0.45, B + r), m, m * 0.9).toNonIndexed());
    }
    return mergeGeometries(p);
  });
  // each arm carries three small bearing blocks (makito) on the beam it holds up
  four(bag, 'shu', () => {
    const p = [];
    for (const x of [...xs, B]) for (let L = 1; L <= 3; L++)
      for (const dx of [-0.3 * sc, 0, 0.3 * sc]) p.push(box(0.18 * sc, 0.1 * sc, 0.2 * sc, x + dx, lv(L) + m + 0.05 * sc, B + L * d).toNonIndexed());
    return mergeGeometries(p);
  });
  // odaruki: the slanting tail rafter. It runs through the second step and carries the
  // third; its inner end, deep inside, is weighed down by the roof to balance the eave.
  const ySlope = 0.45, y2 = lv(2) + m * 0.45, oda = m * 1.1;
  const odaAt = (o) => y2 - ySlope * (o - (B + 2 * d));      // height of the odaruki at offset o out from the centre
  const tip = B + 3 * d + 0.3 * sc;
  four(bag, 'shu', () => {
    const p = [];
    for (const x of [...xs, B]){
      p.push(beam(V(x, odaAt(B - 0.4), B - 0.4), V(x, odaAt(tip), tip), m * 0.95, oda).toNonIndexed());
      p.push(box(0.2 * sc, lv(3) - 0.12 * sc - odaAt(B + 3 * d), 0.2 * sc, x, (lv(3) - 0.12 * sc + odaAt(B + 3 * d)) / 2, B + 3 * d).toNonIndexed()); // block up to the third step
    }
    const r = (tip - B) * Math.SQRT2, r0 = 0.4 * Math.SQRT2;    // the corner one runs out along the diagonal
    const at45 = (s) => V(-B - s / Math.SQRT2, odaAt(B + s / Math.SQRT2), B + s / Math.SQRT2);
    p.push(beam(at45(-r0), at45(r), m, oda).toNonIndexed());
    return mergeGeometries(p);
  });
  // gangyō: the round eave purlin on the top step, which the rafters rest on
  four(bag, 'shu', () => cyl(0.13 * sc, 0.13 * sc, 2 * (B + 3 * d) + 0.3, 0, 0, 0, 12).rotateZ(Q).translate(0, lv(3) + m + 0.13 * sc, B + 3 * d));
  four(bag, 'yellow', () => {   // kiguchi: the ends of the arms and tail rafters are painted yellow
    const p = [];
    for (const x of [...xs, B]){
      for (let L = 1; L <= 3; L++) p.push(box(m * 1.02, m * 0.92, 0.03, x, lv(L) + m * 0.45, B + L * d + 0.2 * sc + 0.015).toNonIndexed());
      p.push(beam(V(x, odaAt(tip), tip), V(x, odaAt(tip + 0.03), tip + 0.03), m * 0.97, oda * 1.02).toNonIndexed());
    }
    return mergeGeometries(p);
  });

  return { group: bag.build(`body${i}`), top: lv(3) + m + 0.26 * sc, sc, out: B + 3 * d + m };
}

// ------------------------------------------------------------------ a storey's roof
function roof(i, yk, sc, Si){
  const bag = new Bag();
  const last = i === 4;
  const E = DIM.E[i];
  const Ti = last ? 0.72 : DIM.B[i + 1] + 0.95;
  const ye = yk - 0.12 * (E - Si);             // bottom of the eave fascia: the soffit falls gently outward
  const fas = 0.3 + 0.12 * sc;
  const yt = ye + fas;                          // top edge of the eave
  const rise = (E - Ti) * (last ? 0.5 : 0.33);
  const curl = 0.7 * sc, ext = 0.06;            // the corners sweep up (sori) and out
  const top = yt + rise;
  const NU = 28;
  const wOf = (u) => Math.abs(u) ** 5;
  // one point on the folded eave profile: offset o out from the centre, height y, curl weight c, stretch weight e
  const at = (u, o, y, c, e) => { const w = wOf(u), s = 1 + ext * w * e; return V(u * o * s, y + curl * w * c, o * s); };
  const slope = Math.hypot(E - Ti, rise);
  const yRoof = (v) => yt + rise * (0.3 * v + 0.7 * v * v); // concave: flat at the eave, steep near the top

  // soffit (the underside), fascia, and the tiled sweep: one continuous fold, outward normals throughout
  four(bag, 'white', () => grid(NU, 6, (a, t) => { const u = a * 2 - 1, o = Si + (E - Si) * t; return [at(u, o, yk + (ye - yk) * t, t * t, t), u, t]; }));
  four(bag, 'shu', () => grid(NU, 1, (a, t) => { const u = a * 2 - 1; return [at(u, E, ye + fas * t, 1, 1), u, t]; }));
  four(bag, 'tile', () => grid(NU, 14, (a, v) => {
    const u = a * 2 - 1, o = E + (Ti - E) * v;
    return [at(u, o, yRoof(v), (1 - v) ** 2, 1 - v), (u * o) / 0.42, (v * slope) / 0.36];
  }));

  // rafters, laid parallel (heikō-daruki) as Japanese carpenters do, even at the corners:
  // round base rafters (jidaruki) inside, square flying rafters (hiendaruki) out to the eave
  const rs = 0.15 * sc, pitch = 0.4 * sc, mid = Si + 0.55 * (E - Si);
  const under = (x, o, drop) => {
    const t = Math.min(1, Math.max(0, (o - Si) / (E - Si))), u = Math.min(1, Math.abs(x) / o);
    return V(x, yk + (ye - yk) * t + curl * wOf(u) * t * t - drop, o);
  };
  four(bag, 'shu', () => {
    const p = [];
    for (let x = -E + pitch / 2; x < E; x += pitch){
      const ax = Math.abs(x);
      const tiers = [[Si, mid + 0.15, rs * 1.6], [mid - 0.25, E - 0.08, rs * 0.55]];
      for (const [o0, o1, drop] of tiers){
        const a = Math.max(o0, ax + 0.12);
        if (o1 - a < 0.2) continue;
        p.push(beam(under(x, a, drop), under(x, o1, drop), rs, rs).toNonIndexed());
      }
    }
    p.push(beam(V(-mid, yk + (ye - yk) * ((mid - Si) / (E - Si)) - rs * 1.1, mid), V(mid, yk + (ye - yk) * ((mid - Si) / (E - Si)) - rs * 1.1, mid), 0.12, rs).toNonIndexed()); // the beam the flying rafters ride on
    // the great hip rafter (sumigi) at the corner
    p.push(beam(V(Si, yk - 0.25, Si), at(1, E - 0.12, ye - 0.12, 1, 1), 0.3 * sc, 0.3 * sc).toNonIndexed());
    return mergeGeometries(p);
  });
  four(bag, 'yellow', () => {
    const p = [];
    for (let x = -E + pitch / 2; x < E; x += pitch){
      for (const [o1, drop] of [[mid + 0.15, rs * 1.6], [E - 0.08, rs * 0.55]]){
        if (o1 - Math.abs(x) < 0.3) continue;
        const e = under(x, o1, drop);
        p.push(box(rs * 1.04, rs * 1.04, 0.03, e.x, e.y, e.z + 0.015).toNonIndexed());
      }
    }
    const c = at(1, E - 0.12, ye - 0.12, 1, 1), dir = c.clone().sub(V(Si, yk - 0.25, Si)).normalize();
    p.push(beam(c, c.clone().addScaledVector(dir, 0.05), 0.31 * sc, 0.31 * sc).toNonIndexed());
    return mergeGeometries(p);
  });

  // hip ridges (sumimune) with a demon tile (onigawara) at the foot, and a wind bell (fūtaku)
  four(bag, 'ridge', () => {
    const pts = [];
    for (let k = 0; k <= 16; k++){ const v = k / 16; pts.push(at(1, E + (Ti - E) * v, yRoof(v) + 0.12 * sc, (1 - v) ** 2, 1 - v)); }
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.15 * sc, 8, false);
    const foot = pts[0];
    const oni = box(0.38 * sc, 0.45 * sc, 0.2 * sc, 0, 0, 0, Math.PI / 4).translate(foot.x + 0.05, foot.y + 0.1 * sc, foot.z + 0.05);
    return mergeGeometries([g.toNonIndexed(), oni.toNonIndexed()]);
  });
  four(bag, 'bronze', () => {
    const tip = at(1, E - 0.18, ye, 1, 1);
    const bell = new THREE.LatheGeometry([[0, 0], [0.19, 0], [0.17, 0.04], [0.13, 0.25], [0.08, 0.38], [0, 0.38]].map(([r, h]) => new THREE.Vector2(r, h)), 14);
    return mergeGeometries([
      cyl(0.02, 0.02, 0.4, tip.x, tip.y - 0.2, tip.z, 5).toNonIndexed(),
      bell.translate(tip.x, tip.y - 0.78, tip.z).toNonIndexed(),
      box(0.16, 0.24, 0.02, tip.x, tip.y - 0.98, tip.z, Math.PI / 4).toNonIndexed(),   // the wind plate that swings the clapper
    ]);
  });

  if (!last){
    // the floor of the next storey's frame, open round the pillar
    const s = new THREE.Shape([V(-Ti, -Ti), V(Ti, -Ti), V(Ti, Ti), V(-Ti, Ti)]);
    s.holes.push(new THREE.Path().absarc(0, 0, 0.55, 0, TAU, true));
    bag.add('wood2', new THREE.ShapeGeometry(s, 12).rotateX(-Q).translate(0, top, 0), false);
  }
  return { group: bag.build(`roof${i}`), top };
}

// ------------------------------------------------------------------ the shinbashira
function pillar(y1){
  const bag = new Bag();
  const h = y1 - 0.85;
  bag.add('hinoki', cyl(0.24, 0.36, h, 0, 0.85 + h / 2, 0, 8));
  // iron bands where the trunk was spliced (a pagoda's pillar is two or three trunks joined)
  for (const f of [0.34, 0.68]) bag.add('lacquer', cyl(0.36 - 0.12 * f + 0.03, 0.36 - 0.12 * f + 0.03, 0.18, 0, 0.85 + h * f, 0, 8));
  return bag.build('shinbashira');
}

// ------------------------------------------------------------------ the sōrin, piece by piece
function sorin(y){
  const out = {};
  const lathe = (pts, seg = 24) => new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg);
  let b = new Bag();
  b.add('bronze', box(1.5, 0.48, 1.5, 0, y + 0.24, 0));
  b.add('bronze', box(1.66, 0.08, 1.66, 0, y + 0.52, 0));
  out.roban = b.build('roban'); y += 0.56;

  b = new Bag();
  const fb = [[0, 0]]; for (let a = 0; a <= 8; a++){ const t = (a / 8) * Q; fb.push([0.62 * Math.cos(t), 0.5 * Math.sin(t)]); }
  b.add('bronze', lathe(fb).translate(0, y, 0));
  out.fukubachi = b.build('fukubachi'); y += 0.48;

  b = new Bag();
  b.add('bronze', cyl(0.36, 0.26, 0.14, 0, y + 0.07, 0, 20));
  for (let k = 0; k < 8; k++)
    b.add('bronze', new THREE.SphereGeometry(0.2, 12, 8).scale(1, 1.35, 0.5).rotateX(0.55).translate(0, y + 0.28, 0.34).rotateY((k / 8) * TAU));
  out.ukebana = b.build('ukebana'); y += 0.42;

  b = new Bag();
  const top = y + 9 * 0.52 + 2.4;
  b.add('bronze', cyl(0.09, 0.1, top - y, 0, (y + top) / 2, 0, 10));   // the mast (sasshin)
  for (let k = 0; k < 9; k++){
    const r = 0.56 - k * 0.013;
    b.add('bronze', lathe([[0.1, 0], [r - 0.02, 0], [r, 0.03], [r, 0.07], [r - 0.02, 0.1], [0.1, 0.1]], 28).translate(0, y + 0.16 + k * 0.52, 0));
  }
  out.kurin = b.build('kurin'); y += 9 * 0.52 + 0.15;

  b = new Bag();
  // one flame fin, from the mast outward; four of them at 90°
  const fin = new THREE.Shape();
  fin.moveTo(0.1, 0); fin.lineTo(0.3, 0);
  fin.bezierCurveTo(0.55, 0.15, 0.62, 0.38, 0.5, 0.5);
  fin.bezierCurveTo(0.68, 0.6, 0.66, 0.86, 0.48, 0.98);
  fin.bezierCurveTo(0.6, 1.1, 0.52, 1.32, 0.34, 1.4);
  fin.bezierCurveTo(0.36, 1.5, 0.24, 1.6, 0.1, 1.62);
  fin.lineTo(0.1, 0);
  fin.holes.push(new THREE.Path().absellipse(0.32, 0.36, 0.08, 0.13, 0, TAU, true));
  fin.holes.push(new THREE.Path().absellipse(0.34, 0.85, 0.07, 0.12, 0, TAU, true));
  for (let k = 0; k < 4; k++)
    b.add('bronze', new THREE.ExtrudeGeometry(fin, { depth: 0.04, bevelEnabled: false, curveSegments: 10 }).translate(0, 0, -0.02).rotateY(k * Q + Math.PI / 4).translate(0, y, 0));
  out.suien = b.build('suien'); y += 1.7;

  b = new Bag();
  b.add('bronze', new THREE.TorusGeometry(0.3, 0.045, 8, 32).rotateX(Q).translate(0, y + 0.06, 0));
  b.add('bronze', cyl(0.12, 0.12, 0.14, 0, y + 0.06, 0, 12));
  for (let k = 0; k < 8; k++) b.add('bronze', box(0.03, 0.03, 0.3, 0, y + 0.06, 0.16).rotateY((k / 8) * TAU + 0.2));
  out.ryusha = b.build('ryusha'); y += 0.22;

  b = new Bag();
  for (let k = 0; k < 6; k++) b.add('bronze', new THREE.SphereGeometry(0.11, 10, 6).scale(1, 1.3, 0.5).rotateX(0.5).translate(0, y + 0.08, 0.13).rotateY((k / 6) * TAU));
  const hj = []; for (let k = 0; k <= 14; k++){ const t = k / 14; hj.push([0.3 * Math.sin(Math.PI * t ** 0.75) * (1 - 0.15 * t), t * 0.62]); }
  hj[hj.length - 1][0] = 0;
  b.add('bronze', lathe(hj, 28).translate(0, y + 0.1, 0));
  out.hoju = b.build('hoju'); y += 0.74;

  return { parts: out, top: y };
}

// ------------------------------------------------------------------ assemble
// Returns the parts in PARTS order, each with the offset it moves by when the
// pagoda is taken apart. The storeys lift straight up; the pillar slides out
// sideways so it can be seen whole.
export function buildPagoda(){
  const root = new THREE.Group();
  const groups = {};
  groups.kidan = podium();
  let y = DIM.podiumH;
  let roofTop = y;
  for (let i = 0; i < 5; i++){
    const b = body(i, y);
    groups[`body${i}`] = b.group;
    const r = roof(i, b.top, b.sc, b.out);
    groups[`roof${i}`] = r.group;
    y = roofTop = r.top;
  }
  groups.shinbashira = pillar(roofTop + 0.4);
  const s = sorin(roofTop - 0.05);
  Object.assign(groups, s.parts);

  // a roof lifts off its body by more than its eave reaches out, so the body and its brackets
  // can be seen under it from above; a body only needs to clear the narrow top of the roof below
  const gapBefore = (id) => (id === 'body0' ? 1.2 : id.startsWith('body') ? 1.5 : id.startsWith('roof') ? 4.4 : id === 'roban' ? 2.2 : 0.7);
  let lift = 0;
  const parts = PARTS.map((p, index) => {
    const g = groups[p.id];
    root.add(g);
    let explode;
    if (p.id === 'kidan') explode = V(0, 0, 0);
    else if (p.id === 'shinbashira') explode = V(DIM.E[0] + 2.4, 0, 0);
    else { lift += gapBefore(p.id); explode = V(0, lift, 0); }
    g.traverse((o) => { if (o.isMesh && !o.userData.hull) o.userData.index = index; });
    return { ...p, index, node: g, explode, offset: new THREE.Vector3(), vel: new THREE.Vector3(), from: 0 };
  });
  return { root, parts, height: s.top, explodedHeight: s.top + lift, explodedWidth: DIM.E[0] + 2.4 + 0.4 + DIM.E[0] };
}
