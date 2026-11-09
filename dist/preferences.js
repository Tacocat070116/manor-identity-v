import {ACCOUNT_KEY,ACCOUNT_CHANGED,PARTICIPATION_ORIGIN,authRequest} from './account-api.js?v=f1b44b39b0a6';

const PREFIX='manor-preferences:',OWNER=PREFIX+'owner',FAVORITES='manor-favorites',THEME='manor-theme';
const validAccount=id=>typeof id==='string'&&/^[a-f0-9]{64}$/.test(id);
export const preferenceMessages={local:'브라우저에 저장됩니다. 로그인하면 계정에도 연결됩니다.',syncing:'브라우저에 저장됨 · 계정과 동기화 중',saved:'브라우저와 Google 계정에 저장됨',offline:'브라우저에 저장됨 · 연결되면 계정에 저장됩니다.',expired:'브라우저에 저장됨 · 다시 로그인하면 계정에 연결됩니다.',error:'브라우저에 저장됨 · 계정 저장은 연결 후 다시 시도합니다.',storage:'브라우저 저장 공간을 확인해 주세요. 계정 동기화를 완료하지 못했습니다.'};

// The browser keeps its last selection after logout. Each Google account has
// its own cache and pending edits, so switching accounts never imports the last
// account's favorites. Only the original, unbound browser list is imported once.
export function createPreferenceSync({characterIds,themeIds,storage=()=>globalThis.localStorage,request=authRequest,
 origin=PARTICIPATION_ORIGIN,locks=()=>globalThis.navigator?.locks,now=Date.now,
 online=()=>globalThis.navigator?.onLine!==false,apply=()=>{},onStatus=()=>{},
 target=globalThis.window,document=globalThis.document,delay=500}={}){
 const characters=new Set(characterIds),themes=new Set(themeIds),fields=['theme',...characterIds];
 let memoryAccount,accountFromEvent=false,inflight,timer,disposed=false,status='local';
 const stored=work=>{try{return work(storage());}catch(error){error.preferenceStorage=true;throw error;}};
 const get=key=>stored(s=>s.getItem(key)),put=(key,value)=>stored(s=>s.setItem(key,value));
 const json=key=>{const value=get(key);return value?JSON.parse(value):null;};
 const cacheKey=id=>PREFIX+id+':cache',editKey=(id,field)=>PREFIX+id+':edit:'+field,ackKey=(id,field)=>PREFIX+id+':ack:'+field;
 function account(){
  try{const value=json(ACCOUNT_KEY);return value|| (accountFromEvent?memoryAccount:null);}catch{return memoryAccount;}
 }
 const active=()=>{const a=account();return a?.expiresAt>now()&&validAccount(a.token)?a:null;};
 const current=token=>!disposed&&active()?.token===token;
 function report(value){status=value;onStatus(preferenceMessages[value]);}
 function local(){
  const favorites=json(FAVORITES)||[];
  if(!Array.isArray(favorites)||favorites.some(id=>typeof id!=='string'))throw Error('Invalid browser favorites');
  const theme=get(THEME);return {favorites:[...new Set(favorites)],theme:themes.has(theme)?theme:null};
 }
 function writeLocal(value){
  put(FAVORITES,JSON.stringify(value.favorites));if(value.theme)put(THEME,value.theme);
  apply(value);
 }
 function bind(id){
  const owner=get(OWNER);if(owner===id)return;
  const before=local();
  if(owner){const cached=json(cacheKey(owner));put(cacheKey(owner),JSON.stringify({...cached,...before}));}
  let cached=json(cacheKey(id));
  if(cached&&(!Array.isArray(cached.favorites)||cached.favorites.some(id=>typeof id!=='string')||cached.theme!==null&&!themes.has(cached.theme)))throw new SyntaxError('Invalid preferences cache');
  if(!cached){
   cached={theme:before.theme,favorites:owner?[]:before.favorites,seed:{theme:before.theme,favorites:owner?[]:before.favorites}};
   put(cacheKey(id),JSON.stringify(cached));
  }
  put(OWNER,id);writeLocal(cached);
 }
 function prepare(){
  const a=active();
  try{if(validAccount(a?.accountId))bind(a.accountId);}catch{report('storage');}
 }
 function pending(id){
  return Object.fromEntries(fields.flatMap(field=>{const item=json(editKey(id,field));return item&&get(ackKey(id,field))!==item.id?[[field,item]]:[];}));
 }
 function record(field,value){
  try{
   const owner=get(OWNER),a=active();
   // Older sessions learn their account ID on the first authenticated read.
   // Until then the unbound local list itself is the migration source.
   if(owner&&(!a?.accountId||a.accountId===owner))put(editKey(owner,field),JSON.stringify({value,id:crypto.randomUUID()}));
   report(a?'syncing':account()?'expired':'local');schedule();
  }catch{report('storage');}
 }
 function merge(remote,edits){
  const favorites=new Set(remote.favorites);
  for(const [field,item] of Object.entries(edits))if(field!=='theme'){
   if(item.value)favorites.add(field);else favorites.delete(field);
  }
  return {theme:edits.theme?.value??remote.theme,favorites:[...favorites].sort()};
 }
 function validate(remote){
  if(!validAccount(remote?.accountId)||!Number.isSafeInteger(remote.revision)||remote.revision<0||remote.theme!==null&&!themes.has(remote.theme)||!Array.isArray(remote.favorites)||remote.favorites.some(id=>typeof id!=='string'))throw Error('Invalid account preferences');
  return remote;
 }
 async function locked(name,work){const manager=locks();return manager?.request?manager.request(name,work):work();}
 async function accept(remote,token,ack={}){
  return locked(FAVORITES,()=>{
   if(!current(token))return false;
   bind(remote.accountId);
   const cached=json(cacheKey(remote.accountId));
   if(cached?.seed){
    for(const id of cached.seed.favorites)if(characters.has(id)&&!remote.favorites.includes(id)&&!get(editKey(remote.accountId,id)))put(editKey(remote.accountId,id),JSON.stringify({value:true,id:crypto.randomUUID()}));
    if(!remote.theme&&cached.seed.theme&&!get(editKey(remote.accountId,'theme')))put(editKey(remote.accountId,'theme'),JSON.stringify({value:cached.seed.theme,id:crypto.randomUUID()}));
   }
   // A separate acknowledgement cannot erase a newer edit written by another
   // tab between reading and clearing storage, including without Web Locks.
   for(const [field,item] of Object.entries(ack))put(ackKey(remote.accountId,field),item.id);
   const edits=pending(remote.accountId),value=merge(remote,edits);
   put(cacheKey(remote.accountId),JSON.stringify(value));writeLocal(value);
   return edits;
  });
 }
 async function run(){
  const a=active();if(!a){report(account()?'expired':'local');return;}
  if(!online()){report('offline');return;}
  const token=a.token;
  report('syncing');
  try{
   await locked(PREFIX+'sync',async()=>{
    if(!current(token))return;
    let remote=validate(await request(origin,'preferences',{token,signal:AbortSignal.timeout(12000)}));
    for(let attempt=0;attempt<4&&current(token);attempt++){
     const edits=await accept(remote,token);if(edits===false)return;
     if(!Object.keys(edits).length){report('saved');return;}
     const body={revision:remote.revision,favorites:Object.entries(edits).filter(([key])=>key!=='theme').map(([id,item])=>({id,selected:item.value})),...(edits.theme?{theme:edits.theme.value}:{})};
     try{
      remote=validate(await request(origin,'preferences',{token,body,signal:AbortSignal.timeout(12000)}));
      const remaining=await accept(remote,token,edits);if(remaining===false)return;
      if(!Object.keys(remaining).length){report('saved');return;}
     }catch(error){
      if(error.status!==409)throw error;
      remote=validate(await request(origin,'preferences',{token,signal:AbortSignal.timeout(12000)}));
     }
    }
    if(current(token))report('error');
   });
  }catch(error){if(current(token))report(error.status===401?'expired':error.preferenceStorage||error instanceof SyntaxError?'storage':!online()?'offline':'error');}
 }
 function sync(){
  clearTimeout(timer);prepare();
  if(inflight)return inflight;
  const token=active()?.token;
  inflight=run().finally(()=>{inflight=null;if(!disposed&&active()?.token!==token)schedule(0);});
  return inflight;
 }
 function schedule(wait=delay){if(disposed)return;clearTimeout(timer);timer=setTimeout(()=>{sync();},wait);}
 function refresh(remote=true){
  prepare();
  try{apply(local());}catch{report('storage');}
  if(remote)schedule(0);
 }
 function storageChanged(event){
  if(event.key===ACCOUNT_KEY){accountFromEvent=false;memoryAccount=null;refresh();}
  else if(event.key===null||event.key===FAVORITES||event.key===THEME||event.key?.startsWith(PREFIX))refresh(false);
 }
 function accountChanged(event){memoryAccount=event.detail;accountFromEvent=true;prepare();schedule(0);}
 function visible(){if(document.visibilityState==='visible')refresh();}
 const listeners=[['storage',storageChanged],['online',()=>schedule(0)],['offline',()=>report(active()?'offline':'local')],['focus',refresh],['pageshow',refresh],[ACCOUNT_CHANGED,accountChanged]];
 return {
  prepare,sync,
  favoriteChanged(id,selected){if(characters.has(id)&&typeof selected==='boolean')record(id,selected);},
  themeChanged(id){if(themes.has(id))record('theme',id);},
  message:()=>preferenceMessages[status],
  start(){for(const [name,fn] of listeners)target?.addEventListener(name,fn);document?.addEventListener('visibilitychange',visible);prepare();schedule(0);},
  dispose(){disposed=true;clearTimeout(timer);for(const [name,fn] of listeners)target?.removeEventListener(name,fn);document?.removeEventListener('visibilitychange',visible);}
 };
}
