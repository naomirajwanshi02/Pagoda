// The flow: viewfinder → the picture is found → the pagoda stands on it like a model
// on the table (walk or turn the phone round it) → touch the pagoda to take it apart,
// touch a part to learn what it is, touch empty space to put it back, shake it.

import { Stage } from './stage.js';
import { PAGODA, PARTS, FACTS } from './data.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const on = (el, v = true) => el.classList.toggle('on', v);
let stage = null, seen = false, factI = 0;

function showErr(e){
  console.error(e);
  $('errText').textContent = String(e?.stack || e?.message || e);
  $('err').hidden = false;
}
addEventListener('error', (e) => showErr(e.error || e.message));
addEventListener('unhandledrejection', (e) => showErr(e.reason));
$('errBtn').onclick = () => location.reload();

let toastT = 0;
function toast(html, ms = 4200){
  $('toast').innerHTML = html;
  on($('toast'));
  clearTimeout(toastT);
  toastT = setTimeout(() => on($('toast'), false), ms);
}

const pad = (n) => String(n).padStart(2, '0');
function card(part){
  const nc = $('namecard');
  if (part){
    $('ncFig').textContent = `Fig. ${pad(part.index + 1)}`;
    $('ncGroup').textContent = part.group;
    $('ncName').textContent = part.name;
    $('ncJp').textContent = part.jp;
    $('ncBlurb').textContent = part.blurb;
    $('ncCount').textContent = `${pad(part.index + 1)} / ${PARTS.length}`;
  } else {
    $('ncFig').textContent = 'Fig. 01';
    $('ncGroup').textContent = 'Kyoto · Nara';
    $('ncName').textContent = PAGODA.name;
    $('ncJp').textContent = PAGODA.jp;
    $('ncBlurb').textContent = stage?.exploded
      ? `Taken apart into ${PARTS.length} parts, bottom to top. Touch any part, or step through them with the arrows. Touch empty space to put it back together.`
      : PAGODA.blurb;
    $('ncCount').textContent = `${PARTS.length} parts`;
  }
  $('ncState').textContent = stage?.exploded ? 'taken apart' : 'assembled';
  nc.classList.remove('pop'); void nc.offsetWidth; nc.classList.add('pop');
}

function syncControls(){
  const apart = stage.exploded;
  $('prevBtn').hidden = $('nextBtn').hidden = !apart;
  hint();
}
function hint(){
  const h = !stage.shown ? ''
    : stage.quaking ? 'Each storey sways <b>the opposite way</b> to its neighbours: the "snake dance"'
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
    card(null);
    syncControls();
  }
  if (seen) hint();
}

async function start(demo){
  stage?.stop();
  stage = new Stage($('ar'), {
    onTrack,
    onPick: (p) => { card(p); syncControls(); },
    onState: () => { card(stage.selected); syncControls(); },
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
  hint();
  setTimeout(hint, 5100);
  toast('<b>Earthquake!</b> The storeys are only stacked, not nailed, so each one slides a little and the free-hanging <b>shinbashira</b> stops them swinging too far.', 5200);
};
$('prevBtn').onclick = () => stage.step(-1);
$('nextBtn').onclick = () => stage.step(1);
$('factBtn').onclick = () => { toast(`<b>Did you know?</b> ${FACTS[factI++ % FACTS.length]}`); };

start(params.has('demo'));
