import {createGoogleSignIn} from './google-signin.js?v=7a8297c89228';
const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const ACCOUNT_KEY='manor-google-session';
const configCache=new Map();
let scriptPromise;
const buttonManagers=new Map();

export async function authRequest(origin,path,{token='',body,signal,fetcher=globalThis.fetch}={}){
 const response=await fetcher(origin+'/api/auth/'+path,{method:body===undefined?'GET':'POST',credentials:'omit',cache:'no-store',redirect:'error',signal,headers:{Accept:'application/json',...(body===undefined?{}:{'Content-Type':'application/json'}),...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 if(response.redirected||!response.headers.get('content-type')?.includes('application/json'))throw Error('로그인 서버 응답을 확인하지 못했습니다. 다시 시도해 주세요.');
 const data=await response.json();
 if(!response.ok){const error=Error(data.error||'로그인을 처리하지 못했습니다.');error.code=data.code;error.status=response.status;throw error;}
 return data;
}
export function googleConfig(origin){
 if(!configCache.has(origin))configCache.set(origin,authRequest(origin,'config',{signal:AbortSignal.timeout(10000)}).then(data=>{
  if(typeof data.enabled!=='boolean'||data.enabled&&(typeof data.clientId!=='string'||!/^[0-9]+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(data.clientId)))throw Error('로그인 설정을 확인하지 못했습니다.');
  return data;
 }).catch(error=>{configCache.delete(origin);throw error;}));
 return configCache.get(origin);
}
function googleLibrary(){
 if(globalThis.google?.accounts?.id)return Promise.resolve(globalThis.google.accounts.id);
 if(!scriptPromise)scriptPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.defer=true;
  const timer=setTimeout(()=>finish(Error('Google 로그인 연결이 지연됩니다. 다시 시도해 주세요.')),15000);
  function finish(error){clearTimeout(timer);script.onload=script.onerror=null;if(error){script.remove();scriptPromise=null;reject(error);}else resolve(globalThis.google.accounts.id);}
  script.onload=()=>globalThis.google?.accounts?.id?finish():finish(Error('Google 로그인을 불러오지 못했습니다.'));
  script.onerror=()=>finish(Error('Google에 연결하지 못했습니다. 네트워크 상태를 확인해 주세요.'));
  document.head.append(script);
 });
 return scriptPromise;
}
function googleButtons(origin,clientId){
 const key=origin+'|'+clientId;
 if(!buttonManagers.has(key))buttonManagers.set(key,createGoogleSignIn({clientId,loadLibrary:googleLibrary,requestChallenge:()=>authRequest(origin,'challenge',{body:{},signal:AbortSignal.timeout(10000)})}));
 return buttonManagers.get(key);
}

export function accountPanel({session=null,profiles=[],profileId='',legacy=false,persistent=true}={}){
 if(!session)return `<div class="recovery-panel google-account"><span class="recovery-state">내 기록을 계정에 보관</span><h2 data-account-heading tabindex="-1">Google로 로그인</h2><p>같은 Google 계정으로 로그인하면 다른 기기에서도 작성한 글과 댓글을 다시 관리할 수 있습니다.</p>${legacy?'<label class="account-link-consent"><input type="checkbox" data-account-link checked><span>이 브라우저의 기존 작성 기록을 선택한 Google 계정에 연결합니다.</span></label>':''}<div class="google-signin-slot" data-google-button></div><div class="account-signin-help"><button type="button" class="btn" data-account="retry">로그인 다시 시작</button><a class="participation-text-button" data-account="add-google" href="https://accounts.google.com/AddSession" rel="noreferrer">Google에서 다른 계정 추가</a></div><p class="recovery-note">계정 선택이 멈추면 Google에서 계정을 추가한 뒤 이 화면으로 돌아와 다시 로그인하세요. ‘로그인 다시 시작’을 누르면 현재 화면을 새로 불러옵니다.</p><p class="recovery-note">Google 계정의 이름과 이메일은 게시글에 표시되지 않습니다. 기존 캐릭터 별명을 사용합니다.</p><p class="participation-result" role="status" aria-live="polite"></p></div>`;
 return `<div class="recovery-panel google-account"><span class="recovery-state is-saved">Google 로그인 연결됨</span><h2 data-account-heading tabindex="-1">내 작성 기록</h2><p>새 기기에서도 같은 Google 계정으로 로그인하세요. 복구 코드를 새로 발급하거나 보관할 필요가 없습니다.</p>${!persistent?'<p class="recovery-storage-warning" role="status">이 브라우저는 로그인을 저장하지 못합니다. 다음에 방문하면 다시 로그인해 주세요.</p>':''}${profiles.length>1?`<div class="account-profiles"><h3>연결된 기록 선택</h3><p class="recovery-note">브라우저별로 따로 작성했던 기록입니다. 원래 글과 별명을 보존하며 선택한 기록으로 활동합니다.</p>${profiles.map((p,i)=>`<button type="button" class="btn account-profile" data-account="profile" data-profile="${e(p.id)}" ${p.id===profileId?'disabled':''}><strong>기록 ${i+1}${p.id===profileId?' · 사용 중':''}</strong><span>피드백 ${Number(p.feedback)||0} · 댓글 ${Number(p.comments)||0} · 연구 ${Number(p.research)||0} · 상대법 ${Number(p.tips)||0} · 채널 ${Number(p.channels)||0}</span></button>`).join('')}</div>`:''}<details class="account-legacy"><summary>이전에 쓴 기록 추가 연결</summary><p>다른 브라우저에서 보관했던 복구 코드를 한 번 입력하면 이 Google 계정에 연결됩니다. 연결 후에는 Google로 로그인해 주세요.</p><form data-account-legacy><label>기존 복구 코드<input name="code" type="password" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="MANOR-R1-…" maxlength="160" required></label><button type="submit" class="btn primary">이 계정에 기록 연결</button></form><p class="recovery-note">다른 Google 계정에 연결된 기록은 가져올 수 없습니다. 코드와 원래 브라우저 정보가 모두 없으면 작성 권한을 확인할 수 없습니다.</p></details><button type="button" class="btn" data-account="logout">이 브라우저에서 로그아웃</button><p class="participation-result" role="status" aria-live="polite"></p></div>`;
}

export function mountGoogleAccount(root,{store,origin,clientId,recoveryToken,onConnected=()=>{},beforeSwitch=()=>true,onChange=()=>{}}){
 let alive=true,busy=false,generation=0,controller,profiles=[],profileId='',timer,disposeButton;
 function message(text,error=false){const target=root.querySelector('.participation-result');if(target){target.textContent=text;target.classList.toggle('is-error',error);}}
 function render(){
  disposeButton?.();disposeButton=null;
  root.innerHTML=accountPanel({session:store.googleAccount()?.expiresAt>Date.now()?store.googleAccount():null,profiles,profileId,legacy:!!store.legacyToken(),persistent:store.persistent()});
  const details=root.querySelector('.account-legacy'),saved=store.profiles();
  if(details&&saved.length){const list=document.createElement('div');list.className='account-local-records';list.innerHTML='<p>이 브라우저에 보관된 이전 기록</p>'+saved.map((_,i)=>`<button class="btn small" type="button" data-account="local-profile" data-local-profile="${i}">이전 기록 ${i+1} 연결</button>`).join('');details.append(list);}
 }
 async function work(task){
  if(busy||!alive)return;busy=true;controller=new AbortController();timer=setTimeout(()=>controller.abort(),15000);root.setAttribute('aria-busy','true');
  const controls=[...root.querySelectorAll('button,input')].map(node=>[node,node.disabled]);controls.forEach(([node])=>{node.disabled=true;});
  try{await task(controller.signal);}catch(error){if(alive)message(error.name==='AbortError'?'연결이 지연됩니다. 다시 시도해 주세요.':error.message,true);}
  finally{clearTimeout(timer);busy=false;if(alive){root.removeAttribute('aria-busy');controls.forEach(([node,disabled])=>{if(node.isConnected)node.disabled=disabled;});}}
 }
 async function loadSession(){
  const token=store.read(),data=await authRequest(origin,'session',{token,signal:controller?.signal});
  if(!alive||store.read()!==token)return;
  profiles=data.profiles;profileId=data.profileId;render();
 }
 async function setSession(data,expected){
  // A late response must not replace a different tab's newly selected account.
  try{if(!alive)throw Error('로그인 화면이 닫혔습니다.');await store.setGoogleAccount(data,expected);}
  catch(error){authRequest(origin,'logout',{token:data.token,body:{},signal:AbortSignal.timeout(5000)}).catch(()=>{});throw error;}
  if(!alive)return;onChange();profileId=data.profileId;profiles=[];render();await loadSession();if(alive)onConnected();
 }
 function signInButton(){
  const version=++generation,slot=root.querySelector('[data-google-button]');if(!slot)return;
  disposeButton?.();
  disposeButton=googleButtons(origin,clientId).mount(slot,{
   canAccept:()=>{
    if(!alive||version!==generation||busy||store.googleAccount()?.expiresAt>Date.now())return false;
    if(!beforeSwitch()){message('입력 중인 내용을 보관한 뒤 로그인해 주세요.');return false;}
    return true;
   },
   onCredential:(response,challenge)=>{
    const expected=store.read(),linkCurrent=!!root.querySelector('[data-account-link]')?.checked,legacy=store.legacyToken();
    return work(async signal=>{
     message('Google 로그인을 확인하고 있습니다.');
     const data=await authRequest(origin,'google',{token:linkCurrent?legacy:'',body:{challengeId:challenge.id,proof:challenge.proof,credential:response.credential,linkCurrent},signal});
     await setSession(data,expected);
    });
   },
   onError:error=>{if(alive&&version===generation)message(error.message,true);}
  });
 }
 function action(event){
  const button=event.target.closest('[data-account]');if(!button)return;
  if(busy||!beforeSwitch()){event.preventDefault();return;}
  if(button.dataset.account==='retry'){globalThis.location.reload();return;}
  if(button.dataset.account==='add-google')return;
  const expected=store.read();
  if(button.dataset.account==='local-profile')return work(async signal=>{
   const token=store.profiles()[Number(button.dataset.localProfile)]?.token;if(!token)throw Error('이전 기록을 찾지 못했습니다.');
   const data=await authRequest(origin,'link-legacy',{token:expected,body:{token},signal});await setSession(data,expected);
  });
  if(button.dataset.account==='profile')return work(async signal=>{
   const data=await authRequest(origin,'profile',{token:expected,body:{profileId:button.dataset.profile},signal});await setSession(data,expected);
  });
  if(button.dataset.account==='logout')return work(async signal=>{
   await authRequest(origin,'logout',{token:expected,body:{},signal});await store.clearGoogleAccount(expected);globalThis.google?.accounts?.id?.disableAutoSelect();onChange();render();signInButton();onConnected();
  });
 }
 function submit(event){
  if(!event.target.matches('[data-account-legacy]'))return;event.preventDefault();if(busy||!beforeSwitch())return;
  const code=recoveryToken(new FormData(event.target).get('code'));if(!code)return message('MANOR-R1로 시작하는 복구 코드 전체를 입력해 주세요.',true);
  const expected=store.read();work(async signal=>{const data=await authRequest(origin,'link-legacy',{token:expected,body:{token:code},signal});await setSession(data,expected);});
 }
 function changed(event){if(event.key===ACCOUNT_KEY&&alive){++generation;controller?.abort();render();if(store.googleAccount()?.expiresAt>Date.now())work(()=>loadSession());else signInButton();}}
 root.addEventListener('click',action);root.addEventListener('submit',submit);globalThis.window?.addEventListener('storage',changed);render();
 if(store.googleAccount()?.expiresAt>Date.now())work(async()=>{try{await loadSession();}catch(error){if(error.status===401){await store.expireGoogleAccount(store.read());onChange();render();signInButton();}else throw error;}});else signInButton();
 return ()=>{alive=false;++generation;disposeButton?.();clearTimeout(timer);controller?.abort();root.removeEventListener('click',action);root.removeEventListener('submit',submit);globalThis.window?.removeEventListener('storage',changed);};
}
