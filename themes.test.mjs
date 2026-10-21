import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as themes from './dist/themes.js';

const {colorThemes,readTheme,resolveTheme,applyTheme,themeOptions}=themes;
const storageWith=value=>({getItem:()=>value,setItem(key,next){this.key=key;value=next;}});
test('eight distinct choices preserve legacy preferences and recover from unavailable storage',()=>{
 assert.equal(colorThemes.length,8);
 assert.equal(new Set(colorThemes.map(t=>t.id)).size,8);
 for(const theme of colorThemes){
  const storage=storageWith(theme.id);
  assert.equal(readTheme(storage,true).id,theme.id);
  const document={documentElement:{dataset:{}},querySelector:()=>null};
  applyTheme(theme.id,{document,storage});
  assert.equal(storage.key,'manor-theme');
  assert.equal(readTheme(storage).id,theme.id);
 }
 for(const value of [null,'obsolete','<script>']){
  assert.equal(readTheme(storageWith(value),false).id,'light');
  assert.equal(readTheme(storageWith(value),true).id,'dark');
 }
 assert.equal(readTheme({getItem(){throw Error('blocked');}},true).id,'dark');
 const document={documentElement:{dataset:{}},querySelector:()=>null};
 assert.equal(applyTheme('rose',{document,storage:{setItem(){throw Error('blocked');}}}).saved,false);
 assert.equal(document.documentElement.dataset.theme,'rose','storage failure does not prevent the choice');
});

test('first paint and application startup choose the same theme without overwriting saved preferences',()=>{
 const bootstrap=fs.readFileSync('dist/index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
 for(const prefersDark of [false,true])for(const saved of [...colorThemes.map(t=>t.id),null,'invalid']){
  const storage=storageWith(saved),document={documentElement:{dataset:{}}};
  vm.runInNewContext(bootstrap,{document,localStorage:storage,matchMedia:()=>({matches:prefersDark})});
  assert.equal(document.documentElement.dataset.theme,readTheme(storage,prefersDark).id);
  const meta={};document.querySelector=()=>meta;
  applyTheme(readTheme(storage,prefersDark).id,{document,storage,remember:false});
  assert.equal(storage.getItem(),saved,'startup never overwrites the preference');
  assert.equal(meta.content,resolveTheme(document.documentElement.dataset.theme).bg);
 }
 const document={documentElement:{dataset:{}}};
 vm.runInNewContext(bootstrap,{document,localStorage:{getItem(){throw Error();}},matchMedia:()=>({matches:true})});
 assert.equal(document.documentElement.dataset.theme,'dark');
});

const luminance=hex=>hex.slice(1).match(/../g).map(c=>parseInt(c,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
test('theme text, muted captions and action labels maintain readable contrast',()=>{
 for(const t of colorThemes){
  for(const surface of [t.bg,t.surface])for(const text of [t.ink,t.muted,t.accent])assert.ok(contrast(text,surface)>=4.5,`${t.id} ${text} on ${surface}: ${contrast(text,surface)}`);
  assert.ok(contrast(t.accent,t.onAccent)>=4.5,t.id+' action label');
 }
 const css=fs.readFileSync('dist/themes.css','utf8');
 for(const theme of colorThemes){
  const block=css.split(`html[data-theme="${theme.id}"]{`)[1]?.split('}')[0];
  assert.ok(block,theme.id+' stylesheet palette');
  for(const key of ['bg','ink','muted','accent'])assert.ok(block.includes(`--${key}:${theme[key]};`),theme.id+' preview matches live palette');
 }
});

test('palettes cannot change component geometry or add another reflective edge',()=>{
 const css=fs.readFileSync('dist/themes.css','utf8');
 const palettes=colorThemes.map(theme=>css.split(`html[data-theme="${theme.id}"]{`)[1].split('}')[0]);
 const keys=block=>[...block.matchAll(/(--[\w-]+):/g)].map(m=>m[1]).sort();
 for(const block of palettes){
  assert.deepEqual(keys(block),keys(palettes[0]),'every palette supplies the same color tokens');
  assert.doesNotMatch(block,/(?:\d|\))\s*(?:px|rem|em|vh|vw)\b|(?:font|padding|margin|width|height|transform)\s*:/,'layout is theme-independent');
 }
 for(const shadow of ['shadow','nav-shadow','selected-shadow']){
  const definitions=[...css.matchAll(new RegExp(`--${shadow}:([^;]+);`,'g'))];
  assert.equal(definitions.length,1,'one shared shadow geometry');
  assert.doesNotMatch(definitions[0][1],/inset/,'no inset highlight on top of a border');
 }
});

test('picker exposes eight native radio choices with exactly one persistent selection',()=>{
 for(const selected of colorThemes){
  const html=themeOptions(selected.id,'check');
  assert.equal((html.match(/type="radio"/g)||[]).length,8);
  assert.equal((html.match(/ checked/g)||[]).length,1);
  assert.ok(html.includes(`value="${selected.id}" checked`));
  for(const theme of colorThemes)assert.ok(html.includes('>'+theme.name+'</span>'));
 }
});

test('live theme changes keep the route, search and main content while reporting storage failure accurately',()=>{
 const nodes=new Map(),handlers={},updates=[];
 const document={documentElement:{dataset:{}},addEventListener(k,h){handlers[k]=h;},querySelector(selector){
  if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',textContent:'',dataset:{},addEventListener(){},showModal(){this.open=true;},querySelector(){return {focus(){}};}});
  return nodes.get(selector);
 }};
 const storage=storageWith(null);
 const context={...themes,document,localStorage:storage,matchMedia:()=>({matches:false}),window:{addEventListener(){}},location:{hash:'#v=character&c=c16'},URLSearchParams,setTimeout,clearTimeout,__updates:updates};
 const source=fs.readFileSync('dist/app.js','utf8').replace(/^import[^\n]*\n/gm,'').replace(/\nboot\(\);\s*$/,'');
 vm.runInNewContext(source+`\ndb={};navigationController={update:next=>__updates.push(next)};state.search='마리';globalThis.testApp={state,openThemePicker};`,context);
 context.testApp.openThemePicker();
 const dialog=nodes.get('#theme-picker');assert.equal(dialog.open,true);
 const originalMarkup=dialog.innerHTML;
 for(const theme of colorThemes){
  handlers.change({target:{name:'color-theme',value:theme.id}});
  assert.equal(context.testApp.state.theme,theme.id);
  assert.equal(document.documentElement.dataset.theme,theme.id);
  assert.equal(nodes.get('meta[name="theme-color"]').content,theme.bg);
  assert.equal(context.location.hash,'#v=character&c=c16');
  assert.equal(context.testApp.state.search,'마리');
  assert.equal(dialog.innerHTML,originalMarkup,'focused radio is not recreated');
  assert.ok(!nodes.has('#main'),'theme change does not rerender or scroll the page');
  assert.equal(updates.at(-1).themeLabel,theme.name);
 }
 storage.setItem=()=>{throw Error('quota');};
 handlers.change({target:{name:'color-theme',value:'rose'}});
 assert.match(nodes.get('#theme-status').textContent,/이번 방문에만/);
 handlers.change({target:{name:'color-theme',value:'unknown'}});
 assert.equal(document.documentElement.dataset.theme,'rose');
});
