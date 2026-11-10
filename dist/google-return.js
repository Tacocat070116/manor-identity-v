// Clear the credential before loading dependencies, including when they fail.
// No analytics or third-party scripts run on this callback page.
export async function completeGoogleReturn({location=globalThis.location,history=globalThis.history,document=globalThis.document,load=()=>Promise.all([import('./google-redirect.js?v=ed402332fa0c'),import('./participation.js?v=8a4b3087a8ed'),import('./google-account.js?v=d8f8d27ca539')])}={}){
 const status=document.getElementById('login-status');
 try{
  const fragment=location.hash;
  history.replaceState(null,'',location.pathname);
  const [{finishGoogleRedirect},{participation,PARTICIPATION_ORIGIN},{authRequest,googleConfig,ACCOUNT_KEY}]=await load();
  const config=await googleConfig(PARTICIPATION_ORIGIN);
  if(!config.enabled)throw Error('Google 로그인을 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.');
  const destination=await finishGoogleRedirect({fragment,origin:PARTICIPATION_ORIGIN,clientId:config.clientId,store:participation,request:authRequest,accountKey:ACCOUNT_KEY,signal:AbortSignal.timeout(15000)});
  status.textContent='로그인이 완료되었습니다. MANOR로 돌아갑니다.';
  location.replace(destination);
 }catch(error){
  status.textContent=error.name==='AbortError'?'로그인 연결이 지연됩니다. MANOR에서 다시 시도해 주세요.':error instanceof TypeError?'로그인 화면을 불러오지 못했습니다. MANOR에서 다시 시도해 주세요.':error.message||'로그인을 완료하지 못했습니다. MANOR에서 다시 시도해 주세요.';
  status.classList.add('is-error');
 }
}
if(globalThis.document&&globalThis.location)completeGoogleReturn();
