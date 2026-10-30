import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {synergyGroups,synergyRoute,validateSynergyDraft,SYNERGY_SITUATIONS} from './dist/synergy-model.js';
import {synergyPostCard,synergyEditor,mountSynergy} from './dist/synergy.js';
const db=JSON.parse(fs.readFileSync('dist/data.json','utf8'));
const characters=Object.fromEntries(db.characters.map(c=>[c.id,c]));
test('all survivor pairs are reachable from either character, grouped without duplicate partners and filtered by situation',()=>{
 for(const c of db.characters.filter(c=>c.side==='생존자')){
  const groups=synergyGroups(db.links,c.name,characters);
  assert.equal(new Set(groups.map(g=>g.partner.id)).size,groups.length);
  for(const g of groups){
   assert.notEqual(g.partner.id,c.id);assert.equal(g.partner.side,'생존자');
   const reverse=synergyGroups(db.links,g.partner.name,characters).find(p=>p.partner.id===c.id);
   assert.equal(reverse.entries.length,g.entries.length);
   for(const entry of g.entries){assert.ok(entry.use&&entry.when&&entry.caution);assert.ok(entry.situations.length);assert.ok(entry.situations.every(s=>SYNERGY_SITUATIONS.includes(s)));}
  }
  for(const s of SYNERGY_SITUATIONS)assert.ok(synergyGroups(db.links,c.name,characters,s).every(g=>g.entries.every(e=>e.situations.includes(s))));
 }
 const seer=synergyGroups(db.links,characters.c58.name,characters);assert.ok(seer.find(g=>g.partner.id==='c55'),'barmaid → seer is discoverable from seer too');
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
 const form=synergyEditor({characters,post});assert.ok(form.includes('name="characterA" value="c55"'));assert.ok(!form.includes('<select name="characterA"'));
 const route=new URLSearchParams(synergyRoute('c58','c55',post.id).slice(1));assert.equal(route.get('post'),post.id);assert.equal(route.get('tab'),'synergy');
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
