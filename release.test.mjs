import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as releaseUI from './dist/releases.js';
import * as model from './dist/model.js';
import {validateReleaseLog,validateReleaseUpdate} from './scripts/release-tools.mjs';
const read=path=>JSON.parse(fs.readFileSync('dist/'+path,'utf8'));
const log=read('releases.json');

test('release validation rejects missing BETA, stale versions and lost history',()=>{
 validateReleaseLog(log,JSON.parse(fs.readFileSync('package.json')).version);
 assert.throws(()=>validateReleaseLog({...log,stage:'stable'},log.version),/BETA/);
 assert.throws(()=>validateReleaseLog(log,'0.0.0'),/버전/);
 assert.throws(()=>validateReleaseUpdate(log,log),/버전/);
 const next=structuredClone(log),parts=next.version.split('.').map(Number);parts[2]++;
 next.version=parts.join('.');next.releases.unshift({id:'test-update',version:next.version,date:log.releases[0].date,title:'새 업데이트',changes:[{type:'수정',text:'오류 수정'}],commits:[]});
 validateReleaseLog(next,next.version);validateReleaseUpdate(next,log);
 next.releases.pop();assert.throws(()=>validateReleaseUpdate(next,log),/삭제/);
});

test('history lists every entry, searches with type filters and escapes text',()=>{
 const all=releaseUI.releaseNotesList(log);
 assert.equal((all.match(/<article class="panel release-card/g)||[]).length,log.releases.length);
 assert.ok(all.includes('MANOR 베타 오픈'));assert.ok(all.includes('BETA v'+log.version));
 assert.equal(releaseUI.selectReleases(log,{query:'BETA v'+log.version}).length,1);
 const matches=releaseUI.selectReleases(log,{query:'상성',type:'데이터'});assert.ok(matches.length>0);
 assert.ok(matches.every(release=>release.changes.some(change=>change.type==='데이터')));
 assert.ok(releaseUI.releaseNotesList(log,{query:'존재하지않는검색어12345'}).includes('일치하는 업데이트가 없습니다'));
 const dirty=structuredClone(log);dirty.releases[0].title='<script>oops</script>';dirty.releases[0].changes[0].text='<img onerror="oops">';
 const html=releaseUI.releaseNotesList(dirty);assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img onerror'));assert.ok(html.includes('&lt;script&gt;'));
});

test('patchnotes deep link, shared version, filters and return navigation work in the app',async()=>{
 const nodes=new Map(),handlers={},fetches=[],views=[];
 const node=()=>({innerHTML:'',textContent:'',dataset:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){}});
 const context={...model,...releaseUI,console,URL,URLSearchParams,Intl,Set,Map,Date,Math,Object,Number,String,JSON,Error,Array,Promise,setTimeout,clearTimeout,
  document:{documentElement:{dataset:{}},querySelector(selector){if(!nodes.has(selector))nodes.set(selector,node());return nodes.get(selector);},addEventListener(type,handler){handlers[type]=handler;}},
  window:{addEventListener(){},scrollTo(){}},location:{hash:'#v=patchnotes'},localStorage:{getItem(){return null;}},matchMedia:()=>({matches:false}),
  mountNavigation:()=>({update:({view})=>views.push(view)}),mountHeroCarousel:()=>()=>{},createCarouselSession:()=>({}),carouselItems:()=>[],
  fetch:async url=>{fetches.push(url);return {ok:true,json:async()=>read(url.split('?')[0])};}
 };
 const source=fs.readFileSync('dist/app.js','utf8').replace(/^import[^\n]*\n/gm,'').replace(/\nboot\(\);\s*$/,'');
 vm.runInNewContext(source+'\nglobalThis.app={boot,readRoute,render};',context);
 await context.app.boot();
 assert.equal(context.document.title,'MANOR 업데이트 · MANOR');
 for(const selector of ['#header','#footer','#page-body'])assert.ok(nodes.get(selector).innerHTML.includes('BETA v'+log.version),selector);
 const header=nodes.get('#header').innerHTML;
 assert.equal((header.match(/class="nav-item /g)||[]).length,8,'desktop and mobile share eight links');
 assert.ok(header.includes('aria-controls="category-panel"'));
 assert.ok(header.includes('aria-expanded="false"'));
 assert.ok(header.includes('aria-hidden="true" inert'));
 assert.equal((header.match(/tabindex="-1"/g)||[]).length,8);
 assert.ok(!/desktop-nav|mobile-nav/.test(header));
 assert.equal((nodes.get('#page-body').innerHTML.match(/<article class="panel release-card/g)||[]).length,log.releases.length);
 assert.equal(fetches.length,5);assert.ok(!fetches.some(url=>/matches|ranked/.test(url)));
 handlers.input({target:{id:'release-search',value:'임의 닉네임'}});
 assert.ok(nodes.get('#release-results').innerHTML.includes('함께 만드는 피드백 게시판'));
 handlers.change({target:{id:'release-type',value:'데이터',dataset:{}}});
 assert.ok(nodes.get('#release-results').innerHTML.includes('일치하는 업데이트가 없습니다'));
 context.location.hash='#v=explore';context.app.readRoute();await context.app.render();
 context.location.hash='#v=patchnotes';context.app.readRoute();await context.app.render();
 assert.deepEqual(views,['patchnotes','explore','patchnotes']);
 assert.ok(nodes.get('#page-body').innerHTML.includes('일치하는 업데이트가 없습니다'));
});
