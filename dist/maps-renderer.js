import {STATE_LABELS,TOOL_LABELS} from './maps-model.js?v=d29d1c20e4a9';
export const mapEscape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const e=mapEscape;
export const INKS={green:'#15785b',red:'#bd3745',blue:'#246fc7',gold:'#a56b08',purple:'#8153bb'};
const glyph={pallet:'▰',window:'▯',cipher:'⌨',chair:'♜',spawn:'◎',gate:'⇥',number:'1',note:'≡',character:'●'};
export function renderItem(item,{characters={},selected='',exporting=false,portraitUrls={}}={}){
 const ink=INKS[item.color],label=item.label||characters[item.characterId]?.name||'',line=item.needsReview?' stroke-dasharray="8 5"':'',inactive=item.state!=='ready';
 const attr=`data-map-item="${item.id}" tabindex="0" role="button" aria-label="${e(label||TOOL_LABELS[item.kind])} · ${e(STATE_LABELS[item.state])}${item.needsReview?' · 경로 재확인 필요':''}"`;
 let art='';
 if(['path','arrow'].includes(item.kind)){
  const points=item.points.map(p=>p.join(',')).join(' ');
  art=`<polyline points="${points}" fill="none" stroke="white" stroke-width="8" opacity=".8"/><polyline points="${points}" fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#map-arrow-${item.color})"${line}/>`;
 }else if(item.kind==='area')art=`<circle cx="${item.x}" cy="${item.y}" r="${item.radius}" fill="${ink}" fill-opacity=".2" stroke="${ink}" stroke-width="3" stroke-dasharray="7 5"/>`;
 else{
  const portrait=portraitUrls[item.characterId]||(!exporting?characters[item.characterId]?.portrait:'');
  art=`<circle cx="${item.x}" cy="${item.y}" r="20" fill="${ink}" stroke="white" stroke-width="3"/>${item.kind==='character'&&portrait?`<defs><clipPath id="pin-${item.id}"><circle cx="${item.x}" cy="${item.y}" r="17"/></clipPath></defs><image href="${e(portrait)}" x="${item.x-17}" y="${item.y-17}" width="34" height="34" clip-path="url(#pin-${item.id})"/>`:`<text x="${item.x}" y="${item.y+6}" text-anchor="middle" fill="white" font-size="20" font-weight="700">${e(item.kind==='number'?label.slice(0,3):glyph[item.kind]||'●')}</text>`}`;
 }
 if(selected===item.id)art+=`<circle cx="${item.x}" cy="${item.y}" r="27" fill="none" stroke="#f0bc42" stroke-width="3" stroke-dasharray="4 3"/>`;
 if(inactive)art+=`<circle cx="${item.x+18}" cy="${item.y-17}" r="8" fill="${item.state==='blocked'?'#b93838':'#23362f'}" stroke="white" stroke-width="2"/>`;
 if(label&&item.kind!=='number')art+=`<text x="${item.x}" y="${item.y+38}" text-anchor="middle" fill="#15382d" stroke="white" stroke-width="4" paint-order="stroke" font-size="14" font-weight="700">${e(label.slice(0,34))}</text>`;
 return `<g ${exporting?'':attr} class="map-item${selected===item.id?' is-selected':''}" opacity="${inactive ? .82 : 1}">${art}</g>`;
}
export function renderScene(map,{floor='ground',items=[],layers=new Set(),characters={},selected='',view,exporting=false,imageUrl,portraitUrls={}}={}){
 const bounds=map.bounds,box=view?`${view.x} ${view.y} ${bounds.width/view.scale} ${bounds.height/view.scale}`:`0 0 ${bounds.width} ${bounds.height}`;
 const ground=map.floors.find(f=>f.id===floor)||map.floors[0];
 return `<svg class="maps-scene" xmlns="http://www.w3.org/2000/svg" viewBox="${box}" aria-label="${e(map.name+' · '+ground.name+' 지도')}" role="group"><defs>${Object.entries(INKS).map(([name,color])=>`<marker id="map-arrow-${name}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10Z" fill="${color}"/></marker>`).join('')}</defs><rect width="${bounds.width}" height="${bounds.height}" fill="#202a27"/>${layers.has('terrain')?`<image href="${e(imageUrl||ground.image)}" width="${bounds.width}" height="${bounds.height}"/>`:''}${layers.has('landmarks')?map.landmarks.filter(p=>!p.floor||p.floor===floor).map(p=>`<g class="map-landmark" ${exporting?'':`data-map-landmark="${p.id}" tabindex="0" role="button" aria-label="${e(p.name)} 구역"`}><circle cx="${p.x}" cy="${p.y}" r="5" fill="#fff8d1" stroke="#263d32" stroke-width="2"/><text x="${p.x}" y="${p.y-11}" text-anchor="middle" font-size="14" font-weight="700" fill="#263d32" stroke="#fff8e3" stroke-width="4" paint-order="stroke">${e(p.name)}</text></g>`).join(''):''}<g class="maps-items">${items.map(i=>renderItem(i,{characters,selected,exporting,portraitUrls})).join('')}</g><g class="maps-draft" aria-hidden="true"></g></svg>`;
}
