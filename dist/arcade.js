import {encounters, shuffleEncounters} from './arcade-events.js?v=84efb89a5679';

// Row order matches the six-frame effect atlas. Michiko and the tentacle also have full-size cast animations.
const effectRows = ['statue','fog','chain','web','lizard','mirror','wax','bomb','rocket','violin',
 'water','fence','cat','trap','wax-drop','cipher','puppet','bell','note','butterfly'];
const storageKey = 'manor-arcade-surprise-nightmare-v1';
const oldStorageKey = 'manor-arcade-surprise-best-v1';
const actions = {dodge:'데하',hold:'바라보기',lane:'방향 선택',gauge:'교정',beat:'박자 맞히기'};
const hints = {dodge:'공격이 닿기 직전, 데하',hold:'모습을 드러내면 길게 누르기',lane:'열린 길이 보이면 방향 선택',
 gauge:'바늘을 밝은 칸에 맞추세요',beat:'음표가 박자선과 겹치면 입력'};
const stopScenes = new Set(['warning','active','result']);
function savedBest(key=storageKey) {
 try {
  const n = Number(localStorage.getItem(key));
  return Number.isSafeInteger(n) && n > 0 ? n : 0;
 } catch { return 0; }
}

export function encounterTiming(encounter, round) {
 const level=Math.min(20,Math.max(0,round-1));
 const sweep=1660-level*23;
 const width=(encounter.kind==='beat'?.056:.061)-level*.00095;
 const impact={statue:.59,fog:.55,chain:.56,web:.48,tentacle:.60,lizard:.63,mirror:.58};
 const window=245-level*4;
 const hitAt=Math.round((360-level*4)*(impact[encounter.effect]||.55)/.55);
 const duration={dodge:hitAt+window,hold:560-level*8,lane:855-level*16,gauge:sweep,beat:sweep-80}[encounter.kind];
 return {duration,hitAt,window,width,hold:encounter.variant==='long'?630:480,
  tell:Math.max(430,760-level*14)+(encounter.variant==='fusion'?215:0)};
}
export function mountArcade(root) {
 const doc = root.ownerDocument, win = doc.defaultView;
 doc.documentElement.dataset.arcade = 'on';
 root.innerHTML = `<section class="px-arcade">
  <div class="px-wipe" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
  <header class="px-heading"><h1><span class="px-pad" aria-hidden="true"></span>아케이드</h1><div class="px-best">악몽 최고 <b data-best>0</b>점</div></header>
  <section class="px-cabinet" aria-label="장원의 돌발전" data-phase="idle">
   <div class="px-hud"><span class="px-hearts" role="img" aria-label="남은 하트 3개"><i></i><i></i><i></i></span><span class="px-round">라운드 <b data-round>0</b></span><span class="px-points">점수 <b data-score>0</b></span><button class="px-pause" type="button" aria-label="일시 정지" hidden>Ⅱ</button></div>
   <div class="px-scene">
    <div class="px-land" aria-hidden="true"></div>
    <div class="px-veil" aria-hidden="true"></div>
    <div class="px-sign"><span>악몽 난이도</span><h2>장원의 돌발전</h2></div>
    <div class="px-signpost" hidden><span data-hunter></span><strong data-name></strong></div>
    <div class="px-fog" aria-hidden="true"></div>
    <div class="px-hazard" aria-hidden="true"></div>
    <div class="px-hero" role="img" aria-label="공구함을 든 정원사"><i class="cast-cell"></i></div>
    <div class="px-foe" aria-hidden="true"><i class="effect-cell"></i></div>
    <div class="px-cast" aria-hidden="true"><i class="cast-cell"></i></div>
    <span class="px-dodge-signal" aria-hidden="true">데하!</span>
    <div class="px-direction" hidden aria-hidden="true"></div>
    <div class="px-meter" hidden aria-hidden="true"><div class="px-track"><i class="px-zone"></i><i class="px-marker"></i></div><span class="px-meter-label"></span></div>
   </div>
   <div class="px-console">
    <div class="px-portrait" aria-hidden="true"><i class="cast-cell"></i></div>
    <div class="px-dialogue" role="status" aria-live="polite" aria-atomic="true"><strong></strong><span></span></div>
    <div class="px-inputs"><button type="button" class="px-button px-primary"></button><div class="px-lanes" hidden><button type="button" class="px-button" data-side="left">◀ 왼쪽</button><button type="button" class="px-button" data-side="right">오른쪽 ▶</button></div></div>
   </div>
  </section>
  <details class="px-help"><summary>조작법</summary><p>터치하거나 스페이스바를 누르세요. 방향을 고를 때는 화면 버튼이나 ← → 키를 사용하세요. 회피는 정원사 곁에 ‘데하!’가 뜨는 순간 누르세요. 나비 떼 속에서 미치코가 모습을 드러내면 버튼을 길게 눌러 시선을 유지하세요. 교정과 조율은 바늘이나 음표가 밝은 구간을 지날 때 누르세요.</p><p>하트 3개로 시작합니다. 성공하면 1점, 완벽한 교정이나 조율은 2점입니다. 라운드가 올라갈수록 입력할 수 있는 시간이 짧아집니다.</p><p data-legacy hidden></p></details>
 </section>`;
 const q = selector=>root.querySelector(selector);
 const board=q('.px-cabinet'), primary=q('.px-primary'), laneButtons=q('.px-lanes'), controls=q('.px-inputs');
 const hudRound=q('[data-round]'), hudScore=q('[data-score]'), hudBest=q('[data-best]'), hearts=q('.px-hearts');
 const pauseButton=q('.px-pause'), signpost=q('.px-signpost'), meter=q('.px-meter'), direction=q('.px-direction');
 const dialogue=q('.px-dialogue strong'), caption=q('.px-dialogue span'), wipe=q('.px-wipe');
 doc.body.append(wipe);
 const oldBest=savedBest(oldStorageKey);
 if(oldBest){const old=q('[data-legacy]');old.textContent='이전 난이도 최고 기록 · '+oldBest+'점';old.hidden=false;}
 let phase='idle', encounter=null, deck=[], score=0, lives=3, round=0, best=savedBest();
 let timer=0, frame=0, releaseAt=0, span=0, center=.65, half=.06, beatsLeft=1, timing;
 let safeSide='', held='', heldAt=0, pausedFrom='', disposed=false, allPerfect=true;
 function setPhase(value) { phase=value; board.dataset.phase=value; }
 function message(title, hint) { dialogue.textContent=title; caption.textContent=hint; }
 function timingOff() { win.clearTimeout(timer);win.cancelAnimationFrame(frame); }
 function later(task, delay) { timer=win.setTimeout(task,delay); }
 function progress(value) { meter.style.setProperty('--progress',value*100+'%'); }
 function showScore() {
  hudRound.textContent=String(round); hudScore.textContent=String(score); hudBest.textContent=String(best);
  hearts.setAttribute('aria-label','남은 하트 '+lives+'개');
  [...hearts.children].forEach((heart,i)=>heart.dataset.empty=String(i>=lives));
 }
 function buttons(label, lanes=false) {
  const focus=doc.activeElement, switchFocus=controls.contains(focus);
  laneButtons.hidden=!lanes; primary.hidden=lanes; primary.textContent=label;
  if(switchFocus && !focus.getClientRects().length) (lanes?laneButtons.firstElementChild:primary).focus({preventScroll:true});
 }
 function action() { return encounter.hunter==='밀랍인형사' && encounter.kind==='hold'?'엄폐하기':actions[encounter.kind]; }
 function gauge() { return encounter.kind==='gauge'||encounter.kind==='beat'; }
 function resetVisuals() {
  delete board.dataset.hit; delete board.dataset.held; delete board.dataset.side;
  delete board.dataset.ready; delete board.dataset.performance; meter.hidden=true; direction.hidden=true; held='';
 }
 function setGauge() {
  half=timing.width;
  center=encounter.kind==='beat'?.67+Math.random()*.14:.32+Math.random()*.44;
  meter.style.setProperty('--start',(center-half)*100+'%'); meter.style.setProperty('--width',half*200+'%');
  progress(encounter.variant==='reverse'?1:0);meter.hidden=false;
  q('.px-meter-label').textContent=encounter.kind==='beat'?'♪  박자선':encounter.variant==='reverse'?'◀  역방향 교정':'교정 구간';
 }
 function gaugePosition(elapsed) {
  const pos=Math.max(0,Math.min(1,elapsed/span));
  return encounter.variant==='reverse'?1-pos:pos;
 }
 function tick(now) {
  if(phase!=='active') return;
  const elapsed=now-releaseAt;
  if(held) {
   const value=(now-heldAt)/timing.hold;
   progress(Math.min(1,value));
   if(value>=1) { finish(true,action()==='엄폐하기'?'엄폐 성공!':'생멸을 막았어요!');return; }
  } else if(elapsed>=span) { finish(false,gauge()?'타이밍을 놓쳤어요.':'한발 늦었어요.');return; }
  if(encounter.kind==='dodge' && elapsed>=timing.hitAt && !board.dataset.ready) {
   board.dataset.ready='yes'; caption.textContent='지금 데하!';
  }
  if(gauge())progress(gaugePosition(elapsed));
  frame=win.requestAnimationFrame(tick);
 }
 function trigger() {
  frame=win.requestAnimationFrame(now=>{
   if(disposed||phase!=='warning')return;
   setPhase('active');board.dataset.performance='strike';releaseAt=now; q('[data-name]').textContent=encounter.name;
   span=timing.duration;
   board.style.setProperty('--travel',span+'ms');
   let hint=encounter.cue;
   if(encounter.kind==='lane') {
    direction.hidden=false;direction.textContent=safeSide==='left'?'◀ 왼쪽 길':'오른쪽 길 ▶';
    board.dataset.side=safeSide;hint+=' '+(safeSide==='left'?'왼쪽':'오른쪽')+'으로 피하세요.';
   }
   if(gauge())setGauge();
   message(hint,encounter.kind==='hold'?'공격이 멈출 때까지 누르고 계세요.':encounter.kind==='dodge'?'공격이 닿을 때 누르세요.':gauge()&&beatsLeft===2?'첫 번째 입력':action());
   frame=win.requestAnimationFrame(tick);
  });
 }
 function warn() {
  timingOff();resetVisuals();setPhase('warning');
  board.dataset.kind=encounter.kind;board.dataset.variant=encounter.variant;board.dataset.effect=encounter.effect;
  board.dataset.performance='tell';timing=encounterTiming(encounter,round);
  beatsLeft=encounter.variant==='double'?2:1;allPerfect=true;
  safeSide=Math.random()<.5?'left':'right';
  const row=effectRows.indexOf(encounter.effect);
  if(row>=0)board.style.setProperty('--effect-row',row*100/(effectRows.length-1)+'%');
  signpost.hidden=false;q('[data-hunter]').textContent=encounter.hunter;q('[data-name]').textContent=encounter.variant==='fusion'?'조각상':encounter.name;
  buttons(action(),encounter.kind==='lane');pauseButton.hidden=false;
  message(encounter.warning,hints[encounter.kind]);showScore();
  const delay=timing.tell+Math.random()*480;
  board.style.setProperty('--tell',delay+'ms');later(trigger,delay);
 }
 function next() {
  if(!deck.length)deck=shuffleEncounters(Math.random,encounter?.kind);
  encounter=deck.shift();round++;warn();
 }
 function begin() {
  lives=3;score=0;round=0;deck=[];next();
 }
 function saveRecord() {
  best=Math.max(best,savedBest());
  if(score<=best)return;
  best=score;
  try { localStorage.setItem(storageKey,String(best)); } catch {}
 }
 function finish(hit,label,points=1) {
  if(phase!=='active'&&phase!=='warning')return;
  if(phase==='warning')delete board.dataset.performance;
  timingOff();held='';delete board.dataset.held;delete board.dataset.ready;direction.hidden=true;meter.hidden=true;
  if(hit){score+=points;saveRecord();} else lives--;
  board.dataset.hit=hit?'yes':'no';showScore();setPhase(lives?'result':'over');
  buttons(lives?'다음 사건 대기':'다시 도전');pauseButton.hidden=!lives;
  if(!lives){message('돌발전 종료 · '+score+'점',round+'번째 사건에서 '+label);return;}
  message(label,hit?'+'+points+'점 · 다음 사건이 다가와요.':'하트가 하나 줄었어요.');
  later(next,Math.max(740,990-round*12));
 }
 function respond(choice,source) {
  if(phase==='idle'||phase==='over'){begin();return;}
  if(phase==='paused'){resume();return;}
  if(phase==='warning'){finish(false,'너무 일찍 움직였어요.');return;}
  if(phase!=='active'||held)return;
  const elapsed=win.performance.now()-releaseAt;
  if(elapsed>=span){finish(false,'한발 늦었어요.');return;}
  if(encounter.kind==='hold') {
   if(!source)return;
   held=source;heldAt=win.performance.now();board.dataset.held='yes';meter.hidden=false;progress(0);
   q('.px-meter-label').textContent='유지 중';message(action()==='엄폐하기'?'몸을 숨겼어요.':'바라보고 있어요.','표시가 찰 때까지 누르고 계세요.');return;
  }
  if(encounter.kind==='lane') {
   if(!choice)return;
   const ok=choice===safeSide;finish(ok,ok?'열린 길로 피했어요!':'위험한 쪽으로 움직였어요.');return;
  }
  if(gauge()) {
   const distance=Math.abs(gaugePosition(elapsed)-center);
   if(distance>half){finish(false,'타이밍이 어긋났어요.');return;}
   allPerfect=allPerfect&&distance<=half*.34;
   if(--beatsLeft>0){
    span=Math.round(span*.87);board.style.setProperty('--travel',span+'ms');
    setGauge();releaseAt=win.performance.now();
    message('한 번 더!',encounter.kind==='beat'?'다음 음표를 맞히세요.':'다음 교정 구간을 맞히세요.');return;
   }
   finish(true,allPerfect?'완벽해요!':encounter.kind==='beat'?'조율 성공!':'교정 성공!',allPerfect?2:1);return;
  }
  if(elapsed<timing.hitAt){finish(false,'데하가 너무 빨랐어요.');return;}
  finish(true,'데하로 피했어요!');
 }
 function release(source) {
  if(phase==='active'&&source===held) {
   const duration=win.performance.now()-heldAt;
   if(duration>=timing.hold) finish(true,action()==='엄폐하기'?'엄폐 성공!':'생멸을 막았어요!');
   else finish(false,'조금 더 오래 눌러주세요.');
  }
 }
 function pause() {
  if(!stopScenes.has(phase))return;
  pausedFrom=phase;pointer=null;timingOff();resetVisuals();setPhase('paused');pauseButton.hidden=true;
  buttons('이어서 하기');message('잠시 멈췄어요.',pausedFrom==='result'?'다음 사건부터 이어갑니다.':'이 사건부터 다시 시작합니다.');
 }
 function resume() {
  if(doc.hidden||panelOpen())return;
  if(pausedFrom==='result')next();else warn();
 }
 function panelOpen() {return !!doc.querySelector('dialog[open],.category-nav[data-expanded="true"]');}
 let pointer=null, swallowClick=false, pointerEnded=0;
 function down(e) {
  const b=e.target.closest('button');if(!b||e.button!==0||!e.isPrimary||pointer!==null)return;
  pointer=e.pointerId;swallowClick=true;
  b.setPointerCapture?.(pointer);respond(b.dataset.side,'p'+pointer);
 }
 function up(e) {
  if(pointer!==e.pointerId)return;
  const id=pointer;pointer=null;pointerEnded=win.performance.now();release('p'+id);
 }
 function click(e) {
  const b=e.target.closest('button');if(!b)return;
  if(swallowClick&&(pointer!==null||e.detail>0||win.performance.now()-pointerEnded<500)){swallowClick=false;return;}
  swallowClick=false;
  if(phase==='active'&&encounter.kind==='hold'&&!held) {
   // Assistive technology activation can deliver just a click, without press/release.
   respond(null,'assist');
  } else respond(b.dataset.side,'');
 }
 const keys={Space:'',Enter:'',ArrowLeft:'left',ArrowRight:'right'};
 function keyDown(e) {
  if(!(e.code in keys)||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||e.defaultPrevented||panelOpen())return;
  if(e.target.isContentEditable||(!controls.contains(e.target)&&e.target.closest?.('button,a,summary,input,textarea,select')))return;
  const side=keys[e.code]||e.target.closest?.('[data-side]')?.dataset.side;
  if(e.code.startsWith('Arrow')&&(encounter?.kind!=='lane'||!['active','warning'].includes(phase)))return;
  if(encounter?.kind==='lane'&&!side&&['active','warning'].includes(phase))return;
  e.preventDefault();swallowClick=false;if(!e.repeat)respond(side,'k'+e.code);
 }
 function keyUp(e){release('k'+e.code);}
 function visibility(){if(doc.hidden)pause();}
 function onPause(){pause();if(phase==='paused')primary.focus({preventScroll:true});}
 const overlayGuard=new win.MutationObserver(()=>{if(stopScenes.has(phase)&&panelOpen())pause();});
 for(const el of doc.querySelectorAll('.category-nav,dialog'))overlayGuard.observe(el,{attributes:true,attributeFilter:['open','data-expanded']});
 const listeners=[[controls,'pointerdown',down],[controls,'pointerup',up],[controls,'pointercancel',up],
  [controls,'lostpointercapture',up],[controls,'click',click],[pauseButton,'click',onPause],[doc,'keydown',keyDown],
  [doc,'keyup',keyUp],[doc,'visibilitychange',visibility],[win,'blur',pause],[win,'pagehide',pause]];
 for(const [el,event,fn] of listeners)el.addEventListener(event,fn);
 buttons('돌발전 시작');message('정원사로 장원의 추격에서 살아남으세요.',encounters.length+'가지 돌발 상황 · 하트 3개');showScore();
 const wipeTimer=win.setTimeout(()=>wipe.remove(),530);
 return ()=>{
  disposed=true;timingOff();overlayGuard.disconnect();win.clearTimeout(wipeTimer);wipe.remove();delete doc.documentElement.dataset.arcade;
  for(const [el,event,fn] of listeners)el.removeEventListener(event,fn);
 };
}
