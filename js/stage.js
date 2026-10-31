// The pagoda on the card. In AR, MindAR image tracking (mind-ar 1.2.5 + three
// 0.160.0, the same pins as Ramen_Builder and Noh_Masks) keeps tracking the
// illustration the whole time and the model stays anchored to it. Without a card
// (?demo=1) the same model stands on a picture of the card and can be orbited.
//
// Taking it apart: every part rides its own spring toward its exploded offset,
// staggered from the top down (and back up from the bottom when it closes), the
// calm eased motion of the Anatomy kit's exploded views.

import * as THREE from 'three';
import { RES, INK, INK_PICK, srgb, haloMesh } from './look.js';
import { buildPagoda, DIM } from './pagoda.js';

const params = new URLSearchParams(location.search);
export const TARGET_SRC = params.get('target') || './targets.mind';
const CARD_IMG = params.get('card') || './target.png';
const TAU = Math.PI * 2;
const ROOF_ON_CARD = 0.6;                          // the first roof spans 60% of the card's width
const S = ROOF_ON_CARD / (2 * DIM.E[0]);           // metres → card widths
const INK_PX = 1.3;

export class Stage {
  constructor(container, { onTrack = () => {}, onPick = () => {}, onTapEmpty = () => {} } = {}){
    this.container = container;
    this.cb = { onTrack, onPick, onTapEmpty };
    this.model = buildPagoda();
    this.parts = this.model.parts;
    this.exploded = false;
    this.selected = null;
    this.quakeT = -1;
    this.tracking = false;
    this.k = 0;                                    // 0 assembled … 1 apart, for the fit
    this.kv = 0;

    // holder: Y-up model standing on an XY card (MindAR's anchor plane, z toward the camera)
    this.holder = new THREE.Group();
    this.holder.rotation.x = Math.PI / 2;
    this.fit = new THREE.Group();
    this.holder.add(this.fit);
    this.model.root.scale.setScalar(S);
    this.fit.add(this.model.root);
    const halo = haloMesh(9.5);
    halo.raycast = () => {};
    this.model.root.add(halo);

    // fit the taken-apart pagoda on screen: shrink it and centre the stack plus the pillar beside it
    this.apartScale = Math.min(1, (this.model.height * 1.3) / this.model.explodedHeight);
    this.apartShift = -((DIM.E[0] + 2.8) / 2 - 0.4) * S;

    this.ray = new THREE.Raycaster();
    this.last = performance.now();
  }

  // ---------------------------------------------------------------- AR
  async startAR({ onStatus = () => {} } = {}){
    onStatus('Loading the scanner…');
    const { MindARThree } = await import('mindar-image-three');
    const mindar = new MindARThree({
      container: this.container, imageTargetSrc: TARGET_SRC, uiScanning: 'no', uiLoading: 'no', uiError: 'no',
      // smoother than MindAR's defaults: the pagoda is tall, so jitter at its tip shows
      filterMinCF: +(params.get('mincf') || 0.0001), filterBeta: +(params.get('beta') || 0.001),
      warmupTolerance: 3, missTolerance: 8,
    });
    this.mindar = mindar;
    const anchor = mindar.addAnchor(0);
    anchor.group.add(this.holder);
    anchor.onTargetFound = () => { this.tracking = true; this.cb.onTrack(true); };
    anchor.onTargetLost = () => { this.tracking = false; this.cb.onTrack(false); };
    onStatus('Starting camera…');
    await mindar.start();
    this.renderer = mindar.renderer;
    this.scene = mindar.scene;
    this.camera = mindar.camera;
    this.bindPointer(this.renderer.domElement, false);
    this.renderer.setAnimationLoop(() => this.frame());
    onStatus('Looking for the picture…');
  }

  // ---------------------------------------------------------------- no card: the model on a picture of the card
  async startDemo(){
    this.container.classList.add('demo');
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: params.has('shots') });
    r.setPixelRatio(Math.min(devicePixelRatio, 2));
    r.domElement.className = 'stage';
    this.container.appendChild(r.domElement);
    this.renderer = r;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.01, 50);
    this.orbit = { yaw: -0.55, pitch: 0.42, dist: 3.5, idle: 0 };

    const card = new THREE.Group();
    card.rotation.x = -Math.PI / 2;
    this.scene.add(card);
    const img = await new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = CARD_IMG; });
    const aspect = img ? img.naturalHeight / img.naturalWidth : 1.4;
    const tex = img ? new THREE.Texture(img) : null;
    if (tex){ tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.needsUpdate = true; }
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(1, aspect), new THREE.MeshBasicMaterial({ map: tex, color: tex ? 0xffffff : 0xf1e5cc }));
    paper.raycast = () => {};
    card.add(paper);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(1.004, aspect + 0.004, 0.006), new THREE.MeshBasicMaterial({ color: 0xcbb894 }));
    edge.position.z = -0.0035; edge.raycast = () => {};
    card.add(edge);
    card.add(this.holder);
    this.tracking = true;

    const resize = () => {
      const w = this.container.clientWidth, h = this.container.clientHeight;
      r.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.orbit.dist = 3.4 * Math.sqrt(Math.max(1, 0.75 / this.camera.aspect)); // a tall phone screen needs the camera further back
    };
    resize();
    addEventListener('resize', resize);
    this.bindPointer(r.domElement, true);
    r.setAnimationLoop(() => this.frame());
    this.cb.onTrack(true);
  }

  // ---------------------------------------------------------------- input
  bindPointer(el, orbit){
    el.style.touchAction = 'none';
    // in AR the canvas sits under the HUD; listen on the container so taps anywhere count
    const target = orbit ? el : this.container;
    const pts = new Map();
    let down = null, pinch0 = 0, dist0 = 0;
    target.addEventListener('pointerdown', (e) => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
      if (pts.size === 2 && orbit){ const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); dist0 = this.orbit.dist; down = null; }
      try { target.setPointerCapture(e.pointerId); } catch { /* fine */ }
    });
    target.addEventListener('pointermove', (e) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (down) down.moved += Math.abs(dx) + Math.abs(dy);
      if (!orbit) return;
      this.orbit.idle = 0;
      if (pts.size === 2){
        const [a, b] = [...pts.values()];
        this.orbit.dist = THREE.MathUtils.clamp(dist0 * pinch0 / Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)), 1.8, 8);
      } else if (!down || down.moved > 8){
        this.orbit.yaw -= dx * 0.008;
        this.orbit.pitch = THREE.MathUtils.clamp(this.orbit.pitch + dy * 0.006, 0.08, 1.35);
      }
    });
    const up = (e) => {
      pts.delete(e.pointerId);
      if (down && pts.size === 0 && down.moved < 10 && performance.now() - down.t < 450) this.tap(e.clientX, e.clientY);
      if (pts.size === 0) down = null;
    };
    target.addEventListener('pointerup', up);
    target.addEventListener('pointercancel', (e) => { pts.delete(e.pointerId); down = null; });
    if (orbit) target.addEventListener('wheel', (e) => { e.preventDefault(); this.orbit.idle = 0; this.orbit.dist = THREE.MathUtils.clamp(this.orbit.dist * (1 + e.deltaY * 0.001), 1.8, 8); }, { passive: false });
  }

  pickAt(x, y){
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
    this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert(); // MindAR writes the projection directly
    this.ray.setFromCamera(ndc, this.camera);
    const hit = this.ray.intersectObject(this.model.root, true).find((h) => h.object.userData.index != null && h.object.visible);
    return hit ? this.parts[hit.object.userData.index] : null;
  }

  tap(x, y){
    if (!this.tracking) return;
    const part = this.pickAt(x, y);
    if (!this.exploded){ this.setExploded(true); return; }
    if (part) this.select(part === this.selected ? null : part);
    else this.cb.onTapEmpty();
  }

  // ---------------------------------------------------------------- state
  setExploded(on){
    if (on === this.exploded) return;
    this.exploded = on;
    const n = this.parts.length;
    this.parts.forEach((p, i) => { p.wait = on ? (n - 1 - i) * 0.045 : i * 0.03; });
    if (!on) this.select(null);
    else this.cb.onPick(null);
  }

  select(part){
    if (this.selected) this.paintInk(this.selected, false);
    this.selected = part;
    if (part) this.paintInk(part, true);
    this.cb.onPick(part);
  }
  step(dir){
    const n = this.parts.length;
    const i = this.selected ? (this.selected.index + dir + n) % n : dir > 0 ? 0 : n - 1;
    if (!this.exploded) this.setExploded(true);
    this.select(this.parts[i]);
  }
  paintInk(part, on){
    const u = part.node.userData.ink.uniforms;
    u.uColor.value.copy(srgb(on ? INK_PICK : INK));
    u.uInk.value = (on ? INK_PX * 2.0 : INK_PX) * this.dpr();
  }
  dpr(){ return this.renderer ? this.renderer.getPixelRatio() : 1; }

  quake(){ this.quakeT = 0; }
  get quaking(){ return this.quakeT >= 0; }

  // ---------------------------------------------------------------- frame
  frame(){
    const now = performance.now();
    const dt = Math.min(0.25, (now - this.last) / 1000);
    this.last = now;
    this.renderer.getDrawingBufferSize(RES.value);
    const dpr = this.dpr();
    for (const p of this.parts) if (p !== this.selected) p.node.userData.ink.uniforms.uInk.value = INK_PX * dpr;

    // springs, sub-stepped so a slow phone still moves in real time without blowing up
    const K = 70, Cd = 2 * Math.sqrt(K) * 0.72;
    const goal = new THREE.Vector3(), zero = new THREE.Vector3();
    const n = Math.ceil(dt / (1 / 120)), h = dt / n;
    for (let s = 0; s < n; s++){
      for (const p of this.parts){
        if (p.wait > 0){ p.wait -= h; continue; }
        goal.copy(this.exploded ? p.explode : zero);
        p.vel.x += ((goal.x - p.offset.x) * K - p.vel.x * Cd) * h;
        p.vel.y += ((goal.y - p.offset.y) * K - p.vel.y * Cd) * h;
        p.offset.x += p.vel.x * h; p.offset.y += p.vel.y * h;
      }
      // the fit: shrink and recentre while apart
      this.kv += (((this.exploded ? 1 : 0) - this.k) * 30 - this.kv * 2 * Math.sqrt(30)) * h;
      this.k += this.kv * h;
    }
    const k = THREE.MathUtils.clamp(this.k, 0, 1.2);
    this.fit.scale.setScalar(1 + (this.apartScale - 1) * k);
    this.fit.position.x = this.apartShift * k;

    // earthquake: the ground shakes, each storey swings the opposite way to its neighbours
    // (the "snake dance") and the free pillar sways slowly, keeping them from swinging far
    let qx = null;
    if (this.quakeT >= 0){
      this.quakeT += dt;
      const T = 5, t = this.quakeT;
      if (t > T) this.quakeT = -1;
      else {
        const env = Math.sin(Math.PI * t / T) ** 2, w = TAU * 1.7;
        const ground = 0.5 * Math.sin(w * t) * env;
        qx = (p) => {
          if (p.id === 'kidan') return ground;
          if (p.id === 'shinbashira') return ground * 0.6 + 0.12 * Math.sin(TAU * 0.8 * t) * env;
          const m = /(\d)/.exec(p.id);
          const s = m ? +m[1] : 4;                          // the spire rides the top storey
          return ground + 0.6 * (s % 2 ? -1 : 1) * Math.sin(w * t - 0.9) * env * (0.7 + s * 0.12);
        };
      }
    }
    // the picked part keeps its colour, the rest fade toward the paper
    const ease = 1 - Math.exp(-dt * 10);
    for (const p of this.parts){
      p.node.position.set(p.offset.x + (qx ? qx(p) : 0), p.offset.y, 0);
      const f = this.selected && p !== this.selected ? 0.6 : 0;
      p.fade = (p.fade || 0) + (f - (p.fade || 0)) * ease;
      for (const m of p.node.userData.mats) m.uniforms.uFade.value = p.fade;
    }
    if (this.selected){
      const s = 1 + 0.25 * Math.sin(now / 260);
      this.selected.node.userData.ink.uniforms.uInk.value = INK_PX * 2.0 * dpr * s;
    }

    if (this.orbit){
      const o = this.orbit;
      o.idle += dt;
      if (o.idle > 4 && !params.has('still')) o.yaw += dt * 0.12;
      const h0 = this.model.height * S, h1 = this.model.explodedHeight * S * this.apartScale;
      const tgt = o.look || new THREE.Vector3(this.fit.position.x, 0.5 * (h0 + (h1 - h0) * k), 0); // o.look: a fixed aim, for close-up checks
      this.camera.position.set(tgt.x + Math.sin(o.yaw) * Math.cos(o.pitch) * o.dist, tgt.y + Math.sin(o.pitch) * o.dist, tgt.z + Math.cos(o.yaw) * Math.cos(o.pitch) * o.dist);
      this.camera.lookAt(tgt);
    }
    this.renderer.render(this.scene, this.camera);
  }

  stop(){
    try { this.renderer?.setAnimationLoop(null); } catch { /* fine */ }
    if (this.mindar){
      try { this.mindar.stop(); } catch { /* fine */ }
      this.container.querySelectorAll('video').forEach((v) => v.srcObject?.getTracks?.().forEach((t) => t.stop()));
    }
    this.container.innerHTML = '';
  }
}
