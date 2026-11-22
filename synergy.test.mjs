import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {synergyGroups,synergyRoute,validateSynergyDraft,SYNERGY_SITUATIONS} from './dist/synergy-model.js';
import {synergyPostCard,synergyEditor,mountSynergy} from './dist/synergy.js';
const db=JSON.parse(fs.readFileSync('dist/data.json','utf8'));
const characters=Object.fromEntries(db.characters.map(c=>[c.id,c]));
test('all survivor pairs remain reachable from either character, grouped without duplicate partners',()=>{
 for(const c of db.characters.filter(c=>c.side==='생존자')){
  const groups=synergyGroups(db.links,c.name,characters);
  assert.equal(new Set(groups.map(g=>g.partner.id)).size,groups.length);
  for(const g of groups){
   assert.notEqual(g.partner.id,c.id);assert.equal(g.partner.side,'생존자');
   const reverse=synergyGroups(db.links,g.partner.name,characters).find(p=>p.partner.id===c.id);
   assert.equal(reverse.entries.length,g.entries.length);
   for(const entry of g.entries){assert.ok(entry.use&&entry.when&&entry.caution);assert.ok(entry.situations.length);assert.ok(entry.situations.every(s=>SYNERGY_SITUATIONS.includes(s)));}
  }
 }
 const novelist=synergyGroups(db.links,characters.c59.name,characters);assert.equal(novelist.find(g=>g.partner.id==='c88').entries.length,1,'lantern → novelist is discoverable in reverse without duplicate rows');
});
test('published duos require specific interactions, evidence and conditions; generic roles never fill empty lists',()=>{
 const review=JSON.parse(fs.readFileSync('research/synergies/2026-11-15/duo-review.json','utf8'));
 const duos=db.links.filter(l=>l.type==='시너지');
 assert.equal(duos.length,review.after.uniquePairs);
 assert.equal(new Set(duos.map(l=>[l.character,l.target].sort().join('|'))).size,duos.length);
 for(const l of duos){
  assert.equal(l.status,'반영');assert.equal(l.basisKind,'duo_interaction');
  assert.ok(l.interaction&&l.reason&&l.use&&l.when&&l.caution&&l.reviewedAt);
  assert.ok(l.sourceSupport.some(s=>s.kind==='community'&&s.url.startsWith('https://cafe.naver.com/')));
  assert.deepEqual(l.sources,[...new Set(l.sourceSupport.map(s=>s.url))]);
  assert.ok(l.sourceSupport.every(s=>s.note&&new URL(s.url).protocol==='https:'));
  const a=synergyGroups(db.links,l.character,characters).find(g=>g.partner.name===l.target);
  const b=synergyGroups(db.links,l.target,characters).find(g=>g.partner.name===l.character);
  assert.equal(a.order,b.order);assert.deepEqual(a.entries,b.entries);
 }
 const valid=duos[0];
 for(const override of [{basisKind:'role_division'},{basisKind:'candidate'},{status:'보류'},{type:'보조 특성'}])assert.deepEqual(synergyGroups([{...valid,...override}],valid.character,characters),[]);
 assert.deepEqual(synergyGroups(db.links,'선지자',characters),[]);
 const edit=JSON.parse(fs.readFileSync('research/editorial/2026-11-15/consistency-edits.json','utf8')).edits.find(e=>e.path==='dist/data.json/links');
 const hunterNames=new Set(db.characters.filter(c=>c.side==='감시자').map(c=>c.name));
 const hunters=links=>links.filter(l=>hunterNames.has(l.character));
 assert.deepEqual(hunters(edit.after),hunters(edit.before),'the duo review preserved all 108 hunter auxiliary trait recommendations');
 // Later, audited wording edits must not make the historical duo snapshot stale.
 const expected={links:structuredClone(edit.after)};
 const laterDates=fs.readdirSync('research/editorial').filter(date=>/^\d{4}-\d{2}-\d{2}$/.test(date)&&date>'2026-11-15'&&fs.existsSync(`research/editorial/${date}/consistency-edits.json`)).sort();
 for(const date of laterDates){
  const later=JSON.parse(fs.readFileSync(`research/editorial/${date}/consistency-edits.json`,'utf8'));
  for(const change of later.edits.filter(e=>/^dist\/data\.json\/links(?:\/|$)/.test(e.path))){
   const parts=change.path.split('/').slice(2);let parent=expected;for(const part of parts.slice(0,-1))parent=parent[part];
   const key=parts.at(-1);
   if(change.beforeMissing)assert.ok(!Object.hasOwn(parent,key),change.path);
   else assert.deepEqual(parent[key],change.before,change.path);
   parent[key]=structuredClone(change.after);
  }
 }
 assert.deepEqual(hunters(db.links),hunters(expected.links),'current hunter recommendations match the preserved snapshot plus reviewed edits');
});
test('proposals require two distinct survivors, meaningful usage, cautions and bounded situations',()=>{
 const draft={characterIds:['c55','c58'],title:'함께 사용한 경험',body:'회복 시간을 확보할 수 있도록 부엉이 보호를 요청했습니다.',caution:'부엉이가 남아 있어야 합니다.',situations:['회복']};
 assert.equal(validateSynergyDraft(draft,characters),'');
 for(const change of [{characterIds:['c58','c58']},{characterIds:['c01','c58']},{situations:[]},{situations:['캠핑']},{situations:['회복','회복']},{caution:''},{body:'짧음'}])assert.ok(validateSynergyDraft({...draft,...change},characters));
});
test('post cards escape user text and retain shareable pair links; edit forms lock characters',()=>{
 const post={id:'90000000-0000-4000-8000-000000000001',characterIds:['c55','c58'],title:'<img src=x onerror=alert(1)>',body:'<script>bad()</script>',caution:'조건을 확인하세요.',situations:['회복'],createdAt:1800000000000,author:{name:'<b>이름</b>'},commentCount:3};
 const html=synergyPostCard(post,characters,{ownId:'c58',partnerId:'c55'});
 assert.ok(html.includes('&lt;img'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('partner=c55'));assert.ok(html.includes('댓글 3'));
 const form=synergyEditor({characters,post});assert.ok(form.includes('name="character" value="c55"'));assert.ok(!form.includes('<select name="character"'));
 const route=new URLSearchParams(synergyRoute('c58','c55',post.id).slice(1));assert.equal(route.get('post'),post.id);assert.equal(route.get('v'),'laboratory');
});

test('research activity labels follow topic and faction while stored values and user prose remain intact',()=>{
 const post={id:'90000000-0000-4000-8000-000000000001',title:'추격 경험',body:'이용자가 작성한 추격 경험은 그대로 유지합니다.',caution:'기존 추격 조건',situations:['추격'],createdAt:1800000000000,author:{name:'작성자'}};
 for(const [topic,characterIds,label] of [
  ['combination',['c55','c58'],'어그로'],['survivor_persona',['c58'],'어그로'],['hunter_persona',['c16'],'사냥'],
  ['strategy',['c16'],'사냥'],['strategy',['c58'],'어그로'],['strategy',['c16','c58'],'어그로·사냥'],['strategy',[],'어그로·사냥'],
 ]){
  const row={...post,topic,characterIds},card=synergyPostCard(row,characters),editor=synergyEditor({characters,post:row});
  assert.ok(card.includes(`<span class="tag">${label}</span>`));
  assert.ok(editor.includes(`value="추격" checked><span>${label}</span>`));
  assert.ok(card.includes(post.body));assert.ok(editor.includes(post.caution));
  assert.deepEqual(row.situations,['추격']);
 }
 const legacy=synergyPostCard({...post,characterIds:['c55','c58']},characters);
 assert.match(legacy,/<span class="tag">어그로<\/span>/,'legacy combination posts keep their original category');
});

test('rebuilding a discussion clears the hidden reply target and starts a fresh comment request',async()=>{
 const originals=new Map();
 const replace=(key,value)=>{originals.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});};
 const token='a'.repeat(64),post={id:'90000000-0000-4000-8000-000000000001',characterIds:['c55','c58'],title:'조합 경험',body:'활용법',caution:'주의점',situations:['회복'],createdAt:1800000000000,updatedAt:1800000000000,revision:0,isMine:true,hidden:false,commentCount:2,author:{name:'작성자'}};
 const makeComment=id=>({id,body:'댓글',author:{name:'참여자'},isMine:true,hidden:false,deleted:false,createdAt:1800000000000});
 const target=makeComment('90000000-0000-4000-8000-000000000002'),other=makeComment('90000000-0000-4000-8000-000000000003');
 let comments=[target,other],html='',replyNode,dispose;
 const requests=[],handlers={},notice={classList:{toggle(){}},hidden:true};
 let onInitialRender;const initialRender=new Promise(resolve=>{onInitialRender=resolve;});
 const root={
  get innerHTML(){return html;},
  set innerHTML(value){html=value;replyNode={innerHTML:'',hidden:true};if(value.includes('class="panel sy-detail"'))onInitialRender();},
  addEventListener:(name,handler)=>{handlers[name]=handler;},removeEventListener(){},contains:()=>true,
  querySelector:selector=>selector==='.sy-reply-target'?replyNode:selector==='.sy-notice'?notice:{focus(){},disabled:false},
 };
 const click=(sy,id)=>{
  const button={dataset:{sy,id},disabled:false,isConnected:true};
  return handlers.click({target:{closest:selector=>selector==='[data-sy]'?button:null},preventDefault(){}});
 };
 const form={dataset:{syForm:'comment'},reportValidity:()=>true,querySelector:()=>({disabled:false,isConnected:true})};
 const submit=()=>handlers.submit({target:{closest:()=>form},preventDefault(){}});
 try{
  replace('localStorage',{getItem:key=>key==='manor-feedback-visitor'?token:null,setItem(){},removeItem(){}});
  replace('document',{querySelectorAll:()=>[]});replace('confirm',()=>true);
  replace('FormData',class{get(){return '함께 사용한 경험을 댓글로 남깁니다.';}});
  replace('fetch',async(url,options={})=>{
   if(options.method==='POST'){
    requests.push(JSON.parse(options.body));
    if(requests.length<=2)return {ok:false,json:async()=>({error:'잠시 후 다시 시도해 주세요.'})};
    return {ok:true,json:async()=>({})};
   }
   if(options.method==='DELETE'){comments=[target];return {ok:true,json:async()=>({})};}
   return {ok:true,json:async()=>url.endsWith('/comments')?{comments,nextAfter:null}:{post}};
  });
  dispose=mountSynergy(root,{characters,ownId:'c55',postId:post.id,origin:'https://fixture.invalid'});
  await initialRender;await click('reply',target.id);
  assert.equal(replyNode.hidden,false);
  await submit();await submit();
  assert.equal(requests[0].parentId,target.id);
  assert.equal(requests[1].requestId,requests[0].requestId,'retrying the same failed submission remains idempotent');
  await click('delete-comment',other.id);
  assert.equal(replyNode.hidden,true,'the refreshed comment form shows no reply target');
  await submit();
  assert.equal(requests[2].parentId,null,'the next general comment must not silently reply to the old target');
  assert.notEqual(requests[2].requestId,requests[1].requestId,'a newly rendered form must not reuse the abandoned request');
 }finally{
  dispose?.();
  for(const [key,descriptor] of originals){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
 }
});

test('laboratory validates persona sides and complete teams; proposal actions follow authorship and review state',async()=>{
 const draft={title:'새로운 인격 구성 연구',body:'해당 인격을 선택한 이유와 게임 중 활용한 조건을 함께 연구합니다.',caution:'아직 검증하지 못한 상황이 있습니다.',situations:['운영']};
 for(const [topic,characterIds] of [['combination',['c37','c55','c58','c60']],['survivor_persona',['c58']],['hunter_persona',['c01']],['strategy',[]]])assert.equal(validateSynergyDraft({...draft,topic,characterIds},characters),'');
 assert.ok(validateSynergyDraft({...draft,topic:'hunter_persona',characterIds:['c58']},characters));
 const {researchProposal}=await import('./dist/synergy.js');
 const post={characterIds:['c58'],isMine:true,proposal:{status:'none'}};
 assert.match(researchProposal(post),/data-sy-form="proposal"/);
 assert.doesNotMatch(researchProposal({...post,isMine:false}),/data-sy-form="proposal"/);
 assert.doesNotMatch(researchProposal({...post,proposal:{status:'pending'}}),/data-sy-form="proposal"/);
 assert.match(researchProposal({...post,proposal:{status:'pending'}},{admin:true}),/data-sy-form="proposal-review"/);
 assert.doesNotMatch(researchProposal({...post,proposal:{status:'approved',reason:'<script>test</script>'}}),/도감에서 보기/);
 assert.doesNotMatch(researchProposal({...post,proposal:{status:'approved',reason:'<script>test</script>'}}),/<script>/);
});
