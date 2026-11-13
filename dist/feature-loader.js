// Keep feature code and styles off the startup path. Failed loads remain retryable.
export function createStyleLoader(doc=globalThis.document){
 const pending=new Map();
 return function loadStyle(name){
  if(pending.has(name))return pending.get(name);
  const link=doc.querySelector(`[data-lazy-style="${name}"]`);
  if(!link)return Promise.reject(Error('화면 스타일을 찾지 못했습니다.'));
  if(link.sheet)return Promise.resolve();
  const task=new Promise((resolve,reject)=>{
   const finish=error=>{
    clearTimeout(timer);link.removeEventListener('load',loaded);link.removeEventListener('error',failed);
    if(error){link.removeAttribute('href');reject(error);}else resolve();
   };
   const loaded=()=>finish(),failed=()=>finish(Error('화면 스타일을 불러오지 못했습니다. 다시 시도해 주세요.'));
   const timer=setTimeout(failed,15000);
   link.addEventListener('load',loaded);link.addEventListener('error',failed);
   link.rel='stylesheet';link.href=link.dataset.href;
  }).catch(error=>{pending.delete(name);throw error;});
  pending.set(name,task);return task;
 };
}

export function createFeatureLoader(definitions,loadStyle){
 const pending=new Map();
 return function loadFeature(name){
  if(pending.has(name))return pending.get(name);
  const definition=definitions[name];
  if(!definition)return Promise.reject(Error('화면 구성을 찾지 못했습니다.'));
  const task=Promise.all([definition.load(),...definition.styles.map(loadStyle)])
   .then(([module])=>module).catch(error=>{pending.delete(name);throw error;});
  pending.set(name,task);return task;
 };
}

export const loadFeature=createFeatureLoader({
 statistics:{load:()=>import('./statistics.js?v=1e88da2f87ba'),styles:[]},
 feedback:{load:()=>import('./feedback.js?v=1f4e90a9cd4b'),styles:['participation','feedback']},
 laboratory:{load:()=>import('./synergy.js?v=e170e4deefca'),styles:['participation','synergy']},
 tips:{load:()=>import('./matchup-tips.js?v=c1249200e175'),styles:['participation','matchup-tips']},
 recovery:{load:()=>import('./participation.js?v=8a4b3087a8ed'),styles:['participation']},
 highlights:{load:()=>import('./research-highlights.js?v=c0b1d60f757a'),styles:['synergy']}
},createStyleLoader());
