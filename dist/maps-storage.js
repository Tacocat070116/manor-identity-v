import {validatePlan} from './maps-schema.js?v=2f4ecdd53a25';
export function createMapStorage({indexedDB=globalThis.indexedDB}={}){
 let opening;
 function open(){if(!indexedDB)return Promise.reject(Error('브라우저 저장을 사용할 수 없습니다. 파일로 내보내 주세요.'));return opening??=new Promise((resolve,reject)=>{const request=indexedDB.open('manor-map-plans',1);request.onupgradeneeded=()=>request.result.createObjectStore('plans',{keyPath:'key'});request.onsuccess=()=>{request.result.onversionchange=()=>{request.result.close();opening=null;};resolve(request.result);};request.onerror=()=>{opening=null;reject(Error('브라우저 저장 공간을 열지 못했습니다.'));};request.onblocked=()=>{opening=null;reject(Error('다른 탭을 닫은 뒤 저장을 다시 시도해 주세요.'));};});}
 async function transaction(mode,work){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('plans',mode),store=tx.objectStore('plans');let result,error;tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(error||Error('브라우저 저장 공간이 부족하거나 저장이 차단되었습니다.'));tx.onabort=()=>reject(error||Error('브라우저 저장을 완료하지 못했습니다.'));work(store,value=>{result=value;},failure=>{error=failure;tx.abort();});});}
 return {
  async list(owner){return transaction('readonly',(s,done)=>{const q=s.getAll();q.onsuccess=()=>done(q.result.filter(r=>r.owner===owner).sort((a,b)=>b.updatedAt-a.updatedAt));});},
  async save(owner,plan,{expected=0,cloudRevision=0}={}){const clean=validatePlan(plan);return transaction('readwrite',(s,done,abort)=>{const key=owner+':'+clean.id,q=s.get(key);q.onsuccess=()=>{if((q.result?.localRevision||0)!==expected){const e=Error('다른 탭의 변경 사항이 있습니다. 내 전술을 사본으로 저장해 주세요.');e.code='local_conflict';abort(e);return;}const record={key,owner,plan:clean,localRevision:expected+1,cloudRevision,updatedAt:Date.now()};s.put(record);done(record);};});},
  async remove(owner,id){return transaction('readwrite',(s,done)=>{s.delete(owner+':'+id);done(true);});},
  close(){opening?.then(db=>db.close(),()=>{});opening=null;}
 };
}
