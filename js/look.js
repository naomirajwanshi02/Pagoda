// The pagoda's look, the same recipe as sushi-ar and Noh_Masks: physically based
// materials painted with textures drawn on canvases (nothing to download), a soft
// studio environment for the lacquer, tiles and bronze to reflect, filmic tone
// mapping, a warm key light with real soft shadows that fall on the card, and a
// fill. In AR the light follows the room: the camera image is sampled twice a
// second and its brightness and tint ease the exposure and fill toward it.
//
// Colours come from the reference photos (assets/refs/, Kiyomizu-dera). The
// tracking illustration is only for recognition: the model is never coloured from it.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// ------------------------------------------------------------------ renderer, environment, lights
export function setupRenderer(renderer){
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}

export function environment(renderer){
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  pmrem.dispose();
  return env;
}

// Lights live in the model's own space (y up, 1 unit = one card width), so the sun
// stays put on the pagoda as you walk round it, like light in a real room.
export function lights(){
  const rig = new THREE.Group();
  const hemi = new THREE.HemisphereLight('#fff6e8', '#5a4632', 0.55);
  const key = new THREE.DirectionalLight('#fff0d8', 2.1);
  key.position.set(-0.55, 1.5, 0.75);
  key.target.position.set(0, 0.35, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0003;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 3;
  const fill = new THREE.DirectionalLight('#dfe8ff', 0.45);
  fill.position.set(0.9, 0.6, 1.0);
  const rim = new THREE.DirectionalLight('#ffe2c0', 0.6);
  rim.position.set(0.6, 0.9, -1.2);
  rig.add(hemi, key, key.target, fill, rim);
  return { rig, hemi, key, fill, rim };
}

// The shadow camera works in world units. In MindAR the world is measured in
// target-image pixels, so it is re-fitted to the model's world scale every frame.
export function fitShadow(key, worldScale, apart){
  const cam = key.shadow.camera, s = worldScale, h = apart ? 1.3 : 0.75;
  if (Math.abs(cam.right - h * s) < 1e-6 * s && cam.userData.apart === apart) return;
  Object.assign(cam, { left: -h * s, right: h * s, top: h * 1.4 * s, bottom: -h * 0.6 * s, near: 0.05 * s, far: 5 * s });
  cam.userData.apart = apart;
  cam.updateProjectionMatrix();
}

// Reads the room from the camera image and eases the lights toward it.
export function roomLight(look, renderer){
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const g = c.getContext('2d', { willReadFrequently: true });
  const target = { exp: 0.95, tint: new THREE.Color('#fff6e8') };
  let last = 0;
  return (video, now, dt) => {
    if (video && video.readyState >= 2 && now - last > 500){
      last = now;
      try {
        g.drawImage(video, 0, 0, 16, 16);
        const d = g.getImageData(0, 0, 16, 16).data;
        let r = 0, gg = 0, b = 0;
        for (let i = 0; i < d.length; i += 4){ r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
        const n = d.length / 4; r /= n * 255; gg /= n * 255; b /= n * 255;
        const lum = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
        target.exp = THREE.MathUtils.clamp(0.55 + lum * 0.9, 0.65, 1.15);  // dim room, dimmer pagoda, never black
        const m = Math.max(r, gg, b, 1e-3);
        target.tint.setRGB(0.6 + 0.4 * r / m, 0.6 + 0.4 * gg / m, 0.6 + 0.4 * b / m);
      } catch { /* video not ready */ }
    }
    const k = 1 - Math.exp(-dt * 2);
    renderer.toneMappingExposure += (target.exp - renderer.toneMappingExposure) * k;
    look.hemi.color.lerp(target.tint, k);
    look.fill.color.lerp(target.tint, k);
  };
}

// ------------------------------------------------------------------ painted textures
let seed = 2024;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const rr = (a, b) => a + (b - a) * rand();
const cache = new Map();
function tex(key, w, h, draw, { color = true, repeat = [1, 1] } = {}){
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  cache.set(key, t);
  return t;
}
const tiled = (w, h, x, y, fn) => { for (const dx of [0, -w, w]) for (const dy of [0, -h, h]) fn(x + dx, y + dy); };
function speckle(g, w, h, n, rgba, size = [0.5, 1.6]){
  for (let i = 0; i < n; i++){ g.fillStyle = rgba(); const x = rr(0, w), y = rr(0, h), s = rr(size[0], size[1]); tiled(w, h, x, y, (px, py) => g.fillRect(px, py, s, s)); }
}
function streaks(g, w, h, n, rgba, len = [10, 60], vertical = true){
  for (let i = 0; i < n; i++){
    g.strokeStyle = rgba(); g.lineWidth = rr(0.5, 2);
    const x = rr(0, w), y = rr(0, h), l = rr(len[0], len[1]);
    tiled(w, h, x, y, (px, py) => { g.beginPath(); g.moveTo(px, py); vertical ? g.lineTo(px + rr(-1, 1), py + l) : g.lineTo(px + l, py + rr(-1, 1)); g.stroke(); });
  }
}

// Vermilion lacquer: brushed, a little sun-faded, darker where rain runs.
const lacquerMap = () => tex('lacquer', 256, 256, (g, w, h) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  streaks(g, w, h, 260, () => `rgba(${rand() < 0.5 ? '255,236,220' : '120,40,20'},${rr(0.04, 0.12)})`, [20, 120]);
  speckle(g, w, h, 500, () => `rgba(90,30,15,${rr(0.04, 0.14)})`);
});
const lacquerRough = () => tex('lacquerR', 128, 128, (g, w, h) => {
  g.fillStyle = '#8c8c8c'; g.fillRect(0, 0, w, h);
  streaks(g, w, h, 120, () => `rgba(${rand() < 0.5 ? '255,255,255' : '40,40,40'},${rr(0.08, 0.2)})`, [10, 60]);
}, { color: false });
// Lime plaster: mottled, with faint grime.
const plasterMap = () => tex('plaster', 256, 256, (g, w, h) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++){
    const x = rr(0, w), y = rr(0, h), r = rr(8, 40);
    tiled(w, h, x, y, (px, py) => { const gr = g.createRadialGradient(px, py, 0, px, py, r); gr.addColorStop(0, `rgba(150,135,110,${rr(0.03, 0.08)})`); gr.addColorStop(1, 'rgba(150,135,110,0)'); g.fillStyle = gr; g.fillRect(px - r, py - r, 2 * r, 2 * r); });
  }
  speckle(g, w, h, 900, () => `rgba(110,100,85,${rr(0.04, 0.12)})`, [0.5, 1.2]);
});
// Wood grain (cypress pillar, inner beams).
const woodMap = () => tex('wood', 256, 256, (g, w, h) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += rr(2, 6)){
    g.fillStyle = `rgba(110,70,35,${rr(0.05, 0.22)})`;
    g.fillRect(x, 0, rr(0.6, 2.2), h);
  }
  streaks(g, w, h, 60, () => `rgba(80,50,25,${rr(0.08, 0.2)})`, [40, 200]);
});
// Hongawara-buki, 4 × 4 tiles per texture: round cover tiles over flat pan tiles,
// each fired a slightly different grey, with lighter weathering on the crowns.
const TILE_N = 4;
const tileMap = () => tex('tile', 256, 256, (g, w, h) => {
  const cw = w / TILE_N, ch = h / TILE_N;
  for (let i = 0; i < TILE_N; i++) for (let j = 0; j < TILE_N; j++){
    const base = rr(78, 108);
    for (let x = 0; x < cw; x++){
      const f = x / cw;
      const crown = f < 0.5 ? Math.sin(f * 2 * Math.PI) : 0;
      const v = f < 0.5 ? base + 46 * crown ** 0.7 : base - 22 + 10 * Math.sin((f - 0.5) * 2 * Math.PI);
      g.fillStyle = `rgb(${v * 0.98},${v},${v * 1.04})`;
      g.fillRect(i * cw + x, j * ch, 1, ch);
    }
    g.fillStyle = 'rgba(15,15,18,.55)'; g.fillRect(i * cw, j * ch + ch - 4, cw, 4);           // the lap
    g.fillStyle = 'rgba(15,15,18,.6)'; g.fillRect(i * cw + cw * 0.5 - 1, j * ch, 2, ch);      // gap beside the cover tile
  }
  speckle(g, w, h, 1400, () => `rgba(${rand() < 0.6 ? '200,198,190' : '30,30,30'},${rr(0.05, 0.18)})`);
}, { repeat: [1 / TILE_N, 1 / TILE_N] });
const tileBump = () => tex('tileB', 256, 256, (g, w, h) => {
  const cw = w / TILE_N, ch = h / TILE_N, img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++){
    const f = (x % cw) / cw, lap = (y % ch) / ch;               // each tile rises toward its lower edge
    const v = f < 0.5 ? 120 + 135 * Math.sin(f * 2 * Math.PI) : 70 - 30 * Math.sin((f - 0.5) * 2 * Math.PI);
    const n = (v * (0.75 + 0.25 * lap)) | 0, o = (y * w + x) * 4;
    img.data[o] = img.data[o + 1] = img.data[o + 2] = n; img.data[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}, { color: false, repeat: [1 / TILE_N, 1 / TILE_N] });
// Granite blocks.
const stoneMap = () => tex('stone', 256, 128, (g, w, h) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  speckle(g, w, h, 3000, () => { const v = rr(120, 255); return `rgba(${v},${v * 0.98},${v * 0.94},${rr(0.15, 0.4)})`; }, [1, 2.5]);
  g.strokeStyle = 'rgba(60,52,44,.6)'; g.lineWidth = 2.5;
  g.strokeRect(1, 1, w - 2, h / 2 - 2);
  g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.moveTo(w / 2, h / 2); g.lineTo(w / 2, h); g.moveTo(0, h - 1); g.lineTo(w, h - 1); g.stroke();
});
const stoneBump = () => tex('stoneB', 256, 128, (g, w, h) => {
  g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, w, h);
  speckle(g, w, h, 2500, () => { const v = rr(80, 200) | 0; return `rgb(${v},${v},${v})`; }, [1, 2]);
  g.strokeStyle = '#000'; g.lineWidth = 3;
  g.strokeRect(1, 1, w - 2, h / 2 - 2);
  g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.moveTo(w / 2, h / 2); g.lineTo(w / 2, h); g.moveTo(0, h - 1); g.lineTo(w, h - 1); g.stroke();
}, { color: false });
// Bronze with verdigris in the hollows.
const bronzeMap = () => tex('bronze', 256, 256, (g, w, h) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++){
    const x = rr(0, w), y = rr(0, h), r = rr(6, 30);
    tiled(w, h, x, y, (px, py) => { const gr = g.createRadialGradient(px, py, 0, px, py, r); gr.addColorStop(0, `rgba(96,150,120,${rr(0.25, 0.55)})`); gr.addColorStop(1, 'rgba(96,150,120,0)'); g.fillStyle = gr; g.fillRect(px - r, py - r, 2 * r, 2 * r); });
  }
  speckle(g, w, h, 800, () => `rgba(40,30,20,${rr(0.1, 0.3)})`);
});

// ------------------------------------------------------------------ materials
let shared = null;
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, envMapIntensity: 0.8, ...o });
// Shared originals; each part clones its own (same textures) so it can fade on its own.
export function materials(){
  if (shared) return shared;
  const lacquer = { map: lacquerMap(), roughnessMap: lacquerRough(), roughness: 0.5 };
  shared = {
    shu: std('#bf3a1c', lacquer),                                          // vermilion lacquer (bengara + shu)
    white: std('#efe8da', { map: plasterMap(), roughness: 0.92 }),         // plaster walls, boards between brackets, soffit
    yellow: std('#e2a92c', { roughness: 0.55 }),                           // kiguchi: painted end-grain of rafters and arms
    green: std('#3a7552', { map: lacquerMap(), roughness: 0.55 }),         // renji-mado lattice windows
    tile: std('#6c6c70', { map: tileMap(), bumpMap: tileBump(), bumpScale: 2.5, roughness: 0.48, envMapIntensity: 1.1, side: THREE.DoubleSide }),
    ridge: std('#3c3c41', { roughness: 0.42, envMapIntensity: 1.1 }),
    stone: std('#9b9588', { map: stoneMap(), bumpMap: stoneBump(), bumpScale: 1.5, roughness: 0.85 }),
    bronze: std('#6a5a3e', { map: bronzeMap(), metalness: 0.75, roughness: 0.45, envMapIntensity: 1.2 }),
    gold: std('#d4a64a', { metalness: 1, roughness: 0.3, envMapIntensity: 1.3 }),
    hinoki: std('#d2a874', { map: woodMap(), roughness: 0.7 }),            // the shinbashira: one cypress trunk
    wood: std('#8a5c38', { map: woodMap(), roughness: 0.75 }),
    lacquer: std('#2a221e', { roughness: 0.35, envMapIntensity: 1 }),
  };
  shared.white2 = shared.white.clone(); shared.white2.side = THREE.DoubleSide;
  shared.wood2 = shared.wood.clone(); shared.wood2.side = THREE.DoubleSide;
  return shared;
}
// The tile texture holds 4 × 4 tiles, the roof UVs count one unit per tile.
export const TILE_UV = 1 / TILE_N;

// A soft contact shadow under the platform (ambient occlusion on the paper), plus a
// shadow catcher that shows only the key light's real shadow over the camera image.
export function groundMeshes(r){
  const t = tex('halo', 128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 6, 64, 64, 64);
    gr.addColorStop(0, 'rgba(20,14,8,.5)'); gr.addColorStop(0.55, 'rgba(20,14,8,.22)'); gr.addColorStop(1, 'rgba(20,14,8,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
  halo.rotation.x = -Math.PI / 2;
  halo.renderOrder = -2;
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(r * 5, r * 5), new THREE.ShadowMaterial({ opacity: 0.32 }));
  catcher.rotation.x = -Math.PI / 2;
  catcher.position.y = 0.002;
  catcher.receiveShadow = true;
  for (const m of [halo, catcher]) m.raycast = () => {};
  return [halo, catcher];
}
