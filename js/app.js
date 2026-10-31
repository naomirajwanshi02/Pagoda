// The flow: viewfinder → the picture is found → the pagoda stands on it and stays
// tracked → tap to take it apart, tap a part to learn what it is, shake it.

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
      ? `Taken apart into ${PARTS.length} parts, bottom to top. Tap any part, or step through them with the arrows.`
      : PAGODA.blurb;
    $('ncCount').textContent = `${PARTS.length} parts`;
  }
  $('ncState').textContent = stage?.exploded ? 'taken apart' : 'assembled';
  nc.classList.remove('pop'); void nc.offsetWidth; nc.classList.add('pop');
}

function syncControls(){
  const apart = stage.exploded;
  $('explodeBtn').textContent = apart ? 'Put it back' : 'Take it apart';
  $('prevBtn').hidden = $('nextBtn').hidden = !apart;
  hint();
}
function hint(){
  const h = !stage.tracking ? ''
    : stage.quaking ? 'Each storey sways <b>the opposite way</b> to its neighbours: the "snake dance"'
      : !stage.exploded ? '<b>Tap the pagoda</b> to take it apart'
        : stage.selected ? 'Tap another part, or <b>Put it back</b>' : '<b>Tap a part</b> to see what it does';
  $('hint').innerHTML = h;
  $('hint').hidden = !h;
}

function onTrack(found){
  on($('lost'), !found && seen);
  if (found && !seen){
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
    onTapEmpty: () => { if (stage.selected) stage.select(null); },
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
$('explodeBtn').onclick = () => { stage.setExploded(!stage.exploded); syncControls(); };
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
