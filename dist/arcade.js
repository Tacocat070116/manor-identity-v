const rounds = 5;
const reactionLimit = 850;
const games = {
 flywheel: {
  name: '데하 반응 속도', icon: 'role-kite', skill: '플라이휠 효과',
  instruction: '리퍼의 발톱이 나타나는 순간 회피하세요. 신호가 오기 전에 누르면 실패합니다.',
  rule: '공격 신호 후 850ms 안에 회피', action: '회피', unit: '평균 반응'
 },
 cipher: {
  name: '해독기 교정', icon: 'role-decode', skill: '해독기',
  instruction: '바늘이 표시된 구간에 들어오면 교정하세요. 중앙의 밝은 구간을 맞히면 완벽한 교정입니다.',
  rule: '일반 교정 1점 · 완벽한 교정 2점', action: '교정', unit: '완벽한 교정'
 }
};

function tally(results) {
 const hits = results.filter(result => result.hit);
 return {
  hits: hits.length,
  average: hits.length ? Math.round(hits.reduce((sum, r) => sum + (r.ms || 0), 0) / hits.length) : 0,
  perfect: hits.filter(r => r.perfect).length
 };
}

function beats(game, current, previous) {
 if (!previous) return current.hits > 0;
 if (game === 'cipher') return current.hits + current.perfect > previous.hits + previous.perfect;
 return current.hits > previous.hits || (current.hits === previous.hits && current.average < previous.average);
}

function readBest(key) {
 try {
  const v = JSON.parse(localStorage.getItem(key));
  if (v && Number.isInteger(v.hits) && v.hits > 0 && v.hits <= rounds &&
      Number.isInteger(v.average) && v.average >= 0 && v.average <= reactionLimit &&
      Number.isInteger(v.perfect) && v.perfect >= 0 && v.perfect <= v.hits) return v;
 } catch { /* The arcade also works when storage is unavailable. */ }
 return null;
}

function dialMarkup() {
 return '<div class="arc-dial" aria-hidden="true"><div class="arc-dial-ticks"></div><div class="arc-dial-track"></div><div class="arc-dial-inner"></div><div class="arc-needle"><i></i></div><span class="arc-pivot"></span></div>';
}

export function mountArcade(root, {game, icon}) {
 const config = games[game];
 const isReaction = game === 'flywheel';
 const key = 'manor-arcade-v1-' + game;
 let best = readBest(key);
 let results = [];
 let phase = 'idle';
 let frame = 0, timer = 0;
 let signalAt = 0, sweep = 0, center = .6, halfWidth = .12, progress = 0;
 const doc = root.ownerDocument;
 const win = doc.defaultView;
 const find = selector => root.querySelector(selector);

 const modes = Object.entries(games).map(([id, g]) => {
  const tag = id === game ? 'span' : 'a';
  const dest = id === game ? 'aria-current="page"' : 'href="#v=arcade&game=' + id + '"';
  return '<' + tag + ' class="arc-mode" ' + dest + '>' + icon(g.icon) + g.name + '</' + tag + '>';
 }).join('');
 const visual = isReaction
  ? '<div class="arc-portrait" aria-hidden="true"></div><div class="arc-reticle" aria-hidden="true"><i></i><i></i><i></i></div>'
  : dialMarkup();
 root.innerHTML = `<section class="arcade">
  <header class="arc-top"><h1>아케이드</h1><nav class="arc-modes" aria-label="미니게임 선택">${modes}</nav></header>
  <section class="arc-board" data-game="${game}" data-phase="idle" aria-labelledby="arc-title">
   <div class="arc-scene">
    <div class="arc-visual">${visual}</div>
    <div class="arc-copy"><div class="arc-skill">${icon(config.icon)} ${config.skill}</div><h2 id="arc-title">${config.name}</h2><p>${config.instruction}</p></div>
    <div class="arc-console"><div class="arc-signal" role="status" aria-live="polite" aria-atomic="true"><strong></strong><span></span></div><button type="button" class="arc-action"></button></div>
   </div>
   <div class="arc-score"><div><span>성공</span><strong data-hits>0 / 5</strong></div><div><span>${config.unit}</span><strong data-stat>—</strong></div><div><span>내 최고 기록</span><strong data-best>—</strong></div></div>
  </section>
  <section class="arc-rounds" aria-labelledby="arc-log-title"><div class="arc-log-head"><h2 id="arc-log-title">라운드 기록</h2><span>${config.rule}</span></div><ol aria-label="라운드별 결과"></ol></section>
 </section>`;

 const board = find('.arc-board');
 const button = find('.arc-action');
 const signal = find('.arc-signal strong');
 const detail = find('.arc-signal span');
 const dial = find('.arc-dial');
 const needle = find('.arc-needle');
 const slots = Array.from({length:rounds}, (_, i) => {
  const li = doc.createElement('li');
  li.innerHTML = '<span>' + (i + 1) + '회</span><strong>대기</strong>';
  find('.arc-rounds ol').append(li);
  return li;
 });

 function setPhase(next) {
  phase = next;
  board.dataset.phase = next;
 }
 function say(title, text, action) {
  signal.textContent = title;
  detail.textContent = text;
  button.textContent = action;
 }
 function cancelTiming() {
  win.clearTimeout(timer);
  win.cancelAnimationFrame(frame);
 }
 function showStats() {
  const score = tally(results);
  find('[data-hits]').textContent = score.hits + ' / ' + rounds;
  find('[data-stat]').textContent = isReaction ? (score.hits ? score.average + ' ms' : '—') : score.perfect + '회';
  find('[data-best]').textContent = !best ? '—' : isReaction
   ? best.hits + '회 · ' + best.average + ' ms' : (best.hits + best.perfect) + ' / 10점';
 }
 function drawDial(value) {
  progress = value;
  needle.style.transform = 'rotate(' + (value * 240 - 120) + 'deg)';
 }
 function setZone() {
  halfWidth = .102 - results.length * .008;
  center = halfWidth + .16 + Math.random() * (.68 - 2 * halfWidth);
  for (const [name, offset] of [['start',-1],['inner-start',-.30],['inner-end',.30],['end',1]]) {
   dial.style.setProperty('--' + name, (center + offset * halfWidth) * 240 + 'deg');
  }
  drawDial(0);
 }
 function endRound(hit, label, extra = {}) {
  cancelTiming();
  results.push({hit, ...extra});
  const li = slots[results.length - 1];
  li.dataset.mark = extra.perfect ? 'perfect' : hit ? 'hit' : 'miss';
  li.lastElementChild.textContent = extra.ms !== undefined ? extra.ms + ' ms' : label;
  const finished = results.length === rounds;
  setPhase(finished ? 'finished' : 'result');
  const score = tally(results);
  let summary = results.length + ' / ' + rounds + '회';
  if (finished) {
   summary = isReaction ? '회피 ' + score.hits + ' / 5회' + (score.hits ? ' · 평균 ' + score.average + ' ms' : '')
    : '교정 ' + (score.hits + score.perfect) + ' / 10점';
   const stored = readBest(key);
   if (stored && beats(game, stored, best)) best = stored;
   if (beats(game, score, best)) {
    best = score;
    try { localStorage.setItem(key, JSON.stringify(best)); summary += ' · 최고 기록'; } catch {}
   }
  }
  board.dataset.outcome = hit ? 'hit' : 'miss';
  say(label, summary, finished ? '다시 도전' : '다음 라운드');
  showStats();
 }
 function startRound() {
  cancelTiming();
  delete board.dataset.outcome;
  slots[results.length].lastElementChild.textContent = '진행 중';
  const count = (results.length + 1) + ' / ' + rounds + '회';
  if (isReaction) {
   setPhase('waiting');
   say('공격을 기다리세요', count, config.action);
   timer = win.setTimeout(() => {
    frame = win.requestAnimationFrame(() => {
     if (phase !== 'waiting') return;
     setPhase('active');
     say('지금 회피!', count, config.action);
     signalAt = win.performance.now();
     timer = win.setTimeout(() => endRound(false, '회피 실패'), reactionLimit);
    });
   }, 1000 + Math.random() * 1600);
  } else {
   setZone();
   setPhase('active');
   say('바늘을 보세요', count, config.action);
   sweep = 2000 - results.length * 130;
   signalAt = null;
   function step(timestamp) {
    if (signalAt === null) signalAt = timestamp;
    const value = (timestamp - signalAt) / sweep;
    drawDial(Math.min(value, 1));
    if (value >= 1) endRound(false, '시간 초과');
    else frame = win.requestAnimationFrame(step);
   }
   frame = win.requestAnimationFrame(step);
  }
 }
 function respond() {
  if (phase === 'waiting') return endRound(false, '너무 빨랐어요');
  if (phase !== 'active') return;
  if (isReaction) {
   const ms = Math.round(win.performance.now() - signalAt);
   return ms >= reactionLimit ? endRound(false, '회피 실패') : endRound(true, '회피 성공 · ' + ms + ' ms', {ms});
  }
  const offset = progress - center;
  const hit = Math.abs(offset) <= halfWidth;
  const perfect = Math.abs(offset) <= halfWidth * .30;
  endRound(hit, perfect ? '완벽한 교정' : hit ? '교정 성공' : offset < 0 ? '너무 빨랐어요' : '너무 늦었어요', {perfect});
 }
 function activate() {
  if (phase === 'waiting' || phase === 'active') return respond();
  if (phase === 'finished') {
   results = [];
   for (const li of slots) { delete li.dataset.mark; li.lastElementChild.textContent = '대기'; }
   showStats();
  }
  startRound();
 }
 // Score on the initial touch. The corresponding click must not start the next round.
 let scoredPointer = false;
 function onPointerDown(event) {
  if (event.button !== 0 || !event.isPrimary) return;
  scoredPointer = phase === 'waiting' || phase === 'active';
  if (scoredPointer) respond();
 }
 function onClick() {
  if (scoredPointer) { scoredPointer = false; return; }
  scoredPointer = false;
  activate();
 }
 function onKey(event) {
  if (event.code !== 'Space' || event.altKey || event.ctrlKey || event.metaKey ||
      event.shiftKey || event.defaultPrevented || doc.querySelector('dialog[open]') ||
      doc.querySelector('.category-nav[data-expanded="true"]')) return;
  const target = event.target;
  if (target !== button && (target.isContentEditable || target.closest?.('a,button,input,select,textarea,summary'))) return;
  event.preventDefault();
  scoredPointer = false;
  if (!event.repeat) activate();
 }
 function pause() {
  if (phase !== 'active' && phase !== 'waiting') return;
  cancelTiming();
  setPhase('paused');
  say('잠시 멈췄어요', '이 라운드부터 다시 시작합니다.', '이어서 하기');
 }
 function onVisibility() { if (doc.hidden) pause(); }
 if (!isReaction) setZone();
 say('준비되셨나요?', '5라운드 · 버튼 또는 스페이스바', '게임 시작');
 showStats();
 button.addEventListener('pointerdown', onPointerDown);
 button.addEventListener('click', onClick);
 doc.addEventListener('keydown', onKey);
 doc.addEventListener('visibilitychange', onVisibility);
 win.addEventListener('pagehide', pause);
 return () => {
  cancelTiming();
  button.removeEventListener('pointerdown', onPointerDown);
  button.removeEventListener('click', onClick);
  doc.removeEventListener('keydown', onKey);
  doc.removeEventListener('visibilitychange', onVisibility);
  win.removeEventListener('pagehide', pause);
 };
}
