import {RESEARCH_TOPICS,synergyEscape as e,synergyRoute} from './synergy-model.js?v=29eb430cab7a';

export function researchHighlights(posts,characterId,characters){
 const link=synergyRoute(characterId);
 if(!posts.length)return '';
 return `<section class="section-gap"><div class="heading-inline"><h2>연구실에서 반영한 전략</h2></div><div class="research-highlights">${posts.map(p=>`<article class="panel research-highlight"><div class="sy-tags"><span class="tag green">도감 반영</span><span class="tag">${e(RESEARCH_TOPICS[p.topic])}</span></div><h3>${e(p.title)}</h3><p class="sy-caption">${e(p.characterIds.map(id=>characters[id]?.name||id).join(' + '))}</p><details><summary>내용·조건 보기</summary><p class="sy-prose">${e(p.body)}</p><h4>조건·주의점</h4><p class="sy-prose">${e(p.caution)}</p><h4>검토 의견</h4><p class="sy-prose">${e(p.proposal.reason)}</p></details><a class="text-link" href="${e(synergyRoute(characterId,'',p.id,p.topic))}">원문·토론 →</a></article>`).join('')}</div><a class="text-link section-gap" href="${e(link)}">관련 연구 더 보기 →</a></section>`;
}

export function mountResearchHighlights(root,{characterId,characters,origin='https://manor-feedback.tacocat070116.chatgpt.site'}={}){
 let alive=true,controller;
 async function load(){
  controller?.abort();controller=new AbortController();const active=controller;
  const timer=setTimeout(()=>active.abort(),12000);
  root.innerHTML='<p class="visually-hidden" role="status">반영된 연구를 불러오는 중입니다.</p>';
  try{
   const response=await fetch(origin+'/api/research?'+new URLSearchParams({character:characterId,adopted:'1'}),{cache:'no-store',credentials:'omit',signal:active.signal});
   if(!response.ok)throw Error();const data=await response.json();
   if(alive&&active===controller)root.innerHTML=researchHighlights(data.posts,characterId,characters);
  }catch{
   if(alive&&active===controller)root.innerHTML=`<p class="muted">연구실의 반영 내역을 불러오지 못했습니다.</p><button class="btn small" type="button" data-research-retry>다시 시도</button> <a class="text-link" href="${e(synergyRoute(characterId))}">연구실 열기 →</a>`;
  }finally{clearTimeout(timer);}
 }
 const click=event=>{if(event.target.closest('[data-research-retry]'))load();};
 root.addEventListener('click',click);load();
 return ()=>{alive=false;controller?.abort();root.removeEventListener('click',click);};
}
