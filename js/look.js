// The Anatomy look in three.js, the same way Ramen_Builder draws its shop:
// four-tone flat shading with the light fixed in VIEW space (the lit top of a part
// is its exact colour, faces turning away step down toward walnut, not grey) and
// an ink outline around every solid. Colours are written raw in sRGB, so the
// pagoda's vermilion is the vermilion of the reference photos.
//
// The ink line is an inverted hull pushed out in SCREEN pixels, not world units:
// in MindAR the anchor is measured in target-image pixels, so a world-space hull
// would change weight with the card's resolution and the phone's distance.

import * as THREE from 'three';

export const RES = { value: new THREE.Vector2(1, 1) }; // drawing-buffer size, shared by every material

const VS = `
uniform float uInk; uniform vec2 uRes;
varying vec3 vN; varying vec2 vUv;
void main(){
  vUv = uv;
  vN = normalize(normalMatrix * normal);
  vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  if (uInk > 0.0){
    vec2 d = (projectionMatrix * vec4(vN, 0.0)).xy;
    float l = length(d);
    if (l > 1e-5) clip.xy += d / l * uInk * 2.0 / uRes * clip.w;
  }
  gl_Position = clip;
}`;
const FS = `
uniform vec3 uColor; uniform sampler2D uMap; uniform float uHasMap; uniform float uFlat; uniform float uGlow; uniform float uFade;
varying vec3 vN; varying vec2 vUv;
void main(){
  vec3 c = uColor;
  if (uHasMap > 0.5) c *= texture2D(uMap, vUv).rgb;
  if (uFlat > 0.5){ gl_FragColor = vec4(mix(c, vec3(0.72, 0.64, 0.53), uFade), 1.0); return; }
  vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
  float d = dot(n, normalize(vec3(-0.35, 0.82, 0.48)));
  float band = d > 0.6 ? 1.0 : d > 0.25 ? 0.93 : d > -0.1 ? 0.86 : d > -0.45 ? 0.79 : 0.72;
  vec3 tone = mix(vec3(0.55, 0.42, 0.29), vec3(1.0), (band - 0.72) / 0.28); // shade toward walnut
  vec3 col = c * mix(vec3(band), tone, 0.55);
  col = mix(col, vec3(1.0, 0.93, 0.78), uGlow);
  gl_FragColor = vec4(mix(col, vec3(0.94, 0.9, 0.82), uFade), 1.0);   // fade toward paper when another part is picked
}`;

export const srgb = (hex) => { const h = parseInt(hex.slice(1), 16); return new THREE.Vector3(((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255); };

export function mat(color, { map = null, side = THREE.FrontSide } = {}){
  return new THREE.ShaderMaterial({
    vertexShader: VS, fragmentShader: FS, side,
    uniforms: { uColor: { value: srgb(color) }, uMap: { value: map }, uHasMap: { value: map ? 1 : 0 },
      uFlat: { value: 0 }, uInk: { value: 0 }, uRes: RES, uGlow: { value: 0 }, uFade: { value: 0 } },
  });
}

// One ink material per part, so a picked part can turn its outline red.
export const INK = '#3b2a1c', INK_PICK = '#b5452f';
export function inkMat(px = 1.3){
  return new THREE.ShaderMaterial({
    vertexShader: VS, fragmentShader: FS, side: THREE.BackSide,
    uniforms: { uColor: { value: srgb(INK) }, uMap: { value: null }, uHasMap: { value: 0 },
      uFlat: { value: 1 }, uInk: { value: px }, uRes: RES, uGlow: { value: 0 }, uFade: { value: 0 } },
  });
}

// Pigments read off the reference photos (assets/refs/, Kiyomizu-dera). The tracking
// illustration is only for recognition: the model is never coloured from it.
export const C = {
  shu: '#d4451f',      // vermilion lacquer (bengara + shu)
  white: '#f1ebde',    // plaster walls and the boards between brackets
  yellow: '#e7b02e',   // kiguchi: the painted end-grain of rafters and bracket arms
  green: '#3d7a55',    // renji-mado lattice windows
  tile: '#5b5854',     // hongawara roof tiles
  ridge: '#45423f',
  stone: '#bdb5a6',
  bronze: '#5f5b4c',   // the sōrin and wind bells, aged bronze
  gold: '#cfa33c',
  hinoki: '#c89b62',   // the shinbashira: one cypress trunk
  wood: '#7a5236',
  lacquer: '#2e2622',
  halo: '#3b2a1c',
};

function canvasTex(w, h, draw){
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}
// Hongawara-buki: rows of round cover tiles over flat pan tiles. u = one tile pitch, v = one tile length.
const tileTex = () => canvasTex(64, 64, (g, w, h) => {
  for (let x = 0; x < w; x++){
    const f = x / w;
    const round = f < 0.5 ? Math.sin(f * 2 * Math.PI) : 0;       // the round cover tile catches light
    const v = f < 0.5 ? 150 + 105 * round ** 0.6 : 120 + 30 * Math.sin((f - 0.5) * 2 * Math.PI);
    g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, 0, 1, h);
  }
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, h - 3, w, 3);   // the lap of the next tile
  g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(w / 2 - 1, 0, 2, h);
});
// Cut granite blocks for the podium.
const stoneTex = () => canvasTex(128, 64, (g, w, h) => {
  g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
  let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 260; i++){ const v = 215 + r() * 40; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(r() * w, r() * h, 2 + r() * 4, 2 + r() * 3); }
  g.strokeStyle = 'rgba(60,50,40,.55)'; g.lineWidth = 2;
  g.strokeRect(1, 1, w - 2, h / 2 - 2);
  g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.moveTo(w / 2, h / 2); g.lineTo(w / 2, h); g.moveTo(0, h - 1); g.lineTo(w, h - 1); g.stroke();
});

let shared = null;
// Materials are shared between parts; each part only owns its ink.
export function materials(){
  if (shared) return shared;
  shared = {};
  for (const [k, v] of Object.entries(C)) shared[k] = mat(v);
  shared.tile = mat(C.tile, { map: tileTex(), side: THREE.DoubleSide });
  shared.stone = mat(C.stone, { map: stoneTex() });
  shared.white2 = mat(C.white, { side: THREE.DoubleSide });
  shared.wood2 = mat(C.wood, { side: THREE.DoubleSide });
  for (const m of Object.values(shared)) m.userData.shared = true;
  return shared;
}

// A soft Anatomy halo under the podium, so the pagoda sits ON the card.
export function haloMesh(r){
  const t = canvasTex(128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 8, 64, 64, 64);
    gr.addColorStop(0, 'rgba(59,42,28,.55)'); gr.addColorStop(0.6, 'rgba(59,42,28,.25)'); gr.addColorStop(1, 'rgba(59,42,28,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.01;
  m.renderOrder = -2;
  return m;
}
