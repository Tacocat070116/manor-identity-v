import * as themeUI from './dist/themes.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {feedbackCard,feedbackComment,feedbackHistory,feedbackResponse,feedbackStatusForm,feedbackProgress,feedbackStatusGuide,FEEDBACK_STATUSES,FEEDBACK_STATUS_HELP,mountFeedback} from './dist/feedback.js';
import * as model from './dist/model.js';
import * as releaseUI from './dist/releases.js';
const id='11111111-1111-4111-8111-111111111111',author={characterId:'c01',number:1,name:'거미 #001'};
const post={id,title:'<img src=x onerror=alert(1)>',body:'<script>alert(1)</script>',category:'feature',status:'open',createdAt:1800000000000,updatedAt:1800000000000,author,upvotes:0,downvotes:0,myVote:0,commentCount:0};
const chars={c01:{id:'c01',name:'거미',portrait:'assets/c01.png'}};
test('response editing is owner-only and the status timeline contains tags and dates without answer text',()=>{
 const p={...post,reason:'기존 <script>답변</script>',replyRevision:0,statusRevision:0};
 const publicReply=feedbackResponse(p);assert(publicReply.includes('기존 &lt;script&gt;답변'));assert(!publicReply.includes('data-fb="edit-response"'));assert(!publicReply.includes('<form'));
 const ownerReply=feedbackResponse(p,true);assert(ownerReply.includes('aria-label="운영자 답변 수정"'));assert(!ownerReply.includes('<textarea'));
 const editor=feedbackResponse(p,true,true,'오타 수정 </textarea><img src=x>');assert(editor.includes('&lt;/textarea&gt;'));assert(editor.includes('data-fb-form="response"'));assert(!editor.includes('name="status"'));
 assert(feedbackResponse({...p,reason:''},true).includes('답변 작성'));assert.equal(feedbackResponse({...p,reason:''}), '');
 const statusForm=feedbackStatusForm(p);assert(statusForm.includes('name="status"'));assert(!statusForm.includes('textarea'));assert(!statusForm.includes('name="reason"'));
 const history=feedbackHistory([{status:'planned',reason:'과거의 답변은 숨깁니다.',createdAt:1793070978114}]);
 assert(history.includes('status-planned'));assert(history.includes('2026년 10월 27일 오후 12:16'));assert(!history.includes('과거의 답변'));assert(!history.includes('<p>'));
});
test('operator controller preserves a reply draft through a status save and saves replies without another status event',async()=>{
 const previous={fetch:globalThis.fetch,FormData:globalThis.FormData},handlers={},calls=[];
 const notice={textContent:'',hidden:true,classList:{toggle(){}}},slot={innerHTML:''},textarea={focus(){}};
 let current={...post,reason:'기존 답변',replyRevision:0,statusRevision:0},history=[];
 globalThis.FormData=class{constructor(form){this.values=form.values;}get(key){return this.values[key]??null;}};
 globalThis.fetch=async(url,opts={})=>{
  const body=opts.body?JSON.parse(opts.body):null;calls.push({url,opts,body});let data;
  if(url.endsWith('/comments'))data={comments:[],nextAfter:null};
  else if(url.endsWith('/reply')){current={...current,reason:body.reason,replyRevision:current.replyRevision+1};data={post:current};}
  else if(url.endsWith('/status')){current={...current,status:body.status,statusRevision:current.statusRevision+1};history.push({status:body.status,createdAt:post.createdAt});data={post:current};}
  else data={post:current,history,myAlias:null};
  return {ok:true,json:async()=>structuredClone(data)};
 };
 const root={innerHTML:'',contains:()=>true,addEventListener:(key,fn)=>handlers[key]=fn,removeEventListener:key=>delete handlers[key],querySelector:s=>s==='.fb-notice'?notice:s==='.fb-response-slot'?slot:textarea};
 const click=async fb=>{const button={dataset:{fb},isConnected:true};await handlers.click({target:{closest:()=>button},preventDefault(){}});};
 const save=async(kind,values)=>{const form={dataset:{fbForm:kind},values,reportValidity:()=>true,querySelector:()=>({disabled:false,isConnected:false})};await handlers.submit({target:{closest:()=>form},preventDefault(){}});};
 let dispose;
 try{
  dispose=mountFeedback(root,{postId:id,admin:true,origin:'https://feedback.example'});await new Promise(resolve=>setImmediate(resolve));
  await click('edit-response');assert(slot.innerHTML.includes('기존 답변'));
  handlers.input({target:{id:'fb-response-body',value:'오타를 고친 답변',closest:()=>null}});
  await save('status',{status:'hold'});assert(root.innerHTML.includes('오타를 고친 답변'));assert.equal(current.reason,'기존 답변');assert.equal(history.length,1);
  await save('response',{reason:'오타를 고친 답변'});assert(slot.innerHTML.includes('오타를 고친 답변'));assert(!slot.innerHTML.includes('<textarea'));assert.equal(current.status,'hold');assert.equal(history.length,1);
  const writes=calls.filter(c=>c.opts.method==='PATCH');assert.deepEqual(writes.map(c=>c.body),[{status:'hold',revision:0},{reason:'오타를 고친 답변',revision:0}]);assert(writes.every(c=>c.opts.headers['X-Manor-Admin']==='1'&&c.opts.credentials==='same-origin'));
  await click('edit-response');handlers.input({target:{id:'fb-response-body',value:'취소할 내용',closest:()=>null}});await click('cancel-response');assert(!slot.innerHTML.includes('취소할 내용'));assert.equal(calls.filter(c=>c.opts.method==='PATCH').length,2);
 }finally{dispose?.();globalThis.fetch=previous.fetch;globalThis.FormData=previous.FormData;}
});
test('feedback and comment templates escape user text and never expose a public status editor',()=>{
 const card=feedbackCard(post,chars);assert(!card.includes('<script>'));assert(!card.includes('<img src=x'));assert(card.includes('&lt;script&gt;'));assert(!card.includes('data-fb-form="status"'));
 assert(card.startsWith('<a class="fb-card"'));assert.equal((card.match(/<a\b/g)||[]).length,1);assert(!card.includes('<button'));assert(card.includes('aria-labelledby="fb-card-title-'+id+'"'));assert(card.includes('댓글 0'));assert(!card.includes('data-fb="vote"'));
 const comment=feedbackComment({id,author,body:'<svg onload=alert(1)>',createdAt:post.createdAt,isAuthor:true,isMine:false},chars);assert(comment.includes('&lt;svg'));assert(comment.includes('작성자'));assert(!comment.includes('data-fb="delete-comment"'));
});
test('cards announce an operator reply independently of processing status or visitor comments',()=>{
 for(const status of ['open','reviewing','planned','completed','hold']){
  const answered=feedbackCard({...post,status,reason:'  확인했습니다. 검토를 진행할게요.  ',commentCount:0},chars);
  assert(answered.includes('운영자 답변'));assert(!answered.includes('답변 완료'));assert(answered.includes('class="fb-response-badge"'));assert(answered.includes('fb-icon-check'));
  assert(answered.includes(`aria-describedby="fb-card-response-${id}"`));assert(answered.includes(`id="fb-card-response-${id}"`));
  assert(answered.includes(`status-${status}`));assert(answered.includes('댓글 0'));assert(answered.includes('확인했습니다.'));
  for(const reason of [undefined,null,'',' \n\t ']){
   const unanswered=feedbackCard({...post,status,reason,commentCount:12},chars);
   assert(!unanswered.includes('fb-response-badge'));assert(unanswered.includes('fb-answer-pending'));assert(unanswered.includes('댓글 12'));
  }
 }
});
test('status definitions distinguish commitment, progress and missing individual reasons',()=>{
 const guide=feedbackStatusGuide();
 for(const status of Object.keys(FEEDBACK_STATUSES)){
  assert(guide.includes(FEEDBACK_STATUS_HELP[status]));
  const progress=feedbackProgress({...post,status});
  assert(progress.includes(FEEDBACK_STATUS_HELP[status]));
  assert(progress.includes('fb-answer-pending'));
  assert(!feedbackProgress({...post,status,reason:'공개된 실제 답변'}).includes('fb-answer-pending'));
 }
 assert(feedbackProgress({...post,status:'hold',reason:'  '}).includes('보류 사유는 아직 등록되지 않았습니다.'));
 assert(feedbackProgress({...post,status:'reviewing'}).includes('검토 내용은 아직 등록되지 않았습니다.'));
 assert(guide.includes('적용 일정이 확정된 것은 아닙니다.'));
 assert(guide.includes('운영자 답변이 있어도 반영이 완료된 것은 아닙니다.'));
 const unknown=feedbackProgress({...post,status:'<svg onload=alert(1)>'});
 assert(unknown.includes('상태 확인 필요'));assert(!unknown.includes('<svg onload'));assert(!unknown.includes('status-open'));
 const card=feedbackCard({...post,status:'hold',reason:'<script>사유</script>\n내용'},chars);
 assert(card.includes('&lt;script&gt;사유'));assert(!card.includes('<script>'));
});
test('whole-card navigation opens once and preserves native modified clicks',async()=>{
 const previous=globalThis.fetch,handlers={},opened=[];globalThis.fetch=async()=>({ok:true,json:async()=>({posts:[post],counts:{open:1},total:1,nextPage:null})});
 const root={innerHTML:'',addEventListener:(k,v)=>handlers[k]=v,removeEventListener:k=>delete handlers[k],contains:()=>true};
 const dispose=mountFeedback(root,{navigate:id=>opened.push(id)});await new Promise(resolve=>setImmediate(resolve));
 const link={dataset:{fb:'open',id}};
 try{
  assert(!root.innerHTML.includes('추천순'));assert(!root.innerHTML.includes('fb-vote'));assert(root.innerHTML.includes('댓글순'));
  for(const status of Object.keys(FEEDBACK_STATUSES))assert(root.innerHTML.includes(`data-status="${status}" aria-pressed="false"`));
  assert(root.innerHTML.includes('처리 상태는 어떤 뜻인가요?'));
  for(const modifier of ['ctrlKey','metaKey','shiftKey','altKey'])await handlers.click({target:{closest:()=>link},[modifier]:true,button:0,preventDefault(){assert.fail('modified click must remain native');}});
  assert.deepEqual(opened,[]);let prevented=0;
  await handlers.click({target:{closest:()=>link},button:0,preventDefault(){prevented++;}});
  assert.equal(prevented,1);assert.deepEqual(opened,[id]);
 }finally{dispose();globalThis.fetch=previous;}
});
test('comments still create guest identity only on write and refresh the shared discussion',async()=>{
 const old={fetch:globalThis.fetch,localStorage:globalThis.localStorage,FormData:globalThis.FormData},calls=[],handlers={},values=new Map(),nodes=new Map();
 globalThis.localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 globalThis.FormData=class{constructor(form){this.values=form.values;}get(key){return this.values[key]??null;}};
 let posted=false;const comment={id:'new-comment',seq:1,author,body:'댓글로 남기는 의견',createdAt:post.createdAt};
 globalThis.fetch=async(url,opts={})=>{calls.push({url,opts});let data;
  if(url.endsWith('/visitors'))data={token:'a'.repeat(64)};
  else if(url.endsWith('/comments')&&opts.method==='POST'){posted=true;data={id:comment.id,comment};}
  else if(url.endsWith('/comments'))data={comments:[],nextAfter:null};
  else data={post:{...post,commentCount:posted?1:0},history:[],myAlias:null};
  return {ok:true,json:async()=>data};
 };
 const root={innerHTML:'',addEventListener:(k,v)=>handlers[k]=v,removeEventListener:k=>delete handlers[k],contains:()=>true,querySelector(s){if(!nodes.has(s))nodes.set(s,{innerHTML:'',textContent:'',hidden:true,classList:{toggle(){}},scrollIntoView(){}});return nodes.get(s);}};
 let dispose;
 try{
  dispose=mountFeedback(root,{characters:chars,postId:id});await new Promise(resolve=>setImmediate(resolve));
  assert.equal(calls.length,2);assert(calls.every(c=>c.opts.method==='GET'&&!c.opts.headers.Authorization));assert(root.innerHTML.includes('댓글 등록'));assert(!root.innerHTML.includes('fb-vote'));
  let reset=false;const form={dataset:{fbForm:'comment'},values:{body:comment.body},reportValidity:()=>true,querySelector:()=>({disabled:false,isConnected:false}),reset(){reset=true;}};
  await handlers.submit({target:{closest:()=>form},preventDefault(){}});
  const write=calls.find(c=>c.url.endsWith('/comments')&&c.opts.method==='POST');assert.equal(write.opts.headers.Authorization,'Bearer '+'a'.repeat(64));assert.equal(JSON.parse(write.opts.body).body,comment.body);
  assert.equal(calls.filter(c=>c.url.endsWith('/visitors')).length,1);assert(reset);assert(root.querySelector('.fb-comments').innerHTML.includes(comment.body));assert.equal(root.querySelector('[data-comment-total]').textContent,1);
  assert(calls.every(c=>!c.url.endsWith('/vote')));
 }finally{dispose?.();globalThis.fetch=old.fetch;globalThis.localStorage=old.localStorage;globalThis.FormData=old.FormData;}
});
test('failed shared-data loading shows an explicit retry screen rather than fabricated or browser-only feedback',async()=>{
 const old=globalThis.fetch;globalThis.fetch=async()=>{throw Error('연결 실패');};const root={innerHTML:'',addEventListener(){},removeEventListener(){}};const dispose=mountFeedback(root);await new Promise(resolve=>setImmediate(resolve));assert(root.innerHTML.includes('의견을 불러오지 못했습니다.'));assert(root.innerHTML.includes('다시 시도'));assert(!root.innerHTML.includes('첫 번째 의견'));dispose();globalThis.fetch=old;
});
test('live navigation restores feedback posts and retires the old source route',async()=>{
 const db=JSON.parse(fs.readFileSync('dist/data.json')),specialties=JSON.parse(fs.readFileSync('dist/specialties.json')),introductions=JSON.parse(fs.readFileSync('dist/introductions.json')),releases=JSON.parse(fs.readFileSync('dist/releases.json'));const nodes=new Map(),mounts=[];let disposed=0,navMounts=0;const navUpdates=[];
 const node=()=>({innerHTML:'',textContent:'',dataset:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){}});
 const context={...themeUI,...model,...releaseUI,console,URL,URLSearchParams,Intl,Set,Map,Date,Math,Object,Number,String,JSON,Error,Array,Promise,setTimeout,clearTimeout,
 document:{documentElement:{dataset:{}},querySelector(s){if(!nodes.has(s))nodes.set(s,node());return nodes.get(s);},addEventListener(){}},window:{addEventListener(){},scrollTo(){}},location:{hash:'#v=feedback&post='+id},localStorage:{getItem(){return null;}},matchMedia:()=>({matches:false}),
 mountFeedback:(root,opts)=>{mounts.push(opts);root.innerHTML='shared feedback';return ()=>disposed++;},createCarouselSession:()=>({}),carouselItems:()=>[],mountNavigation:()=>{navMounts++;return {update(next){navUpdates.push({...next});}};},mountHeroCarousel:()=>()=>{},fetch:async url=>({ok:true,json:async()=>url.startsWith('specialties')?specialties:url.startsWith('introductions')?introductions:url.startsWith('releases')?releases:db})};
 let source=fs.readFileSync('dist/app.js','utf8').replace(/^import[^\n]*\n/gm,'').replace(/\nboot\(\);\s*$/,'');vm.runInNewContext(source+'\nglobalThis.app={boot,render,readRoute,state};',context);await context.app.boot();assert.equal(mounts[0].postId,id);assert(nodes.get('#header').innerHTML.includes('피드백'));assert(!nodes.get('#header').innerHTML.includes('>근거<'));assert(!nodes.get('#footer').innerHTML.includes('#v=sources'));
 context.location.hash='#v=sources';context.app.readRoute();await context.app.render();assert.equal(disposed,1);assert(nodes.get('#page-body').innerHTML.includes('id="characters"'));assert.equal(context.app.state.view,'explore');assert.equal(navMounts,1);assert.deepEqual(navUpdates.map(x=>x.view),['feedback','explore']);
});
