import test from 'node:test';
import assert from 'node:assert/strict';
import {GOOGLE_REDIRECT_URI,REDIRECT_KEY,prefersGoogleRedirect,startGoogleRedirect,finishGoogleRedirect} from './dist/google-redirect.js';
import {completeGoogleReturn} from './dist/google-return.js';
import {createParticipationStore} from './dist/participation.js';
import {ACCOUNT_KEY,accountPanel} from './dist/google-account.js';

const clientId='123-test.apps.googleusercontent.com',origin='https://manor-feedback.tacocat070116.chatgpt.site';
const pageUrl='https://tacocat070116.github.io/manor-identity-v/#v=feedback&id=post-1';
function memory(){const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key),values};}
function deferred(){let resolve;return {promise:new Promise(r=>{resolve=r;}),resolve};}
function setup(){
 const storage=memory(),persistentStorage=memory(),calls=[];
 let clock=100000,serial=0;
 const store=createParticipationStore({storage:()=>persistentStorage,locks:()=>undefined,now:()=>clock});
 const session={token:'a'.repeat(64),profileId:'profile-a',expiresAt:clock+600000};
 const request=async(target,path,options)=>{
  calls.push({target,path,options});
  if(path==='challenge')return {id:'challenge',nonce:'b'.repeat(64),proof:'c'.repeat(64)};
  if(path==='google')return session;
  return {ok:true};
 };
 const shared={origin,clientId,store,request,storage,persistentStorage,now:()=>clock};
 return {storage,persistentStorage,calls,store,session,request,advance:ms=>{clock+=ms;},
  start:options=>startGoogleRedirect({...shared,pageUrl,random:()=>String(++serial).padStart(64,'0'),...options}),
  finish:options=>finishGoogleRedirect({...shared,pageUrl:GOOGLE_REDIRECT_URI,accountKey:ACCOUNT_KEY,fragment:'#'+new URLSearchParams({state:JSON.parse(storage.getItem(REDIRECT_KEY)||'{}').state||'',id_token:'signed-google-credential',iss:'https://accounts.google.com'}),...options})
 };
}

test('same-tab Google login returns to MANOR after a verified durable session is saved',async()=>{
 const h=setup(),url=new URL(await h.start());
 assert.equal(url.origin,'https://accounts.google.com');assert.equal(url.pathname,'/o/oauth2/v2/auth');
 assert.equal(url.searchParams.get('redirect_uri'),GOOGLE_REDIRECT_URI);
 assert.equal(url.searchParams.get('response_type'),'id_token');assert.equal(url.searchParams.get('response_mode'),'fragment');
 assert.equal(url.searchParams.get('scope'),'openid email');assert.equal(url.searchParams.get('prompt'),'select_account');
 assert.equal(url.searchParams.has('access_type'),false);assert.equal(url.searchParams.has('client_secret'),false);
 assert.equal(url.href.includes('c'.repeat(64)),false,'the server proof must stay in this tab');
 assert.equal(await h.finish(),pageUrl);
 assert.equal(h.store.read(),h.session.token);assert.equal(JSON.parse(h.persistentStorage.getItem(ACCOUNT_KEY)).token,h.session.token);
 assert.equal(h.storage.getItem(REDIRECT_KEY),null);
 assert.equal([...h.storage.values.values(),...h.persistentStorage.values.values()].some(value=>value.includes('signed-google-credential')),false);
 assert.deepEqual(h.calls.find(c=>c.path==='google').options.body,{challengeId:'challenge',proof:'c'.repeat(64),credential:'signed-google-credential',linkCurrent:false});
});

test('callback dependency failures still clear the credential and leave a usable recovery screen',async()=>{
 const location={hash:'#id_token=private&state=test',pathname:'/manor-identity-v/google-return.html'};let cleaned,errorStyle=false;
 const status={textContent:'',classList:{add:()=>{errorStyle=true;}}};
 await completeGoogleReturn({location,document:{getElementById:()=>status},history:{replaceState:(state,title,url)=>{cleaned=url;}},load:async()=>{assert.equal(cleaned,location.pathname);throw new TypeError('dependency unavailable');}});
 assert.equal(cleaned,location.pathname);assert.ok(!cleaned.includes('private'));assert.equal(errorStyle,true);assert.match(status.textContent,/MANOR에서 다시/);assert.ok(!status.textContent.includes('private'));
});

for(const kind of ['missing','mismatch','duplicate','expired','changed-origin','changed-client','invalid-proof'])test('invalid redirect transaction never reaches the credential endpoint: '+kind,async()=>{
 const h=setup();await h.start();const pending=JSON.parse(h.storage.getItem(REDIRECT_KEY));
 let fragment='#'+new URLSearchParams({state:pending.state,id_token:'signed-google-credential'});
 if(kind==='missing')h.storage.removeItem(REDIRECT_KEY);
 if(kind==='mismatch')fragment='#state=wrong&id_token=signed-google-credential';
 if(kind==='duplicate')fragment+='&state='+pending.state;
 if(kind==='expired')h.advance(10*60*1000);
 if(kind==='changed-origin')pending.origin='https://other.example';
 if(kind==='changed-client')pending.clientId='other-client';
 if(kind==='invalid-proof')pending.proof='invalid';
 if(kind.startsWith('changed-')||kind==='invalid-proof')h.storage.setItem(REDIRECT_KEY,JSON.stringify(pending));
 await assert.rejects(h.finish({fragment}));assert.equal(h.calls.some(c=>c.path==='google'),false);assert.equal(h.store.read(),'');
});

test('cancellation consumes the transaction and a new attempt remains usable',async()=>{
 const h=setup();await h.start();const pending=JSON.parse(h.storage.getItem(REDIRECT_KEY));
 await assert.rejects(h.finish({fragment:'#'+new URLSearchParams({state:pending.state,error:'access_denied',error_description:'<script>untrusted</script>'})}),/취소/);
 assert.equal(h.storage.getItem(REDIRECT_KEY),null);assert.equal(h.calls.some(c=>c.path==='google'),false);
 await h.start();assert.notEqual(JSON.parse(h.storage.getItem(REDIRECT_KEY)).state,pending.state);await h.finish();
});

test('callback refresh and duplicate responses cannot replay a credential exchange',async()=>{
 const h=setup();await h.start();await h.finish();await assert.rejects(h.finish());
 assert.equal(h.calls.filter(c=>c.path==='google').length,1);
});

test('an account change before returning preserves the newer account without exchanging',async()=>{
 const h=setup();await h.start();const newer={...h.session,token:'d'.repeat(64)};await h.store.setGoogleAccount(newer,'');
 await assert.rejects(h.finish(),/다른 창/);assert.equal(h.store.read(),newer.token);assert.equal(h.calls.some(c=>c.path==='google'),false);
});

test('an account change during exchange revokes only the rejected new session',async()=>{
 const h=setup(),pending=deferred();await h.start();
 const completing=h.finish({request:async(target,path,options)=>path==='google'?pending.promise:h.request(target,path,options)});
 const newer={...h.session,token:'d'.repeat(64)};await h.store.setGoogleAccount(newer,'');pending.resolve(h.session);
 await assert.rejects(completing,/다른 창/);assert.equal(h.store.read(),newer.token);
 assert.equal(h.calls.find(c=>c.path==='logout').options.token,h.session.token);
});

test('record linking uses only the original consent and exact legacy identity',async()=>{
 const h=setup(),legacy='e'.repeat(64);h.persistentStorage.setItem('manor-feedback-visitor',legacy);
 await h.start({linkCurrent:true});await h.finish();const exchange=h.calls.find(c=>c.path==='google');
 assert.equal(exchange.options.token,legacy);assert.equal(exchange.options.body.linkCurrent,true);
 const other=setup();other.persistentStorage.setItem('manor-feedback-visitor',legacy);await other.start({linkCurrent:true});
 other.persistentStorage.setItem('manor-feedback-visitor','f'.repeat(64));await assert.rejects(other.finish(),/다른 창/);
 assert.equal(other.calls.some(c=>c.path==='google'),false);
});

for(const target of ['storage','persistentStorage'])test('unavailable '+target+' prevents leaving MANOR',async()=>{
 const h=setup(),blocked={setItem(){throw Error('blocked');},getItem(){throw Error('blocked');},removeItem(){}};
 await assert.rejects(h.start({[target]:blocked}),/보관/);assert.equal(h.calls.length,0);
});

test('a session that only survives in memory cannot be reported as a completed redirect login',async()=>{
 const h=setup();await h.start();h.persistentStorage.setItem=()=>{throw Error('blocked after return');};
 await assert.rejects(h.finish(),/저장하지 못해/);
 assert.equal(h.calls.find(c=>c.path==='logout').options.token,h.session.token);
 assert.equal(h.store.read(),'');assert.equal(h.persistentStorage.getItem(ACCOUNT_KEY),null);
});

test('a transaction that cannot be removed must not exchange its credential',async()=>{
 const h=setup();await h.start();h.storage.removeItem=()=>{};
 await assert.rejects(h.finish(),/정리하지 못했/);assert.equal(h.calls.some(c=>c.path==='google'),false);
});

test('unmounting or changing accounts during preparation cannot navigate later',async()=>{
 const h=setup(),pending=deferred();let alive=true;
 const preparing=h.start({request:()=>pending.promise,canContinue:()=>alive});alive=false;
 pending.resolve({id:'late',nonce:'b'.repeat(64),proof:'c'.repeat(64)});
 await assert.rejects(preparing,{name:'AbortError'});assert.equal(h.storage.getItem(REDIRECT_KEY),null);
 const other=setup(),challenge=deferred();const changed=other.start({request:()=>challenge.promise});
 await other.store.setGoogleAccount(other.session,'');challenge.resolve({id:'late',nonce:'b'.repeat(64),proof:'c'.repeat(64)});
 await assert.rejects(changed,/다른 창/);assert.equal(other.storage.getItem(REDIRECT_KEY),null);
});

test('return destinations are restricted to the MANOR app, including tampered saved routes',async()=>{
 const h=setup();await assert.rejects(h.start({pageUrl:'https://attacker.example/'}));assert.equal(h.calls.length,0);
 await h.start();const pending=JSON.parse(h.storage.getItem(REDIRECT_KEY));pending.returnHash='https://attacker.example/';h.storage.setItem(REDIRECT_KEY,JSON.stringify(pending));
 assert.equal(await h.finish(),'https://tacocat070116.github.io/manor-identity-v/#v=recovery');
});

test('unexpected access tokens, duplicate credentials and foreign response issuers are rejected',async()=>{
 for(const suffix of ['&access_token=unexpected','&id_token=duplicate','&iss=https://attacker.example','&iss=https://accounts.google.com&iss=https://attacker.example','&error=access_denied&error=other']){
  const h=setup();await h.start();const state=JSON.parse(h.storage.getItem(REDIRECT_KEY)).state;
  await assert.rejects(h.finish({fragment:'#state='+state+'&id_token=valid'+suffix}));assert.equal(h.calls.some(c=>c.path==='google'),false);
 }
});

test('network and server failures leave the previous records unchanged and allow a fresh attempt',async()=>{
 const h=setup();await h.start();await assert.rejects(h.finish({request:async()=>{throw Error('offline');}}),/offline/);
 assert.equal(h.storage.getItem(REDIRECT_KEY),null);assert.equal(h.store.read(),'');await h.start();await h.finish();assert.equal(h.store.read(),h.session.token);
});

test('Safari and iOS use the same-tab preference while desktop Chrome keeps its existing popup',()=>{
 assert.equal(prefersGoogleRedirect({userAgent:'Mozilla/5.0 (iPhone) Version/26.0 Mobile Safari/604.1'}),true);
 assert.equal(prefersGoogleRedirect({userAgent:'Mozilla/5.0 (Macintosh) Version/26.0 Safari/605.1.15'}),true);
 assert.equal(prefersGoogleRedirect({userAgent:'Mozilla/5.0 (iPhone) CriOS/142.0 Mobile Safari/604.1'}),true);
 assert.equal(prefersGoogleRedirect({userAgent:'Mozilla/5.0 (Macintosh)',platform:'MacIntel',maxTouchPoints:5}),true);
 assert.equal(prefersGoogleRedirect({userAgent:'Mozilla/5.0 Chrome/142.0 Safari/537.36'}),false);
 assert.equal(prefersGoogleRedirect({userAgent:'Mozilla/5.0 (Android) Chrome/142.0 Safari/537.36'}),false);
});

test('registered redirect login is available with popup fallback and can be disabled safely',()=>{
 const desktop=accountPanel();assert.doesNotMatch(desktop,/AddSession/);assert.match(desktop,/data-google-button/);assert.match(desktop,/data-account="redirect"/);
 const safari=accountPanel({sameTab:true});assert.match(safari,/data-account="redirect"/);assert.match(safari,/data-account="popup"/);assert.doesNotMatch(safari,/data-google-button/);
 const disabled=accountPanel({redirectAvailable:false});assert.doesNotMatch(disabled,/data-account="redirect"/);assert.match(disabled,/data-google-button/);
});
