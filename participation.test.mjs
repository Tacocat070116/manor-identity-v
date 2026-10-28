import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createParticipationStore,recoveryCode,recoveryToken} from './dist/participation.js';
const a='a'.repeat(64),b='b'.repeat(64),key='manor-feedback-visitor';
function storage(initial={}){const values=new Map(Object.entries(initial));return {values,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};}
const valid=async()=>new Response(JSON.stringify({connected:true}),{headers:{'Content-Type':'application/json'}});
const options={origin:'https://feedback.example',fetcher:valid};

test('all public participation features load the same current identity module URL',()=>{
 const digest=createHash('sha256').update(fs.readFileSync('dist/participation.js')).digest('hex').slice(0,12);
 for(const file of ['feedback.js','matchup-tips.js','creators.js']){
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
