import * as synergyModel from './dist/synergy-model.js';
import * as themeUI from './dist/themes.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import * as releaseUI from './dist/releases.js';
import * as model from './dist/model.js';
import {validateReleaseLog,validateReleaseUpdate,refreshPackage} from './scripts/release-tools.mjs';
const read=path=>JSON.parse(fs.readFileSync('dist/'+path,'utf8'));
const log=read('releases.json');

test('unannounced deployments preserve the complete public history',()=>{
 validateReleaseUpdate(log,structuredClone(log));
 const edited=structuredClone(log);edited.releases[0].changes[0].text+=' changed';
 assert.throws(()=>validateReleaseUpdate(edited,log),/공지 대기/);
 const removed=structuredClone(log);removed.releases.pop();
 assert.throws(()=>validateReleaseUpdate(removed,log),/공지 대기/);
});

test('release validation rejects missing BETA, stale versions and lost history',()=>{
 validateReleaseLog(log,JSON.parse(fs.readFileSync('package.json')).version);
 assert.throws(()=>validateReleaseLog({...log,stage:'stable'},log.version),/BETA/);
 assert.throws(()=>validateReleaseLog(log,'0.0.0'),/버전/);
 const older={...log,version:'0.0.0'};assert.throws(()=>validateReleaseUpdate(older,log),/버전/);
 const next=structuredClone(log),parts=next.version.split('.').map(Number);parts[2]++;
 next.version=parts.join('.');next.releases.unshift({id:'test-update',version:next.version,date:log.releases[0].date,title:'새 업데이트',changes:[{type:'수정',text:'오류 수정'}],commits:[]});
 validateReleaseLog(next,next.version);validateReleaseUpdate(next,log);
 next.releases.pop();assert.throws(()=>validateReleaseUpdate(next,log),/삭제/);
});

test('history lists every entry, searches with type filters and escapes text',()=>{
 const all=releaseUI.releaseNotesList(log);
 assert.equal((all.match(/<article class="panel release-card/g)||[]).length,log.releases.length);
 assert.ok(all.includes('BETA 오픈'));assert.ok(all.includes('BETA v'+log.version));
 assert.ok(!all.includes('<h3'));
 assert.equal((all.match(/class="release-kind"/g)||[]).length,log.releases.reduce((sum,release)=>sum+release.changes.length,0),'every patch item keeps its change-type badge');
 const removals=releaseUI.selectReleases(log,{type:'삭제'});assert.ok(removals.length>0);
 assert.ok(removals.every(release=>release.changes.some(change=>change.type==='삭제')));
 assert.ok(releaseUI.releaseNotesList(log,{type:'삭제'}).includes('data-kind="삭제"'));
 assert.ok(releaseUI.releaseNotesPage(log,{query:'',type:'삭제'},{icon:()=>''}).includes('<option value="삭제" selected>삭제</option>'));
 assert.equal(releaseUI.selectReleases(log,{query:'BETA v'+log.version}).length,1);
 const matches=releaseUI.selectReleases(log,{query:'상성',type:'데이터'});assert.ok(matches.length>0);
 assert.ok(matches.every(release=>release.changes.some(change=>change.type==='데이터')));
 assert.ok(releaseUI.releaseNotesList(log,{query:'존재하지않는검색어12345'}).includes('일치하는 업데이트가 없습니다'));
 const dirty=structuredClone(log);dirty.releases[0].title='<script>hidden-title-probe</script>';dirty.releases[0].changes[0].text='<img onerror="oops">';
 const html=releaseUI.releaseNotesList(dirty);assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img onerror'));assert.ok(!html.includes('hidden-title-probe'));assert.ok(html.includes('&lt;img onerror='));
 assert.equal(releaseUI.selectReleases(dirty,{query:'hidden-title-probe'}).length,0,'hidden titles must not produce results absent from displayed content');
});

test('patchnotes deep link, shared version, filters and return navigation work in the app',async()=>{
 const nodes=new Map(),handlers={},fetches=[],views=[],creatorMounts=[],recoveryMounts=[];let creatorDisposals=0,recoveryDisposals=0;
 const node=()=>({innerHTML:'',textContent:'',dataset:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){}});
 const context={...themeUI,...model,...releaseUI,console,URL,URLSearchParams,Intl,Set,Map,Date,Math,Object,Number,String,JSON,Error,Array,Promise,setTimeout,clearTimeout,
  document:{documentElement:{dataset:{}},querySelector(selector){if(!nodes.has(selector))nodes.set(selector,node());return nodes.get(selector);},addEventListener(type,handler){handlers[type]=handler;}},
  window:{addEventListener(){},scrollTo(){}},location:{hash:'#v=patchnotes'},localStorage:{getItem(){return null;}},matchMedia:()=>({matches:false}),
  mountCreators:(root,options)=>{creatorMounts.push({root,options});return ()=>creatorDisposals++;},
  mountRecoveryPage:root=>{recoveryMounts.push(root);return ()=>recoveryDisposals++;},
  mountNavigation:()=>({update:({view})=>views.push(view)}),mountHeroCarousel:()=>()=>{},createCarouselSession:()=>({}),carouselItems:()=>[],
  fetch:async url=>{fetches.push(url);return {ok:true,json:async()=>read(url.split('?')[0])};}
 };
 const source=fs.readFileSync('dist/app.js','utf8').replace(/^import[^\n]*\n/gm,'').replace(/\nboot\(\);\s*$/,'');
 Object.assign(context,synergyModel);vm.runInNewContext(source+'\nglobalThis.app={boot,readRoute,render};',context);
 await context.app.boot();
 assert.equal(context.document.title,'MANOR 업데이트 · MANOR');
 for(const selector of ['#header','#footer','#page-body'])assert.ok(nodes.get(selector).innerHTML.includes('BETA v'+log.version),selector);
 const header=nodes.get('#header').innerHTML;
 assert.equal((header.match(/class="nav-item /g)||[]).length,8,'desktop and mobile share eight links; ban records live under statistics');
 assert.ok(header.includes('href="#v=recovery"'));
 assert.ok(header.includes('aria-controls="category-panel"'));
 for(const selector of ['#header','#footer','#page-body'])assert.ok(!nodes.get(selector).innerHTML.includes('#v=gamepatches'),'game-patch links are removed from '+selector);
 assert.ok(header.includes('aria-expanded="false"'));
 assert.ok(header.includes('aria-hidden="true" inert'));
 assert.equal((header.match(/tabindex="-1"/g)||[]).length,8);
 assert.ok(!/desktop-nav|mobile-nav/.test(header));
 assert.equal((nodes.get('#page-body').innerHTML.match(/<article class="panel release-card/g)||[]).length,log.releases.length);
 assert.equal(fetches.length,4);assert.ok(!fetches.some(url=>url.startsWith('patches/')));assert.ok(!fetches.some(url=>/matches|ranked/.test(url)));
 handlers.input({target:{id:'release-search',value:'닉네임'}});
 assert.ok(nodes.get('#release-results').innerHTML.includes('닉네임'));
 handlers.change({target:{id:'release-type',value:'데이터',dataset:{}}});
 assert.ok(nodes.get('#release-results').innerHTML.includes('일치하는 업데이트가 없습니다'));
 context.location.hash='#v=explore';context.app.readRoute();await context.app.render();
 context.location.hash='#v=patchnotes';context.app.readRoute();await context.app.render();
 assert.deepEqual(views,['patchnotes','explore','patchnotes']);
 assert.ok(nodes.get('#page-body').innerHTML.includes('일치하는 업데이트가 없습니다'));
 context.location.hash='#v=creators&channel=11111111-1111-4111-8111-111111111111';context.app.readRoute();await context.app.render();
 assert.equal(context.document.title,'유튜브 채널 BETA · MANOR');assert.equal(creatorMounts.length,1);assert.equal(creatorMounts[0].options.postId,'11111111-1111-4111-8111-111111111111');
 creatorMounts[0].options.navigate();assert.equal(context.location.hash,'#v=creators');
 context.location.hash='#v=patchnotes';context.app.readRoute();await context.app.render();assert.equal(creatorDisposals,1);
 context.location.hash='#v=recovery';context.app.readRoute();await context.app.render();
 assert.equal(context.document.title,'복구 코드 · MANOR');assert.equal(recoveryMounts.length,1);
 context.location.hash='#v=patchnotes';context.app.readRoute();await context.app.render();assert.equal(recoveryDisposals,1);
});


test('normal release commands cannot create an announcement implicitly',()=>{
 const before=fs.readFileSync('dist/releases.json','utf8');
 const result=spawnSync(process.execPath,['scripts/release.mjs','patch','자동 공지 금지','수정: 테스트'],{encoding:'utf8'});
 assert.notEqual(result.status,0);
 assert.match(result.stderr,/운영자가 공개를 요청한 때만/);
 assert.equal(fs.readFileSync('dist/releases.json','utf8'),before);
});

test('cache refresh fingerprints transitive module imports and propagates changes',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'manor-cache-'));
 try{
  execFileSync('git',['init','-q',root]);fs.mkdirSync(path.join(root,'dist'));
  const write=(file,body)=>fs.writeFileSync(path.join(root,'dist',file),body);
  write('index.html','<script type="module" src="app.js?v=old"></script>');
  write('app.js',"import {value} from './model.js'; console.log(value);");
  write('model.js','export const value=1;');
  refreshPackage(root);
  const first=fs.readFileSync(path.join(root,'dist','index.html'),'utf8');
  assert.match(fs.readFileSync(path.join(root,'dist','app.js'),'utf8'),/model\.js\?v=[a-f0-9]{12}/);
  write('model.js','export const value=2;');refreshPackage(root);
  assert.notEqual(fs.readFileSync(path.join(root,'dist','index.html'),'utf8'),first);
  const stable=fs.readFileSync(path.join(root,'SHA256SUMS.txt'),'utf8');refreshPackage(root);
  assert.equal(fs.readFileSync(path.join(root,'SHA256SUMS.txt'),'utf8'),stable);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
