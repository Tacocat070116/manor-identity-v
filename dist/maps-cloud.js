import {ACCOUNT_KEY,PARTICIPATION_ORIGIN,authRequest} from './account-api.js?v=f1b44b39b0a6';
import {validatePlan,isPlanId} from './maps-schema.js?v=2f4ecdd53a25';
export function mapAccount(storage){try{storage??=globalThis.localStorage;const a=JSON.parse(storage.getItem(ACCOUNT_KEY)||'null');return a?.expiresAt>Date.now()&&/^[a-f0-9]{64}$/.test(a?.token||'')&&/^[a-f0-9]{64}$/.test(a?.accountId||'')?a:null;}catch{return null;}}
export function createMapCloud({request=authRequest,origin=PARTICIPATION_ORIGIN,session=mapAccount,fetcher=globalThis.fetch}={}){
 const controllers=new Set(),owner=session()?.accountId;let disposed=false;
 const changedAccount=()=>Object.assign(Error('계정이 변경되었습니다. 현재 계정의 전술을 다시 선택해 주세요.'),{code:'account_changed'});
 async function call(path,body){if(disposed)throw Error('전술 화면이 닫혔습니다. 다시 열어 주세요.');const account=session();if(!account)throw Error('계정 저장과 공유는 로그인 후 이용할 수 있습니다.');if(account.accountId!==owner)throw changedAccount();const controller=new AbortController();controllers.add(controller);const timer=setTimeout(()=>controller.abort(),15000);
  try{const data=await request(origin,path,{token:account.token,body,signal:controller.signal});if(disposed||session()?.token!==account.token)throw changedAccount();return data;}finally{clearTimeout(timer);controllers.delete(controller);}}
 return {list:()=>call('map-plans'),read:id=>call('map-plans/'+id),save:(plan,revision)=>call('map-plans',{action:'save',plan:validatePlan(plan),revision}),remove:(id,revision)=>call('map-plans',{action:'delete',id,revision}),shares:()=>call('map-shares'),publish:(planId,revision,id)=>call('map-shares',{action:'create',planId,revision,id}),revoke:id=>call('map-shares',{action:'revoke',id}),
  async shared(id){if(!isPlanId(id))throw Error('공유 주소를 확인해 주세요.');const controller=new AbortController();controllers.add(controller);const timer=setTimeout(()=>controller.abort(),15000);try{const response=await fetcher(origin+'/api/maps/shared/'+id,{cache:'no-store',credentials:'omit',redirect:'error',signal:controller.signal});if(response.redirected||!response.headers.get('content-type')?.includes('application/json'))throw Error('공유 전술을 불러오지 못했습니다.');const data=await response.json();if(!response.ok)throw Error(data.error||'공유 전술을 불러오지 못했습니다.');return {...data,plan:validatePlan(data.plan)};}finally{clearTimeout(timer);controllers.delete(controller);}},
  destroy(){disposed=true;for(const c of controllers)c.abort();controllers.clear();}
 };
}
