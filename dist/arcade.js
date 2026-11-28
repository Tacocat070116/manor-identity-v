import {encounters, shuffleEncounters, dealStages} from './arcade-events.js?v=589d863a5ba0';

// Row order matches the six-frame effect atlas. Michiko and the tentacle also have full-size cast animations.
const effectRows = ['statue','fog','chain','web','lizard','mirror','wax','bomb','rocket','violin',
 'water','fence','cat','trap','wax-drop','cipher','puppet','bell','note','butterfly'];
const extraRows=['camera','umbrella','soul','wheel','pallet','gate'];
// Sheet order follows the model-rendered cast. Michiko, Luchino and Smiley Face use their own attack poses.
const hunterRows=['조각가','리퍼','사냥터지기','거미','노란 옷의 왕','블러디 퀸','밀랍인형사','수위 26호','바이올리니스트',
 '나이아스','광기의 눈','사도','우산의 영혼','사진사','울보','파멸의 바퀴','기계공','작곡가','백무상'];
const storageKey = 'manor-arcade-surprise-nightmare-v1';
const oldStorageKey = 'manor-arcade-surprise-best-v1';
const appearanceMs=700;
const actions = {dodge:'데하',tap:'바라보기',lane:'방향 선택',gauge:'교정',beat:'박자 맞히기'};
const hints = {dodge:'공격이 닿기 직전, 데하',tap:'미치코가 나타나면 한 번 누르세요.',lane:'열린 길이 보이면 방향 선택',
 gauge:'바늘을 밝은 칸에 맞추세요',beat:'음표가 박자선과 겹치면 입력'};
const stopScenes = new Set(['warning','active','result']);
function savedBest(key=storageKey) {
 try {
  const n = Number(localStorage.getItem(key));
  return Number.isSafeInteger(n) && n > 0 ? n : 0;
 } catch { return 0; }
}

export function encounterTiming(encounter, round, pace=1) {
 const level=Math.min(20,Math.max(0,round-1));
 const sweep=Math.round((1660-level*23)*pace);
 const width=(encounter.kind==='beat'?.056:.061)-level*.00095;
 const impact={statue:.59,fog:.55,chain:.56,web:.48,tentacle:.60,lizard:.63,mirror:.58};
 const window=245-level*4;
 const incoming=encounter.effect==='rocket'||encounter.effect==='lizard';
 const hitAt=incoming?0:Math.round(pace*(360-level*4)*(impact[encounter.effect]||.55)/.55);
 const duration={dodge:hitAt+window,tap:560-level*8,lane:Math.round((855-level*16)*pace),gauge:sweep,beat:sweep-80}[encounter.kind];
 return {duration,hitAt,window,width};
}
export function preloadArcadeSprites() {
 // Decode the shared sheets before the first timed cue, including on a cold mobile cache.
 return Promise.all(['cast-motion','hunter-motion','skill-motion','encounter-motion','gardener-portrait'].map(name=>{
  const sprite=new Image();
  sprite.src=new URL('./assets/arcade/'+name+'.png',import.meta.url).href;
  return sprite.decode();
 }));
}
export function mountArcade(root) {
 const doc = root.ownerDocument, win = doc.defaultView;
 doc.documentElement.dataset.arcade = 'on';
 root.innerHTML = `<section class="px-arcade">
  <div class="px-wipe" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
  <header class="px-heading"><h1><span class="px-pad" aria-hidden="true"></span>아케이드</h1><div class="px-best">악몽 최고 <b data-best>0</b>점</div></header>
  <section class="px-cabinet" aria-label="장원의 돌발전" data-phase="idle" data-scene="idle">
   <div class="px-hud"><span class="px-hearts" role="img" aria-label="남은 하트 3개"><i></i><i></i><i></i></span><span class="px-round">라운드 <b data-round>0</b></span><span class="px-points">점수 <b data-score>0</b></span>
    <span class="px-reaction" role="img" aria-label="평균 반응 시간 · 측정 전" title="신호가 뜬 뒤 첫 입력까지의 평균 시간"><i aria-hidden="true"></i><span>평균 <b data-average>—</b> ms</span></span>
    <span class="px-run-actions" hidden><button class="px-pause" type="button" aria-label="일시 정지" title="일시 정지"><i aria-hidden="true"></i></button><button class="px-stop" type="button" aria-label="게임 중단" title="게임 중단"><i aria-hidden="true"></i></button></span></div>
   <div class="px-scene">
    <div class="px-land" aria-hidden="true"></div>
    <div class="px-veil" aria-hidden="true"></div>
    <div class="px-sign"><span>악몽 난이도</span><h2>장원의 돌발전</h2></div>
    <div class="px-signpost" hidden><span data-hunter></span><strong data-name></strong></div>
    <div class="px-fog" aria-hidden="true"></div>
    <div class="px-hazard" aria-hidden="true"></div>
    <div class="px-actors"><div class="px-hero" role="img" aria-label="공구함을 든 정원사"><i class="cast-cell"></i></div>
    <div class="px-hunter" aria-hidden="true" hidden><i class="hunter-cell"></i></div>
    <div class="px-foe" aria-hidden="true"><i class="effect-cell"></i></div>
    <div class="px-cast" aria-hidden="true"><i class="cast-cell"></i></div></div>
    <span class="px-dodge-signal" aria-hidden="true">데하!</span>
    <div class="px-direction" hidden aria-hidden="true"></div>
    <div class="px-meter" hidden aria-hidden="true"><div class="px-track"><i class="px-zone"></i><i class="px-marker"></i></div><span class="px-meter-label"></span></div>
    <div class="px-pause-menu" role="group" aria-label="게임 일시 정지" hidden><strong>일시 정지</strong><div><button type="button" class="px-button px-resume">재개</button><button type="button" class="px-button px-restart">다시하기</button></div></div>
   </div>
   <div class="px-console">
    <div class="px-portrait" aria-hidden="true"></div>
    <div class="px-dialogue" role="status" aria-live="polite" aria-atomic="true"><strong></strong><span></span><span class="px-floor-cue"></span></div>
    <div class="px-inputs"><button type="button" class="px-button px-primary"></button><div class="px-lanes" hidden><button type="button" class="px-button" data-side="left">◀ 왼쪽</button><button type="button" class="px-button" data-side="right">오른쪽 ▶</button></div></div>
   </div>
  </section>
  <details class="px-help"><summary>조작법</summary><p>터치하거나 스페이스바를 누르세요. 방향을 고를 때는 화면 버튼이나 ← → 키를 사용하세요. 회피는 정원사 곁에 ‘데하!’가 뜨는 순간 누르세요. 미치코가 나타나면 바라보기를, 밀랍이나 섬광이 보이면 엄폐하기를 한 번 누르세요. 교정과 조율은 바늘이나 음표가 밝은 구간을 지날 때 누르세요.</p><p>연속 사건에서는 첫 상황을 넘기면 다음 공격이 이어집니다. 하트 3개로 시작합니다. 성공하면 1점, 완벽한 교정이나 조율은 2점입니다. 라운드가 올라갈수록 입력할 수 있는 시간이 짧아집니다. 상단 시계는 이번 도전에서 신호를 보고 누르기까지 걸린 평균 시간입니다. 교정과 조율은 바늘이나 음표가 판정 구간에 들어온 순간부터 잽니다.</p><p data-legacy hidden></p></details>
 </section>`;
 const q = selector=>root.querySelector(selector);
 const board=q('.px-cabinet'), primary=q('.px-primary'), laneButtons=q('.px-lanes'), controls=q('.px-inputs');
 const hunterSprite=q('.px-hunter');
 hunterSprite.style.setProperty('--sheet-height',hunterRows.length*100+'%');
 const hudRound=q('[data-round]'), hudScore=q('[data-score]'), hudBest=q('[data-best]'), hearts=q('.px-hearts');
 const runActions=q('.px-run-actions'), pauseMenu=q('.px-pause-menu'), resumeButton=q('.px-resume');
 const reaction=q('.px-reaction'), average=q('[data-average]');
 const floorCue=q('.px-floor-cue'), pauseButton=q('.px-pause'), signpost=q('.px-signpost'), meter=q('.px-meter'), direction=q('.px-direction');
 const dialogue=q('.px-dialogue strong'), caption=q('.px-dialogue span'), wipe=q('.px-wipe');
 doc.body.append(wipe);
 const oldBest=savedBest(oldStorageKey);
 if(oldBest){const old=q('[data-legacy]');old.textContent='이전 난이도 최고 기록 · '+oldBest+'점';old.hidden=false;}
 let phase='idle', encounter=null, deck=[], score=0, lives=3, round=0, best=savedBest();
 let card=null, stages=[], stageIndex=0, followUp=false;
 let timer=0, frame=0, releaseAt=0, span=0, center=.65, half=.06, beatsLeft=1, timing;
 let scheduled=null, dueAt=0, remaining=0, pausedAt=0;
 let signalAt=null, reactionTotal=0, reactionCount=0, needlePosition=0;
 let safeSide='', pausedFrom='', disposed=false, allPerfect=true;
 function setPhase(value) {
  phase=value;board.dataset.phase=value;
  if(value!=='paused')board.dataset.scene=value;
  pauseMenu.hidden=value!=='paused';controls.inert=value==='paused';
  runActions.hidden=value==='idle'||value==='over';
  pauseButton.hidden=value==='paused';
 }
 function message(title, hint) { dialogue.textContent=title; caption.textContent=hint;floorCue.textContent=''; }
 function timingOff() { win.clearTimeout(timer);win.cancelAnimationFrame(frame);scheduled=null;timer=frame=0; }
 function later(task,delay) {
  scheduled=task;dueAt=win.performance.now()+delay;
  timer=win.setTimeout(()=>{timer=0;scheduled=null;task();},delay);
 }
 function progress(value) {
  needlePosition=value;meter.style.setProperty('--progress',value*100+'%');
 }
 function showAverage() {
  const value=reactionCount?Math.round(reactionTotal/reactionCount):'—';
  average.textContent=String(value);
  reaction.setAttribute('aria-label','평균 반응 시간 · '+(reactionCount?value+'밀리초':'측정 전'));
 }
 function recordResponse(now) {
  if(signalAt===null)return;
  reactionTotal+=Math.max(0,now-signalAt);reactionCount++;signalAt=null;showAverage();
 }
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
 function action() { return encounter.kind==='tap' && encounter.effect!=='butterfly'?'엄폐하기':actions[encounter.kind]; }
 function gauge() { return encounter.kind==='gauge'||encounter.kind==='beat'; }
 function resetVisuals() {
  delete board.dataset.dodged;delete board.dataset.interrupted;delete board.dataset.hit; delete board.dataset.side;
  delete board.dataset.ready; delete board.dataset.performance; meter.hidden=true; direction.hidden=true;
 }
 function setGauge() {
  signalAt=null;
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
  if(elapsed>=span) { finish(false,gauge()?'타이밍을 놓쳤어요.':'한발 늦었어요.');return; }
  if(encounter.kind==='dodge' && elapsed>=timing.hitAt && !board.dataset.ready) {
   board.dataset.ready='yes';signalAt=now;caption.textContent='지금 데하!';
  }
  if(gauge()){
   progress(gaugePosition(elapsed));
   if(signalAt===null&&Math.abs(needlePosition-center)<=half)signalAt=now;
  }
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
    board.dataset.side=safeSide;
    if(encounter.effect==='fence')hint+=' 반대쪽으로 피하세요.';
    else{
     direction.hidden=false;direction.textContent=safeSide==='left'?'◀ 왼쪽 길':'오른쪽 길 ▶';
     hint+=' '+(safeSide==='left'?'왼쪽':'오른쪽')+'으로 피하세요.';
    }
   }
   if(gauge())setGauge();
   message(hint,encounter.kind==='dodge'?'공격이 닿을 때 누르세요.':gauge()&&beatsLeft===2?'첫 번째 입력':action());
   if(encounter.effect==='fence')floorCue.textContent=safeSide==='left'?'오른쪽 바닥에 붉은 선':'왼쪽 바닥에 붉은 선';
   if(encounter.kind==='tap'||encounter.kind==='lane')signalAt=now;
   tick(now);
  });
 }
 function warn() {
  timingOff();resetVisuals();signalAt=null;setPhase('warning');
  board.dataset.kind=encounter.kind;board.dataset.variant=encounter.variant;board.dataset.effect=encounter.effect;
  const stage=stages[stageIndex];
  board.dataset.performance='tell';board.dataset.facing=stage.facing;
  timing=encounterTiming(encounter,round,stage.pace);
  beatsLeft=encounter.variant==='double'?2:1;allPerfect=true;
  safeSide=stage.safeSide;
  if(encounter.kind==='lane'&&encounter.effect!=='fence')board.dataset.side=safeSide;
  const hunterRow=hunterRows.indexOf(encounter.effect==='umbrella'?'백무상':encounter.hunter);
  hunterSprite.hidden=hunterRow<0;
  if(hunterRow>=0)hunterSprite.style.setProperty('--row',hunterRow*100/(hunterRows.length-1)+'%');
  const extra=extraRows.includes(encounter.effect);
  board.dataset.atlas=extra?'encounter':'skill';
  const rows=extra?extraRows:effectRows, row=rows.indexOf(encounter.effect);
  board.style.setProperty('--effect-row',(Math.max(0,row)*100/(rows.length-1))+'%');
  signpost.hidden=false;
  q('[data-hunter]').textContent=stages.length>1?card.name+' · '+encounter.hunter:encounter.hunter;
  q('[data-name]').textContent=encounter.variant==='fusion'?'조각상':encounter.name;
  buttons(action(),encounter.kind==='lane');
  message(encounter.warning,action()==='엄폐하기'?'공격이 시작되면 한 번 누르세요.':hints[encounter.kind]);showScore();
  board.style.setProperty('--tell',appearanceMs+'ms');
  later(trigger,appearanceMs+stage.wait);
 }
 function next() {
  if(!deck.length)deck=shuffleEncounters(Math.random,encounter?.kind,card);
  card=deck.shift();round++;stageIndex=0;
  stages=dealStages(card).map(move=>({
   move, pace:.86+Math.random()*.30, wait:800+Math.floor(Math.random()*2201),
   safeSide:Math.random()<.5?'left':'right', facing:Math.random()<.5?'reverse':'normal'
  }));
  encounter=stages[0].move;followUp=false;warn();
 }
 function continueRun(){
  if(!followUp){next();return;}
  followUp=false;encounter=stages[++stageIndex].move;warn();
 }
 function begin() {
  timingOff();reactionTotal=0;reactionCount=0;showAverage();
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
  if(phase==='warning')board.dataset.interrupted='yes';
  timingOff();delete board.dataset.ready;direction.hidden=true;meter.hidden=true;
  if(hit){score+=points;saveRecord();} else lives--;
  followUp=hit && stageIndex+1<stages.length;
  const rest=followUp?760:Math.max(740,990-round*12);
  board.style.setProperty('--rest',rest+'ms');
  board.dataset.hit=hit?'yes':'no';showScore();setPhase(lives?'result':'over');
  buttons(lives?(followUp?'다음 공격 대기':'다음 사건 대기'):'다시 도전');
  if(!lives){message('돌발전 종료 · '+score+'점',round+'번째 사건에서 '+label);return;}
  message(label,hit?'+'+points+(followUp?'점 · 다음 공격이 이어져요.':'점 · 다음 사건이 다가와요.'):'하트가 하나 줄었어요.');
  later(continueRun,rest);
 }
 function respond(choice) {
  if(phase==='idle'||phase==='over'){begin();return;}
  if(phase==='paused'){resume();return;}
  if((phase==='warning'||phase==='active')&&encounter.kind==='dodge')board.dataset.dodged='yes';
  if(phase==='warning'){finish(false,'너무 일찍 움직였어요.');return;}
  if(phase!=='active')return;
  const now=win.performance.now(), elapsed=now-releaseAt;
  if(elapsed>=span){finish(false,'한발 늦었어요.');return;}
  if(encounter.kind==='lane'&&!choice)return;
  recordResponse(now);
  if(encounter.kind==='tap') {
   const result=encounter.effect==='butterfly'?'생멸을 막았어요!':'엄폐 성공!';
   finish(true,result+' · '+Math.round(elapsed)+'ms');return;
  }
  if(encounter.kind==='lane') {
   const ok=choice===safeSide;finish(ok,ok?'열린 길로 피했어요!':'위험한 쪽으로 움직였어요.');return;
  }
  if(gauge()) {
   const distance=Math.abs(needlePosition-center);
   if(distance>half){finish(false,'타이밍이 어긋났어요.');return;}
   allPerfect=allPerfect&&distance<=half*.34;
   if(--beatsLeft>0){
    span=Math.round(span*.87);board.style.setProperty('--travel',span+'ms');
    setGauge();releaseAt=win.performance.now();
    message('한 번 더!',encounter.kind==='beat'?'다음 음표를 맞히세요.':'다음 교정 구간을 맞히세요.');return;
   }
   finish(true,allPerfect?'완벽해요!':encounter.kind==='beat'?'조율 성공!':'교정 성공!',allPerfect?2:1);return;
  }
  if(!board.dataset.ready){finish(false,'데하가 너무 빨랐어요.');return;}
  finish(true,'데하로 피했어요!');
 }
 function pause() {
  if(!stopScenes.has(phase))return;
  pausedFrom=phase;pausedAt=win.performance.now();pointer=null;
  remaining=Math.max(0,dueAt-pausedAt);
  win.clearTimeout(timer);win.cancelAnimationFrame(frame);timer=frame=0;
  setPhase('paused');
 }
 function resume() {
  if(phase!=='paused'||doc.hidden||panelOpen())return;
  const elapsedPause=win.performance.now()-pausedAt;
  setPhase(pausedFrom);
  if(phase==='active'){
   releaseAt+=elapsedPause;
   if(signalAt!==null)signalAt+=elapsedPause;
   frame=win.requestAnimationFrame(tick);
  }else if(scheduled)later(scheduled,remaining);
  else if(phase==='warning')trigger();
 }
 function stop() {
  if(!stopScenes.has(phase)&&phase!=='paused')return;
  timingOff();resetVisuals();signalAt=null;pointer=null;followUp=false;signpost.hidden=true;
  setPhase('over');buttons('다시 도전');message('돌발전을 중단했어요.',round+'라운드 · '+score+'점');
  primary.focus({preventScroll:true});
 }
 function focusAction(){
  (primary.hidden?laneButtons.firstElementChild:primary).focus({preventScroll:true});
 }
 function onResume(){resume();if(phase!=='paused')focusAction();}
 function onRestart(){if(phase==='paused'){begin();focusAction();}}
 function panelOpen() {return !!doc.querySelector('dialog[open],.category-nav[data-expanded="true"]');}
 let pointer=null, swallowClick=false, pointerEnded=0;
 function down(e) {
  const b=e.target.closest('button');if(!b||e.button!==0||!e.isPrimary||pointer!==null)return;
  pointer=e.pointerId;swallowClick=true;
  b.setPointerCapture?.(pointer);respond(b.dataset.side);
 }
 function up(e) {
  if(pointer!==e.pointerId)return;
  pointer=null;pointerEnded=win.performance.now();
 }
 function click(e) {
  const b=e.target.closest('button');if(!b)return;
  if(swallowClick&&(pointer!==null||e.detail>0||win.performance.now()-pointerEnded<500)){swallowClick=false;return;}
  swallowClick=false;
  respond(b.dataset.side);
 }
 const keys={Space:'',Enter:'',ArrowLeft:'left',ArrowRight:'right'};
 function keyDown(e) {
  if(!(e.code in keys)||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||e.defaultPrevented||panelOpen())return;
  if(e.target.isContentEditable||(!controls.contains(e.target)&&e.target.closest?.('button,a,summary,input,textarea,select')))return;
  const side=keys[e.code]||e.target.closest?.('[data-side]')?.dataset.side;
  if(e.code.startsWith('Arrow')&&(encounter?.kind!=='lane'||!['active','warning'].includes(phase)))return;
  if(encounter?.kind==='lane'&&!side&&['active','warning'].includes(phase))return;
  e.preventDefault();swallowClick=false;if(!e.repeat)respond(side);
 }
 function visibility(){if(doc.hidden)pause();}
 function onPause(){pause();if(phase==='paused')resumeButton.focus({preventScroll:true});}
 const overlayGuard=new win.MutationObserver(()=>{if(stopScenes.has(phase)&&panelOpen())pause();});
 for(const el of doc.querySelectorAll('.category-nav,dialog'))overlayGuard.observe(el,{attributes:true,attributeFilter:['open','data-expanded']});
 const listeners=[[controls,'pointerdown',down],[controls,'pointerup',up],[controls,'pointercancel',up],
  [controls,'lostpointercapture',up],[controls,'click',click],[pauseButton,'click',onPause],[q('.px-stop'),'click',stop],
  [resumeButton,'click',onResume],[q('.px-restart'),'click',onRestart],[doc,'keydown',keyDown],
  [doc,'visibilitychange',visibility],[win,'blur',pause],[win,'pagehide',pause]];
 for(const [el,event,fn] of listeners)el.addEventListener(event,fn);
 buttons('돌발전 시작');message('정원사로 장원의 추격에서 살아남으세요.',encounters.length+'가지 돌발 상황 · 하트 3개');showScore();
 const wipeTimer=win.setTimeout(()=>wipe.remove(),530);
 return ()=>{
  disposed=true;timingOff();overlayGuard.disconnect();win.clearTimeout(wipeTimer);wipe.remove();delete doc.documentElement.dataset.arcade;
  for(const [el,event,fn] of listeners)el.removeEventListener(event,fn);
 };
}
