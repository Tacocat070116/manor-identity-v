import test from 'node:test';
import assert from 'node:assert/strict';
import {createParticipationStore,issueRecoveryCode,recoveryCode} from './dist/participation.js';
import {ACCOUNT_KEY,authRequest,accountPanel} from './dist/google-account.js';
const guest='a'.repeat(64),session='b'.repeat(64),other='c'.repeat(64),legacyKey='manor-feedback-visitor';
const storage=initial=>{const map=new Map(Object.entries(initial||{}));return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k),map};};
const login=(token=session)=>({token,profileId:'profile-1',expiresAt:2000});

test('Google sessions survive reload, preserve old profiles and never become exportable recovery codes',async()=>{
 const saved=storage({[legacyKey]:guest}),store=createParticipationStore({storage:()=>saved,now:()=>1000});
 await store.setGoogleAccount(login(),guest);
 assert.equal(store.read(),session);assert.equal(store.legacyToken(),guest);assert.deepEqual(store.profiles().map(p=>p.token),[guest]);
 assert.equal(createParticipationStore({storage:()=>saved,now:()=>1000}).read(),session);
 await assert.rejects(issueRecoveryCode({store}),/복구 코드를 발급하지 않습니다/);
 await assert.rejects(store.connect(recoveryCode(guest)),/Google 계정에 연결/);
 assert.equal(store.markBackedUp(session),false);
});

test('expired or invalid Google sessions require sign-in instead of falling back to the legacy credential',async()=>{
 let now=1000;const saved=storage({[legacyKey]:guest}),store=createParticipationStore({storage:()=>saved,now:()=>now});
 await store.setGoogleAccount(login());now=2001;assert.equal(store.read(),'');
 let created=false;await assert.rejects(store.ensure(async()=>{created=true;return {token:other};}),/Google로 로그인/);assert.equal(created,false);
 assert.equal(store.legacyToken(),guest);assert.equal(await store.invalidate(session),true);assert.equal(store.read(),'');
});

test('late sign-in and invalid-token responses cannot replace or erase another tab’s account',async()=>{
 const saved=storage(),a=createParticipationStore({storage:()=>saved,now:()=>1000}),b=createParticipationStore({storage:()=>saved,now:()=>1000});
 await a.setGoogleAccount(login());await b.setGoogleAccount(login(other),session);
 assert.equal(await a.invalidate(session),false);assert.equal(a.read(),other);
 await assert.rejects(a.setGoogleAccount(login(),session),/다른 창/);assert.equal(a.read(),other);
 assert.equal(await a.clearGoogleAccount(session),false);assert.equal(a.read(),other);
});

test('logout is reflected in other tabs and does not resurrect the old capability',async()=>{
 const saved=storage({[legacyKey]:guest}),a=createParticipationStore({storage:()=>saved,now:()=>1000}),b=createParticipationStore({storage:()=>saved,now:()=>1000});
 await a.setGoogleAccount(login());assert.equal(b.read(),session);
 await a.clearGoogleAccount(session);assert.equal(b.read(),'');assert.equal(b.googleAccount(),null);assert.equal(saved.getItem(ACCOUNT_KEY),null);
 assert.deepEqual(b.profiles().map(p=>p.token),[guest]);
});

test('blocked browser storage supports a temporary Google session without losing its identity silently',async()=>{
 const store=createParticipationStore({storage:()=>{throw Error('blocked');},now:()=>1000});
 await store.setGoogleAccount(login());assert.equal(store.read(),session);assert.equal(store.persistent(),false);
 await store.clearGoogleAccount(session);assert.equal(store.read(),'');
});

test('auth transport sends credentials only in headers or JSON, with redirects and ambient cookies disabled',async()=>{
 let call;
 const fetcher=async(url,options)=>{call={url,options};return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json'}});};
 await authRequest('https://feedback.example','google',{token:guest,body:{credential:'test-id-token'},fetcher});
 assert.equal(call.url,'https://feedback.example/api/auth/google');assert.equal(call.options.headers.Authorization,'Bearer '+guest);
 assert.equal(call.options.credentials,'omit');assert.equal(call.options.redirect,'error');assert.equal(call.options.cache,'no-store');
 await assert.rejects(authRequest('https://feedback.example','session',{fetcher:async()=>new Response('<html/>',{headers:{'Content-Type':'text/html'}})}));
});

test('account screens distinguish login, legacy import and separate records while escaping supplied identifiers',()=>{
 const page=accountPanel({legacy:true});assert.match(page,/Google로 로그인/);assert.match(page,/기존 작성 기록/);assert(!page.includes(guest));
 const connected=accountPanel({session:login(),profiles:[{id:'" onclick="bad',feedback:2},{id:'normal'}]});
 assert.match(connected,/이전에 쓴 기록 추가 연결/);assert.match(connected,/원래 글과 별명을 보존/);assert(!connected.includes('onclick="bad'));
 assert(!connected.includes(session));
});
