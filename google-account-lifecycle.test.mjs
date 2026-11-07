import test from 'node:test';
import assert from 'node:assert/strict';
import {mountGoogleAccount} from './dist/google-account.js';

test('closing a second login panel does not leave the first panel with a dead Google callback',async()=>{
 const previous={google:globalThis.google,fetch:globalThis.fetch,window:globalThis.window};
 let configuration,challenge=0,accepted=0;
 const rendered=new Map(),slots=[];
 const node=()=>({textContent:'',isConnected:true,classList:{toggle(){}},replaceChildren(){},getBoundingClientRect:()=>({width:320})});
 function root(){const slot=node(),message=node(),listeners={};slots.push(slot);return {
  innerHTML:'',querySelector(s){if(s==='[data-google-button]')return slot;if(s==='.participation-result')return message;return null;},
  querySelectorAll:()=>[],setAttribute(){},removeAttribute(){},addEventListener(k,v){listeners[k]=v;},removeEventListener(k){delete listeners[k];}
 };}
 const store={googleAccount:()=>null,legacyToken:()=>'',profiles:()=>[],persistent:()=>true,read:()=>'',setGoogleAccount:async()=>{accepted++;}};
 const disposers=[];
 try{
  globalThis.window=new EventTarget();
  globalThis.google={accounts:{id:{initialize:config=>{configuration=config;},renderButton:(slot,options)=>rendered.set(slot,options)}}};
  globalThis.fetch=async url=>new Response(JSON.stringify(url.endsWith('/challenge')?{id:'challenge-'+(++challenge),nonce:'nonce-'+challenge,proof:'proof-'+challenge}:url.endsWith('/google')?{token:'b'.repeat(64),profileId:'test',expiresAt:Date.now()+60000}:{profiles:[],profileId:'test'}),{headers:{'Content-Type':'application/json'}});
  disposers.push(mountGoogleAccount(root(),{store,origin:'https://lifecycle.example',clientId:'123-test.apps.googleusercontent.com'}));
  await new Promise(setImmediate);
  const first=rendered.get(slots[0]);
  disposers.push(mountGoogleAccount(root(),{store,origin:'https://lifecycle.example',clientId:'123-test.apps.googleusercontent.com'}));
  await new Promise(setImmediate);
  disposers.pop()();
  configuration.callback({credential:'test-credential',state:first.state});
  await new Promise(setImmediate);
  assert.equal(accepted,1,'the remaining visible Google button must still complete sign-in');
 }finally{disposers.forEach(dispose=>dispose());Object.assign(globalThis,previous);}
});

test('restarting login and adding an account respect the unsent-content guard',async()=>{
 const previous={google:globalThis.google,fetch:globalThis.fetch,window:globalThis.window,location:globalThis.location};
 const handlers={},slot={textContent:'',isConnected:true,replaceChildren(){},getBoundingClientRect:()=>({width:320})};
 const root={innerHTML:'',querySelector:s=>s==='[data-google-button]'?slot:null,querySelectorAll:()=>[],addEventListener:(k,v)=>{handlers[k]=v;},removeEventListener:k=>{delete handlers[k];}};
 const store={googleAccount:()=>null,legacyToken:()=>'',profiles:()=>[],persistent:()=>true,read:()=>''};
 let allow=false,reloads=0,dispose;
 function click(action){let prevented=false;handlers.click({target:{closest:()=>({dataset:{account:action}})},preventDefault:()=>{prevented=true;}});return prevented;}
 try{
  globalThis.window=new EventTarget();globalThis.location={reload:()=>{reloads++;}};
  globalThis.google={accounts:{id:{initialize(){},renderButton(){}}}};
  globalThis.fetch=async()=>new Response(JSON.stringify({id:'guard',nonce:'guard-nonce',proof:'guard-proof'}),{headers:{'Content-Type':'application/json'}});
  dispose=mountGoogleAccount(root,{store,origin:'https://guard.example',clientId:'123-test.apps.googleusercontent.com',beforeSwitch:()=>allow});
  await new Promise(setImmediate);
  assert.equal(click('retry'),true);assert.equal(reloads,0);
  assert.equal(click('add-google'),true,'canceling the guard must prevent external navigation');
  allow=true;click('retry');assert.equal(reloads,1,'restart must reset the whole Google client, not only redraw the iframe');
  assert.equal(click('add-google'),false,'an approved account-add link uses ordinary browser navigation');
 }finally{dispose?.();Object.assign(globalThis,previous);}
});
