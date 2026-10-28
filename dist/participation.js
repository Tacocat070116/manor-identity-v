const TOKEN_KEY='manor-feedback-visitor',PROFILE_KEY='manor-participation-profiles';
const validToken=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
export function recoveryCode(token){return validToken(token)?'MANOR-R1-'+token.toUpperCase().match(/.{8}/g).join('-'):'';}
export function recoveryToken(code){
 const value=String(code||'').trim().toUpperCase().replace(/[\s-]/g,'');
 return /^MANORR1[A-F0-9]{64}$/.test(value)?value.slice(7).toLowerCase():'';
}

// One identity store serves feedback, player notes and creator posts. Keep the
// old key so existing authors retain their records without a data migration.
export function createParticipationStore({storage=()=>globalThis.localStorage,locks=()=>typeof window==='undefined'?undefined:globalThis.navigator?.locks}={}){
 let memory='',memoryOnly=false,profiles=[],pending,persistent=true,queue=Promise.resolve();
 const read=()=>{try{const target=storage();if(!target)throw Error();const value=target.getItem(TOKEN_KEY);if(validToken(value)){memory=value;memoryOnly=false;return value;}return memoryOnly?memory:'';}catch{persistent=false;return memory;}};
 function saved(){
  try{const raw=JSON.parse(storage()?.getItem(PROFILE_KEY)||'[]');if(Array.isArray(raw)){
   const merged=new Map(profiles.map(p=>[p.token,p]));
   for(const p of raw)if(validToken(p?.token))merged.set(p.token,{token:p.token,createdAt:Number(p.createdAt)||Date.now(),backedUp:p.backedUp===true});
   profiles=[...merged.values()];
  }}catch{persistent=false;}
  return profiles;
 }
 function remember(token){if(validToken(token)&&!saved().some(p=>p.token===token))profiles.push({token,createdAt:Date.now(),backedUp:false});}
 function persistProfiles(){try{const target=storage();if(!target)throw Error();target.setItem(PROFILE_KEY,JSON.stringify(profiles));return true;}catch{persistent=false;return false;}}
 function save(token){
  if(token&&!validToken(token))throw Error('작성 정보가 올바르지 않습니다.');
  const previous=read();remember(previous);remember(token);
  if(!persistProfiles()&&previous&&token&&previous!==token)throw Error('현재 기록의 코드를 보관하지 못해 전환하지 않았습니다. 현재 복구 코드를 먼저 파일로 보관하고, 저장 가능한 브라우저에서 연결해 주세요.');
  memory=token;memoryOnly=false;
  try{const target=storage();if(!target)throw Error();if(token)target.setItem(TOKEN_KEY,token);else target.removeItem(TOKEN_KEY);persistent=true;}catch{persistent=false;memoryOnly=true;if(previous&&token&&previous!==token){memory=previous;throw Error('이 브라우저에 기록을 저장하지 못해 기존 연결을 유지했습니다. 복구 코드는 계속 보관해 주세요.');}}
  return token;
 }
 function serial(work){
  const task=()=>{const manager=locks();return manager?.request?manager.request('manor-participation',work):work();};
  const result=queue.then(task,task);queue=result.catch(()=>{});return result;
 }
 return {
  read,
  persistent:()=>persistent,
  profiles:()=>{remember(read());return saved().map(p=>({...p}));},
  backedUp:()=>saved().some(p=>p.token===read()&&p.backedUp),
  markBackedUp(){remember(read());const p=profiles.find(p=>p.token===read());if(p)p.backedUp=true;persistProfiles();},
  ensure(create){
   if(read())return Promise.resolve(read());
   if(!pending)pending=serial(async()=>{
    if(read())return read();
    const result=await create();if(!validToken(result?.token))throw Error('작성 정보를 만들지 못했습니다. 다시 시도해 주세요.');
    // Another tab without Web Locks may have finished while this request ran.
    return read()||save(result.token);
   }).finally(()=>{pending=null;});
   return pending;
  },
  invalidate(expected){return serial(()=>{if(expected&&read()===expected){save('');return true;}return false;});},
  async connect(code,{origin,fetcher=globalThis.fetch,signal,beforeSwitch=()=>true}={}){
   const token=recoveryToken(code);if(!token)throw Error('MANOR-R1로 시작하는 개인 복구 코드 전체를 입력해 주세요.');
   const response=await fetcher(origin+'/api/feedback/session',{method:'GET',credentials:'omit',cache:'no-store',redirect:'error',headers:{Authorization:'Bearer '+token,Accept:'application/json'},signal});
   if(!response.ok)throw Error(response.status===401?'등록된 기록을 찾지 못했습니다. 복구 코드를 다시 확인해 주세요.':'기록을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
   if(response.redirected||!response.headers.get('content-type')?.includes('application/json')||(await response.json())?.connected!==true)throw Error('기록 확인 응답이 올바르지 않습니다. 현재 기록은 그대로 유지됩니다.');
   return serial(()=>{if(signal?.aborted)throw new DOMException('Aborted','AbortError');if(read()!==token&&!beforeSwitch())return false;save(token);return true;});
  },
 };
}
export const participation=createParticipationStore();
const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function participationBar(){
 const current=participation.read();
 const text=!current?'전에 남긴 글이 있나요? 복구 코드로 내 기록을 연결하세요.':!participation.persistent()?'이 브라우저에서는 작성 정보가 유지되지 않을 수 있어요. 복구 코드를 꼭 따로 보관하세요.':participation.backedUp()?'연결된 기록으로 글과 운영자 답변을 확인할 수 있어요.':'브라우저가 바뀌어도 내 글을 찾을 수 있도록 복구 코드를 보관하세요.';
 return `<aside class="participation-bar"><p>${e(text)}</p><button type="button" class="btn small" data-participation="open">${current?'내 기록 연결·보관':'기존 기록 연결'}</button></aside>`;
}

let activeDialog=null;
export function openParticipation({origin,onConnected=()=>{},beforeSwitch=()=>true}={}){
 if(activeDialog){activeDialog.focus();return;}
 const dialog=document.createElement('dialog');dialog.className='participation-dialog';dialog.setAttribute('aria-labelledby','participation-title');
 const previousFocus=document.activeElement;let busy=false,controller;
 function render(){
  const current=participation.read(),profiles=participation.profiles();
  dialog.innerHTML=`<div class="participation-dialog-head"><h2 id="participation-title">내 기록 연결·보관</h2><button type="button" class="btn small" data-participation="close" aria-label="내 기록 연결 닫기">닫기</button></div><div class="participation-dialog-body"><p>글과 답변은 서버에 보관됩니다. 개인 복구 코드를 다른 브라우저에 입력하면 같은 작성 기록을 다시 확인할 수 있어요.</p>${current?`<section><h3>지금 연결된 기록 보관</h3><p>이 코드는 내 피드백·댓글·상대법·채널의 작성 권한을 연결합니다. 비밀번호처럼 보관하고 다른 사람에게 공유하지 마세요.</p><button type="button" class="btn" data-participation="reveal">개인 복구 코드 확인</button><div data-participation-code hidden><label>개인 복구 코드<textarea readonly rows="3" spellcheck="false" autocomplete="off" aria-label="개인 복구 코드"></textarea></label><div class="participation-actions"><button type="button" class="btn primary" data-participation="copy">복사</button><button type="button" class="btn" data-participation="download">파일로 보관</button><button type="button" class="btn" data-participation="saved">따로 저장했어요</button></div></div></section>`:'<p class="participation-note">아직 연결된 기록이 없습니다. 처음 글이나 댓글을 남기면 개인 복구 코드가 만들어집니다.</p>'}<section><h3>다른 브라우저의 기록 연결</h3><form data-participation-form><label>보관한 개인 복구 코드<input name="recoveryCode" type="password" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="MANOR-R1-…" maxlength="160" required></label><p class="participation-note">기존 기록이 있다면 함께 보관합니다. 서로 다른 기록은 합쳐지지 않으며 아래에서 전환할 수 있어요.</p><button class="btn primary" type="submit">내 기록 연결</button></form></section>${profiles.length>1?`<section><h3>이 브라우저에 보관한 기록</h3><div class="participation-profiles">${profiles.map((p,index)=>`<button type="button" class="btn" data-participation="switch" data-profile="${index}" ${p.token===current?'disabled':''}>기록 ${index+1} · ${e(new Intl.DateTimeFormat('ko-KR',{month:'short',day:'numeric'}).format(new Date(p.createdAt)))}${p.token===current?' · 연결 중':''}</button>`).join('')}</div></section>`:''}<p class="participation-note">복구 코드와 원래 브라우저 정보가 모두 없으면 작성자임을 자동으로 확인할 수 없습니다. 운영자 권한과는 별개입니다.</p><p class="participation-result" role="status" aria-live="polite"></p></div>`;
 }
 function result(message,error=false){const node=dialog.querySelector('.participation-result');node.textContent=message;node.classList.toggle('is-error',error);}
 async function connect(code){
  if(busy)return;busy=true;controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
  const button=dialog.querySelector('[type="submit"]');button.disabled=true;result('기존 기록을 확인하고 있습니다.');
  try{
   const changed=await participation.connect(code,{origin,signal:controller.signal,beforeSwitch});
   if(!dialog.isConnected)return;
   if(changed){render();result(participation.persistent()?'내 기록을 연결했습니다. 복구 코드는 계속 보관해 주세요.':'이번 창에서는 기록을 연결했지만 브라우저 저장에 실패했습니다. 창을 닫기 전에 복구 코드를 꼭 따로 보관해 주세요.');onConnected();}
   else result('기록 전환을 취소했습니다.');
  }catch(error){if(dialog.isConnected)result(error.name==='AbortError'?'연결이 지연되고 있습니다. 기존 기록은 유지됩니다.':error.message,true);}
  finally{clearTimeout(timer);busy=false;if(button.isConnected)button.disabled=false;}
 }
 dialog.addEventListener('click',async event=>{
  const button=event.target.closest('[data-participation]');if(!button)return;
  const action=button.dataset.participation;
  if(action==='close'){dialog.close();return;}
  if(busy)return;
  if(action==='reveal'){
   const node=dialog.querySelector('[data-participation-code]');node.hidden=false;
   node.querySelector('textarea').value=recoveryCode(participation.read());button.hidden=true;return;
  }
  if(action==='copy'){
   try{await navigator.clipboard.writeText(recoveryCode(participation.read()));participation.markBackedUp();result('복사했습니다. 개인 메모나 비밀번호 관리자에 따로 저장해 주세요.');}
   catch{dialog.querySelector('textarea').select();result('코드를 길게 눌러 직접 복사해 주세요.');}return;
  }
  if(action==='download'){
   const code=recoveryCode(participation.read());if(!code)return;
   const url=URL.createObjectURL(new Blob(['MANOR 개인 복구 코드\n\n'+code+'\n\n이 코드는 작성 권한을 연결합니다. 다른 사람에게 공유하지 마세요.\n'],{type:'text/plain;charset=utf-8'}));
   const link=document.createElement('a');link.href=url;link.download='MANOR-개인-복구-코드.txt';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);participation.markBackedUp();result('개인 복구 코드를 파일로 보관했습니다.');return;
  }
  if(action==='saved'){participation.markBackedUp();result('보관 확인을 저장했습니다. 다른 브라우저에서 이 코드로 연결하세요.');return;}
  if(action==='switch'){const profile=participation.profiles()[Number(button.dataset.profile)];if(profile)await connect(recoveryCode(profile.token));}
 });
 dialog.addEventListener('submit',event=>{if(!event.target.matches('[data-participation-form]'))return;event.preventDefault();connect(new FormData(event.target).get('recoveryCode'));});
 dialog.addEventListener('close',()=>{controller?.abort();activeDialog=null;dialog.remove();if(previousFocus?.isConnected)previousFocus.focus();},{once:true});
 render();activeDialog=dialog;document.body.append(dialog);dialog.showModal();
}
