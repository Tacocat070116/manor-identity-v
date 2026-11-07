// GIS owns one client per document. Panels share its challenge and route returned
// credentials by button state, so closing a panel cannot replace another callback.
export function createGoogleSignIn({clientId,loadLibrary,requestChallenge,now=Date.now,events=globalThis.window,page=globalThis.document,schedule=setTimeout,cancel=clearTimeout}){
 const views=new Map();
 let current,pending,serial=0,recoveryTimer;
 const active=view=>views.get(view.id)===view&&view.slot.isConnected!==false;
 function paint(view,attempt,force=false){
  if(!active(view)||current!==attempt||attempt.consumed||!force&&view.painted===attempt)return;
  try{
   view.slot.inert=false;view.slot.replaceChildren();
   attempt.google.renderButton(view.slot,{
    type:'standard',theme:'outline',size:'large',text:'continue_with',shape:'pill',locale:'ko',
    width:Math.min(320,Math.floor(view.slot.getBoundingClientRect().width)||280),
    state:attempt.challenge.id+':'+view.id,
    click_listener:()=>{if(active(view)&&current===attempt&&!attempt.consumed){cancel(recoveryTimer);attempt.clicked=true;}}
   });
   view.painted=attempt;
  }catch(error){view.onError(error);}
 }
 async function receive(attempt,response){
  if(current!==attempt||attempt.consumed||typeof response?.credential!=='string')return;
  const view=[...views.values()].find(item=>response.state===attempt.challenge.id+':'+item.id);
  if(!view||!active(view)||!view.canAccept())return;
  attempt.consumed=true;cancel(recoveryTimer);
  views.forEach(item=>{item.slot.inert=true;});
  try{await view.onCredential(response,attempt.challenge);}
  catch(error){if(active(view))view.onError(error);}
  finally{
   if(current===attempt){current=null;if(views.size)refresh();}
  }
 }
 function prepare(){
  // Focus returning is not proof of cancellation: a valid credential may still arrive.
  if(current&&(current.consumed||current.clicked||now()-current.createdAt<9*60*1000))return Promise.resolve(current);
  if(!pending)pending=Promise.all([loadLibrary(),requestChallenge()]).then(([google,challenge])=>{
   // An existing button may have opened a popup while the new challenge loaded.
   if(current&&(current.clicked||current.consumed))return current;
   const attempt={google,challenge,createdAt:now(),consumed:false,clicked:false};
   google.initialize({client_id:clientId,nonce:challenge.nonce,auto_select:false,ux_mode:'popup',callback:response=>receive(attempt,response)});
   current=attempt;views.forEach(view=>paint(view,attempt));return attempt;
  }).finally(()=>{pending=null;});
  // An exchange can finish while an idle renewal is still pending. If that
  // renewal kept the now-consumed attempt, prepare a usable challenge instead.
  return pending.then(attempt=>attempt===current?attempt:prepare());
 }
 function refresh(){
  return prepare().then(attempt=>views.forEach(view=>paint(view,attempt))).catch(error=>views.forEach(view=>{if(active(view)){view.slot.inert=false;view.slot.textContent='';view.onError(error);}}));
 }
 function returned(){
  if(page?.visibilityState==='hidden'||!current?.clicked||current.consumed)return;
  const attempt=current;cancel(recoveryTimer);
  recoveryTimer=schedule(()=>{
   if(current!==attempt||attempt.consumed)return;
   attempt.clicked=false;
   // Replace the button iframe without changing the nonce or the callback.
   views.forEach(view=>paint(view,attempt,true));
  },750);
 }
 function listen(add){
  const method=add?'addEventListener':'removeEventListener';
  for(const type of ['focus','pageshow'])events?.[method](type,returned);
  page?.[method]('visibilitychange',returned);
 }
 return {
  mount(slot,{canAccept=()=>true,onCredential,onError=()=>{}}){
   const view={id:String(++serial),slot,canAccept,onCredential,onError};
   if(!views.size)listen(true);
   views.set(view.id,view);slot.textContent='Google 로그인 버튼을 불러오고 있습니다.';
   prepare().then(attempt=>paint(view,attempt)).catch(error=>{if(active(view)){slot.textContent='';onError(error);}});
   return ()=>{
    views.delete(view.id);
    if(!views.size){cancel(recoveryTimer);listen(false);}
   };
  }
 };
}
