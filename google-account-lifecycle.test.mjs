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

test('switching from same-tab login to popup preserves a declined record-linking choice',async()=>{
 const previous={google:globalThis.google,fetch:globalThis.fetch,window:globalThis.window};
 const navigatorDescriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 let html='',configuration,button,exchange,dispose;const handlers={},choice={checked:true};
 const slot={textContent:'',isConnected:true,replaceChildren(){},getBoundingClientRect:()=>({width:320})};
 const root={get innerHTML(){return html;},set innerHTML(value){html=value;choice.checked=true;},querySelector:s=>s==='[data-account-link]'?choice:s==='[data-google-button]'&&html.includes('data-google-button')?slot:null,querySelectorAll:()=>[],setAttribute(){},removeAttribute(){},addEventListener:(k,v)=>{handlers[k]=v;},removeEventListener:k=>{delete handlers[k];}};
 const legacy='e'.repeat(64),store={googleAccount:()=>null,legacyToken:()=>legacy,profiles:()=>[],persistent:()=>true,read:()=>legacy,setGoogleAccount:async()=>{}};
 try{
  globalThis.window=new EventTarget();Object.defineProperty(globalThis,'navigator',{configurable:true,value:{userAgent:'Version/26.0 Safari/605.1.15'}});
  globalThis.google={accounts:{id:{initialize:value=>{configuration=value;},renderButton:(slot,value)=>{button=value;}}}};
  globalThis.fetch=async(url,options)=>{
   if(url.endsWith('/google'))exchange=options;
   const data=url.endsWith('/challenge')?{id:'choice',nonce:'b'.repeat(64),proof:'c'.repeat(64)}:url.endsWith('/google')?{token:'a'.repeat(64),profileId:'test',expiresAt:Date.now()+60000}:{profiles:[],profileId:'test'};
   return new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
  };
  dispose=mountGoogleAccount(root,{store,origin:'https://choice.example',clientId:'123-test.apps.googleusercontent.com',redirectEnabled:true});
  choice.checked=false;handlers.click({target:{closest:()=>({dataset:{account:'popup'}})},preventDefault(){}});await new Promise(setImmediate);
  assert.equal(choice.checked,false);await configuration.callback({credential:'credential',state:button.state});
  assert.equal(JSON.parse(exchange.body).linkCurrent,false);assert.equal(exchange.headers.Authorization,undefined);
 }finally{dispose?.();Object.assign(globalThis,previous);if(navigatorDescriptor)Object.defineProperty(globalThis,'navigator',navigatorDescriptor);else delete globalThis.navigator;}
});

test('rapid redirect clicks navigate once and closing the panel cancels pending navigation',async()=>{
 const previous={google:globalThis.google,fetch:globalThis.fetch,window:globalThis.window,location:globalThis.location,sessionStorage:globalThis.sessionStorage,localStorage:globalThis.localStorage};
 const handles=[],navigations=[];let pendingReply,block=false,redirectRequests=0;
 const memory=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};};
 const store={googleAccount:()=>null,legacyToken:()=>'',profiles:()=>[],persistent:()=>true,read:()=>''};
 function panel(){
  const handlers={},slot={textContent:'',isConnected:true,replaceChildren(){},getBoundingClientRect:()=>({width:320})};
  const root={innerHTML:'',querySelector:s=>s==='[data-google-button]'?slot:null,querySelectorAll:()=>[],setAttribute(){},removeAttribute(){},addEventListener:(k,v)=>{handlers[k]=v;},removeEventListener:k=>{delete handlers[k];}};
  const dispose=mountGoogleAccount(root,{store,origin:'https://redirect-lifecycle.example',clientId:'123-test.apps.googleusercontent.com',redirectEnabled:true});
  handles.push(dispose);return {dispose,click:()=>handlers.click({target:{closest:()=>({dataset:{account:'redirect'}})},preventDefault(){}})};
 }
 try{
  globalThis.window=new EventTarget();globalThis.sessionStorage=memory();globalThis.localStorage=memory();
  globalThis.location={href:'https://tacocat070116.github.io/manor-identity-v/#v=recovery',assign:url=>navigations.push(url)};
  globalThis.google={accounts:{id:{initialize(){},renderButton(){}}}};
  const response=()=>new Response(JSON.stringify({id:'challenge',nonce:'b'.repeat(64),proof:'c'.repeat(64)}),{headers:{'Content-Type':'application/json'}});
  globalThis.fetch=async()=>{if(block){redirectRequests++;await new Promise(resolve=>{pendingReply=resolve;});}return response();};
  const first=panel();await new Promise(setImmediate);block=true;
  first.click();first.click();assert.equal(redirectRequests,1);first.dispose();pendingReply();await new Promise(setImmediate);
  assert.equal(navigations.length,0);assert.equal(globalThis.sessionStorage.getItem('manor-google-redirect'),null);
  const second=panel();await new Promise(setImmediate);second.click();second.click();assert.equal(redirectRequests,2);
  pendingReply();await new Promise(setImmediate);assert.equal(navigations.length,1);
  assert.equal(new URL(navigations[0]).searchParams.get('redirect_uri'),'https://tacocat070116.github.io/manor-identity-v/google-return.html');
 }finally{handles.forEach(dispose=>dispose());Object.assign(globalThis,previous);}
});

test('restarting login and redirect navigation respect the unsent-content guard',async()=>{
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
  assert.equal(click('redirect'),true,'canceling the guard must prevent redirect navigation');
  allow=true;click('retry');assert.equal(reloads,1,'restart must reset the whole Google client, not only redraw the iframe');
  assert.equal(click('redirect'),false,'unregistered redirect flow stays inactive even when the input guard permits navigation');
 }finally{dispose?.();Object.assign(globalThis,previous);}
});
