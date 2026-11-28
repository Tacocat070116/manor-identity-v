import {difficultyNames,mountSurprise} from './arcade.js?v=f42129f29dae';
export {preloadArcadeSprites} from './arcade.js?v=f42129f29dae';

const games=[{
 id:'surprise', title:'장원의 돌발전', genre:'반응 속도',
 intro:'정원사가 되어 감시자의 기습을 피하세요.',
 rules:[
  ['데하와 방향 회피','데하 신호가 뜨면 한 번 누르세요. 바닥이 붉게 빛나면 반대쪽으로 피하세요.'],
  ['바라보기와 엄폐','미치코가 나타나면 바라보기를, 밀랍이나 섬광이 보이면 엄폐하기를 누르세요.'],
  ['교정과 조율','바늘이나 음표가 밝은 구간에 닿을 때 누르세요. 중앙에 맞히면 2점입니다.']
 ],
 play:mountSurprise
}];
const descriptions={
 normal:'한 번에 한 사건씩, 신호를 보고 대응하세요.',
 hard:'한 번에 한 사건씩, 보통보다 조금 더 빠르게 대응하세요.',
 nightmare:'어려움과 같은 속도입니다. 첫 공격을 피해도 다음 공격이 이어집니다.'
};
const poster='<span class="px-cover" aria-hidden="true"><i class="px-cover-hunter"></i><i class="px-cover-gardener"></i></span>';
export function mountArcade(root){
 const doc=root.ownerDocument,win=doc.defaultView;
 doc.documentElement.dataset.arcade='on';
 let current, playing, screen;
 const wipe=doc.createElement('div');
 wipe.className='px-wipe';wipe.setAttribute('aria-hidden','true');wipe.innerHTML='<i></i>'.repeat(5);
 doc.body.append(wipe);
 const wipeTimer=win.setTimeout(()=>wipe.remove(),530);
 function paint(view,focus=true){
  playing?.();playing=null;screen=view;
  const back=view==='games'?'':`<button type="button" class="px-back" data-lobby="back">‹ ${view==='guide'?'게임 선택':'게임 안내'}</button>`;
  let contents;
  if(view==='games'){
   contents=`<div class="px-library">${games.map(g=>`<button type="button" class="px-game-card" data-game="${g.id}">${poster}<span class="px-card-line"><span><small>${g.genre}</small><strong>${g.title}</strong><span class="px-blurb">${g.intro}</span></span><span class="px-card-action">게임 선택 ›</span></span></button>`).join('')}</div>`;
  }else if(view==='guide'){
   contents=`<section class="px-guide-panel"><div class="px-guide-banner">${poster}<div><small>게임 안내</small><h2>${current.title}</h2></div></div>
    <div class="px-guide-copy"><p>${current.intro} 하트 3개로 시작하며, 실수하면 하나씩 잃습니다.</p><dl>${current.rules.map(([name,rule])=>`<div><dt>${name}</dt><dd>${rule}</dd></div>`).join('')}</dl>
    <button type="button" class="px-button px-menu-start" data-lobby="start">시작</button></div></section>`;
  }else{
   contents=`<section class="px-mode-panel"><h2>난이도 선택</h2><p>${current.title}</p><div class="px-modes">${Object.entries(difficultyNames).map(([id,name],i)=>`<button type="button" class="px-mode" data-mode="${id}"><i aria-hidden="true">${'◆'.repeat(i+1)}</i><strong>${name}</strong><span>${descriptions[id]}</span></button>`).join('')}</div></section>`;
  }
  root.innerHTML=`<section class="px-arcade px-lobby"><header class="px-heading"><h1 tabindex="-1"><span class="px-pad" aria-hidden="true"></span>아케이드</h1>${back}</header>${contents}</section>`;
  if(focus){
   const heading=root.querySelector('h2')||root.querySelector('h1');
   heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});
  }
 }
 function select(e){
  const button=e.target.closest('button');
  if(!button||screen==='play')return;
  const {game,lobby,mode}=button.dataset;
  if(game&&screen==='games'){
   current=games.find(g=>g.id===game);if(current)paint('guide');
  }else if(lobby==='start'&&screen==='guide')paint('difficulty');
  else if(lobby==='back')paint(screen==='guide'?'games':'guide');
  else if(screen==='difficulty'&&Object.hasOwn(difficultyNames,mode)){
   screen='play';playing=current.play(root,mode,()=>paint('games'));
  }
 }
 root.addEventListener('click',select);paint('games',false);
 return ()=>{
  playing?.();root.removeEventListener('click',select);win.clearTimeout(wipeTimer);
  wipe.remove();delete doc.documentElement.dataset.arcade;
 };
}
