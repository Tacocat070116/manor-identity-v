import {selectRanked} from './statistics-model.js?v=da7a6f69a1d6';

// One repository per app session owns partition requests and hydrated rows.
// Failed requests are evicted; successful requests retain no raw tuple arrays.
export function createRankedLoader({characters,loadIndex,loadJSON}){
 const files=new Map();
 function loadFile(path,message,version,transform=value=>value){
  if(!/^ranked\/[a-z0-9-]+\.json$/.test(path||'')||!/^[a-f0-9]{12}$/.test(version||''))throw Error('랭킹전 자료 경로를 확인하지 못했습니다.');
  const url=path+'?v='+version;
  if(!files.has(url))files.set(url,loadJSON(url,message,{cache:'no-cache'}).then(transform).catch(error=>{files.delete(url);throw error;}));
  return files.get(url);
 }
 function character(id){
  const c=characters[id];
  if(!c)throw Error('통계 캐릭터 정보를 확인하지 못했습니다.');
  return {id:c.id,name:c.name,side:c.side};
 }
 const rankedRow=([id,pick,win,draw,loss,ban])=>({...character(id),pick,win,draw,loss,ban});
 async function hydrate(selected,datasets,versions,toRow,message,missing){
  if(!selected||selected.rows)return;
  await loadFile(selected.path,message,versions[selected.path],part=>{
   const targets=new Map(datasets.map(d=>[d.id,d]));
   const hydrated=part.datasets.flatMap(entry=>{
    const target=targets.get(entry.id);
    return target?[{target,rows:entry.rows.map(toRow)}]:[];
   });
   // Validate the whole partition before changing any shared dataset.
   if(!hydrated.some(entry=>entry.target===selected))throw Error(missing);
   for(const {target,rows} of hydrated)target.rows=rows;
  });
  if(!selected.rows)throw Error(missing);
 }
 return {
  async load(filters={}){
   const data=await loadIndex(),selection=selectRanked(data,filters);
   await hydrate(selection.dataset,data.datasets,data.assetVersions,rankedRow,'선택한 시즌 자료를 불러오지 못했습니다.','선택한 통계 항목을 확인하지 못했습니다.');
   return data;
  }
 };
}
