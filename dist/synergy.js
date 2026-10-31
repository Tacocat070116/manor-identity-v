import {requestId as uuid} from './request-id.js?v=58ef88b53202';
import {participation,participationBar,openParticipation,refreshParticipationBanners} from './participation.js?v=a5cb7f44886e';
import {SYNERGY_SITUATIONS,SYNERGY_REPORTS,RESEARCH_TOPICS,PROPOSAL_STATES,synergyEscape as e,synergyRoute,validateSynergyDraft} from './synergy-model.js?v=29eb430cab7a';
const ORIGIN='https://manor-feedback.tacocat070116.chatgpt.site';
const date=time=>new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(time));
const option=(value,label,selected)=>`<option value="${e(value)}" ${value===selected?'selected':''}>${e(label)}</option>`;
const person=(author,characters)=>`<span class="sy-person">${characters[author?.characterId]?`<img src="${e(characters[author.characterId].portrait)}" alt="" width="28" height="28" loading="lazy">`:''}<span>${e(author?.name||'장원의 손님')}</span></span>`;
const tags=situations=>`<div class="sy-tags">${situations.map(s=>`<span class="tag">${e(s)}</span>`).join('')}</div>`;
const pairLabel=(ids,characters)=>ids.map(id=>characters[id]?.name||'알 수 없는 캐릭터').join(' + ')||'게임 시스템·운영';
const pairImages=(ids,characters)=>`<span class="sy-pair-images" aria-hidden="true">${ids.map(id=>characters[id]?`<img src="${e(characters[id].portrait)}" alt="" width="40" height="40" loading="lazy">`:'').join('')}</span>`;

const topicLabel=post=>RESEARCH_TOPICS[post.topic||'combination'];
const proposalTag=post=>post.proposal?.status&&post.proposal.status!=='none'?`<span class="tag ${post.proposal.status==='approved'?'green':''}">${e(PROPOSAL_STATES[post.proposal.status])}</span>`:'';

export function synergyPostCard(post,characters,{ownId='',partnerId='',admin=false}={}){
 return `<a class="panel sy-post-card" href="${e(synergyRoute(ownId,partnerId,post.id,post.topic))}" data-sy="open" data-id="${e(post.id)}"><div class="sy-pair">${pairImages(post.characterIds,characters)}<span>${e(pairLabel(post.characterIds,characters))}</span><span class="tag">${e(topicLabel(post))}</span>${proposalTag(post)}${post.hidden?'<span class="tag warm">숨김</span>':''}${admin&&post.reportCount?`<span class="tag warm">미처리 신고 ${post.reportCount}건</span>`:''}</div><h3>${e(post.title)}</h3>${tags(post.situations)}<p class="sy-excerpt">${e(post.body)}</p><div class="sy-meta">${person(post.author,characters)}<time datetime="${new Date(post.createdAt).toISOString()}">${e(date(post.createdAt))}</time><span>댓글 ${Number(post.commentCount)||0}</span></div></a>`;
}

const topicHelp=topic=>({combination:'생존자 2~4명을 고르고 역할 분담과 연계 방법을 적어주세요.',survivor_persona:'생존자 1명의 인격 구성, 선택 이유와 교체 조건을 함께 적어주세요.',hunter_persona:'감시자 1명의 인격 구성, 선택 이유와 교체 조건을 함께 적어주세요.',strategy:'맵, 운영, 게임 시스템 등 자유롭게 토의하세요. 관련 캐릭터는 선택 사항입니다.'}[topic]);
export function researchCharacterFields(characters,topic,ids=[],fixed=false){
 const side=topic==='hunter_persona'?'감시자':topic==='strategy'?'':'생존자';
 const choices=Object.values(characters).filter(c=>!side||c.side===side).sort((a,b)=>a.name.localeCompare(b.name,'ko'));
 const count=fixed?ids.length:topic.endsWith('_persona')?1:4;
 if(fixed&&!count)return '<p class="muted">관련 캐릭터 없이 게임 시스템을 토의하는 글입니다.</p>';
 return Array.from({length:count},(_,i)=>{
  const id=choices.some(c=>c.id===ids[i])?ids[i]:'',required=topic==='combination'?i<2:topic.endsWith('_persona');
  return `<label>${topic.endsWith('_persona')?'연구할 캐릭터':`관련 캐릭터 ${i+1}${required?'':' · 선택'}`}${fixed?`<strong class="sy-fixed-character">${e(characters[id]?.name)}</strong><input type="hidden" name="character" value="${e(id)}">`:`<select name="character" ${required?'required':''}>${option('','캐릭터 선택',id)+choices.map(c=>option(c.id,c.name,id)).join('')}</select>`}</label>`;
 }).join('');
}
export function synergyEditor({characters,ownId='',partnerId='',topic='combination',post=null}={}){
 topic=post?.topic||topic||'combination';
 const ids=post?.characterIds||[ownId,partnerId].filter(Boolean),p=post||{title:'',body:'',caution:'',situations:[]};
 return `<form class="sy-editor panel" data-sy-form="post"><h2>${post?'연구 글 수정':'연구 시작하기'}</h2><label>연구 주제${post?`<strong>${e(RESEARCH_TOPICS[topic])}</strong><input type="hidden" name="topic" value="${e(topic)}">`:`<select name="topic">${Object.entries(RESEARCH_TOPICS).map(([k,v])=>option(k,v,topic)).join('')}</select>`}</label><p class="muted sy-topic-help">${e(topicHelp(topic))}</p><div class="sy-form-pair">${researchCharacterFields(characters,topic,ids,!!post)}</div><label>제목<input name="title" value="${e(p.title)}" minlength="3" maxlength="80" required placeholder="함께 연구하고 싶은 내용을 적어주세요."></label><fieldset><legend>활용 상황 · 1~3개</legend><div class="sy-situation-choices">${SYNERGY_SITUATIONS.map(s=>`<label><input type="checkbox" name="situation" value="${e(s)}" ${p.situations.includes(s)?'checked':''}><span>${e(s)}</span></label>`).join('')}</div></fieldset><label>연구 내용·활용법<textarea name="body" rows="7" minlength="20" maxlength="3000" required placeholder="조합의 역할 분담, 인격 구성과 선택 이유, 확인해 본 상황 등을 자유롭게 적어주세요.">${e(p.body)}</textarea><small>20~3,000자</small></label><label>조건·주의점<textarea name="caution" rows="3" minlength="5" maxlength="1000" required placeholder="적용하기 어려운 상황이나 아직 확인하지 못한 점을 적어주세요.">${e(p.caution)}</textarea><small>5~1,000자</small></label><p class="sy-caption">${post?.proposal?.status&&post.proposal.status!=='none'?'글을 수정하면 기존 도감 반영·검토 상태가 해제됩니다. 수정한 내용으로 다시 제안해 주세요.':'등록한 글은 공개됩니다. 토론 후 글의 ‘도감 반영 제안’으로 검토를 요청할 수 있습니다.'}</p><div class="sy-actions"><button type="button" class="btn" data-sy="cancel">취소</button><button type="submit" class="btn primary">${post?'수정 저장':'연구 글 등록'}</button></div></form>`;
}

export function researchProposal(post,{admin=false}={}){
 const p=post.proposal||{status:'none'},canPropose=!admin&&post.isMine&&!post.hidden&&post.characterIds.length&&!['pending','approved'].includes(p.status);
 return `<section class="panel sy-proposal"><div class="heading-inline"><h3>도감 반영</h3><span class="tag ${p.status==='approved'?'green':''}">${e(PROPOSAL_STATES[p.status])}</span></div><p class="sy-caption">연구 글의 작성자가 근거와 함께 제안하면 운영자가 검토합니다. 승인된 내용은 관련 캐릭터 도감의 ‘연구실에서 반영한 전략’에 원문과 함께 표시됩니다.</p>${p.note?`<details><summary>제안 근거 보기</summary><p class="sy-prose">${e(p.note)}</p></details>`:''}${p.reason?`<p class="sy-prose"><strong>검토 의견</strong><br>${e(p.reason)}</p>`:''}${p.status==='approved'?`<div class="sy-actions">${post.characterIds.map(id=>`<a class="text-link" href="${admin?'https://tacocat070116.github.io/manor-identity-v/':''}#v=character&c=${e(id)}">도감에서 보기 →</a>`).join('')}</div>`:''}${canPropose?`<form data-sy-form="proposal"><label>검토 근거<textarea name="note" rows="3" minlength="20" maxlength="1500" required placeholder="직접 확인한 경기·맵·인격 구성과 재현 조건, 참고 링크 등을 적어주세요.">${e(p.note||'')}</textarea></label><button class="btn primary" type="submit">도감 반영 제안</button></form>`:!admin&&post.isMine&&!post.characterIds.length?'<p class="sy-caption">도감 반영을 제안하려면 관련 캐릭터가 지정된 연구 글이 필요합니다.</p>':''}${admin&&!post.hidden&&['pending','approved'].includes(p.status)?`<form data-sy-form="proposal-review"><label>검토 결과<select name="decision">${p.status==='pending'?'<option value="approved">도감에 반영</option>':''}<option value="declined">${p.status==='approved'?'도감 반영 철회':'보완 요청'}</option></select></label><label>검토 의견<textarea name="reason" rows="3" minlength="5" maxlength="1000" required placeholder="적용 조건과 검토한 근거 또는 보완할 내용을 적어주세요."></textarea></label><button class="btn primary" type="submit">검토 결과 저장</button></form>`:''}</section>`;
}

export function mountSynergy(root,{characters={},ownId='',partnerId='',postId='',initialMine=false,initialTopic='',initialSituation='',initialQuery='',initialSort='new',navigate,admin=false,origin=ORIGIN}={}){
 let alive=true,busy=false,version=0,current=null,editing=null,reply=null,comments=[],posts=[],nextPage=null,nextAfter=null,requestId=uuid(),authorAtOpen=participation.read();
 const filters={character:ownId,partner:partnerId,topic:initialTopic,situation:initialSituation,q:initialQuery,sort:initialSort,mine:initialMine?'1':'',reported:'',proposal:''};
 const controllers=new Set(),base='/api/'+(admin?'admin/research':'research');
 const frame=html=>{if(alive)root.innerHTML=`<section class="sy-board"><div class="sy-notice" role="status" aria-live="polite" hidden></div>${html}</section>`;};
 const notice=(message,error=false)=>{const node=root.querySelector('.sy-notice');if(node){node.textContent=message;node.classList.toggle('is-error',error);node.hidden=!message;}};
 const context=()=>({...filters,partnerId:filters.partner,mine:filters.mine==='1'});
 const move=id=>{if(navigate){navigate(id||'',context());return;}postId=id||'';reply=null;editing=null;requestId=uuid();load();};
 const back=()=>`<button class="back-link" type="button" data-sy="back">← 연구실 목록</button>`;
 const help='<p class="sy-caption">서로의 전략을 나누고 댓글로 발전시켜 보세요. 도감 반영 제안은 운영자의 검토를 거쳐 관련 캐릭터 도감에 연결됩니다.</p>';
 const recovery=()=>admin?'':participationBar();
 const loading=()=>frame('<div class="sy-empty" role="status" aria-busy="true"><span class="loading-orbit" aria-hidden="true"></span><p>연구실을 불러오고 있습니다.</p></div>');
 const errorScreen=error=>frame(`${back()}<div class="sy-empty"><h2>연구실을 불러오지 못했습니다.</h2><p>${e(error.message)}</p><button class="btn" type="button" data-sy="reload">다시 시도</button></div>`);
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
  const roster=Object.values(characters).sort((a,b)=>a.name.localeCompare(b.name,'ko'));
  frame(`<div class="sy-heading"><div><h2>${admin?'연구실 관리':'함께 만드는 전략'}</h2><p>${admin?'연구 글·댓글·신고와 도감 반영 제안을 검토하세요.':'조합부터 인격, 게임 시스템까지 함께 실험하고 토의하세요.'}</p></div>${admin?'':'<button type="button" class="btn primary" data-sy="compose">연구 시작하기</button>'}</div>${admin?'':help}${recovery()}<div class="lab-topics" role="group" aria-label="연구 주제">${Object.entries({'':'전체 연구',...RESEARCH_TOPICS}).map(([k,v])=>`<button type="button" data-sy="topic" data-topic="${k}" aria-pressed="${filters.topic===k}">${e(v)}</button>`).join('')}</div>${admin?'':`<div class="participation-tabs" role="group" aria-label="연구 글 보기"><button type="button" data-sy="all" aria-pressed="${!filters.mine}">모든 글</button><button type="button" data-sy="mine" aria-pressed="${filters.mine==='1'}">내 참여 글</button></div>`}<form class="sy-filters" data-sy-form="filters"><label>관련 캐릭터<select name="character">${option('','모든 캐릭터',filters.character)+roster.map(c=>option(c.id,c.name,filters.character)).join('')}</select></label>${filters.partner?`<label>함께한 캐릭터<select name="partner">${option('','모든 캐릭터',filters.partner)+roster.map(c=>option(c.id,c.name,filters.partner)).join('')}</select></label>`:''}<label>활용 상황<select name="situation">${option('','모든 상황',filters.situation)+SYNERGY_SITUATIONS.map(s=>option(s,s,filters.situation)).join('')}</select></label><label>정렬<select name="sort">${option('new','최신순',filters.sort)+option('discussed','댓글순',filters.sort)}</select></label>${admin?`<label>신고<select name="reported">${option('','전체 글',filters.reported)+option('1','미처리 신고',filters.reported)}</select></label><label>도감 검토<select name="proposal">${option('','모든 상태',filters.proposal)+['pending','approved','declined'].map(k=>option(k,PROPOSAL_STATES[k],filters.proposal)).join('')}</select></label>`:''}<label class="sy-search">내용 검색<input type="search" name="q" value="${e(filters.q)}" maxlength="100" placeholder="연구 내용 검색"></label><button class="btn" type="submit">검색</button><button class="btn quiet" type="button" data-sy="reset-filters">초기화</button></form><p class="sy-count" role="status">${filters.mine?'내가 작성하거나 댓글을 남긴 연구 글':'조건에 맞는 연구 글'} ${data.total}개</p><div class="sy-post-list">${posts.length?posts.map(p=>synergyPostCard(p,characters,{ownId:filters.character,partnerId:filters.partner,admin})).join(''):`<div class="sy-empty"><h3>${filters.mine?'연결된 기록의 참여 글이 없습니다.':'아직 조건에 맞는 연구 글이 없습니다.'}</h3><p>${filters.mine?'다른 브라우저에서 쓴 글은 복구 코드로 기록을 연결해 주세요.':'궁금한 조합이나 인격, 직접 확인한 전략을 첫 글로 남겨보세요.'}</p></div>`}</div>${nextPage!==null?'<button type="button" class="btn sy-more" data-sy="more">연구 글 더 보기</button>':''}`);
 }
 async function list(append=false){
  const request=++version;if(!append)loading();
  const query=new URLSearchParams({...filters,page:String(append?nextPage:0)});
  try{const data=filters.mine&&!admin&&!participation.read()?{posts:[],total:0,nextPage:null}:await api(base+'?'+query);if(alive&&request===version)listView(data,append);}catch(error){if(alive&&request===version)errorScreen(error);}
 }
 function comment(c){return `<article class="sy-comment" id="sy-comment-${e(c.id)}"><div class="sy-meta">${person(c.author,characters)}${c.isAuthor?'<span>작성자</span>':''}<time>${e(date(c.createdAt))}</time></div>${c.replyTo?`<p class="sy-caption">↳ ${e(c.replyTo.name)}에게</p>`:''}<p class="sy-prose ${c.hidden||c.deleted?'muted':''}">${e(c.deleted?'삭제된 댓글입니다.':c.hidden&&!admin?'운영자가 숨긴 댓글입니다.':c.body)}</p><div class="sy-comment-actions">${!admin&&!current.hidden&&!c.hidden&&!c.deleted?`<button type="button" data-sy="reply" data-id="${e(c.id)}">답글</button>`:''}${!admin&&c.isMine&&!c.deleted?`<button type="button" data-sy="delete-comment" data-id="${e(c.id)}">삭제</button>`:''}${admin&&!c.deleted?`<button type="button" data-sy="hide-comment" data-id="${e(c.id)}">${c.hidden?'다시 공개':'숨기기'}</button>`:''}</div></article>`;}
 function detailView(data){
  current=data.post;const p=current;
  // A full render creates an empty comment form, so its reply target must reset too.
  reply=null;requestId=uuid();
  frame(`${back()}${recovery()}<article class="panel sy-detail"><div class="sy-pair">${pairImages(p.characterIds,characters)}<strong>${e(pairLabel(p.characterIds,characters))}</strong><span class="tag ${p.hidden?'warm':''}">${p.hidden?'숨김':e(topicLabel(p))}</span></div><h2>${e(p.title)}</h2>${tags(p.situations)}<div class="sy-meta">${person(p.author,characters)}<time>${e(date(p.createdAt))}</time>${p.updatedAt>p.createdAt?`<span>최근 변경 ${e(date(p.updatedAt))}</span>`:''}</div><section><h3>활용법</h3><p class="sy-prose">${e(p.body)}</p></section><section><h3>조건·주의점</h3><p class="sy-prose">${e(p.caution)}</p></section>${p.hidden?`<p class="sy-notice">현재 공개되지 않은 글입니다. ${e(p.moderationReason)}</p>`:''}<div class="sy-actions"><button type="button" class="btn quiet small" data-sy="share">공유</button>${!admin&&p.isMine?'<button type="button" class="btn quiet small" data-sy="edit">수정</button><button type="button" class="btn quiet small" data-sy="delete">삭제</button>':''}${!admin&&!p.hidden?'<button type="button" class="btn quiet small" data-sy="report">신고</button>':''}</div></article>${researchProposal(p,{admin})}${admin?`<form class="panel sy-moderation" data-sy-form="moderation"><h3>공개 관리</h3><label>처리 사유<textarea name="reason" rows="2" maxlength="500" ${p.hidden?'':'required minlength="3"'}>${e(p.moderationReason)}</textarea></label><button class="btn" type="submit">${p.hidden?'다시 공개':'게시글 숨기기'}</button></form><section class="panel sy-reports"><h3>미처리 신고 ${data.reports?.length||0}건</h3>${(data.reports||[]).map(r=>`<p><strong>${e(SYNERGY_REPORTS[r.reason]||r.reason)}</strong> · ${e(date(r.createdAt))}</p><p class="sy-prose">${e(r.detail)}</p>`).join('')}${data.reports?.length?'<button class="btn small" type="button" data-sy="resolve-reports">신고 확인 완료</button>':''}</section>`:help}<div class="sy-report-slot"></div><section class="panel sy-discussion"><h2>댓글 <span data-sy-count>${p.commentCount}</span></h2>${!admin&&!p.hidden?`<form data-sy-form="comment" class="sy-comment-form"><div class="sy-reply-target" hidden></div><label>댓글<textarea name="body" rows="3" maxlength="1500" required placeholder="함께 써 본 경험이나 다른 활용법을 남겨주세요."></textarea></label><button class="btn primary small" type="submit">댓글 등록</button></form>`:''}<div class="sy-comments">${comments.map(comment).join('')||'<p class="muted">아직 댓글이 없습니다.</p>'}</div>${nextAfter!==null?'<button type="button" class="btn sy-more" data-sy="more-comments">댓글 더 보기</button>':''}</section>`);
 }
 async function detail(){const request=++version;loading();try{const [data,thread]=await Promise.all([api(base+'/'+postId),api(base+'/'+postId+'/comments')]);if(!alive||request!==version)return;comments=thread.comments;nextAfter=thread.nextAfter;detailView(data);}catch(error){if(alive&&request===version)errorScreen(error);}}
 const load=()=>postId?detail():list();
 function compose(post=null){++version;editing=post;requestId=uuid();frame(back()+recovery()+synergyEditor({characters,ownId:filters.character,partnerId:filters.partner,topic:filters.topic||'combination',post}));root.querySelector(post?'[name="title"]':'[name="topic"]')?.focus();}
 function report(){root.querySelector('.sy-report-slot').innerHTML=`<form class="panel sy-report-form" data-sy-form="report"><h3>연구 글 신고</h3><label>사유<select name="reason">${Object.entries(SYNERGY_REPORTS).map(([k,v])=>option(k,v,'')).join('')}</select></label><label>설명 · 선택<textarea name="detail" rows="3" maxlength="500"></textarea></label><p class="sy-caption">신고 내용은 운영자만 확인합니다.</p><div class="sy-actions"><button type="button" class="btn" data-sy="cancel-report">취소</button><button type="submit" class="btn primary">신고 보내기</button></div></form>`;root.querySelector('.sy-report-form select')?.focus();}
 async function click(event){
  const recoveryButton=event.target.closest('[data-participation]');if(recoveryButton?.dataset.participation==='open'){event.preventDefault();if(busy)return;openParticipation({origin,mode:recoveryButton.dataset.participationView,beforeSwitch:()=>!root.querySelector('[data-sy-form="post"], [data-sy-form="comment"] textarea:not(:placeholder-shown)')||confirm('입력 중인 내용이 있습니다. 기록을 전환하고 목록을 다시 불러올까요?'),onConnected:()=>{authorAtOpen=participation.read();controllers.forEach(c=>c.abort());filters.mine='1';move('');}});return;}
  const button=event.target.closest('[data-sy]');if(!button||!root.contains(button))return;event.preventDefault();if(busy)return;const action=button.dataset.sy;
  if(action==='open'){move(button.dataset.id);return;}if(action==='back'){move('');return;}if(action==='reload'){load();return;}if(action==='compose'){compose();return;}if(action==='edit'){compose(current);return;}if(action==='cancel'){editing=null;load();return;}
  if(action==='all'||action==='mine'){filters.mine=action==='mine'?'1':'';move('');return;}
  if(action==='topic'){filters.topic=button.dataset.topic;move('');return;}
  if(action==='reset-filters'){Object.assign(filters,{character:'',partner:'',topic:'',situation:'',q:'',sort:'new',reported:'',proposal:''});move('');return;}
  if(action==='reply'){reply=comments.find(c=>c.id===button.dataset.id);if(!reply)return;const node=root.querySelector('.sy-reply-target');node.innerHTML=`${e(reply.author.name)}에게 답글 <button type="button" data-sy="cancel-reply">취소</button>`;node.hidden=false;requestId=uuid();root.querySelector('[data-sy-form="comment"] textarea').focus();return;}
  if(action==='cancel-reply'){reply=null;requestId=uuid();root.querySelector('.sy-reply-target').hidden=true;return;}
  if(action==='report'){report();return;}if(action==='cancel-report'){root.querySelector('.sy-report-slot').innerHTML='';return;}
  if(action==='share'){const url='https://tacocat070116.github.io/manor-identity-v/'+synergyRoute('','',current.id,current.topic);try{if(navigator.share)await navigator.share({title:current.title,url});else{await navigator.clipboard.writeText(url);notice('공유 링크를 복사했습니다.');}}catch(error){if(error.name!=='AbortError')notice('공유 링크: '+url);}return;}
  if(action==='delete'&&!confirm('이 연구 글을 삭제할까요? 삭제하면 다시 볼 수 없습니다.'))return;
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
  if(kind==='filters'){for(const key of ['character','partner','situation','q','sort','reported','proposal'])if(data.has(key))filters[key]=String(data.get(key));move('');return;}
  let draft;
  if(kind==='post'){
   draft={topic:String(data.get('topic')),characterIds:data.getAll('character').map(String).filter(Boolean),title:String(data.get('title')),body:String(data.get('body')),caution:String(data.get('caution')),situations:data.getAll('situation').map(String),...(editing?{revision:editing.revision}:{})};
   const error=validateSynergyDraft(draft,characters,{editing:!!editing});if(error){notice(error,true);return;}
  }
  busy=true;const button=form.querySelector('[type="submit"]');button.disabled=true;
  try{
   const authorToken=admin?'':await ensureAuthor();
   if(kind==='post'){const {characterIds,topic,...content}=draft;const result=await api(base+(editing?'/'+editing.id:''),{method:editing?'PATCH':'POST',body:editing?content:{...draft,requestId},authorToken});if(alive){editing=null;move(result.post.id);}}
   if(kind==='comment'){await api(base+'/'+postId+'/comments',{method:'POST',body:{body:String(data.get('body')),parentId:reply?.id||null,requestId},authorToken});if(alive){reply=null;requestId=uuid();await detail();notice('댓글을 등록했습니다.');}}
   if(kind==='report'){await api(base+'/'+postId+'/report',{method:'POST',body:{reason:String(data.get('reason')),detail:String(data.get('detail'))},authorToken});if(alive){root.querySelector('.sy-report-slot').innerHTML='';notice('신고를 접수했습니다. 운영자가 확인합니다.');}}
   if(kind==='proposal'){await api(base+'/'+postId+'/proposal',{method:'POST',body:{note:String(data.get('note')),revision:current.revision},authorToken});if(alive){await detail();notice('도감 반영 제안을 보냈습니다. 검토 결과는 이 글에서 확인하세요.');}}
   if(kind==='proposal-review'&&admin){await api(base+'/'+postId+'/proposal',{method:'PATCH',body:{decision:String(data.get('decision')),reason:String(data.get('reason')),revision:current.revision}});if(alive)await detail();}
   if(kind==='moderation'&&admin){await api(base+'/'+postId+'/moderation',{method:'PATCH',body:{hidden:!current.hidden,reason:String(data.get('reason')),revision:current.revision}});if(alive)await detail();}
  }catch(error){if(alive)notice(error.message,true);}finally{busy=false;if(button.isConnected)button.disabled=false;}
 }
 const changed=event=>{
  if(busy)return;
  if(event.target.closest('[data-sy-form="post"], [data-sy-form="comment"]'))requestId=uuid();
  if(event.type==='change'&&event.target.matches('[data-sy-form="post"] [name="topic"]')){
   const topic=event.target.value,ids=[...root.querySelectorAll('[name="character"]')].map(n=>n.value).filter(Boolean);
   root.querySelector('.sy-form-pair').innerHTML=researchCharacterFields(characters,topic,ids);
   root.querySelector('.sy-topic-help').textContent=topicHelp(topic);
  }
 };
 root.addEventListener('click',click);root.addEventListener('submit',submit);root.addEventListener('input',changed);root.addEventListener('change',changed);load();
 return ()=>{alive=false;++version;controllers.forEach(c=>c.abort());root.removeEventListener('click',click);root.removeEventListener('submit',submit);root.removeEventListener('input',changed);root.removeEventListener('change',changed);};
}
