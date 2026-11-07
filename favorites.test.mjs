import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as themes from './dist/themes.js';

const key='manor-favorites';
const source=fs.readFileSync('dist/app.js','utf8').replace(/^import[^\n]*\n/gm,'').replace(/\nboot\(\);\s*$/,'');
function storage(initial=[]){
 const values=new Map([[key,JSON.stringify(initial)]]);
 return {values,failRead:false,failWrite:false,
  getItem(k){if(this.failRead)throw Error('storage blocked');return values.get(k)??null;},
  setItem(k,v){if(this.failWrite)throw Error('quota');values.set(k,v);}
 };
}
function page(saved,{locks}={}){
 const nodes=new Map(),buttons=new Map(),events=new Map(),handlers={};
 const makeNode=()=>{const classes=new Set();return {innerHTML:'',textContent:'',dataset:{},disabled:false,attrs:{},classes,
  classList:{add:v=>classes.add(v),remove:v=>classes.delete(v),toggle:(v,on)=>on?classes.add(v):classes.delete(v)},
  setAttribute(k,v){this.attrs[k]=v;},addEventListener(){},querySelector(){return this.label;}};};
 function button(id){if(!buttons.has(id)){const b=makeNode(),selected=context.app.state.favorites.has(id);b.dataset={action:'favorite',id};b.label={textContent:selected?'저장됨':'즐겨찾기'};b.attrs['aria-pressed']=String(selected);b.classList.toggle('favorite-on',selected);buttons.set(id,b);}return buttons.get(id);}
 const document={documentElement:{dataset:{}},visibilityState:'visible',
  querySelector(s){if(!nodes.has(s))nodes.set(s,makeNode());return nodes.get(s);},
  querySelectorAll(s){return s==='[data-action="favorite"]'?[...buttons.values()]:[];},
  addEventListener(type,fn){if(type==='visibilitychange')events.set(type,fn);else handlers[type]=fn;}
 };
 const context={...themes,document,localStorage:saved,navigator:{locks},matchMedia:()=>({matches:false}),
  window:{addEventListener:(type,fn)=>events.set(type,fn)},location:{hash:'#v=character&c=c01'},
  URLSearchParams,setTimeout:()=>0,clearTimeout(){},__renders:0};
 vm.runInNewContext(source+`
  db={characters:[{id:'c01'},{id:'c02'},{id:'c03'}]};byId=Object.fromEntries(db.characters.map(c=>[c.id,c]));
  state.view='character';state.character='c01';render=()=>{globalThis.__renders++;};
  globalThis.app={state};
 `,context);
 return {context,button,nodes,ids:()=>Array.from(context.app.state.favorites).sort(),
  click:async id=>{await handlers.click({target:{closest:()=>button(id)}});},
  fire:(type,event={})=>events.get(type)?.(event)};
}

test('saved favorites survive reload and a later removal preserves the other characters',async()=>{
 const saved=storage(['c01']);const first=page(saved);await first.click('c02');
 const reopened=page(saved);assert.deepEqual(reopened.ids(),['c01','c02']);
 await reopened.click('c01');assert.deepEqual(page(saved).ids(),['c02']);
});

test('a stale tab preserves additions and removals saved in another tab',async()=>{
 const saved=storage(['c01']),a=page(saved),b=page(saved);
 await a.click('c02');await b.click('c03');
 assert.deepEqual(page(saved).ids(),['c01','c02','c03']);
 await a.click('c01');await b.click('c03');
 assert.deepEqual(page(saved).ids(),['c02'],'old tab must not restore c01 or erase c02');
});

test('storage events and restored pages refresh stars without rebuilding the current page',async()=>{
 const saved=storage(),a=page(saved);const star=a.button('c01');
 saved.values.set(key,'["c01"]');a.fire('storage',{key,newValue:'["c01"]'});
 assert.deepEqual(a.ids(),['c01']);assert.equal(star.attrs['aria-pressed'],'true');assert.equal(star.label.textContent,'저장됨');
 assert.equal(star.classes.has('favorite-on'),true);
 saved.values.set(key,'["c02"]');a.fire('pageshow',{persisted:true});assert.deepEqual(a.ids(),['c02']);
 saved.values.set(key,'["c03"]');a.fire('focus');assert.deepEqual(a.ids(),['c03']);
 saved.values.set(key,'["c01"]');a.fire('visibilitychange');assert.deepEqual(a.ids(),['c01']);
 assert.equal(a.context.__renders,0,'an unsent form or open guide must remain mounted');
});

test('late storage events use the current stored list and unrelated account changes leave favorites alone',()=>{
 const saved=storage(['c01']),a=page(saved);
 saved.values.set(key,'["c03"]');a.fire('storage',{key:'manor-google-session'});assert.deepEqual(a.ids(),['c01']);
 a.fire('storage',{key,newValue:'["c02"]'});assert.deepEqual(a.ids(),['c03']);
 saved.values.delete(key);a.fire('storage',{key:null});assert.deepEqual(a.ids(),[]);
});

test('failed writes never display a new favorite as saved or drop an existing one',async()=>{
 const saved=storage(['c01']),a=page(saved);saved.failWrite=true;
 await a.click('c02');assert.deepEqual(a.ids(),['c01']);assert.deepEqual(JSON.parse(saved.values.get(key)),['c01']);
 assert.equal(a.button('c02').label.textContent,'즐겨찾기');assert.equal(a.button('c02').attrs['aria-pressed'],'false');
 assert.match(a.nodes.get('#toast').textContent,/저장하지 못|저장할 수 없/);
 await a.click('c01');assert.deepEqual(a.ids(),['c01']);
 assert.equal(a.button('c01').label.textContent,'저장됨');assert.equal(a.button('c01').classes.has('favorite-on'),true);
 assert.equal(a.button('c01').disabled,false);assert.equal(a.button('c02').disabled,false);
});

test('unreadable or malformed storage is not overwritten and can recover after access returns',async()=>{
 const saved=storage(['c01']),a=page(saved);saved.failRead=true;
 await a.click('c02');assert.deepEqual(a.ids(),['c01']);assert.equal(saved.values.get(key),'["c01"]');
 saved.failRead=false;saved.values.set(key,'not-json');await a.click('c02');assert.equal(saved.values.get(key),'not-json');
 saved.values.set(key,'["c03"]');a.fire('focus');assert.deepEqual(a.ids(),['c03']);
 await a.click('c02');assert.deepEqual(page(saved).ids(),['c02','c03']);
});

test('concurrent tabs serialize updates when browser locks are available',async()=>{
 let queued=Promise.resolve();const locks={request(_name,callback){const next=queued.then(callback);queued=next.catch(()=>{});return next;}};
 const saved=storage(['c01']),a=page(saved,{locks}),b=page(saved,{locks});
 await Promise.all([a.click('c02'),b.click('c03')]);assert.deepEqual(page(saved).ids(),['c01','c02','c03']);
 assert.equal(a.button('c02').disabled,false);assert.equal(b.button('c03').disabled,false);
});

test('a stale add or remove keeps the intended choice when another tab already made it',async()=>{
 const saved=storage(),a=page(saved),b=page(saved);
 await a.click('c01');await b.click('c01');assert.deepEqual(page(saved).ids(),['c01']);
 await a.click('c01');await b.click('c01');assert.deepEqual(page(saved).ids(),[]);
});

test('a rejected browser lock releases the control without reporting an unsaved change as saved',async()=>{
 const saved=storage(['c01']),a=page(saved,{locks:{request(){return Promise.reject(Error('unavailable'));}}});
 await a.click('c02');assert.deepEqual(page(saved).ids(),['c01']);assert.deepEqual(a.ids(),['c01']);
 assert.equal(a.button('c02').disabled,false);assert.equal(a.button('c02').label.textContent,'즐겨찾기');
 assert.match(a.nodes.get('#toast').textContent,/저장하지 못/);
});

test('favorites do not export, clear or change login, recovery and theme storage',async()=>{
 const saved=storage(['c01']);saved.values.set('manor-google-session','account-session');saved.values.set('manor-feedback-visitor','legacy-record');saved.values.set('manor-theme','rose');
 const a=page(saved);await a.click('c02');
 assert.equal(saved.values.get('manor-google-session'),'account-session');assert.equal(saved.values.get('manor-feedback-visitor'),'legacy-record');assert.equal(saved.values.get('manor-theme'),'rose');
 assert.equal(a.context.__renders,0);
});
