import {practiceData,practiceKinds,activePracticeScenes,practiceEntryFor,selectPractice,practiceFeedback,practiceKey,readPracticeProgress,markPracticeViewed} from './practice-model.js?v=ed3c63f5b939';

export {practiceEntryFor};
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paramsFor = (character = '', scene = '', variant = '') => ({v:'practice', ...(character ? {c:character} : {}), ...(scene ? {case:scene} : {}), ...(variant ? {variant} : {})});
const urlFor = (...args) => '#' + new URLSearchParams(paramsFor(...args)).toString();
const safeURL = value => { try {const url = new URL(value);return url.protocol === 'https:' ? url.href : '';} catch {return '';} };

function characterChip(character, label) {
  if (!character) return '';
  return `<span class="practice-person"><img src="${esc(character.portrait)}" alt="" width="36" height="36"><span><small>${esc(label)}</small><strong>${esc(character.name)}</strong></span></span>`;
}

export function practiceExerciseHTML({data = practiceData, selection, characters, session}) {
  const {scene, variant, character} = selection;
  if (!scene || !variant) return '';
  const result = session.revealed ? practiceFeedback(scene, variant, session.action, session.reason) : null;
  const focus = new Set(result?.clues || []);
  const sourceMap = new Map(data.sources.map(source => [source.id, source]));
  const nextVariant = scene.variants.find(item => item.id !== variant.id);
  const checked = (type, id) => session[type] === id ? ' checked' : '';
  const explanation = result ? `<section class="practice-explanation" data-kind="${esc(result.kind)}" aria-labelledby="practice-explanation-title" tabindex="-1" id="practice-explanation">
    <div class="practice-section-label">03 · 해설 <span class="practice-outcome">${esc(practiceKinds[result.kind])}</span></div>
    <h3 id="practice-explanation-title">${esc(result.title)}</h3><p>${esc(result.text)}</p>
    <div class="practice-reason-review"><strong>${result.reasonAligned ? '선택한 이유와 연결해 보기' : '선택한 이유에서 다시 볼 부분'}</strong><p class="practice-selected-reason">선택한 이유: ${esc(result.reason.label)}</p><p>${esc(result.reasonExplanation)}</p></div>
    <div class="practice-takeaway"><span>이번 장면에서 기억할 것</span><p>${esc(variant.takeaway)}</p></div>
    <p class="practice-note">이 평가는 제시한 조건 안의 편집 해설입니다. 실전 승률이나 플레이 실력 점수가 아닙니다.</p>
    <div class="practice-explanation-actions"><a class="btn primary" href="${urlFor(character,scene.id,nextVariant.id)}">조건 바꿔 다시 생각하기</a><button type="button" class="btn" data-practice-action="retry">같은 조건 다시 풀기</button></div>
  </section>` : '';
  return `<article class="practice-exercise" aria-labelledby="practice-scene-title">
    <div class="practice-exercise-heading"><div><p class="eyebrow">${esc(scene.topic)}</p><h2 id="practice-scene-title" tabindex="-1">${esc(scene.title)}</h2></div><span class="practice-beta">BETA</span></div>
    <div class="practice-pair">${characterChip(characters[scene.own],'내 캐릭터')}<span class="practice-versus">VS</span>${characterChip(characters[scene.opponent],'상대')}</div>
    <div class="practice-variant"><span>${esc(scene.variationLabel)}</span><div class="practice-variant-options" role="group" aria-label="${esc(scene.variationLabel)}">${scene.variants.map(item => `<a href="${urlFor(character,scene.id,item.id)}" class="${item.id===variant.id?'is-active':''}" ${item.id===variant.id?'aria-current="true"':''}>${esc(item.label)}</a>`).join('')}</div></div>
    <section class="practice-scene" aria-labelledby="practice-condition-title"><div class="practice-section-label" id="practice-condition-title">01 · 주어진 상황</div><p class="practice-prompt">${esc(variant.prompt)}</p>
      <ol class="practice-flow" aria-label="상황 흐름 · 실제 맵이나 거리 축척이 아닌 개념도">${variant.flow.map(([label,detail],i)=>`<li><span class="practice-flow-number">${i+1}</span><strong>${esc(label)}</strong><span>${esc(detail)}</span></li>`).join('')}</ol>
      <p class="practice-diagram-note">상황 흐름을 나타낸 개념도입니다. 실제 맵·거리·공격 시간을 재현하지 않습니다.</p>
      <dl class="practice-facts">${variant.facts.map(fact => `<div class="practice-fact ${focus.has(fact.id)?'is-highlighted':''}"><dt>${focus.has(fact.id)?'<span class="practice-clue-label">해설의 핵심</span>':''}${esc(fact.label)}</dt><dd>${esc(fact.value)}</dd></div>`).join('')}</dl>
      <details class="practice-details"><summary>이 장면의 적용 범위와 제외 조건</summary><ul>${scene.limits.map(item=>`<li>${esc(item)}</li>`).join('')}</ul></details>
    </section>
    <form data-practice-form class="practice-form"><div class="practice-section-label">02 · 내 선택과 이유</div>
      <fieldset><legend>어떻게 판단하나요?</legend><div class="practice-options">${scene.actions.map((action,i)=>`<label class="practice-option"><input type="radio" name="practice-action" value="${esc(action.id)}"${checked('action',action.id)}><span class="practice-option-number">${String(i+1).padStart(2,'0')}</span><span>${esc(action.label)}</span></label>`).join('')}</div></fieldset>
      <fieldset><legend>그렇게 생각한 이유는 무엇인가요?</legend><div class="practice-reasons">${scene.reasons.map(reason=>`<label class="practice-option practice-reason"><input type="radio" name="practice-reason" value="${esc(reason.id)}"${checked('reason',reason.id)}><span>${esc(reason.label)}</span></label>`).join('')}</div></fieldset>
      <div class="practice-form-footer"><span data-practice-selection-hint aria-live="polite">${session.action&&session.reason?'선택한 행동과 이유를 해설에서 확인하세요.':'행동과 이유를 하나씩 선택해 주세요.'}</span><button class="btn primary" type="submit" data-practice-reveal ${session.action&&session.reason?'':'disabled'}>해설 보기</button></div>
    </form>
    ${explanation}
    <details class="practice-details practice-sources"><summary>기전·해설 근거와 검토 범위</summary><div class="practice-source-content"><p><strong>참고한 기전</strong><br>${esc(scene.mechanic)}</p><p class="practice-note">자료 확인 ${esc(data.reviewedAt)} · ${esc(data.reviewLabel)}<br>선택별 평가는 아래 기전을 바탕으로 작성한 MANOR의 조건부 해설입니다. 출처가 해당 장면의 정답을 인증한 것은 아니며, 이후 패치는 자동 반영되지 않습니다.</p>${scene.sourceIds.map(id=>sourceMap.get(id)).filter(Boolean).map(source=>`<article class="practice-source"><span>${esc(source.type)}</span><a href="${esc(safeURL(source.url))}" target="_blank" rel="noopener noreferrer">${esc(source.title)} ↗</a><p>${esc(source.support)}</p></article>`).join('')}<a class="text-link" href="#${new URLSearchParams({v:'matchup',own:scene.own,opp:scene.opponent})}">이 대진의 상성 근거 보기</a></div></details>
    <div class="practice-feedback"><p>실제 게임과 다른 내용이 있나요?<br><small>장면과 조건을 복사해 피드백에 함께 남겨 주세요.</small></p><div><button type="button" class="btn small" data-practice-action="copy">장면 정보 복사</button><a class="btn small" href="#v=feedback">피드백 열기</a></div></div>
  </article>`;
}

export function practicePageHTML({data = practiceData, selection, characters, session, progress = new Set()}) {
  const all = activePracticeScenes(data);
  const total = all.reduce((sum,scene)=>sum+scene.variants.length,0);
  const selectionNotice = selection.unsupported ? '이 캐릭터는 아직 연습실 지원 범위에 없습니다. 현재 공개한 장면을 보여드립니다.' : selection.unavailable ? '이 장면은 공개 범위에 없거나 검토 중입니다. 아래에서 공개된 장면을 선택해 주세요.' : '';
  return `<div class="practice-page">
    <section class="practice-intro"><div><div class="practice-intro-kicker"><span class="eyebrow">PRACTICE LAB</span><span class="practice-beta">BETA · 제한 공개</span></div><h1>한 장면씩,<br>판단의 조건을 연습하세요.</h1><p>선택하고, 이유를 확인하고, 조건을 바꿔 다시 생각합니다.</p></div><div class="practice-scope"><span>지금 연습할 수 있는 범위</span><strong>${all.length}개 장면 · ${total}가지 조건</strong><p>${esc(data.scope)}</p><small>해설을 확인한 조건 <b data-practice-progress>${progress.size} / ${total}</b><br>이 브라우저에 저장하며 실력 점수로 사용하지 않습니다.</small></div></section>
    <div class="practice-beta-note"><strong>제한된 상황의 시험 해설입니다.</strong><p>제시한 조건 안에서 기전을 이해하는 연습입니다. 복합적인 구출·운영의 최선 판단은 아직 다루지 않습니다. <span>${esc(data.reviewLabel)}</span></p></div>
    <section class="practice-library" aria-labelledby="practice-library-title"><div class="practice-library-heading"><h2 id="practice-library-title">어떤 장면을 연습할까요?</h2><label class="practice-filter">내 캐릭터<select class="filter-select" data-practice-character><option value="">전체 지원 캐릭터</option>${selection.supported.map(id=>`<option value="${esc(id)}" ${selection.character===id?'selected':''}>${esc(characters[id]?.name)}</option>`).join('')}</select></label></div>
      ${selectionNotice?`<p class="note" role="status">${esc(selectionNotice)}</p>`:''}
      <div class="practice-library-grid">${selection.scenes.map(scene=>`<a class="practice-card ${selection.scene?.id===scene.id?'is-active':''}" href="${urlFor(selection.character,scene.id)}" ${selection.scene?.id===scene.id?'aria-current="true"':''}><img src="${esc(characters[scene.own]?.portrait)}" width="48" height="48" alt=""><div><span>${esc(characters[scene.own]?.name)} · ${esc(scene.topic)}</span><h3>${esc(scene.title)}</h3><p>${esc(scene.summary)}</p><small>${scene.variants.length}가지 조건${scene.variants.every(variant=>progress.has(practiceKey(data,scene,variant)))?' · 해설 확인함':''}</small></div></a>`).join('')}</div>
    </section>
    <div data-practice-exercise>${selection.scene?practiceExerciseHTML({data,selection,characters,session}):'<div class="practice-start"><span>선택 → 이유 → 해설 → 조건 변경</span><p>위에서 연습할 장면을 선택해 주세요.</p></div>'}</div>
    <p class="practice-storage-status" data-practice-storage role="status"></p>
    <details class="practice-details practice-about"><summary>BETA 운영 기준</summary><ul><li>현재는 위에 표시된 캐릭터와 장면만 제공합니다. 지원하지 않는 대진의 해설을 생성하지 않습니다.</li><li>기전 설명과 조건부 판단을 구분합니다. 여러 선택이 가능한 장면은 하나의 정답으로 채점하지 않습니다.</li><li>공개 자료를 대조했으며, 실제 게임 재현이나 전문가 검증을 마쳤다는 뜻은 아닙니다.</li><li>논란이 있거나 패치로 달라진 장면은 검토 후 수정하거나 공개 목록에서 내릴 수 있습니다.</li></ul></details>
  </div>`;
}

export function mountPractice(root, {characters, params = {}, navigate, session = {}, data = practiceData, storage, clipboard, toast = () => {}}) {
  const selection = selectPractice(data, params);
  const {scene,variant} = selection;
  const key = scene && variant ? practiceKey(data,scene,variant) : '';
  if (session.key !== key) Object.assign(session,{key,action:'',reason:'',revealed:false});
  if (scene && (!scene.actions.some(item=>item.id===session.action) || !scene.reasons.some(item=>item.id===session.reason))) session.revealed = false;
  const progress = readPracticeProgress(storage,data);
  root.innerHTML = practicePageHTML({data,selection,characters,session,progress});
  let disposed = false;
  function renderExercise({focus = ''} = {}) {
    root.querySelector('[data-practice-exercise]').innerHTML = practiceExerciseHTML({data,selection,characters,session});
    if (focus) root.querySelector(focus)?.focus({preventScroll:true});
  }
  function onChange(event) {
    if (event.target.matches('[data-practice-character]')) {
      navigate(paramsFor(event.target.value));return;
    }
    const field = event.target.name === 'practice-action' ? 'action' : event.target.name === 'practice-reason' ? 'reason' : '';
    if (!field || !scene) return;
    session[field] = event.target.value;
    if (session.revealed) {session.revealed=false;renderExercise({focus:`input[name="${event.target.name}"][value="${event.target.value}"]`});}
    const ready = Boolean(practiceFeedback(scene,variant,session.action,session.reason));
    root.querySelector('[data-practice-reveal]').disabled = !ready;
    root.querySelector('[data-practice-selection-hint]').textContent = ready ? '선택한 행동과 이유를 해설에서 확인하세요.' : '행동과 이유를 하나씩 선택해 주세요.';
  }
  function onSubmit(event) {
    if (!event.target.matches('[data-practice-form]')) return;
    event.preventDefault();
    if (!scene || !practiceFeedback(scene,variant,session.action,session.reason)) return;
    session.revealed = true;
    const saved = markPracticeViewed(storage,progress,key);
    renderExercise({focus:'#practice-explanation'});
    root.querySelector('[data-practice-progress]').textContent = `${progress.size} / ${activePracticeScenes(data).reduce((sum,item)=>sum+item.variants.length,0)}`;
    if (!saved) root.querySelector('[data-practice-storage]').textContent = '브라우저 저장을 사용할 수 없어 이번 방문에서만 진행을 표시합니다.';
    const reduce = root.ownerDocument.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    root.querySelector('#practice-explanation')?.scrollIntoView?.({block:'start',behavior:reduce?'instant':'smooth'});
  }
  async function onClick(event) {
    const button = event.target.closest('[data-practice-action]');
    if (!button || !root.contains(button) || !scene) return;
    if (button.dataset.practiceAction === 'retry') {
      Object.assign(session,{action:'',reason:'',revealed:false});
      renderExercise({focus:'input[name="practice-action"]'});return;
    }
    if (button.dataset.practiceAction === 'copy') {
      const win = root.ownerDocument.defaultView;
      const text = `[실전 연습실 BETA]\n장면: ${scene.title} (${scene.id})\n조건: ${variant.label} (${variant.id})\n해설 자료: ${data.version}\n${win?.location?.origin || ''}${win?.location?.pathname || ''}${urlFor(selection.character,scene.id,variant.id)}`;
      try {if (!clipboard?.writeText) throw new Error('Clipboard unavailable');await clipboard.writeText(text);if (!disposed) toast('장면과 조건을 복사했습니다.');}
      catch {if (!disposed){root.querySelector('[data-practice-storage]').textContent = `복사하지 못했습니다. 피드백에 ${scene.id} / ${variant.id}를 적어 주세요.`;}}
    }
  }
  root.addEventListener('change',onChange);root.addEventListener('submit',onSubmit);root.addEventListener('click',onClick);
  return () => {disposed=true;root.removeEventListener('change',onChange);root.removeEventListener('submit',onSubmit);root.removeEventListener('click',onClick);};
}
