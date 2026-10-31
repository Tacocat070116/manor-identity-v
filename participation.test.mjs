import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createParticipationStore,recoveryCode,recoveryToken,issueRecoveryCode,recoveryPanel} from './dist/participation.js';
const a='a'.repeat(64),b='b'.repeat(64),key='manor-feedback-visitor';
function storage(initial={}){const values=new Map(Object.entries(initial));return {values,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};}
const valid=async()=>new Response(JSON.stringify({connected:true}),{headers:{'Content-Type':'application/json'}});
const options={origin:'https://feedback.example',fetcher:valid};

test('all public participation features load the same current identity module URL',()=>{
 const digest=createHash('sha256').update(fs.readFileSync('dist/participation.js')).digest('hex').slice(0,12);
 for(const file of ['app.js','feedback.js','matchup-tips.js','creators.js']){
  const source=fs.readFileSync('dist/'+file,'utf8');
  assert(source.includes("from './participation.js?v="+digest+"'"),file+' must share one module instance');
 }
});

test('old author identity survives reload and its versioned code restores in an independent browser',async()=>{
 const old=storage({[key]:a}),first=createParticipationStore({storage:()=>old});
 assert.equal(first.read(),a);
 assert.equal(recoveryToken(recoveryCode(a).toLowerCase()),a);
 assert.equal(recoveryToken('bad-code'),'');
 const secondStorage=storage(),second=createParticipationStore({storage:()=>secondStorage});
 let request;
 await second.connect(recoveryCode(a),{origin:options.origin,fetcher:async(url,init)=>{request={url,init};return valid();}});
 assert.equal(second.read(),a);
 assert.equal(createParticipationStore({storage:()=>secondStorage}).read(),a);
 assert.equal(request.url,'https://feedback.example/api/feedback/session');
 assert(!request.url.includes(a));assert.equal(request.init.headers.Authorization,'Bearer '+a);
 assert.equal(request.init.credentials,'omit');assert.equal(request.init.cache,'no-store');
});

test('one shared creation and cross-tab lock prevent duplicate identity replacement',async()=>{
 const target=storage();let issued=0,queue=Promise.resolve();
 const lock={request(_name,work){const result=queue.then(work);queue=result.catch(()=>{});return result;}};
 const one=createParticipationStore({storage:()=>target,locks:()=>lock}),two=createParticipationStore({storage:()=>target,locks:()=>lock});
 const create=async()=>{issued++;await new Promise(r=>setImmediate(r));return {token:a};};
 assert.deepEqual(await Promise.all([one.ensure(create),one.ensure(create),two.ensure(create)]),[a,a,a]);
 assert.equal(issued,1);
});

test('a delayed invalid-token reply cannot erase a newly connected identity and both profiles remain available',async()=>{
 const target=storage({[key]:a}),identity=createParticipationStore({storage:()=>target});
 await identity.connect(recoveryCode(b),options);
 assert.equal(await identity.invalidate(a),false);assert.equal(identity.read(),b);
 assert.deepEqual(new Set(identity.profiles().map(p=>p.token)),new Set([a,b]));
 await identity.connect(recoveryCode(a),options);assert.equal(identity.read(),a);
});

test('invalid, unavailable, redirected, malformed or cancelled restoration leaves the existing identity unchanged',async()=>{
 const target=storage({[key]:a}),identity=createParticipationStore({storage:()=>target});
 const attempts=[
  async()=>new Response('{}',{status:401}),
  async()=>new Response('{}',{status:503}),
  async()=>new Response('<h1>Login</h1>',{headers:{'Content-Type':'text/html'}}),
  async()=>new Response('{',{headers:{'Content-Type':'application/json'}}),
  async()=>{throw new TypeError('offline');},
 ];
 for(const fetcher of attempts){await assert.rejects(identity.connect(recoveryCode(b),{...options,fetcher}));assert.equal(identity.read(),a);assert.equal(target.values.size,1);}
 assert.equal(await identity.connect(recoveryCode(b),{...options,beforeSwitch:()=>false}),false);assert.equal(identity.read(),a);
 const controller=new AbortController();controller.abort();await assert.rejects(identity.connect(recoveryCode(b),{...options,signal:controller.signal}));assert.equal(identity.read(),a);
});

test('storage failure does not silently replace a current profile; first-time memory-only writing is labelled nonpersistent',async()=>{
 const broken=storage({[key]:a});broken.setItem=()=>{throw Error('quota');};
 const identity=createParticipationStore({storage:()=>broken});await assert.rejects(identity.connect(recoveryCode(b),options));assert.equal(identity.read(),a);
 const blocked=createParticipationStore({storage:()=>{throw Error('blocked');}});
 assert.equal(await blocked.ensure(async()=>({token:b})),b);assert.equal(blocked.read(),b);assert.equal(blocked.persistent(),false);
});

test('an identity removed by another tab is not resurrected from stale memory',async()=>{
 const target=storage({[key]:a}),one=createParticipationStore({storage:()=>target}),two=createParticipationStore({storage:()=>target});
 assert.equal(one.read(),a);await two.invalidate(a);assert.equal(one.read(),'');
});

test('issuing before writing creates one server identity; repeated issuance preserves authorship',async()=>{
 const target=storage(),identity=createParticipationStore({storage:()=>target});let requests=[];
 const fetcher=async(url,init)=>{requests.push({url,init});await new Promise(r=>setImmediate(r));return new Response(JSON.stringify({token:a}),{headers:{'Content-Type':'application/json'}});};
 assert.deepEqual(await Promise.all([issueRecoveryCode({store:identity,...options,fetcher}),issueRecoveryCode({store:identity,...options,fetcher})]),[a,a]);
 assert.equal(requests.length,1);assert.equal(requests[0].url,options.origin+'/api/feedback/visitors');
 assert.equal(requests[0].init.method,'POST');assert.equal(requests[0].init.credentials,'omit');assert.equal(requests[0].init.redirect,'error');
 assert.equal(identity.backedUp(),false);
 const reloaded=createParticipationStore({storage:()=>target});
 assert.equal(await issueRecoveryCode({store:reloaded,fetcher:()=>{throw Error('must reuse current identity');}}),a);
 assert.equal(await reloaded.ensure(()=>{throw Error('writing must reuse issued identity');}),a);
});

test('failed or cancelled issuance never persists an unverified or abandoned code',async()=>{
 const attempts=[
  async()=>new Response('{}',{status:429}),async()=>new Response('{}',{status:503}),
  async()=>new Response('<h1>Login</h1>',{headers:{'Content-Type':'text/html'}}),
  async()=>new Response('{',{headers:{'Content-Type':'application/json'}}),
  async()=>new Response('{"token":"invalid"}',{headers:{'Content-Type':'application/json'}}),
  async()=>{throw new TypeError('offline');},
  async()=>({ok:true,redirected:true,headers:new Headers({'Content-Type':'application/json'}),json:async()=>({token:a})}),
 ];
 for(const fetcher of attempts){const target=storage(),identity=createParticipationStore({storage:()=>target});await assert.rejects(issueRecoveryCode({store:identity,...options,fetcher}));assert.equal(identity.read(),'');assert.equal(target.values.size,0);}
 const target=storage(),identity=createParticipationStore({storage:()=>target}),controller=new AbortController();
 await assert.rejects(issueRecoveryCode({store:identity,...options,signal:controller.signal,fetcher:async()=>{controller.abort();return new Response(JSON.stringify({token:a}),{headers:{'Content-Type':'application/json'}});}}),{name:'AbortError'});
 assert.equal(identity.read(),'');assert.equal(target.values.size,0);
});

test('a new code restores in another browser before the first post; backup acknowledgment belongs to the displayed identity',async()=>{
 const target=storage(),identity=createParticipationStore({storage:()=>target});
 await issueRecoveryCode({store:identity,fetcher:async()=>new Response(JSON.stringify({token:a}),{headers:{'Content-Type':'application/json'}})});
 const otherStorage=storage(),other=createParticipationStore({storage:()=>otherStorage});await other.connect(recoveryCode(identity.read()),options);assert.equal(other.read(),a);
 assert.equal(other.backedUp(),false);assert.equal(other.markBackedUp(a),true);assert.equal(other.backedUp(),true);
 await other.connect(recoveryCode(b),options);assert.equal(other.markBackedUp(a),false);assert.equal(other.backedUp(),false);
 assert.equal(other.profiles().find(p=>p.token===a).backedUp,true);
});

test('recovery screens keep secrets out of markup and require explicit backup confirmation',()=>{
 const initial=recoveryPanel();assert.match(initial,/복구 코드 발급받기/);assert.doesNotMatch(initial,/data-recovery-code/);
 for(const revealed of [false,true]){
  const html=recoveryPanel({current:a,revealed,profiles:[{token:a,createdAt:Date.now()},{token:b,createdAt:Date.now()}]});
  assert(!html.includes(a));assert(!html.includes(recoveryCode(a)));
  if(revealed){assert.match(html,/data-recovery-confirm/);assert.match(html,/data-recovery="saved" disabled/);}
 }
 const restored=recoveryPanel({current:a,mode:'connect',profiles:[{token:a,createdAt:Date.now()},{token:b,createdAt:Date.now()}]});
 assert(!restored.includes(a));assert(!restored.includes(b));assert.match(restored,/type="password"/);
 assert.match(recoveryPanel({persistent:false}),/role="alert"/);
});

test('recovery prompts distinguish disconnected, connected, confirmed and nonpersistent browsers without exposing codes',async()=>{
 const {recoveryState,participationBar}=await import('./dist/participation.js');
 for(const [current,saved,persistent,expected] of [['',false,true,'unconnected'],[a,false,true,'needs-backup'],[a,true,true,'ready'],[a,true,false,'temporary'],['',true,true,'unconnected']]){
  assert.equal(recoveryState({current,saved,persistent}),expected);
  const bar=participationBar({store:{read:()=>current,backedUp:()=>saved,persistent:()=>persistent}});
  assert.match(bar,new RegExp('data-recovery-state="'+expected+'"'));assert.ok(!bar.includes(a));
  if(expected==='ready'){assert.doesNotMatch(bar,/data-participation-view="connect"|발급받기|코드 확인·보관/);assert.match(bar,/코드 관리/);}
 }
 const completed=recoveryPanel({current:a,saved:true,persistent:true});
 assert.match(completed,/recovery-completed" disabled/);assert.doesNotMatch(completed,/class="recovery-steps"|data-recovery-confirm/);
 assert.match(recoveryPanel({current:a,saved:true,persistent:false}),/이 창에서만 연결/);
});

test('saving only the token cannot falsely report that recovery profiles persisted',async()=>{
 const target=storage(),identity=createParticipationStore({storage:()=>({...target,setItem(key,value){if(key==='manor-participation-profiles')throw Error('quota');target.setItem(key,value);}})});
 await identity.ensure(async()=>({token:a}));assert.equal(identity.read(),a);assert.equal(identity.persistent(),false);
});
