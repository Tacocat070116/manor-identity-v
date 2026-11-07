import test from 'node:test';
import assert from 'node:assert/strict';
import {createGoogleSignIn} from './dist/google-signin.js';

const tick=()=>new Promise(setImmediate);
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function harness({challenge,exchange=async()=>{},canAccept=()=>true}={}){
 const events=new EventTarget(),page=new EventTarget(),timers=new Map(),configs=[],renders=[],errors=[],received=[];
 page.visibilityState='visible';
 let clock=0,requested=0,timerId=0;
 const google={initialize:config=>configs.push(config),renderButton:(slot,options)=>renders.push({slot,options})};
 const manager=createGoogleSignIn({clientId:'test-client',loadLibrary:async()=>google,
  requestChallenge:()=>{requested++;return challenge?challenge():Promise.resolve({id:'challenge-'+requested,nonce:'nonce-'+requested,proof:'proof-'+requested});},
  now:()=>clock,events,page,schedule:fn=>{timers.set(++timerId,fn);return timerId;},cancel:id=>timers.delete(id)
 });
 function mount(){
  const slot={isConnected:true,textContent:'',replacements:0,replaceChildren(){this.replacements++;},getBoundingClientRect:()=>({width:320})};
  const dispose=manager.mount(slot,{canAccept,onCredential:async(response,proof)=>{received.push({slot,response,proof});await exchange(response,proof);},onError:error=>errors.push(error)});
  return {slot,dispose,button:()=>renders.findLast(item=>item.slot===slot).options};
 }
 return {mount,configs,renders,errors,received,events,page,timers,requested:()=>requested,advance:ms=>{clock+=ms;},flush:()=>{const jobs=[...timers.values()];timers.clear();jobs.forEach(fn=>fn());}};
}

test('concurrent login panels share initialization and route credentials only to their button',async()=>{
 const h=harness(),a=h.mount(),b=h.mount();await tick();
 assert.equal(h.configs.length,1);assert.equal(h.requested(),1);
 const callback=h.configs[0].callback;
 await callback({credential:'unknown',state:'missing'});assert.equal(h.received.length,0);
 await callback({credential:'for-b',state:b.button().state});
 assert.equal(h.received.length,1);assert.equal(h.received[0].slot,b.slot);
 assert.equal(h.received[0].proof.nonce,'nonce-1');a.dispose();b.dispose();
});

test('repeated popup cancellations restore the button without invalidating a late credential',async()=>{
 const pending=deferred(),h=harness({exchange:()=>pending.promise}),view=h.mount();await tick();
 const original=h.configs[0],state=view.button().state;
 for(const event of ['focus','pageshow','visibilitychange']){
  view.button().click_listener();
  (event==='visibilitychange'?h.page:h.events).dispatchEvent(new Event(event));h.flush();
  assert.equal(view.button().state,state);assert.equal(h.configs.length,1);
 }
 assert.equal(view.slot.replacements,4);
 const response={credential:'late-valid-credential',state};
 const first=original.callback(response);await original.callback(response);
 assert.equal(h.received.length,1);assert.equal(h.received[0].proof.nonce,'nonce-1');assert.equal(view.slot.inert,true);
 pending.resolve();await first;await tick();
 assert.equal(h.requested(),2);assert.equal(view.slot.inert,false);
 await original.callback(response);assert.equal(h.received.length,1,'a duplicate from the completed attempt must stay ignored');view.dispose();
});

test('return events cannot replace a button while its credential is being exchanged',async()=>{
 const pending=deferred(),h=harness({exchange:()=>pending.promise}),view=h.mount();await tick();
 view.button().click_listener();h.events.dispatchEvent(new Event('focus'));
 const completing=h.configs[0].callback({credential:'valid',state:view.button().state});
 h.flush();h.events.dispatchEvent(new Event('pageshow'));h.flush();
 assert.equal(view.slot.replacements,1);assert.equal(h.requested(),1);
 pending.resolve();await completing;await tick();assert.equal(h.requested(),2);view.dispose();
});

test('a quick retry cancels the previous popup return recovery',async()=>{
 const h=harness(),view=h.mount();await tick();
 view.button().click_listener();h.events.dispatchEvent(new Event('focus'));assert.equal(h.timers.size,1);
 view.button().click_listener();assert.equal(h.timers.size,0);h.flush();
 assert.equal(view.slot.replacements,1);assert.equal(h.configs.length,1);
 await h.configs[0].callback({credential:'quick-retry',state:view.button().state});
 assert.equal(h.received.length,1);assert.equal(h.received[0].proof.nonce,'nonce-1');view.dispose();
});

test('a rejected credential gets a fresh challenge and the next login can complete',async()=>{
 let fail=true;
 const h=harness({exchange:async()=>{if(fail)throw Error('expired challenge');}}),view=h.mount();await tick();
 await h.configs[0].callback({credential:'expired',state:view.button().state});await tick();
 assert.equal(h.errors[0].message,'expired challenge');assert.equal(h.configs.length,2);assert.equal(view.slot.inert,false);
 fail=false;await h.configs[1].callback({credential:'valid',state:view.button().state});
 assert.equal(h.received.length,2);assert.equal(h.received[1].proof.nonce,'nonce-2');view.dispose();
});

test('disposing a pending panel prevents detached rendering and accepting its returned credential',async()=>{
 const pending=deferred(),h=harness({challenge:()=>pending.promise}),old=h.mount();old.dispose();
 pending.resolve({id:'pending',nonce:'pending-nonce',proof:'pending-proof'});await tick();
 assert.equal(old.slot.replacements,0);assert.equal(h.renders.length,0);
 const current=h.mount();await tick();
 await h.configs[0].callback({credential:'old',state:'pending:1'});
 assert.equal(h.received.length,0);assert.equal(current.slot.replacements,1);
 current.button().click_listener();h.events.dispatchEvent(new Event('focus'));assert.equal(h.timers.size,1);
 current.dispose();assert.equal(h.timers.size,0);
 h.events.dispatchEvent(new Event('focus'));assert.equal(h.timers.size,0);
});

test('a new panel renews an expired idle challenge but preserves an active popup challenge',async()=>{
 const h=harness(),a=h.mount();await tick();h.advance(10*60*1000);
 const b=h.mount();await tick();assert.equal(h.configs.length,2);
 assert.ok(a.button().state.startsWith('challenge-2:'),'an older visible panel must use the renewed challenge too');
 b.button().click_listener();h.advance(10*60*1000);
 const c=h.mount();await tick();assert.equal(h.configs.length,2);
 await h.configs[1].callback({credential:'active',state:a.button().state});assert.equal(h.received[0].proof.nonce,'nonce-2');
 a.dispose();b.dispose();c.dispose();
});

test('loading a new challenge must not interrupt a popup opened by an existing button',async()=>{
 const pending=deferred();let requests=0;
 const h=harness({challenge:()=>++requests===1?Promise.resolve({id:'first',nonce:'first-nonce',proof:'first-proof'}):pending.promise});
 const a=h.mount();await tick();h.advance(10*60*1000);
 const b=h.mount();a.button().click_listener();
 pending.resolve({id:'second',nonce:'second-nonce',proof:'second-proof'});await tick();
 assert.equal(h.configs.length,1);assert.ok(b.button().state.startsWith('first:'));
 await h.configs[0].callback({credential:'popup-credential',state:a.button().state});assert.equal(h.received[0].proof.nonce,'first-nonce');
 a.dispose();b.dispose();
});

for(const order of ['challenge-first','exchange-first'])test('overlapping challenge renewal and credential exchange recover: '+order,async()=>{
 const renewal=deferred(),exchange=deferred();let requests=0;
 const h=harness({challenge:()=>{
  const id=++requests;
  return id===2?renewal.promise:Promise.resolve({id:'challenge-'+id,nonce:'nonce-'+id,proof:'proof-'+id});
 },exchange:()=>exchange.promise});
 const a=h.mount();await tick();h.advance(10*60*1000);
 const b=h.mount();a.button().click_listener();
 const completing=h.configs[0].callback({credential:'first',state:a.button().state});
 assert.equal(a.slot.inert,true);assert.equal(b.slot.inert,true);
 const renewed={id:'renewal',nonce:'renewal-nonce',proof:'renewal-proof'};
 if(order==='challenge-first'){renewal.resolve(renewed);exchange.resolve();}
 else{exchange.resolve();renewal.resolve(renewed);}
 await completing;await tick();
 assert.equal(a.slot.inert,false);assert.equal(b.slot.inert,false);
 assert.equal(h.configs.length,2);assert.ok(!a.button().state.startsWith('challenge-1:'));
 await h.configs[1].callback({credential:'second',state:b.button().state});
 assert.equal(h.received.length,2);assert.notEqual(h.received[1].proof.nonce,'nonce-1');
 a.dispose();b.dispose();
});

test('a denied account switch does not consume the challenge and can be retried',async()=>{
 let allowed=false;
 const h=harness({canAccept:()=>allowed}),view=h.mount();await tick();
 const response={credential:'valid',state:view.button().state};
 await h.configs[0].callback(response);assert.equal(h.received.length,0);assert.equal(h.requested(),1);
 allowed=true;await h.configs[0].callback(response);assert.equal(h.received.length,1);view.dispose();
});

test('challenge loading failure is visible and remounting can recover',async()=>{
 let fail=true;
 const h=harness({challenge:async()=>{if(fail)throw Error('network unavailable');return {id:'retry',nonce:'retry-nonce',proof:'retry-proof'};}}),old=h.mount();await tick();
 assert.equal(h.errors[0].message,'network unavailable');assert.equal(old.slot.textContent,'');old.dispose();
 fail=false;const view=h.mount();await tick();assert.equal(view.slot.replacements,1);assert.equal(h.configs.length,1);view.dispose();
});
