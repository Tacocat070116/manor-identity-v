export const GOOGLE_REDIRECT_URI='https://tacocat070116.github.io/manor-identity-v/google-return.html';
// Enable only after this exact URI is registered and the live round trip passes.
export const GOOGLE_REDIRECT_READY=false;
export const REDIRECT_KEY='manor-google-redirect';
const MAX_AGE=9*60*1000;
const token=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const base=new URL('./',GOOGLE_REDIRECT_URI).href;
const returnHash=value=>typeof value==='string'&&value.length<=2000&&/^#v=[a-z-]+(?:&[^#]*)?$/.test(value)?value:'#v=recovery';
function browserStorage(name){try{return globalThis[name];}catch{return undefined;}}

export function prefersGoogleRedirect(nav=globalThis.navigator){
 const ua=nav?.userAgent||'';
 return /iPad|iPhone|iPod/.test(ua)||nav?.platform==='MacIntel'&&nav?.maxTouchPoints>1||/Safari\//.test(ua)&&/Version\//.test(ua)&&!/Chrome|Chromium|Android/.test(ua);
}
function storageProbe(storage,key,value){
 try{storage.setItem(key,value);if(storage.getItem(key)!==value)throw Error();storage.removeItem(key);}
 catch{try{storage?.removeItem(key);}catch{}throw Error('이 브라우저에 로그인 정보를 보관할 수 없습니다. 사이트의 팝업 로그인으로 다시 시도해 주세요.');}
}

export async function startGoogleRedirect({clientId,origin,store,request,storage=browserStorage('sessionStorage'),persistentStorage=browserStorage('localStorage'),pageUrl=globalThis.location.href,now=Date.now,random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join(''),linkCurrent=false,signal,canContinue=()=>true}){
 const page=new URL(pageUrl);
 if(page.origin!==new URL(base).origin||![new URL(base).pathname,new URL('index.html',base).pathname].includes(page.pathname))throw Error('MANOR 로그인 화면에서 다시 시작해 주세요.');
 if(!/^[0-9]+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(clientId))throw Error('Google 로그인 설정을 확인하지 못했습니다.');
 const state=random();if(!token(state))throw Error('로그인 요청을 만들지 못했습니다.');
 storageProbe(storage,REDIRECT_KEY+'-check',state);storageProbe(persistentStorage,REDIRECT_KEY+'-check',state);
 const expected=store.read(),legacy=linkCurrent?store.legacyToken():'';
 const challenge=await request(origin,'challenge',{body:{},signal});
 if(signal?.aborted||!canContinue())throw new DOMException('Aborted','AbortError');
 if(store.read()!==expected||linkCurrent&&store.legacyToken()!==legacy)throw Error('다른 창에서 로그인 상태가 바뀌었습니다. 다시 확인해 주세요.');
 if(typeof challenge?.id!=='string'||!token(challenge.proof)||!token(challenge.nonce))throw Error('로그인 요청을 확인하지 못했습니다.');
 const pending={version:1,state,challengeId:challenge.id,proof:challenge.proof,createdAt:now(),origin,clientId,expected,legacy,linkCurrent:!!linkCurrent,returnHash:returnHash(page.hash)};
 const serialized=JSON.stringify(pending);
 try{storage.setItem(REDIRECT_KEY,serialized);if(storage.getItem(REDIRECT_KEY)!==serialized)throw Error();}
 catch{throw Error('로그인 요청을 보관하지 못했습니다. 사이트에서 다시 시도해 주세요.');}
 const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
 url.search=new URLSearchParams({client_id:clientId,redirect_uri:GOOGLE_REDIRECT_URI,response_type:'id_token',response_mode:'fragment',scope:'openid email',state,nonce:challenge.nonce,prompt:'select_account'}).toString();
 return url.href;
}

export async function finishGoogleRedirect({fragment,origin,clientId,store,request,accountKey,storage=browserStorage('sessionStorage'),persistentStorage=browserStorage('localStorage'),pageUrl=globalThis.location.href,now=Date.now,signal}){
 if(pageUrl!==GOOGLE_REDIRECT_URI)throw Error('로그인 복귀 주소가 올바르지 않습니다.');
 let pending;
 try{const raw=storage.getItem(REDIRECT_KEY);if(raw?.length>8000)throw Error();pending=JSON.parse(raw||'null');}
 catch{throw Error('이 창의 로그인 요청을 확인하지 못했습니다. MANOR에서 다시 로그인해 주세요.');}
 const params=new URLSearchParams(typeof fragment==='string'&&fragment.length<=24000?fragment.replace(/^#/,''):'');
 if(!pending||pending.version!==1||!token(pending.state)||params.getAll('state').length!==1||params.get('state')!==pending.state)throw Error('이 창에서 시작한 로그인 요청이 아닙니다. MANOR에서 다시 로그인해 주세요.');
 // Consume before any asynchronous work, including user-cancelled responses.
 try{storage.removeItem(REDIRECT_KEY);if(storage.getItem(REDIRECT_KEY)!==null)throw Error();}
 catch{throw Error('로그인 요청을 정리하지 못했습니다. MANOR에서 다시 시도해 주세요.');}
 if(pending.origin!==origin||pending.clientId!==clientId||!Number.isFinite(pending.createdAt)||now()-pending.createdAt>MAX_AGE||now()<pending.createdAt||typeof pending.challengeId!=='string'||!token(pending.proof)||typeof pending.expected!=='string'||typeof pending.linkCurrent!=='boolean'||typeof pending.legacy!=='string')throw Error('로그인 요청이 만료되었거나 변경되었습니다. MANOR에서 다시 시작해 주세요.');
 if(['iss','error'].some(name=>params.getAll(name).length>1))throw Error('Google 로그인 응답을 확인하지 못했습니다. 다시 로그인해 주세요.');
 if(params.has('error'))throw Error(params.get('error')==='access_denied'?'Google 로그인이 취소되었습니다. MANOR에서 다시 로그인할 수 있습니다.':'Google 로그인을 완료하지 못했습니다. MANOR에서 다시 시도해 주세요.');
 if(params.getAll('id_token').length!==1||!params.get('id_token')||params.get('id_token').length>16000||params.has('access_token')||params.has('iss')&&params.get('iss')!=='https://accounts.google.com')throw Error('Google 로그인 응답을 확인하지 못했습니다. 다시 로그인해 주세요.');
 if(store.read()!==pending.expected||pending.linkCurrent&&store.legacyToken()!==pending.legacy)throw Error('다른 창에서 로그인 상태가 바뀌어 기존 계정을 유지했습니다.');
 const data=await request(origin,'google',{token:pending.linkCurrent?pending.legacy:'',body:{challengeId:pending.challengeId,proof:pending.proof,credential:params.get('id_token'),linkCurrent:pending.linkCurrent},signal});
 try{
  if(signal?.aborted)throw new DOMException('Aborted','AbortError');
  await store.setGoogleAccount(data,pending.expected);
  // A memory-only session would disappear on the navigation back to MANOR.
  const saved=JSON.parse(persistentStorage.getItem(accountKey)||'null');
  if(saved?.token!==data.token||saved.profileId!==data.profileId||saved.expiresAt!==data.expiresAt)throw Error('로그인 정보를 저장하지 못해 MANOR로 이동하지 않았습니다. 팝업 로그인으로 다시 시도해 주세요.');
 }catch(error){
  await request(origin,'logout',{token:data.token,body:{},signal:AbortSignal.timeout(5000)}).catch(()=>{});
  await store.expireGoogleAccount(data.token).catch(()=>{});
  throw error;
 }
 return base+returnHash(pending.returnHash);
}
