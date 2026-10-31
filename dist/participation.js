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
  markBackedUp(expected=read()){if(!expected||read()!==expected)return false;remember(expected);const p=profiles.find(p=>p.token===expected);if(p)p.backedUp=true;return persistProfiles();},
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
export const PARTICIPATION_ORIGIN='https://manor-feedback.tacocat070116.chatgpt.site';
const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const keyIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="4.5"/><path d="m11.2 11.2 9.3 9.3m-3-3 3-3m-6 0 3-3"/></svg>';

// Explicit issuance uses the same server identity as writing. Reopening or
// repeating it must never replace the visitor who owns the existing records.
export async function issueRecoveryCode({store=participation,origin=PARTICIPATION_ORIGIN,fetcher=globalThis.fetch,signal}={}){
 if(signal?.aborted)throw new DOMException('Aborted','AbortError');
 return store.ensure(async()=>{
  if(signal?.aborted)throw new DOMException('Aborted','AbortError');
  const response=await fetcher(origin+'/api/feedback/visitors',{method:'POST',credentials:'omit',cache:'no-store',redirect:'error',headers:{'Content-Type':'application/json',Accept:'application/json'},body:'{}',signal});
  if(!response.ok)throw Error(response.status===429?'발급 요청이 많습니다. 잠시 후 다시 시도해 주세요.':'복구 코드를 발급하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  if(response.redirected||!response.headers.get('content-type')?.includes('application/json'))throw Error('발급 응답을 확인하지 못했습니다. 다시 시도해 주세요.');
  const data=await response.json();
  if(signal?.aborted)throw new DOMException('Aborted','AbortError');
  return data;
 });
}

export function participationBar(){
 const current=participation.read(),saved=!!current&&participation.backedUp();
 const title=saved?'복구 코드 보관을 확인했어요':current?'내 기록을 잃지 않도록, 코드 보관':'작성 전에 복구 코드를 받아두세요';
 const text=!participation.persistent()?'이 브라우저에서는 작성 정보가 유지되지 않을 수 있어요. 코드를 꼭 따로 보관하세요.':saved?'다른 브라우저에서도 내 글과 운영자 답변을 이어서 볼 수 있어요.':'다른 브라우저에서 내 피드백·상대법·조합 글·채널을 관리할 때 필요합니다. 코드를 따로 저장해 주세요.';
 return `<aside class="participation-bar ${saved?'is-saved':'is-important'}" data-participation-banner aria-label="복구 코드 안내"><span class="participation-key">${keyIcon}</span><div class="participation-bar-copy"><strong>${title}</strong><p>${e(text)}</p></div><div class="participation-bar-actions"><button type="button" class="btn ${saved?'':'primary'} small" data-participation="open" data-participation-view="issue">${current?'복구 코드 확인·보관':'복구 코드 발급받기'}</button><button type="button" class="participation-text-button" data-participation="open" data-participation-view="connect">기존 코드로 연결</button></div></aside>`;
}
export function refreshParticipationBanners(){
 globalThis.document?.querySelectorAll('[data-participation-banner]').forEach(node=>{node.outerHTML=participationBar();});
}

export function recoveryPanel({current='',saved=false,persistent=true,revealed=false,mode='issue',profiles=[]}={}){
 const status=!current?'발급 전':saved?'보관 확인 완료':'보관 필요';
 const steps=['코드 발급·확인','따로 보관','보관 확인'];
 const active=saved&&!revealed?2:revealed?1:0;
 const issue=`<div class="recovery-card-heading"><span class="recovery-state ${saved?'is-saved':''}">${status}</span><span class="recovery-private">나만 보관하는 코드</span></div>
 <ol class="recovery-steps" aria-label="복구 코드 보관 순서">${steps.map((label,i)=>`<li ${active===i?'aria-current="step"':''} class="${i<=active?'is-active':''}"><span>0${i+1}</span>${label}</li>`).join('')}</ol>
 ${revealed?`<h2 tabindex="-1" data-recovery-heading>이 코드를 따로 보관해 주세요.</h2><p>개인 메모나 비밀번호 관리자에 저장하거나 파일로 내려받으세요.</p><label class="recovery-code-label">내 복구 코드<textarea readonly rows="3" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="내 복구 코드" data-recovery-code></textarea></label><div class="participation-actions"><button type="button" class="btn primary" data-recovery="copy">코드 복사</button><button type="button" class="btn" data-recovery="download">파일로 저장</button><button type="button" class="participation-text-button" data-recovery="hide">코드 숨기기</button></div><div class="recovery-confirm"><label><input type="checkbox" data-recovery-confirm><span>이 브라우저 밖에 복구 코드를 따로 보관했어요.</span></label><button type="button" class="btn primary" data-recovery="saved" disabled>보관 완료</button></div>`:
 saved?`<div class="recovery-emblem is-saved" aria-hidden="true">✓</div><h2 tabindex="-1" data-recovery-heading>복구 코드 보관을 확인했습니다.</h2><p>다른 기기나 브라우저에서는 <strong>기존 기록 연결</strong>에 보관한 코드를 입력하세요. 코드는 계속 보관해 주세요.</p><button type="button" class="btn" data-recovery="issue">내 복구 코드 다시 확인</button>`:
 `<div class="recovery-emblem">${keyIcon}</div><h2 tabindex="-1" data-recovery-heading>${current?'복구 코드를 따로 저장하세요.':'복구 코드 발급'}</h2><p>${current?'이미 작성한 글과 연결된 복구 코드입니다. 코드를 확인해도 기존 기록은 그대로 유지돼요.':'로그인 없이 글을 남길 수 있어요. 먼저 복구 코드를 받아두면 다른 브라우저에서도 작성 기록을 이어갈 수 있습니다.'}</p><button type="button" class="btn primary recovery-issue" data-recovery="issue">${keyIcon}${current?'내 복구 코드 확인':'복구 코드 발급받기'}</button><p class="recovery-note">${current?'코드를 확인하는 것으로 보관이 완료되지는 않아요. 꼭 따로 저장해 주세요.':'전에 남긴 기록이 있다면 먼저 ‘기존 기록 연결’에서 보관한 코드를 입력하세요.'}</p>`}
 <div class="recovery-caution"><strong>복구 코드는 비밀번호처럼 보관하세요.</strong><p>코드를 아는 사람은 내 작성 권한을 사용할 수 있습니다. 게시글·댓글에 올리거나 다른 사람에게 보내지 마세요.</p></div>`;
 const connect=`<span class="recovery-state">다른 브라우저에서 이어보기</span><h2 tabindex="-1" data-recovery-heading>보관한 코드로 내 기록 연결</h2><p>피드백·상대법·조합 이야기·채널을 같은 작성 기록으로 이어서 볼 수 있어요.</p><form data-recovery-form><label>보관한 복구 코드<input name="recoveryCode" type="password" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="MANOR-R1-…" maxlength="160" required aria-describedby="recovery-connect-note"></label><p id="recovery-connect-note" class="recovery-note">${current?'지금 연결된 기록도 이 브라우저에 보관합니다. 서로 다른 기록은 합쳐지지 않아요.':'전에 쓰던 브라우저의 ‘복구 코드’ 메뉴에서 코드를 확인할 수 있어요.'}</p><button class="btn primary" type="submit">내 기록 연결</button></form>${profiles.length>1?`<div class="recovery-profiles"><h3>이 브라우저에 보관한 기록</h3><div class="participation-profiles">${profiles.map((p,index)=>`<button type="button" class="btn" data-recovery="switch" data-profile="${index}" ${p.token===current?'disabled':''}>기록 ${index+1} · ${e(new Intl.DateTimeFormat('ko-KR',{month:'short',day:'numeric'}).format(new Date(p.createdAt)))}${p.token===current?' · 연결 중':''}</button>`).join('')}</div></div>`:''}<p class="recovery-note">복구 코드와 원래 브라우저 정보가 모두 없으면 작성자임을 자동으로 확인할 수 없습니다.</p>`;
 return `<div class="recovery-mode" role="group" aria-label="복구 코드 메뉴"><button type="button" data-recovery="mode" data-mode="issue" aria-pressed="${mode==='issue'}">발급·보관</button><button type="button" data-recovery="mode" data-mode="connect" aria-pressed="${mode==='connect'}">기존 기록 연결</button></div>${!persistent?'<div class="recovery-storage-warning" role="alert">이 브라우저에서는 작성 정보가 유지되지 않을 수 있어요. 창을 닫기 전에 코드를 꼭 따로 보관해 주세요.</div>':''}<div class="recovery-panel">${mode==='connect'?connect:issue}</div><p class="participation-result" role="status" aria-live="polite" aria-atomic="true"></p>`;
}

export function mountRecovery(root,{origin=PARTICIPATION_ORIGIN,mode='issue',onConnected=()=>{},beforeSwitch=()=>true}={}){
 let alive=true,busy=false,controller,revealedToken='',renderedToken='';
 function render(focus=false){
  const current=participation.read();if(revealedToken!==current)revealedToken='';renderedToken=current;
  root.innerHTML=recoveryPanel({current,saved:participation.backedUp(),persistent:participation.persistent(),revealed:!!revealedToken,mode,profiles:participation.profiles()});
  const field=root.querySelector('[data-recovery-code]');if(field)field.value=recoveryCode(revealedToken);
  if(focus)root.querySelector('[data-recovery-heading]')?.focus();
 }
 function result(message,error=false){const node=root.querySelector('.participation-result');if(node){node.textContent=message;node.classList.toggle('is-error',error);}}
 async function run(work,message){
  if(busy||!alive)return;busy=true;controller=new AbortController();const signal=controller.signal,timer=setTimeout(()=>controller.abort(),15000);
  const controls=[...root.querySelectorAll('button,input,textarea')].map(node=>[node,node.disabled]);controls.forEach(([node])=>{node.disabled=true;});root.setAttribute('aria-busy','true');result(message);
  try{await work(signal);}catch(error){if(alive)result(error.name==='AbortError'?'연결이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.':error instanceof TypeError?'서버에 연결하지 못했습니다. 네트워크 상태를 확인해 주세요.':error instanceof SyntaxError?'서버 응답을 확인하지 못했습니다. 다시 시도해 주세요.':error.message,true);}
  finally{clearTimeout(timer);busy=false;if(alive){root.removeAttribute('aria-busy');controls.forEach(([node,disabled])=>{if(node.isConnected)node.disabled=disabled;});}}
 }
 function connect(code){return run(async signal=>{
  const previous=participation.read();
  const changed=await participation.connect(code,{origin,signal,beforeSwitch});if(!alive)return;
  if(changed){revealedToken='';mode='issue';render(true);refreshParticipationBanners();result('내 기록을 연결했습니다. 보관한 코드는 계속 사용할 수 있어요.');if(previous!==participation.read())onConnected();}
  else result('기록 전환을 취소했습니다.');
 },'기존 기록을 확인하고 있습니다.');}
 async function click(event){
  const button=event.target.closest('[data-recovery]');if(!button||!root.contains(button)||busy)return;
  const action=button.dataset.recovery;
  if(action==='mode'){mode=button.dataset.mode==='connect'?'connect':'issue';revealedToken='';render(true);return;}
  if(action==='issue'){await run(async signal=>{
   const token=await issueRecoveryCode({origin,signal});if(!alive)return;
   revealedToken=token===participation.read()?token:'';render(true);refreshParticipationBanners();
   result(revealedToken?'복구 코드를 확인했습니다. 따로 저장한 뒤 보관 완료를 눌러주세요.':'연결된 기록이 바뀌었습니다. 현재 기록의 코드를 다시 확인해 주세요.');
  },'복구 코드를 준비하고 있습니다.');return;}
  if(action==='switch'){const profile=participation.profiles()[Number(button.dataset.profile)];if(profile)await connect(recoveryCode(profile.token));return;}
  if(action==='hide'){revealedToken='';render(true);return;}
  const token=revealedToken;if(!token)return;
  if(token!==participation.read()){revealedToken='';render(true);result('연결된 기록이 바뀌었습니다. 코드를 다시 확인해 주세요.',true);return;}
  if(action==='copy'){
   await run(async()=>{
    try{await navigator.clipboard.writeText(recoveryCode(token));if(alive)result('복사했습니다. 개인 메모나 비밀번호 관리자에 붙여넣어 저장해 주세요.');}
    catch{if(alive){const field=root.querySelector('[data-recovery-code]');if(field){field.disabled=false;field.focus();field.select();}result('자동 복사가 지원되지 않습니다. 선택된 코드를 길게 누르거나 복사 단축키로 복사해 주세요.');}}
   },'복구 코드를 복사하고 있습니다.');return;
  }
  if(action==='download'){
   try{const url=URL.createObjectURL(new Blob(['MANOR 개인 복구 코드\n\n'+recoveryCode(token)+'\n\nMANOR > 복구 코드 > 기존 기록 연결에서 입력하세요.\n이 코드는 작성 권한을 연결합니다. 비밀번호처럼 보관하고 다른 사람에게 공유하지 마세요.\n'],{type:'text/plain;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download='MANOR-개인-복구-코드.txt';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);result('파일 다운로드를 시작했습니다. 저장된 파일을 확인한 뒤 보관 완료를 눌러주세요.');
   }catch{result('파일을 저장하지 못했습니다. 코드 복사를 이용해 따로 보관해 주세요.',true);}return;
  }
  if(action==='saved'&&root.querySelector('[data-recovery-confirm]')?.checked){
   const persisted=participation.markBackedUp(token);revealedToken='';render(true);refreshParticipationBanners();
   result(persisted?'코드 보관을 확인했습니다. 브라우저가 바뀌어도 이 코드로 내 기록을 연결하세요.':'보관 확인은 이 창에서만 유지될 수 있어요. 따로 저장한 복구 코드는 계속 보관해 주세요.');
  }
 }
 function submit(event){if(!event.target.matches('[data-recovery-form]'))return;event.preventDefault();if(!busy&&event.target.reportValidity())connect(new FormData(event.target).get('recoveryCode'));}
 function change(event){if(event.target.matches('[data-recovery-confirm]'))root.querySelector('[data-recovery="saved"]').disabled=busy||!event.target.checked;}
 function storageChanged(event){if(event.key===null||[TOKEN_KEY,PROFILE_KEY].includes(event.key)){refreshParticipationBanners();if(participation.read()!==renderedToken){controller?.abort();revealedToken='';render(true);result('다른 창에서 연결된 기록이 바뀌었습니다. 현재 기록을 확인해 주세요.');}}}
 root.addEventListener('click',click);root.addEventListener('submit',submit);root.addEventListener('change',change);window.addEventListener('storage',storageChanged);render();
 return ()=>{alive=false;controller?.abort();revealedToken='';root.querySelectorAll('[data-recovery-code], [name="recoveryCode"]').forEach(node=>{node.value='';});root.removeEventListener('click',click);root.removeEventListener('submit',submit);root.removeEventListener('change',change);window.removeEventListener('storage',storageChanged);};
}

export function mountRecoveryPage(root,options={}){
 root.innerHTML=`<section class="recovery-page"><header class="recovery-heading"><div class="eyebrow">KEEP YOUR MANOR</div><h1>복구 코드</h1><p>이전 주소나 다른 기기에서 쓴 글과 등록한 채널은 저장해 둔 개인 복구 코드로 다시 연결할 수 있습니다.</p></header><div class="recovery-layout"><aside class="recovery-intro"><h2>기기를 바꾸기 전에<br>코드를 따로 저장하세요.</h2><p>MANOR는 로그인 없이 글을 남길 수 있습니다. 복구 코드를 저장해 두면 다른 브라우저에서도 아래 작성 기록을 연결할 수 있습니다.</p><ul><li><strong>피드백과 댓글</strong><span>내 참여 글과 운영자 답변</span></li><li><strong>유저 상대법</strong><span>제출 내역과 운영자 검토 의견</span></li><li><strong>조합 이야기</strong><span>내 조합 제안과 댓글</span></li><li><strong>유튜브 채널</strong><span>등록한 채널의 작성 기록</span></li></ul><p class="recovery-note">기기 변경·브라우저 데이터 삭제 전에<br>복구 코드를 꼭 따로 저장해 주세요.</p></aside><div class="recovery-workspace" data-recovery-workspace></div></div></section>`;
 return mountRecovery(root.querySelector('[data-recovery-workspace]'),options);
}

let activeDialog=null;
export function openParticipation(options={}){
 if(activeDialog){activeDialog.querySelector('button')?.focus();return;}
 const dialog=document.createElement('dialog');dialog.className='participation-dialog';dialog.setAttribute('aria-labelledby','participation-title');
 dialog.innerHTML='<div class="participation-dialog-head"><div><span class="eyebrow">MY RECOVERY CODE</span><h2 id="participation-title">복구 코드</h2></div><button type="button" class="btn small" data-participation-close aria-label="복구 코드 닫기">닫기</button></div><div class="recovery-workspace" data-recovery-workspace></div>';
 const previousFocus=document.activeElement;activeDialog=dialog;document.body.append(dialog);
 const dispose=mountRecovery(dialog.querySelector('[data-recovery-workspace]'),options);
 const closeOnNavigation=()=>dialog.close();window.addEventListener('hashchange',closeOnNavigation);
 dialog.querySelector('[data-participation-close]').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{dispose();window.removeEventListener('hashchange',closeOnNavigation);activeDialog=null;dialog.remove();if(previousFocus?.isConnected)previousFocus.focus();else document.querySelector('[data-participation="open"]')?.focus();},{once:true});
 dialog.showModal();
}
