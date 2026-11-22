// The flow, the same as the sibling apps (Shinto_Shrine, Kumamoto_Castle, Bonsai):
// 0 allow the camera (skipped if already allowed) → 1 viewfinder: find the picture →
// "Found it!" → 2 instruction card → 3 the pagoda stands on the picture like a model on
// the table: touch it to take it apart, touch a part to learn what it is, touch empty
// space to put it back, shake it. All words go in the one card at the top, so nothing
// ever covers the pagoda.

import { Stage } from './stage.js';
import { PAGODA, PARTS, QUAKE } from './data.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const on = (el, v = true) => el.classList.toggle('on', v);
const show = (id) => document.querySelectorAll('.screen').forEach((s) => on(s, s.id === id));
let stage = null, phase = 'perm', demo = false, quakeT = 0;

function showErr(e){
  console.error(e);
  $('errText').textContent = String(e?.stack || e?.message || e);
  $('err').hidden = false;
}
addEventListener('error', (e) => showErr(e.error || e.message));
addEventListener('unhandledrejection', (e) => showErr(e.reason));
$('errBtn').onclick = () => location.reload();

// ------------------------------------------------------------ 0 · camera permission
async function cameraGranted(){
  try { return (await navigator.permissions?.query({ name: 'camera' }))?.state === 'granted'; } catch { return false; }
}
async function openPerm(){
  phase = 'perm';
  if (await cameraGranted()) return openScan();
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia){
    $('permStatus').textContent = 'This browser cannot use the camera here. Open the page over https in Safari or Chrome.';
    $('permBtn').disabled = true;
  }
  show('perm');
}
async function askCamera(){
  $('permBtn').disabled = true;
  $('permStatus').textContent = 'Waiting for you to tap “Allow”…';
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    stream.getTracks().forEach((t) => t.stop());
    $('permStatus').textContent = '';
    openScan();
  } catch (err){
    console.error(err);
    $('permStatus').textContent = err?.name === 'NotAllowedError'
      ? 'The camera was blocked. Tap the “aA” or lock icon next to the address, allow the camera for this site, then tap Allow camera again.'
      : 'The camera did not start. Close other apps that use the camera and try again.';
  } finally { $('permBtn').disabled = false; }
}

// ------------------------------------------------------------ 1 · find the picture
function newStage(){
  stage?.stop();
  stage = new Stage($('ar'), {
    onTrack,
    onPick: () => syncControls(),
    onState: () => syncControls(),
  });
  window.__stage = stage;
}
async function openScan(){
  phase = 'scan';
  demo = false;
  show(null);
  on($('hud'), false);
  on($('guide'));
  $('scanRetry').hidden = true;
  newStage();
  try {
    await stage.startAR({ onStatus: (t) => { if (phase === 'scan') $('scanStatus').textContent = t; } });
  } catch (e){
    console.warn(e);
    $('scanStatus').textContent = 'The camera could not start. Allow camera access, or try the demo.';
    $('scanRetry').hidden = false;
  }
}

// tracking: the picture is in view; shown: the pagoda is on screen (tracked, or held by the gyroscope)
function onTrack(tracking, shown = tracking){
  if (phase === 'scan' && shown){
    phase = 'found';
    on($('guide'), false);
    on($('found'));
    setTimeout(() => { on($('found'), false); openIntro(); }, 1300);
  }
  if (phase !== 'view') return;
  on($('lost'), !shown);
  on($('held'), shown && !tracking);
  hint();
}

// ------------------------------------------------------------ 2 · instructions
function openIntro(){
  phase = 'intro';
  on($('guide'), false);
  $('camStatus').textContent = '';
  show('intro');
}

// ------------------------------------------------------------ 3 · the pagoda
async function begin(){
  show(null);
  if (demo){ newStage(); await stage.startDemo(); }
  phase = 'view';
  stage.ready = true;
  on($('hud'));
  syncControls();
  onTrack(stage.tracking, stage.shown);
}

// The top card: the earthquake while it shakes, else the picked part, else the pagoda.
function card(){
  const part = stage.selected;
  const [name, blurb] = stage.quaking ? [QUAKE.name, QUAKE.blurb]
    : part ? [part.name, part.blurb]
      : [PAGODA.name, stage.exploded
        ? `Taken apart into ${PARTS.length} parts, bottom to top. Touch any part, or step through them with the arrows. Touch empty space to put it back together.`
        : PAGODA.blurb];
  if ($('ncName').textContent === name && $('ncBlurb').textContent === blurb) return;
  $('ncName').textContent = name;
  $('ncBlurb').textContent = blurb;
  $('ncBlurb').scrollTop = 0;
  const nc = $('namecard');
  nc.classList.remove('pop'); void nc.offsetWidth; nc.classList.add('pop');
}

function syncControls(){
  if (phase !== 'view') return;
  $('prevBtn').hidden = $('nextBtn').hidden = !stage.exploded;
  card();
  hint();
}
function hint(){
  const h = !stage.shown || stage.quaking ? ''
    : !stage.exploded ? '<b>Touch the pagoda</b> to take it apart.<br>Walk round it to see every side.'
      : stage.selected ? 'Touch another part.<br>Touch empty space to let go.' : '<b>Touch a part</b> to see what it is.<br>Touch empty space to put it back.';
  $('hint').innerHTML = h;
  $('hint').hidden = !h;
}

$('permBtn').onclick = askCamera;
$('scanSkip').onclick = () => { stage?.stop(); demo = true; openIntro(); };
$('scanRetry').onclick = openScan;
$('goBtn').onclick = begin;
$('quakeBtn').onclick = () => {
  stage.quake();
  syncControls();
  clearTimeout(quakeT);
  quakeT = setTimeout(syncControls, 5100);   // the card goes back to the part once the shaking stops
};
$('prevBtn').onclick = () => stage.step(-1);
$('nextBtn').onclick = () => stage.step(1);

if (params.has('demo')){ demo = true; openIntro(); }
else openPerm();
