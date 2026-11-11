import {renderScene} from './maps-renderer.js?v=c4fa0c7979f6';
import {validatePlan} from './maps-schema.js?v=2f4ecdd53a25';
import {visibleItems,SITUATIONS} from './maps-model.js?v=d29d1c20e4a9';
export function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
export function exportJSON(plan){downloadBlob(new Blob([JSON.stringify(validatePlan(plan),null,2)],{type:'application/json'}),'MANOR-'+plan.mapId+'.json');}
export async function importJSON(file){if(!file||file.size>65536)throw Error('64KB 이하의 MANOR 전술 JSON 파일을 선택해 주세요.');let input;try{input=JSON.parse(await file.text());}catch{throw Error('전술 파일을 읽을 수 없습니다. JSON 형식을 확인해 주세요.');}return validatePlan(input);}
async function dataURL(url){const resolved=new URL(url,location.href);if(resolved.origin!==location.origin)throw Error('지도 이미지 출처를 확인해 주세요.');const response=await fetch(resolved,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('지도 이미지를 불러오지 못했습니다.');const blob=await response.blob();return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('이미지를 읽지 못했습니다.'));reader.readAsDataURL(blob);});}
function loadImage(url){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('이미지를 만들지 못했습니다.'));image.src=url;});}
export async function createMapPNG(map,plan,{step=0,floor='ground',layers,characters={}}={}){
 const items=visibleItems(plan,step,floor,layers),imageUrl=await dataURL(map.floors.find(f=>f.id===floor).image),portraitUrls={};
 await Promise.all([...new Set(items.map(i=>i.characterId).filter(Boolean))].map(async id=>{try{portraitUrls[id]=await dataURL(characters[id]?.portrait);}catch{/* A named token remains legible when a portrait is unavailable. */}}));
 const source=renderScene(map,{floor,items,layers,characters,exporting:true,imageUrl,portraitUrls}),url=URL.createObjectURL(new Blob([source],{type:'image/svg+xml;charset=utf-8'}));
 try{
  const image=await loadImage(url),canvas=document.createElement('canvas'),width=1600,mapHeight=Math.round(width*map.bounds.height/map.bounds.width),ctx=canvas.getContext('2d');canvas.width=width;canvas.height=mapHeight+210;
  ctx.fillStyle='#f6f5eb';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#173f31';ctx.font='bold 32px sans-serif';ctx.fillText('MANOR MAPS · BETA',36,48);ctx.font='24px sans-serif';ctx.fillText(plan.title.slice(0,55),36,88);ctx.font='19px sans-serif';ctx.fillText(`${map.name} · ${plan.steps[step].title} · ${floor==='ground'?'야외':floor==='f1'?'1층':'2층'} · ${SITUATIONS[plan.conditions.situation]} · ${plan.conditions.server==='global'?'글로벌':'중국'} · ${plan.conditions.mode==='practice'?'연습':'일반 1 대 4'}`,36,124);
  ctx.drawImage(image,0,150,width,mapHeight);ctx.fillStyle='#173f31';ctx.font='16px sans-serif';ctx.fillText('자료: Identity V / NetEase · BWIKI · '+map.revision+' · 표식은 사용자 가정 · 현재 게임 배치 미검증',24,mapHeight+188);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('이미지 저장을 완료하지 못했습니다.');return blob;
 }finally{URL.revokeObjectURL(url);}
}

export async function exportPNG(map,plan,options){const blob=await createMapPNG(map,plan,options);downloadBlob(blob,'MANOR-'+plan.mapId+'-step-'+((options?.step||0)+1)+'.png');}
