import test from 'node:test';
import assert from 'node:assert/strict';
import {tipCard,tipSubmissionForm,mountMatchupTips} from './dist/matchup-tips.js';
const id='11111111-1111-4111-8111-111111111111';
const characters={c37:{id:'c37',name:'곡예사',side:'생존자'},c38:{id:'c38',name:'공군',side:'생존자'},c01:{id:'c01',name:'거미',side:'감시자'}};
const tip={id,ownId:'c37',opponentId:'c01',displayName:'<script>x</script>',body:'<img src=x onerror=x>테스트 문장입니다.',context:'<svg onload=x>',claimedTier:'7단',season:'테스트 시즌',status:'pending',reviewMessage:'작성자만 보는 답변',updatedAt:1800000000000,revision:0,uid:'987654321012',server:'asia',verificationNote:'PRIVATE-NOTE'};
test('public cards escape text, omit private fields and unverified claims, and expose no moderation controls',()=>{
 const html=tipCard(tip,characters);assert(html.includes('&lt;script&gt;'));assert(html.includes('&lt;img'));assert(!html.includes('<script>'));assert(!html.includes('<img src=x'));assert(!html.includes('987654321012'));assert(!html.includes('PRIVATE-NOTE'));assert(!html.includes('7단'));assert(!html.includes('티어 확인'));assert(!html.includes(tip.reviewMessage));assert(!html.includes('data-tip="edit"'));
 const approved=tipCard({...tip,verifiedTier:'7단 확인',verifiedSeason:'테스트 시즌',verifiedAt:1800000000000},characters);assert(approved.includes('티어 확인'));assert(approved.includes('7단 확인'));
 const mine=tipCard(tip,characters,{mine:true});assert(mine.includes('검토 대기'));assert(mine.includes(tip.reviewMessage));assert(mine.includes('data-tip="edit"'));assert(!mine.includes(tip.uid));
});
test('submission forms keep UID out of HTML state, use POST and list only opposing-faction characters',()=>{
 const html=tipSubmissionForm({characters,ownId:'c37'});assert(html.includes('method="post"'));assert(html.includes('name="uid"'));assert(html.includes('name="privacyConsent" required'));assert(html.includes('value="c01"'));assert(!html.includes('value="c38"'));assert(!html.includes('value="cn"'));
 const edit=tipSubmissionForm({characters,ownId:'c37',tip});assert(!edit.includes(tip.uid));assert(!edit.includes('PRIVATE-NOTE'));assert(edit.includes('기존 정보 유지'));assert(edit.includes('&lt;img'));
});
test('controller reads anonymously, sends UID only in the submission body, and stores only an opaque author token',async()=>{
 const original={fetch:globalThis.fetch,localStorage:globalThis.localStorage,FormData:globalThis.FormData};
 const calls=[],storage=new Map(),handlers={},notice={textContent:'',hidden:true,classList:{toggle(){}},focus(){}},button={disabled:false,isConnected:true};
 const form={closest:()=>form,reportValidity:()=>true,querySelector:()=>button};
 const fields=new Map(Object.entries({ownId:'c37',opponentId:'c01',displayName:'테스트 작성자',claimedTier:'7단',season:'테스트 시즌',body:'개인정보를 포함하지 않는 테스트 상대법 문장입니다.',context:'테스트',server:'asia',uid:tip.uid,verificationNote:'PRIVATE-NOTE',privacyConsent:'on'}));
 globalThis.FormData=class{constructor(){return fields;}};
 globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 globalThis.fetch=async(url,opts)=>{calls.push({url,opts});let data;if(url.endsWith('/visitors'))data={token:'b'.repeat(64)};else if(opts.method==='POST')data={tip};else data={tips:[],total:0,nextPage:null};return {ok:true,json:async()=>data};};
 const root={innerHTML:'',contains:()=>true,querySelector:()=>notice,addEventListener:(k,v)=>handlers[k]=v,removeEventListener:k=>delete handlers[k]};
 try{
  const dispose=mountMatchupTips(root,{characters,ownId:'c37',opponentId:'c01',origin:'https://feedback.example'});
  await new Promise(r=>setImmediate(r));assert.equal(calls.length,1);assert(calls[0].url.includes('own=c37&opponent=c01'));assert(!calls[0].opts.headers.Authorization);assert.equal(storage.size,0);
  await handlers.click({target:{closest:()=>({dataset:{tip:'compose'}})},preventDefault(){}});
  assert(root.innerHTML.includes('운영자에게만 전달'));
  await handlers.submit({target:form,preventDefault(){}});
  const submitted=calls.find(c=>c.url.endsWith('/api/tips')&&c.opts.method==='POST');assert(submitted);const body=JSON.parse(submitted.opts.body);assert.equal(body.uid,tip.uid);assert.equal(body.privacyConsent,true);assert.equal(submitted.opts.credentials,'omit');assert.equal(submitted.opts.headers.Authorization,'Bearer '+'b'.repeat(64));
  assert(!calls.some(c=>c.url.includes(tip.uid)||c.url.includes('PRIVATE-NOTE')));assert.equal(storage.get('manor-feedback-visitor'),'b'.repeat(64));assert.deepEqual(JSON.parse(storage.get('manor-participation-profiles')).map(p=>p.token),['b'.repeat(64)]);assert(!JSON.stringify([...storage]).includes(tip.uid));assert(!JSON.stringify([...storage]).includes('PRIVATE-NOTE'));assert(!root.innerHTML.includes(tip.uid));assert(root.innerHTML.includes('내 제출 내역'));
  dispose();assert.deepEqual(Object.keys(handlers),[]);
 }finally{Object.assign(globalThis,original);}
});
test('load failures and empty data have different messages and late responses cannot repaint an unmounted panel',async()=>{
 const old=globalThis.fetch;const root={innerHTML:'',addEventListener(){},removeEventListener(){}};
 try{
  globalThis.fetch=async()=>{throw Error('연결 실패');};let dispose=mountMatchupTips(root,{characters,ownId:'c37'});await new Promise(r=>setImmediate(r));assert(root.innerHTML.includes('불러오지 못했습니다'));assert(root.innerHTML.includes('다시 시도'));assert(!root.innerHTML.includes('아직 검토를 마친 상대법이 없습니다'));dispose();
  let resolve;globalThis.fetch=()=>new Promise(r=>resolve=r);dispose=mountMatchupTips(root,{characters,ownId:'c37'});dispose();const html=root.innerHTML;resolve({ok:true,json:async()=>({tips:[],total:0,nextPage:null})});await new Promise(r=>setImmediate(r));assert.equal(root.innerHTML,html);
 }finally{globalThis.fetch=old;}
});
