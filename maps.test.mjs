import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHistory,newPlan,createItem,moveItem,duplicateStep,changeConditions,planFromGuide,validatePlan,clone} from './dist/maps-model.js';
import {createPlanSession} from './dist/maps-session.js';
import {createMapCloud,mapAccount} from './dist/maps-cloud.js';
import {renderItem} from './dist/maps-renderer.js';
import {clampView} from './dist/maps-input.js';
import {mapShareURL,mapAttachment,researchDraft} from './dist/maps-links.js';
const catalog=JSON.parse(fs.readFileSync('dist/maps/catalog.json','utf8')).maps,map=catalog[0];
test('all beta maps have aligned floor assets, in-bounds landmarks and complete conditional examples',()=>{
 assert.equal(catalog.length,3);let floors=0,bytes=0;
 for(const m of catalog){floors+=m.floors.length;for(const f of m.floors)bytes+=fs.statSync('dist/'+f.image).size;for(const p of m.landmarks){assert.ok(p.x>=0&&p.x<=m.bounds.width);assert.ok(p.y>=0&&p.y<=m.bounds.height);}for(const guide of m.guides){assert.equal(guide.status,'연습 예시 · 실전 검증 전');assert.ok(guide.start&&guide.evidence&&guide.reviewedAt);const p=validatePlan(planFromGuide(m,guide));assert.equal(p.steps.length,guide.steps.length);for(const s of guide.steps)assert.ok(s.reason&&s.switch&&s.alternative);}}
 assert.equal(floors,7);assert.ok(bytes<550000);
});
test('undo/redo, copied steps and changed conditions keep independent IDs and preserve geometry',()=>{
 const history=createHistory(newPlan(map));history.change(p=>p.steps[0].items.push(createItem('path',[20,20],'ground',{points:[[20,20],[90,50]]})));
 history.change(p=>duplicateStep(p,0));assert.notEqual(history.get().steps[0].id,history.get().steps[1].id);assert.notEqual(history.get().steps[0].items[0].id,history.get().steps[1].items[0].id);
 history.change(p=>changeConditions(p,{...p.conditions,server:'cn'}));assert.ok(history.get().steps.every(s=>s.items[0].needsReview));history.undo();assert.ok(history.get().steps.every(s=>!s.items[0].needsReview));history.redo();assert.equal(history.get().conditions.server,'cn');
 const item=clone(history.get().steps[0].items[0]);moveItem(item,-100,1000,map.bounds);assert.deepEqual(item.points,[[0,860],[70,890]]);assert.equal(item.x,0);assert.equal(item.y,860);
 assert.deepEqual(clampView({scale:99,x:-3,y:9999},map.bounds),{scale:5,x:0,y:712});
});
test('wire validation rejects unsupported versions, duplicate IDs, cross-floor and out-of-bounds imports',()=>{
 const p=newPlan(map);for(const change of [p=>p.schema=2,p=>p.mapRevision='future',p=>p.steps.push(clone(p.steps[0])),p=>p.steps[0].items.push(createItem('note',[20,999],'ground')),p=>p.steps[0].items.push(createItem('note',[20,20],'f2')),p=>p.steps[0].items.push(createItem('path',[20,20],'ground',{points:[[1,1]]})),p=>p.conditions.account='attacker']){const bad=clone(p);change(bad);assert.throws(()=>validatePlan(bad));}
 const item=createItem('note',[20,20],'ground',{label:'<img src=x onerror=alert(1)>'});assert.doesNotMatch(renderItem(item),/<img|onerror="/);assert.match(renderItem(item),/&lt;img/);
});
function fakeStorage(){const rows=new Map();return {rows,list:async owner=>[...rows.values()].filter(r=>r.owner===owner),async save(owner,plan,{expected=0,cloudRevision=0}={}){const key=owner+':'+plan.id,current=rows.get(key);if((current?.localRevision||0)!==expected)throw Object.assign(Error('conflict'),{code:'local_conflict'});const r={owner,plan:clone(plan),localRevision:expected+1,cloudRevision};rows.set(key,r);return clone(r);}};}
test('local saves serialize, survive undo and resolve tab conflicts into a new copy',async()=>{
 const storage=fakeStorage(),session=createPlanSession({initial:newPlan(map),owner:'guest',storage,cloud:{}});session.change(p=>p.title='A');const a=session.flush();session.change(p=>p.title='B');await session.flush();await a;assert.equal([...storage.rows.values()][0].plan.title,'B');
 session.undo();await session.flush();assert.equal([...storage.rows.values()][0].plan.title,'A');const old=session.get().id;storage.rows.get('guest:'+old).localRevision++;session.change(p=>p.title='다른 탭 충돌');await assert.rejects(session.flush(),{code:'local_conflict'});await session.copy();await session.flush();assert.notEqual(session.get().id,old);assert.equal(storage.rows.size,2);await session.destroy();
});
test('account conflicts preserve edits and a remote acknowledgement cannot replace edits made while saving',async()=>{
 const storage=fakeStorage(),statuses=[];let resolve;const cloud={save:(plan,revision)=>new Promise(r=>{resolve=()=>r({plan,revision:revision+1});})};const session=createPlanSession({initial:newPlan(map),owner:'a',storage,cloud,onStatus:text=>statuses.push(text)});session.change(p=>p.title='보낼 내용');await session.flush();const saving=session.saveCloud();await new Promise(r=>setImmediate(r));session.change(p=>p.title='저장 중 추가 편집');resolve();await saving;assert.equal(session.get().title,'저장 중 추가 편집');assert.equal(session.meta().cloudRevision,1);assert.equal([...storage.rows.values()][0].plan.title,'저장 중 추가 편집');assert.match(statuses.at(-1),/추가 변경.*다시 저장/);await session.destroy();
 const failing=createPlanSession({initial:newPlan(map),owner:'b',storage,cloud:{save:async()=>{throw Object.assign(Error('stale'),{code:'map_conflict'});}}});failing.change(p=>p.title='보존');await assert.rejects(failing.saveCloud(),{code:'map_conflict'});assert.equal(failing.get().title,'보존');await failing.destroy();
});
test('cloud results from another login session are discarded and failures remain retryable',async()=>{
 let account={token:'a'.repeat(64)},done;const cloud=createMapCloud({session:()=>account,request:()=>new Promise(r=>{done=r;})});const pending=cloud.list();account={token:'b'.repeat(64)};done({plans:[]});await assert.rejects(pending,{code:'account_changed'});cloud.destroy();assert.equal(mapAccount({getItem(){throw Error('blocked');}}),null);
});
test('an editor cannot send a pending save with another account or after being closed',async()=>{
 let account={accountId:'a'.repeat(64),token:'1'.repeat(64)},calls=0;
 const cloud=createMapCloud({session:()=>account,request:async()=>{calls++;return {};}});
 account={accountId:'b'.repeat(64),token:'2'.repeat(64)};
 await assert.rejects(cloud.save(newPlan(map),0),{code:'account_changed'});
 assert.equal(calls,0);
 cloud.destroy();
 await assert.rejects(cloud.list());
 assert.equal(calls,0);
});
test('an account token can refresh for the same editor owner',async()=>{
 let account={accountId:'a'.repeat(64),token:'1'.repeat(64)},sent;
 const cloud=createMapCloud({session:()=>account,request:async(origin,path,options)=>{sent=options.token;return {plans:[]};}});
 account={...account,token:'2'.repeat(64)};
 assert.deepEqual(await cloud.list(),{plans:[]});assert.equal(sent,account.token);cloud.destroy();
});
test('research links accept only versioned MANOR shares and drafts remain unpublished',()=>{
 const plan=newPlan(map),link=mapShareURL(plan.id);assert.equal(mapAttachment('설명\n'+link),link);assert.equal(mapAttachment(link.replace('tacocat070116.github.io','evil.example')),'');assert.equal(mapAttachment(link.replace('/manor-identity-v/','/elsewhere/')),'');assert.equal(mapAttachment('javascript:alert(1)'),'');const draft=researchDraft(map,plan,plan.id);assert.ok(draft.body.includes(map.revision));assert.ok(draft.body.includes('검토 상태'));assert.equal(draft.topic,'strategy');assert.ok(draft.body.length<=3000);
});
test('the retired YouTube screen is replaced with a lazy map feature and shared beta styling',()=>{
 const app=fs.readFileSync('dist/app.js','utf8'),loader=fs.readFileSync('dist/feature-loader.js','utf8'),html=fs.readFileSync('dist/index.html','utf8');assert.match(app,/\['maps','맵','map'\]/);assert.doesNotMatch(app,/mountCreators|creatorPost|\['creators','유튜브'/);assert.match(loader,/maps:\{load:\(\)=>import\('\.\/maps\.js/);assert.match(html,/data-lazy-style="maps"/);for(const f of ['creators.js','creators-model.js','creators.css'])assert.equal(fs.existsSync('dist/'+f),false);
});
