export const colorThemes=Object.freeze([
 {id:'white',name:'화이트',mode:'light',bg:'#ffffff',surface:'#ffffff',ink:'#171717',muted:'#505050',accent:'#242424',onAccent:'#ffffff'},
 {id:'black',name:'블랙',mode:'dark',bg:'#000000',surface:'#141414',ink:'#f5f5f5',muted:'#c4c4c4',accent:'#f2f2f2',onAccent:'#111111'},
 {id:'light',name:'민트',mode:'light',bg:'#e9f1ed',surface:'#f6faf7',ink:'#192e29',muted:'#40594d',accent:'#145a46',onAccent:'#ffffff'},
 {id:'dark',name:'다크',mode:'dark',bg:'#101e19',surface:'#1c3027',ink:'#edf6f0',muted:'#c2d3c7',accent:'#a8e0c3',onAccent:'#101c19'},
 {id:'ocean',name:'오션',mode:'light',bg:'#e7eff7',surface:'#f6f9fd',ink:'#1a2d42',muted:'#3c536d',accent:'#215583',onAccent:'#ffffff'},
 {id:'lavender',name:'라벤더',mode:'light',bg:'#efebf7',surface:'#faf8fe',ink:'#302840',muted:'#51445f',accent:'#604589',onAccent:'#ffffff'},
 {id:'rose',name:'로즈',mode:'light',bg:'#f7ebee',surface:'#fff8fa',ink:'#422a33',muted:'#624351',accent:'#8a3e58',onAccent:'#ffffff'},
 {id:'sand',name:'샌드',mode:'light',bg:'#f3eee5',surface:'#fcfaf5',ink:'#3b3227',muted:'#594c3a',accent:'#765424',onAccent:'#ffffff'},
 {id:'midnight',name:'미드나이트',mode:'dark',bg:'#111b2c',surface:'#1b2a40',ink:'#edf3fc',muted:'#c0cde0',accent:'#b5d3fa',onAccent:'#14243a'},
 {id:'plum',name:'플럼',mode:'dark',bg:'#231b2d',surface:'#31253f',ink:'#f4effa',muted:'#d4c5df',accent:'#e1c4f3',onAccent:'#2b1b3a'},
 {id:'christmas',name:'크리스마스',mode:'light',bg:'#faf5eb',surface:'#fffdf7',ink:'#193c2e',muted:'#445447',accent:'#8d2036',onAccent:'#ffffff',action:'#a8243b',onAction:'#ffffff'}
].map(theme=>Object.freeze({action:theme.accent,onAction:theme.onAccent,...theme})));

export function resolveTheme(id,prefersDark=false){
 return colorThemes.find(theme=>theme.id===id)||colorThemes.find(theme=>theme.id===(prefersDark?'dark':'light'));
}
export function readTheme(storage,prefersDark=false){
 try{return resolveTheme(storage?.getItem('manor-theme'),prefersDark);}catch{return resolveTheme(null,prefersDark);}
}
export function applyTheme(id,{document,storage,remember=true}){
 const theme=resolveTheme(id);
 document.documentElement.dataset.theme=theme.id;
 const meta=document.querySelector('meta[name="theme-color"]');
 if(meta)meta.content=theme.bg;
 let saved=null;
 if(remember){try{if(!storage)throw Error('Storage unavailable');storage.setItem('manor-theme',theme.id);saved=true;}catch{saved=false;}}
 return {theme,saved};
}
export function themeOptions(selected,checkIcon){
 return colorThemes.map(theme=>`<label class="theme-option"><input type="radio" name="color-theme" value="${theme.id}" ${theme.id===selected?'checked':''}><span class="theme-option-card"><span class="theme-preview" aria-hidden="true" style="--preview-bg:${theme.bg};--preview-surface:${theme.surface};--preview-ink:${theme.ink};--preview-accent:${theme.accent};--preview-action:${theme.action}"><span class="theme-preview-bar"><i></i><i></i></span><span class="theme-preview-content"><span class="theme-preview-lines"><i></i><i></i><i></i></span><span class="theme-preview-tile"></span></span></span><span class="theme-option-label"><span>${theme.name}</span><span class="theme-check" aria-hidden="true">${checkIcon}</span></span></span></label>`).join('');
}
