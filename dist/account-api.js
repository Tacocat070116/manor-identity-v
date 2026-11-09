export const ACCOUNT_KEY='manor-google-session';
export const ACCOUNT_CHANGED='manor-account-changed';
export const PARTICIPATION_ORIGIN='https://manor-feedback.tacocat070116.chatgpt.site';
export async function authRequest(origin,path,{token='',body,signal,fetcher=globalThis.fetch}={}){
 const response=await fetcher(origin+'/api/auth/'+path,{method:body===undefined?'GET':'POST',credentials:'omit',cache:'no-store',redirect:'error',signal,headers:{Accept:'application/json',...(body===undefined?{}:{'Content-Type':'application/json'}),...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 if(response.redirected||!response.headers.get('content-type')?.includes('application/json'))throw Error('로그인 서버 응답을 확인하지 못했습니다. 다시 시도해 주세요.');
 const data=await response.json();
 if(!response.ok){const error=Error(data.error||'로그인을 처리하지 못했습니다.');error.code=data.code;error.status=response.status;throw error;}
 return data;
}
