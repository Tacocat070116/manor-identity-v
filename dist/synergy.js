import {participation,participationBar,openParticipation,refreshParticipationBanners} from './participation.js?v=df3296656ea9';
import {SYNERGY_SITUATIONS,SYNERGY_REPORTS,synergyEscape as e,synergyRoute,validateSynergyDraft} from './synergy-model.js?v=c4a394898b4e';
const ORIGIN='https://manor-feedback.tacocat070116.chatgpt.site';
const uuid=()=>{if(crypto.randomUUID)return crypto.randomUUID();const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const s=Array.from(b,n=>n.toString(16).padStart(2,'0')).join('');return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;};
const date=time=>new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(time));
const option=(value,label,selected)=>`<option value="${e(value)}" ${value===selected?'selected':''}>${e(label)}</option>`;
const person=(author,characters)=>`<span class="sy-person">${characters[author?.characterId]?`<img src="${e(characters[author.characterId].portrait)}" alt="" width="28" height="28" loading="lazy">`:''}<span>${e(author?.name||'장원의 손님')}</span></span>`;
const tags=situations=>`<div class="sy-tags">${situations.map(s=>`<span class="tag">${e(s)}</span>`).join('')}</div>`;
const pairLabel=(ids,characters)=>ids.map(id=>characters[id]?.name||'알 수 없는 캐릭터').join(' + ');
const pairImages=(ids,characters)=>`<span class="sy-pair-images" aria-hidden="true">${ids.map(id=>characters[id]?`<img src="${e(characters[id].portrait)}" alt="" width="40" height="40" loading="lazy">`:'').join('')}</span>`;

export function synergyPostCard(post,characters,{ownId='',partnerId='',admin=false}={}){
 return `<a class="panel sy-post-card" href="${e(synergyRoute(ownId||post.characterIds[0],partnerId,post.id))}" data-sy="open" data-id="${e(post.id)}"><div class="sy-pair">${pairImages(post.characterIds,characters)}<span>${e(pairLabel(post.characterIds,characters))}</span>${post.hidden?'<span class="tag warm">숨김</span>':''}${admin&&post.reportCount?`<span class="tag warm">미처리 신고 ${post.reportCount}건</span>`:''}</div><h3>${e(post.title)}</h3>${tags(post.situations)}<p class="sy-excerpt">${e(post.body)}</p><div class="sy-meta">${person(post.author,characters)}<time datetime="${new Date(post.createdAt).toISOString()}">${e(date(post.createdAt))}</time><span>댓글 ${Number(post.commentCount)||0}</span></div></a>`;
}

export function synergyEditor({characters,ownId='',partnerId='',post=null}={}){
 const survivors=Object.values(characters).filter(c=>c.side==='생존자').sort((a,b)=>a.name.localeCompare(b.name,'ko'));
 const ids=post?.characterIds||[ownId,partnerId],p=post||{title:'',body:'',caution:'',situations:[]};
 const choices=(selected,exclude)=>option('','생존자 선택',selected)+survivors.filter(c=>c.id!==exclude).map(c=>option(c.id,c.name,selected)).join('');
 return `<form class="sy-editor panel" data-sy-form="post"><h2>${post?'조합 글 수정':'조합 제안하기'}</h2><p class="muted">직접 함께 플레이한 경험과 도움이 된 상황을 알려주세요.</p><div class="sy-form-pair">${ids.map((id,i)=>`<label>${i?'함께한 생존자':'기준 생존자'}${post||i===0&&ownId?`<strong class="sy-fixed-character">${e(characters[id]?.name)}</strong><input type="hidden" name="character${i?'B':'A'}" value="${e(id)}">`:`<select name="character${i?'B':'A'}" required>${choices(id,ids[1-i])}</select>`}</label>`).join('')}</div><label>제목<input name="title" value="${e(p.title)}" minlength="3" maxlength="80" required placeholder="예: 부엉이로 술 회복 시간을 벌었던 조합"></label><fieldset><legend>활용 상황 · 1~3개</legend><div class="sy-situation-choices">${SYNERGY_SITUATIONS.map(s=>`<label><input type="checkbox" name="situation" value="${e(s)}" ${p.situations.includes(s)?'checked':''}><span>${e(s)}</span></label>`).join('')}</div></fieldset><label>활용법<textarea name="body" rows="7" minlength="20" maxlength="3000" required placeholder="각자 무엇을 했는지, 어떤 순서로 스킬을 썼는지 적어주세요.">${e(p.body)}</textarea><small>20~3,000자</small></label><label>조건·주의점<textarea name="caution" rows="3" minlength="5" maxlength="1000" required placeholder="잘 통하지 않았던 상대나 지형, 남아 있어야 하는 아이템 등을 적어주세요.">${e(p.caution)}</textarea><small>5~1,000자</small></label><p class="sy-caption">등록하면 모든 방문자에게 공개됩니다. 개인 복구 코드를 보관하면 다른 브라우저에서도 글을 수정·삭제할 수 있습니다.</p><div class="sy-actions"><button type="button" class="btn" data-sy="cancel">취소</button><button type="submit" class="btn primary">${post?'수정 저장':'조합 글 등록'}</button></div></form>`;
}

export function mountSynergy(root,{characters={},ownId='',partnerId='',postId='',initialMine=false,navigate,admin=false,origin=ORIGIN}={}){
 let alive=true,busy=false,version=0,current=null,editing=null,reply=null,comments=[],posts=[],nextPage=null,nextAfter=null,requestId=uuid(),authorAtOpen=participation.read();
 const filters={partner:partnerId,situation:'',q:'',sort:'new',mine:initialMine?'1':'',reported:''};
 const controllers=new Set(),base='/api/'+(admin?'admin/synergies':'synergies');
 const frame=html=>{if(alive)root.innerHTML=`<section class="sy-board"><div class="sy-notice" role="status" aria-live="polite" hidden></div>${html}</section>`;};
 const notice=(message,error=false)=>{const node=root.querySelector('.sy-notice');if(node){node.textContent=message;node.classList.toggle('is-error',error);node.hidden=!message;}};
 const context=()=>({partnerId:filters.partner,mine:filters.mine==='1'});
 const move=id=>{if(navigate){navigate(id||'',context());return;}postId=id||'';reply=null;editing=null;requestId=uuid();load();};
 const back=()=>`<button class="back-link" type="button" data-sy="back">← 조합 이야기 목록</button>`;
 const help='<p class="sy-caption">이용자가 직접 올린 경험담입니다. MANOR의 추천 조합이나 검증된 공략으로 자동 반영되지 않습니다. 적용 조건과 댓글을 함께 확인하세요.</p>';
 const recovery=()=>admin?'':participationBar();
 const loading=()=>frame('<div class="sy-empty" role="status" aria-busy="true"><span class="loading-orbit" aria-hidden="true"></span><p>조합 이야기를 불러오고 있습니다.</p></div>');
 const errorScreen=error=>frame(`${back()}<div class="sy-empty"><h2>조합 이야기를 불러오지 못했습니다.</h2><p>${e(error.message)}</p><button class="btn" type="button" data-sy="reload">다시 시도</button></div>`);
 async function api(path,{method='GET',body,guest=true,authorToken,retry=true}={}){
  const token=admin||!guest?'':(authorToken??participation.read()),controller=new AbortController();controllers.add(controller);const timeout=setTimeout(()=>controller.abort(),15000);
  const headers={};if(body!==undefined)headers['Content-Type']='application/json';if(admin)headers['X-Manor-Admin']='1';else if(token)headers.Authorization='Bearer '+token;
  try{
   const response=await fetch(origin+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),credentials:admin?'same-origin':'omit',cache:'no-store',signal:controller.signal});let data;
   try{data=await response.json();}catch{throw Error('서버 연결을 확인하고 다시 시도해 주세요.');}
   if(!response.ok){if(data.code==='visitor_invalid'){const removed=await participation.invalidate(token);if(method==='GET'&&retry)return api(path,{guest:!removed,retry:false});}throw Error(data.error||'요청을 처리하지 못했습니다.');}
   if(!admin&&guest&&method==='GET'&&retry&&token!==participation.read())return api(path,{guest,retry:false});return data;
  }catch(error){if(error.name==='AbortError')throw Error('연결 시간이 길어지고 있습니다. 다시 시도해 주세요.');if(error instanceof TypeError)throw Error('서버에 연결하지 못했습니다. 네트워크 상태를 확인해 주세요.');throw error;}finally{clearTimeout(timeout);controllers.delete(controller);}
 }
 async function ensureAuthor(){
  if(authorAtOpen&&authorAtOpen!==participation.read())throw Error('다른 창에서 연결된 기록이 바뀌었습니다. 입력 내용을 보관한 뒤 원래 기록으로 다시 연결해 주세요.');
  const identity=await participation.ensure(()=>api('/api/feedback/visitors',{method:'POST',body:{},guest:false}));authorAtOpen=identity;refreshParticipationBanners();return identity;
 }
 function listView(data,append=false){
  posts=append?[...posts,...data.posts.filter(p=>!posts.some(old=>old.id===p.id))]:data.posts;nextPage=data.nextPage;
  const partners=Object.values(characters).filter(c=>c.side==='생존자'&&c.id!==ownId).sort((a,b)=>a.name.localeCompare(b.name,'ko'));
  frame(`<div class="sy-heading"><div><h2>${admin?'조합 이야기 관리':'조합 이야기'}</h2><p>${admin?'글과 댓글의 공개 여부를 관리하고 신고 내용을 확인하세요.':`${e(characters[ownId]?.name||'생존자')}와 함께한 조합을 제안하고 댓글로 경험을 나눠보세요.`}</p></div>${admin?'':'<button type="button" class="btn primary" data-sy="compose">조합 제안하기</button>'}</div>${admin?'':help}${recovery()}${admin?'':`<div class="participation-tabs" role="group" aria-label="조합 이야기 보기"><button type="button" data-sy="all" aria-pressed="${!filters.mine}">모든 이야기</button><button type="button" data-sy="mine" aria-pressed="${filters.mine==='1'}">내 참여 글</button></div>`}<form class="sy-filters" data-sy-form="filters">${!filters.mine?`<label>함께한 생존자<select name="partner">${option('','모든 생존자',filters.partner)+partners.map(c=>option(c.id,c.name,filters.partner)).join('')}</select></label>`:''}<label>활용 상황<select name="situation">${option('','모든 상황',filters.situation)+SYNERGY_SITUATIONS.map(s=>option(s,s,filters.situation)).join('')}</select></label><label>정렬<select name="sort">${option('new','최신순',filters.sort)+option('discussed','댓글순',filters.sort)}</select></label>${admin?`<label>신고<select name="reported">${option('','전체 글',filters.reported)+option('1','미처리 신고',filters.reported)}</select></label>`:''}<label class="sy-search">내용 검색<input type="search" name="q" value="${e(filters.q)}" maxlength="100" placeholder="조합 이야기 검색"></label><button class="btn" type="submit">검색</button></form><p class="sy-count" role="status">${filters.mine?'내가 작성하거나 댓글을 남긴 전체 조합 글':'조건에 맞는 조합 글'} ${data.total}개</p><div class="sy-post-list">${posts.length?posts.map(p=>synergyPostCard(p,characters,{ownId,partnerId:filters.partner,admin})).join(''):`<div class="sy-empty"><h3>${filters.mine?'연결된 기록의 참여 글이 없습니다.':'아직 조건에 맞는 조합 글이 없습니다.'}</h3><p>${filters.mine?'다른 브라우저에서 쓴 글은 개인 복구 코드로 기록을 연결해 주세요.':'직접 써 본 조합이 있다면 활용법과 주의점을 남겨주세요.'}</p></div>`}</div>${nextPage!==null?'<button type="button" class="btn sy-more" data-sy="more">조합 글 더 보기</button>':''}`);
 }
 async function list(append=false){
  const request=++version;if(!append)loading();
  const query=new URLSearchParams({...filters,page:String(append?nextPage:0)});if(ownId&&!filters.mine)query.set('character',ownId);if(filters.mine)query.delete('partner');
  try{const data=filters.mine&&!admin&&!participation.read()?{posts:[],total:0,nextPage:null}:await api(base+'?'+query);if(alive&&request===version)listView(data,append);}catch(error){if(alive&&request===version)errorScreen(error);}
 }
 function comment(c){return `<article class="sy-comment" id="sy-comment-${e(c.id)}"><div class="sy-meta">${person(c.author,characters)}${c.isAuthor?'<span>작성자</span>':''}<time>${e(date(c.createdAt))}</time></div>${c.replyTo?`<p class="sy-caption">↳ ${e(c.replyTo.name)}에게</p>`:''}<p class="sy-prose ${c.hidden||c.deleted?'muted':''}">${e(c.deleted?'삭제된 댓글입니다.':c.hidden&&!admin?'운영자가 숨긴 댓글입니다.':c.body)}</p><div class="sy-comment-actions">${!admin&&!current.hidden&&!c.hidden&&!c.deleted?`<button type="button" data-sy="reply" data-id="${e(c.id)}">답글</button>`:''}${!admin&&c.isMine&&!c.deleted?`<button type="button" data-sy="delete-comment" data-id="${e(c.id)}">삭제</button>`:''}${admin&&!c.deleted?`<button type="button" data-sy="hide-comment" data-id="${e(c.id)}">${c.hidden?'다시 공개':'숨기기'}</button>`:''}</div></article>`;}
 function detailView(data){
  current=data.post;const p=current;
  // A full render creates an empty comment form, so its reply target must reset too.
  reply=null;requestId=uuid();
  frame(`${back()}${recovery()}<article class="panel sy-detail"><div class="sy-pair">${pairImages(p.characterIds,characters)}<strong>${e(pairLabel(p.characterIds,characters))}</strong><span class="tag ${p.hidden?'warm':''}">${p.hidden?'숨김':'이용자 경험'}</span></div><h2>${e(p.title)}</h2>${tags(p.situations)}<div class="sy-meta">${person(p.author,characters)}<time>${e(date(p.createdAt))}</time>${p.updatedAt>p.createdAt?`<span>최근 변경 ${e(date(p.updatedAt))}</span>`:''}</div><section><h3>활용법</h3><p class="sy-prose">${e(p.body)}</p></section><section><h3>조건·주의점</h3><p class="sy-prose">${e(p.caution)}</p></section>${p.hidden?`<p class="sy-notice">현재 공개되지 않은 글입니다. ${e(p.moderationReason)}</p>`:''}<div class="sy-actions"><button type="button" class="btn quiet small" data-sy="share">공유</button>${!admin&&p.isMine?'<button type="button" class="btn quiet small" data-sy="edit">수정</button><button type="button" class="btn quiet small" data-sy="delete">삭제</button>':''}${!admin&&!p.hidden?'<button type="button" class="btn quiet small" data-sy="report">신고</button>':''}</div></article>${admin?`<form class="panel sy-moderation" data-sy-form="moderation"><h3>공개 관리</h3><label>처리 사유<textarea name="reason" rows="2" maxlength="500" ${p.hidden?'':'required minlength="3"'}>${e(p.moderationReason)}</textarea></label><button class="btn" type="submit">${p.hidden?'다시 공개':'게시글 숨기기'}</button></form><section class="panel sy-reports"><h3>미처리 신고 ${data.reports?.length||0}건</h3>${(data.reports||[]).map(r=>`<p><strong>${e(SYNERGY_REPORTS[r.reason]||r.reason)}</strong> · ${e(date(r.createdAt))}</p><p class="sy-prose">${e(r.detail)}</p>`).join('')}${data.reports?.length?'<button class="btn small" type="button" data-sy="resolve-reports">신고 확인 완료</button>':''}</section>`:help}<div class="sy-report-slot"></div><section class="panel sy-discussion"><h2>댓글 <span data-sy-count>${p.commentCount}</span></h2>${!admin&&!p.hidden?`<form data-sy-form="comment" class="sy-comment-form"><div class="sy-reply-target" hidden></div><label>댓글<textarea name="body" rows="3" maxlength="1500" required placeholder="함께 써 본 경험이나 다른 활용법을 남겨주세요."></textarea></label><button class="btn primary small" type="submit">댓글 등록</button></form>`:''}<div class="sy-comments">${comments.map(comment).join('')||'<p class="muted">아직 댓글이 없습니다.</p>'}</div>${nextAfter!==null?'<button type="button" class="btn sy-more" data-sy="more-comments">댓글 더 보기</button>':''}</section>`);
 }
 async function detail(){const request=++version;loading();try{const [data,thread]=await Promise.all([api(base+'/'+postId),api(base+'/'+postId+'/comments')]);if(!alive||request!==version)return;comments=thread.comments;nextAfter=thread.nextAfter;detailView(data);}catch(error){if(alive&&request===version)errorScreen(error);}}
 const load=()=>postId?detail():list();
 function compose(post=null){++version;editing=post;requestId=uuid();frame(back()+recovery()+synergyEditor({characters,ownId,partnerId:filters.partner,post}));root.querySelector('[name="'+(post?'title':filters.partner?'title':'characterB')+'"]')?.focus();}
 function report(){root.querySelector('.sy-report-slot').innerHTML=`<form class="panel sy-report-form" data-sy-form="report"><h3>조합 글 신고</h3><label>사유<select name="reason">${Object.entries(SYNERGY_REPORTS).map(([k,v])=>option(k,v,'')).join('')}</select></label><label>설명 · 선택<textarea name="detail" rows="3" maxlength="500"></textarea></label><p class="sy-caption">신고 내용은 운영자만 확인합니다.</p><div class="sy-actions"><button type="button" class="btn" data-sy="cancel-report">취소</button><button type="submit" class="btn primary">신고 보내기</button></div></form>`;root.querySelector('.sy-report-form select')?.focus();}
 async function click(event){
  const recoveryButton=event.target.closest('[data-participation]');if(recoveryButton?.dataset.participation==='open'){event.preventDefault();if(busy)return;openParticipation({origin,mode:recoveryButton.dataset.participationView,beforeSwitch:()=>!root.querySelector('[data-sy-form="post"], [data-sy-form="comment"] textarea:not(:placeholder-shown)')||confirm('입력 중인 내용이 있습니다. 기록을 전환하고 목록을 다시 불러올까요?'),onConnected:()=>{authorAtOpen=participation.read();controllers.forEach(c=>c.abort());filters.mine='1';move('');}});return;}
  const button=event.target.closest('[data-sy]');if(!button||!root.contains(button))return;event.preventDefault();if(busy)return;const action=button.dataset.sy;
  if(action==='open'){move(button.dataset.id);return;}if(action==='back'){move('');return;}if(action==='reload'){load();return;}if(action==='compose'){compose();return;}if(action==='edit'){compose(current);return;}if(action==='cancel'){editing=null;load();return;}
  if(action==='all'||action==='mine'){filters.mine=action==='mine'?'1':'';list();return;}
  if(action==='reply'){reply=comments.find(c=>c.id===button.dataset.id);if(!reply)return;const node=root.querySelector('.sy-reply-target');node.innerHTML=`${e(reply.author.name)}에게 답글 <button type="button" data-sy="cancel-reply">취소</button>`;node.hidden=false;requestId=uuid();root.querySelector('[data-sy-form="comment"] textarea').focus();return;}
  if(action==='cancel-reply'){reply=null;requestId=uuid();root.querySelector('.sy-reply-target').hidden=true;return;}
  if(action==='report'){report();return;}if(action==='cancel-report'){root.querySelector('.sy-report-slot').innerHTML='';return;}
  if(action==='share'){const url=new URL(synergyRoute(current.characterIds[0],current.characterIds[1],current.id),location.href).href;try{if(navigator.share)await navigator.share({title:current.title,url});else{await navigator.clipboard.writeText(url);notice('공유 링크를 복사했습니다.');}}catch(error){if(error.name!=='AbortError')notice('공유 링크: '+url);}return;}
  if(action==='delete'&&!confirm('이 조합 글을 삭제할까요? 삭제하면 다시 볼 수 없습니다.'))return;
  if(action==='delete-comment'&&!confirm('직접 작성한 댓글을 삭제할까요?'))return;
  busy=true;button.disabled=true;
  try{
   if(action==='more')await list(true);
   if(action==='more-comments'){const data=await api(base+'/'+postId+'/comments?after='+nextAfter);if(alive){comments=[...comments,...data.comments.filter(c=>!comments.some(old=>old.id===c.id))];nextAfter=data.nextAfter;root.querySelector('.sy-comments').innerHTML=comments.map(comment).join('');if(nextAfter===null)button.remove();}}
   if(action==='delete'){const authorToken=await ensureAuthor();await api(base+'/'+postId,{method:'DELETE',authorToken});if(alive)move('');}
   if(action==='delete-comment'){const authorToken=await ensureAuthor();await api(base+'/comments/'+button.dataset.id,{method:'DELETE',authorToken});if(alive)await detail();}
   if(action==='hide-comment'&&admin){const c=comments.find(c=>c.id===button.dataset.id);if(c){await api(base+'/comments/'+c.id,{method:'PATCH',body:{hidden:!c.hidden}});if(alive)await detail();}}
   if(action==='resolve-reports'&&admin){await api(base+'/'+postId+'/reports',{method:'PATCH',body:{}});if(alive)await detail();}
  }catch(error){if(alive)notice(error.message,true);}finally{busy=false;if(button.isConnected)button.disabled=false;}
 }
 async function submit(event){
  const form=event.target.closest('[data-sy-form]');if(!form||!root.contains(form))return;event.preventDefault();if(busy||!form.reportValidity())return;
  const data=new FormData(form),kind=form.dataset.syForm;
  if(kind==='filters'){for(const key of ['partner','situation','q','sort','reported'])if(data.has(key))filters[key]=String(data.get(key));list();return;}
  let draft;
  if(kind==='post'){
   draft={characterIds:[String(data.get('characterA')),String(data.get('characterB'))],title:String(data.get('title')),body:String(data.get('body')),caution:String(data.get('caution')),situations:data.getAll('situation').map(String),...(editing?{revision:editing.revision}:{})};
   const error=validateSynergyDraft(draft,characters,{editing:!!editing});if(error){notice(error,true);return;}
  }
  busy=true;const button=form.querySelector('[type="submit"]');button.disabled=true;
  try{
   const authorToken=admin?'':await ensureAuthor();
   if(kind==='post'){const {characterIds,...content}=draft;const result=await api(base+(editing?'/'+editing.id:''),{method:editing?'PATCH':'POST',body:editing?content:{...draft,requestId},authorToken});if(alive){editing=null;move(result.post.id);}}
   if(kind==='comment'){await api(base+'/'+postId+'/comments',{method:'POST',body:{body:String(data.get('body')),parentId:reply?.id||null,requestId},authorToken});if(alive){reply=null;requestId=uuid();await detail();notice('댓글을 등록했습니다.');}}
   if(kind==='report'){await api(base+'/'+postId+'/report',{method:'POST',body:{reason:String(data.get('reason')),detail:String(data.get('detail'))},authorToken});if(alive){root.querySelector('.sy-report-slot').innerHTML='';notice('신고를 접수했습니다. 운영자가 확인합니다.');}}
   if(kind==='moderation'&&admin){await api(base+'/'+postId+'/moderation',{method:'PATCH',body:{hidden:!current.hidden,reason:String(data.get('reason')),revision:current.revision}});if(alive)await detail();}
  }catch(error){if(alive)notice(error.message,true);}finally{busy=false;if(button.isConnected)button.disabled=false;}
 }
 const changed=event=>{if(!busy&&event.target.closest('[data-sy-form="post"], [data-sy-form="comment"]'))requestId=uuid();};
 root.addEventListener('click',click);root.addEventListener('submit',submit);root.addEventListener('input',changed);root.addEventListener('change',changed);load();
 return ()=>{alive=false;++version;controllers.forEach(c=>c.abort());root.removeEventListener('click',click);root.removeEventListener('submit',submit);root.removeEventListener('input',changed);root.removeEventListener('change',changed);};
}
