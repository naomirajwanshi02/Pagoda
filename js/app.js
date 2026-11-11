// The flow: viewfinder → the picture is found → the pagoda stands on it like a model
// on the table (walk or turn the phone round it) → touch the pagoda to take it apart,
// touch a part to learn what it is, touch empty space to put it back, shake it.
// All words go in the one card at the top, so nothing ever covers the pagoda.

import { Stage } from './stage.js';
import { PAGODA, PARTS, QUAKE } from './data.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const on = (el, v = true) => el.classList.toggle('on', v);
let stage = null, seen = false, quakeT = 0;

function showErr(e){
  console.error(e);
  $('errText').textContent = String(e?.stack || e?.message || e);
  $('err').hidden = false;
}
addEventListener('error', (e) => showErr(e.error || e.message));
addEventListener('unhandledrejection', (e) => showErr(e.reason));
$('errBtn').onclick = () => location.reload();

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
  $('prevBtn').hidden = $('nextBtn').hidden = !stage.exploded;
  card();
  hint();
}
function hint(){
  const h = !stage.shown || stage.quaking ? ''
    : !stage.exploded ? '<b>Touch the pagoda</b> to take it apart · walk round it to see every side'
      : stage.selected ? 'Touch another part · touch empty space to let go' : '<b>Touch a part</b> to see what it is · empty space puts it back';
  $('hint').innerHTML = h;
  $('hint').hidden = !h;
}

// tracking: the picture is in view; shown: the pagoda is on screen (tracked, or held by the gyroscope)
function onTrack(tracking, shown = tracking){
  on($('lost'), seen && !shown);
  on($('held'), seen && shown && !tracking);
  if (shown && !seen){
    seen = true;
    on($('guide'), false);
    if (!stage.orbit){
      on($('found'));
      setTimeout(() => on($('found'), false), 1400);
    }
    on($('hud'));
    syncControls();
  }
  if (seen) hint();
}

async function start(demo){
  stage?.stop();
  stage = new Stage($('ar'), {
    onTrack,
    onPick: () => syncControls(),
    onState: () => syncControls(),
  });
  window.__stage = stage;
  if (demo){
    on($('guide'), false);
    await stage.startDemo();
    return;
  }
  $('scanRetry').hidden = true;
  try {
    await stage.startAR({ onStatus: (t) => { $('scanStatus').textContent = t; } });
  } catch (e){
    console.warn(e);
    $('scanStatus').textContent = 'The camera could not start. Allow camera access, or try the demo.';
    $('scanRetry').hidden = false;
  }
}

$('scanSkip').onclick = () => start(true);
$('scanRetry').onclick = () => start(false);
$('quakeBtn').onclick = () => {
  stage.quake();
  syncControls();
  clearTimeout(quakeT);
  quakeT = setTimeout(syncControls, 5100);   // the card goes back to the part once the shaking stops
};
$('prevBtn').onclick = () => stage.step(-1);
$('nextBtn').onclick = () => stage.step(1);

start(params.has('demo'));
