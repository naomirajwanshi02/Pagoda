// The pagoda in AR. MindAR image tracking (mind-ar 1.2.5 + three 0.160.0, the same
// pins as the other repos) only RECOGNISES and anchors to the illustration; nothing of
// the picture is drawn. The pagoda stands on it like a real model on a table: walk or
// turn the phone round it to see every side. If the picture slips out of view, the
// phone's gyroscope keeps the pagoda where it was in the room until the picture is
// found again, and then it eases back onto it.
//
// Without a picture (?demo=1) the same model stands on a plain ground and orbits.
//
// Touch the pagoda to take it apart: each part rides its own spring to its exploded
// offset, staggered from the top down. Touch a part to learn what it is; touch empty
// space to put it back together.

import * as THREE from 'three';
import { setupRenderer, environment, lights, fitShadow, roomLight, groundMeshes } from './look.js';
import { buildPagoda, DIM } from './pagoda.js';

const params = new URLSearchParams(location.search);
export const TARGET_SRC = params.get('target') || './targets.mind';
const TAU = Math.PI * 2;
const ROOF_ON_CARD = 0.6;                          // the first roof spans 60% of the card's width
const S = ROOF_ON_CARD / (2 * DIM.E[0]);           // metres → card widths
const PAPER = new THREE.Color('#e9e1d2'), GLOW = new THREE.Color('#ffb070');

// ------------------------------------------------------------------ phone orientation
// The camera's orientation from the device, as three's old DeviceOrientationControls
// computed it, so a turn of the phone can be undone on the pagoda while it is held.
const gyro = { q: new THREE.Quaternion(), ok: false, asked: false };
{
  const euler = new THREE.Euler(), zee = new THREE.Vector3(0, 0, 1), q0 = new THREE.Quaternion();
  const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
  addEventListener('deviceorientation', (e) => {
    if (e.alpha == null) return;
    const d = Math.PI / 180, orient = (screen.orientation?.angle || 0) * d;
    euler.set(e.beta * d, e.alpha * d, -e.gamma * d, 'YXZ');
    gyro.q.setFromEuler(euler).multiply(q1).multiply(q0.setFromAxisAngle(zee, -orient));
    gyro.ok = true;
  });
}
// iOS only hands out orientation after a tap asks for it.
function askGyro(){
  if (gyro.asked) return;
  gyro.asked = true;
  const D = window.DeviceOrientationEvent;
  if (D && typeof D.requestPermission === 'function') D.requestPermission().catch(() => {});
}

export class Stage {
  constructor(container, { onTrack = () => {}, onPick = () => {}, onState = () => {} } = {}){
    this.container = container;
    this.cb = { onTrack, onPick, onState };
    this.model = buildPagoda();
    this.parts = this.model.parts;
    this.exploded = false;
    this.selected = null;
    this.quakeT = -1;
    this.tracking = false;   // the picture is in view
    this.shown = false;      // the pagoda is on screen (tracked, or held by the gyro)
    this.k = 0;              // 0 assembled … 1 apart, for the fit
    this.kv = 0;

    // holder: Y-up model standing on an XY card (MindAR's anchor plane, z toward the camera)
    this.holder = new THREE.Group();
    this.holder.rotation.x = Math.PI / 2;
    this.spin = new THREE.Group();                 // a drag turns the pagoda on its base
    this.holder.add(this.spin);
    this.fit = new THREE.Group();
    this.spin.add(this.fit);
    this.model.root.scale.setScalar(S);
    this.fit.add(this.model.root);
    this.look = lights();
    this.holder.add(this.look.rig);
    for (const m of groundMeshes(0.42)) this.holder.add(m);

    // fit the taken-apart pagoda in view: shrink it and centre the stack plus the pillar beside it
    this.apartScale = Math.min(1, (this.model.height * 1.3) / this.model.explodedHeight);
    this.apartShift = -((DIM.E[0] + 2.8) / 2 - 0.4) * S;

    this.ray = new THREE.Raycaster();
    this.last = performance.now();
  }

  setupLook(){
    setupRenderer(this.renderer);
    this.scene.environment = environment(this.renderer);
  }

  // ---------------------------------------------------------------- AR
  async startAR({ onStatus = () => {} } = {}){
    onStatus('Loading the scanner…');
    const { MindARThree } = await import('mindar-image-three');
    const mindar = new MindARThree({
      container: this.container, imageTargetSrc: TARGET_SRC, uiScanning: 'no', uiLoading: 'no', uiError: 'no',
      // a little smoother than MindAR's defaults (the spire's tip shows jitter), but quick enough to walk round
      filterMinCF: +(params.get('mincf') || 0.0001), filterBeta: +(params.get('beta') || 0.005),
      warmupTolerance: 3, missTolerance: 6,
    });
    this.mindar = mindar;
    this.anchor = mindar.addAnchor(0);
    // the pagoda hangs from its own group, which copies the anchor while the picture is
    // tracked and is held in the room by the gyroscope while it is not
    this.place = new THREE.Group();
    this.place.matrixAutoUpdate = false;
    this.place.visible = false;
    this.place.add(this.holder);
    mindar.scene.add(this.place);
    this.held = { m: new THREE.Matrix4(), q: new THREE.Quaternion(), blend: 1 };
    this.anchor.onTargetFound = () => {
      this.tracking = true;
      if (this.shown) this.held.blend = 0;         // ease from the held pose back onto the picture
      this.cb.onTrack(true);
    };
    this.anchor.onTargetLost = () => { this.tracking = false; this.cb.onTrack(false); };
    onStatus('Starting camera…');
    await mindar.start();
    this.renderer = mindar.renderer;
    this.scene = mindar.scene;
    this.camera = mindar.camera;
    this.setupLook();
    this.room = roomLight(this.look, this.renderer);
    this.video = this.container.querySelector('video');
    this.bindPointer(this.container, false);
    this.renderer.setAnimationLoop(() => this.frame());
    onStatus('Looking for the picture…');
  }

  // Each frame: follow the picture, or hold still in the room with the gyroscope.
  updatePlace(dt){
    const P = this.place, H = this.held;
    if (this.tracking){
      this.anchor.group.updateMatrixWorld();
      const T = this.anchor.group.matrixWorld;
      if (H.blend < 1){
        H.blend = Math.min(1, H.blend + dt / 0.35);
        const a = decompose(P.matrix), b = decompose(T), t = 1 - (1 - H.blend) ** 3;
        a.p.lerp(b.p, t); a.q.slerp(b.q, t); a.s.lerp(b.s, t);
        P.matrix.compose(a.p, a.q, a.s);
      } else P.matrix.copy(T);
      H.m.copy(P.matrix);
      H.q.copy(gyro.q);
      P.visible = true;
    } else if (this.shown && gyro.ok){
      // the phone turned by R since the picture was lost: turn the world the other way
      const R = gyro.q.clone().invert().multiply(H.q);
      P.matrix.makeRotationFromQuaternion(R).multiply(H.m);
      P.visible = true;
    } else P.visible = false;
    P.matrixWorldNeedsUpdate = true;
    if (P.visible !== this.shown){ this.shown = P.visible; this.cb.onTrack(this.tracking, this.shown); }
  }

  // ---------------------------------------------------------------- no picture: the model on a plain ground
  async startDemo(){
    this.container.classList.add('demo');
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: params.has('shots') });
    r.setPixelRatio(Math.min(devicePixelRatio, 2));
    r.domElement.className = 'stage';
    this.container.appendChild(r.domElement);
    this.renderer = r;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.01, 50);
    this.orbit = { yaw: -0.55, pitch: 0.32, dist: 3.5, idle: 0 };
    this.setupLook();
    const ground = new THREE.Group();               // stands in for MindAR's card plane
    ground.rotation.x = -Math.PI / 2;
    ground.add(this.holder);
    this.scene.add(ground);
    this.tracking = this.shown = true;

    const resize = () => {
      const w = this.container.clientWidth, h = this.container.clientHeight;
      r.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.orbit.dist = 2.6 * Math.sqrt(Math.max(1, 0.75 / this.camera.aspect)); // a tall phone screen needs the camera further back
    };
    resize();
    addEventListener('resize', resize);
    this.bindPointer(r.domElement, true);
    r.setAnimationLoop(() => this.frame());
    this.cb.onTrack(true, true);
  }

  // ---------------------------------------------------------------- input
  // A tap picks; a one-finger drag turns the pagoda (AR) or orbits round it (demo).
  bindPointer(target, orbit){
    target.style.touchAction = 'none';
    const pts = new Map();
    let down = null, pinch0 = 0, dist0 = 0;
    target.addEventListener('pointerdown', (e) => {
      if (e.target.closest?.('button, a, .plate')) return; // the HUD handles its own taps
      askGyro();
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
      if (pts.size === 2 && orbit){ const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); dist0 = this.orbit.dist; down = null; }
    });
    target.addEventListener('pointermove', (e) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (down) down.moved += Math.abs(dx) + Math.abs(dy);
      if (down && down.moved < 8) return;
      if (!orbit){ this.spin.rotation.y += dx * 0.012; return; }
      this.orbit.idle = 0;
      if (pts.size === 2){
        const [a, b] = [...pts.values()];
        this.orbit.dist = THREE.MathUtils.clamp(dist0 * pinch0 / Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)), 1.2, 7);
      } else {
        this.orbit.yaw -= dx * 0.008;
        this.orbit.pitch = THREE.MathUtils.clamp(this.orbit.pitch + dy * 0.006, 0.05, 1.35);
      }
    });
    const up = (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      if (down && pts.size === 0 && down.moved < 10 && performance.now() - down.t < 450) this.tap(e.clientX, e.clientY);
      if (pts.size === 0) down = null;
    };
    target.addEventListener('pointerup', up);
    target.addEventListener('pointercancel', (e) => { pts.delete(e.pointerId); down = null; });
    if (orbit) target.addEventListener('wheel', (e) => { e.preventDefault(); this.orbit.idle = 0; this.orbit.dist = THREE.MathUtils.clamp(this.orbit.dist * (1 + e.deltaY * 0.001), 1.2, 7); }, { passive: false });
  }

  // The part under a screen point: the exact surface first, then (for small fingers on
  // thin parts) the nearest part whose bounding box the ray passes through.
  pickAt(x, y){
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
    this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert(); // MindAR writes the projection directly
    this.ray.setFromCamera(ndc, this.camera);
    const hit = this.ray.intersectObject(this.model.root, true).find((h) => h.object.userData.index != null);
    if (hit) return this.parts[hit.object.userData.index];
    let best = null, bestD = Infinity;
    const box = new THREE.Box3(), at = new THREE.Vector3();
    for (const p of this.parts){
      box.setFromObject(p.node);
      const grow = box.getSize(at).length() * 0.04;
      if (this.ray.ray.intersectBox(box.expandByScalar(grow), at)){
        const d = at.distanceTo(this.ray.ray.origin);
        if (d < bestD){ bestD = d; best = p; }
      }
    }
    return best;
  }

  tap(x, y){
    if (!this.shown) return;
    const part = this.pickAt(x, y);
    if (!this.exploded){ if (part) this.setExploded(true); return; }
    if (part) this.select(part === this.selected ? null : part);
    else if (this.selected) this.select(null);
    else this.setExploded(false);
  }

  // ---------------------------------------------------------------- state
  setExploded(on){
    if (on === this.exploded) return;
    this.exploded = on;
    const n = this.parts.length;
    this.parts.forEach((p, i) => { p.wait = on ? (n - 1 - i) * 0.04 : i * 0.025; });
    if (!on) this.select(null);
    else this.cb.onPick(null);
    this.cb.onState(on);
  }

  select(part){
    this.selected = part;
    this.cb.onPick(part);
  }
  step(dir){
    const n = this.parts.length;
    const i = this.selected ? (this.selected.index + dir + n) % n : dir > 0 ? 0 : n - 1;
    if (!this.exploded) this.setExploded(true);
    this.select(this.parts[i]);
  }

  quake(){ this.quakeT = 0; }
  get quaking(){ return this.quakeT >= 0; }

  // ---------------------------------------------------------------- frame
  frame(){
    const now = performance.now();
    const dt = Math.min(0.25, (now - this.last) / 1000);
    this.last = now;
    if (this.place) this.updatePlace(dt);
    this.room?.(this.video, now, dt);

    // critically damped springs (no bounce), sub-stepped so a slow phone still moves in real time
    const K = 45, Cd = 2 * Math.sqrt(K);
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
    const k = THREE.MathUtils.clamp(this.k, 0, 1);
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
    // the picked part keeps its colour and glows softly; the rest fade toward paper
    const ease = 1 - Math.exp(-dt * 10), glow = 0.1 + 0.06 * Math.sin(now / 280);
    for (const p of this.parts){
      p.node.position.set(p.offset.x + (qx ? qx(p) : 0), p.offset.y, 0);
      const f = this.selected && p !== this.selected ? 0.65 : 0;
      p.fade = (p.fade || 0) + (f - (p.fade || 0)) * ease;
      const g = p === this.selected ? glow : 0;
      for (const m of p.node.userData.mats){
        m.color.copy(m.userData.color0).lerp(PAPER, p.fade);
        m.emissive.copy(PAPER).multiplyScalar(p.fade * 0.35).lerp(GLOW, g);
      }
    }

    this.holder.updateMatrixWorld();
    fitShadow(this.look.key, this.holder.matrixWorld.getMaxScaleOnAxis(), this.exploded);

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

function decompose(m){
  const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  m.decompose(p, q, s);
  return { p, q, s };
}
