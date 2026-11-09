import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreferenceSync} from './dist/preferences.js';
import {ACCOUNT_KEY} from './dist/account-api.js';

const a='a'.repeat(64),b='b'.repeat(64),ta='1'.repeat(64),tb='2'.repeat(64);
function storage(){const data=new Map();return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};}
function server(){
 const rows=new Map(),calls=[];
 const row=id=>rows.get(id)||{accountId:id,theme:null,favorites:[],revision:0};
 const request=async(_origin,path,{token,body})=>{
  assert.equal(path,'preferences');const id=token===ta?a:token===tb?b:null;
  if(!id)throw Object.assign(Error('expired'),{status:401});
  calls.push({id,body});let value=structuredClone(row(id));
  if(body){
   if(value.revision!==body.revision)throw Object.assign(Error('conflict'),{status:409});
   const favorites=new Set(value.favorites);for(const item of body.favorites)if(item.selected)favorites.add(item.id);else favorites.delete(item.id);
   value={...value,theme:body.theme??value.theme,favorites:[...favorites].sort(),revision:value.revision+1};rows.set(id,value);
  }
  return structuredClone(value);
 };
 return {row,rows,calls,request};
}
function browser(s,{saved=storage(),request=s.request}={}){
 let network=true,last,status;
 const controller=createPreferenceSync({characterIds:['c01','c02','c03'],themeIds:['light','dark','christmas','rose'],storage:()=>saved,locks:()=>null,
  request,online:()=>network,apply:value=>{last=value;},onStatus:value=>{status=value;},delay:60000});
 const login=(id=a,token=ta)=>saved.setItem(ACCOUNT_KEY,JSON.stringify({accountId:id,token,profileId:'profile',expiresAt:Date.now()+600000}));
 const favorite=(id,selected)=>{
  controller.prepare();const ids=new Set(JSON.parse(saved.getItem('manor-favorites')||'[]'));
  if(selected)ids.add(id);else ids.delete(id);saved.setItem('manor-favorites',JSON.stringify([...ids]));controller.favoriteChanged(id,selected);
 };
 const theme=id=>{controller.prepare();saved.setItem('manor-theme',id);controller.themeChanged(id);};
 return {controller,saved,login,favorite,theme,sync:()=>controller.sync(),logout:()=>saved.removeItem(ACCOUNT_KEY),offline:()=>network=false,online:()=>network=true,get last(){return last;},get status(){return status;}};
}
const finish=(t,...browsers)=>t.after(()=>browsers.forEach(b=>b.controller.dispose()));

test('first login unions browser favorites once while an existing account theme wins',async t=>{
 const s=server(),x=browser(s);finish(t,x);
 s.rows.set(a,{accountId:a,theme:'dark',favorites:['c02'],revision:4});
 x.favorite('c01',true);x.theme('christmas');x.login();await x.sync();
 assert.deepEqual(s.row(a).favorites,['c01','c02']);assert.equal(x.last.theme,'dark');
 assert.equal(x.saved.getItem('manor-theme'),'dark');assert.match(x.status,/Google 계정에 저장됨/);
});
test('a new account adopts the browser theme and another device receives it and favorites',async t=>{
 const s=server(),x=browser(s),y=browser(s);finish(t,x,y);
 x.favorite('c01',true);x.theme('christmas');x.login();await x.sync();y.login();await y.sync();
 assert.equal(y.last.theme,'christmas');assert.deepEqual(y.last.favorites,['c01']);
 y.favorite('c01',false);await y.sync();await x.sync();
 assert.deepEqual(x.last.favorites,[],'an already bound browser never reimports a removed favorite');
});
test('offline edits survive a reload and merge with changes from another device',async t=>{
 const s=server(),x=browser(s),y=browser(s);finish(t,x,y);x.login();y.login();await x.sync();await y.sync();
 x.offline();x.favorite('c01',true);x.theme('rose');await x.sync();assert.match(x.status,/연결되면/);
 y.favorite('c02',true);await y.sync();const reload=browser(s,{saved:x.saved});finish(t,reload);await reload.sync();
 assert.deepEqual(s.row(a).favorites,['c01','c02']);assert.equal(s.row(a).theme,'rose');
});
test('revision conflicts retain unrelated additions and removals from both devices',async t=>{
 const s=server(),x=browser(s),y=browser(s);finish(t,x,y);x.login();y.login();x.favorite('c01',true);await x.sync();await y.sync();
 x.favorite('c01',false);x.favorite('c02',true);y.favorite('c03',true);
 await Promise.all([x.sync(),y.sync()]);await x.sync();await y.sync();
 assert.deepEqual(s.row(a).favorites,['c02','c03']);assert.deepEqual(x.last,y.last);
});
test('logout retains browser choices and account switching keeps caches and pending edits separate',async t=>{
 const s=server(),x=browser(s);finish(t,x);x.login();x.favorite('c01',true);x.theme('christmas');await x.sync();
 x.logout();x.favorite('c02',true);await x.sync();assert.deepEqual(x.saved.getItem('manor-favorites'),'["c01","c02"]');
 x.login(b,tb);await x.sync();assert.deepEqual(s.row(b).favorites,[]);x.favorite('c03',true);await x.sync();
 x.login();await x.sync();assert.deepEqual(x.last.favorites,['c01','c02']);assert.deepEqual(s.row(b).favorites,['c03']);
});
test('late account responses never replace settings after logout or account switching',async t=>{
 const s=server();let release,paused=true;
 const x=browser(s,{request:async(...args)=>{const value=await s.request(...args);if(paused){paused=false;await new Promise(resolve=>release=resolve);}return value;}});finish(t,x);
 x.login();const pending=x.sync();while(!release)await new Promise(resolve=>setImmediate(resolve));
 x.logout();x.theme('rose');release();await pending;assert.equal(x.saved.getItem('manor-theme'),'rose');assert.equal(s.calls.filter(c=>c.body).length,0);
 x.login(b,tb);await x.sync();assert.deepEqual(x.last.favorites,[]);
});
test('edits made during a save are not removed by an older acknowledgement',async t=>{
 const s=server();let release,paused=false;
 const x=browser(s,{request:async(...args)=>{const value=await s.request(...args);if(paused&&args[2].body){paused=false;await new Promise(resolve=>release=resolve);}return value;}});finish(t,x);
 x.login();await x.sync();x.favorite('c01',true);paused=true;const pending=x.sync();while(!release)await new Promise(resolve=>setImmediate(resolve));
 x.favorite('c01',false);x.theme('dark');release();await pending;
 assert.deepEqual(s.row(a).favorites,[]);assert.equal(s.row(a).theme,'dark');
});
test('expired sessions and failed requests retain local changes for the next valid login',async t=>{
 const s=server();let fail=false;
 const x=browser(s,{request:(...args)=>{if(fail)throw Object.assign(Error('expired'),{status:401});return s.request(...args);}});finish(t,x);
 x.login();await x.sync();x.favorite('c01',true);fail=true;await x.sync();assert.match(x.status,/다시 로그인/);assert.deepEqual(JSON.parse(x.saved.getItem('manor-favorites')),['c01']);
 fail=false;await x.sync();assert.deepEqual(s.row(a).favorites,['c01']);
});
test('existing sessions without accountId migrate only after the authenticated response',async t=>{
 const s=server(),x=browser(s);finish(t,x);x.favorite('c02',true);
 x.saved.setItem(ACCOUNT_KEY,JSON.stringify({token:ta,profileId:'legacy',expiresAt:Date.now()+60000}));await x.sync();
 assert.deepEqual(s.row(a).favorites,['c02']);assert.equal(x.saved.getItem('manor-preferences:owner'),a);
});
test('storage failures never erase account data or claim that settings were saved',async t=>{
 const s=server(),x=browser(s);finish(t,x);x.login();s.rows.set(a,{accountId:a,theme:'dark',favorites:['c01'],revision:3});
 x.saved.setItem=()=>{throw Error('quota');};await x.sync();
 assert.deepEqual(s.row(a).favorites,['c01']);assert.equal(s.calls.filter(c=>c.body).length,0);assert.doesNotMatch(x.status,/Google 계정에 저장됨/);
});
