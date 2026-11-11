import {createHistory,clone,makeId,validatePlan} from './maps-model.js?v=d29d1c20e4a9';

// Serial local writes prevent an older debounce from overwriting a newer draft.
// Account writes use server revisions; conflicts always keep the local document.
export function createPlanSession({initial,owner,storage,cloud,onStatus=()=>{}}){
 const history=createHistory(initial),records=new Map();let pending=Promise.resolve(),timer=0,dirty=false,closed=false,inFlight=0;
 const key=id=>owner+':'+id;
 const meta=id=>records.get(key(id))||{localRevision:0,cloudRevision:0};
 function status(text,error=false){if(!closed)onStatus(text,error);}
 function persist(){
  clearTimeout(timer);timer=0;if(!dirty)return pending;
  const plan=clone(history.get());dirty=false;
  inFlight++;const job=pending.catch(()=>{}).then(async()=>{
   const state=meta(plan.id);
   const record=await storage.save(owner,plan,{expected:state.localRevision,cloudRevision:state.cloudRevision});
   records.set(key(plan.id),record);status('브라우저에 저장됨');return record;
  });
  pending=job.finally(()=>{inFlight--;}).catch(error=>{if(history.get().id===plan.id)dirty=true;status(error.message,true);throw error;});
  pending.catch(()=>{});return pending;
 }
 function changed(){dirty=true;status('브라우저에 저장 중…');clearTimeout(timer);timer=setTimeout(()=>{persist().catch(()=>{});},300);}
 return {
  history,get:history.get,owner,meta:()=>meta(history.get().id),hasPending:()=>dirty||inFlight>0,
  change(fn){if(history.change(fn)){changed();return true;}return false;},
  undo(){if(history.undo()){changed();return true;}return false;},redo(){if(history.redo()){changed();return true;}return false;},
  flush:persist,
  async open(plan,record={}){await persist();history.replace(validatePlan(plan));records.set(key(plan.id),{localRevision:record.localRevision||0,cloudRevision:record.cloudRevision||0});dirty=false;},
  async copy(plan=history.get()){try{await persist();}catch(error){if(error.code!=='local_conflict')throw error;}const next=clone(plan);next.id=makeId();next.title=(next.title+' 사본').slice(0,80);history.replace(next);changed();return next;},
  async saveCloud(){
   await persist();const plan=clone(history.get()),state=meta(plan.id);
   const result=await cloud.save(plan,state.cloudRevision);
   records.set(key(plan.id),{...meta(plan.id),cloudRevision:result.revision});
   // Persist the acknowledged revision even if edits arrived during the request.
   if(history.get().id===plan.id){dirty=true;await persist();status('계정에 저장됨 · 버전 '+result.revision);}
   return result;
  },
  async openCloud(id){
   const data=await cloud.read(id);await persist();
   const local=(await storage.list(owner)).find(r=>r.plan.id===id);
   history.replace(data.plan);records.set(key(id),{localRevision:local?.localRevision||0,cloudRevision:data.revision});dirty=true;await persist();return data;
  },
  destroy(){closed=true;clearTimeout(timer);return persist().catch(()=>{});}
 };
}
