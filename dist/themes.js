export const colorThemes=Object.freeze([
 {id:'light',name:'화이트',mode:'light',bg:'#e9f1ed',surface:'#f6faf7',ink:'#192e29',muted:'#53685d',accent:'#17634e',onAccent:'#ffffff'},
 {id:'dark',name:'다크',mode:'dark',bg:'#101e19',surface:'#1c3027',ink:'#edf6f0',muted:'#adc1b5',accent:'#9fd9bb',onAccent:'#101c19'},
 {id:'ocean',name:'오션',mode:'light',bg:'#e7eff7',surface:'#f6f9fd',ink:'#1a2d42',muted:'#50647b',accent:'#275e91',onAccent:'#ffffff'},
 {id:'lavender',name:'라벤더',mode:'light',bg:'#efebf7',surface:'#faf8fe',ink:'#302840',muted:'#696077',accent:'#695096',onAccent:'#ffffff'},
 {id:'rose',name:'로즈',mode:'light',bg:'#f7ebee',surface:'#fff8fa',ink:'#422a33',muted:'#7a5965',accent:'#9b4965',onAccent:'#ffffff'},
 {id:'sand',name:'샌드',mode:'light',bg:'#f3eee5',surface:'#fcfaf5',ink:'#3b3227',muted:'#70614c',accent:'#88642d',onAccent:'#ffffff'},
 {id:'midnight',name:'미드나이트',mode:'dark',bg:'#111b2c',surface:'#1b2a40',ink:'#edf3fc',muted:'#acbbd2',accent:'#a4c7f3',onAccent:'#14243a'},
 {id:'plum',name:'플럼',mode:'dark',bg:'#231b2d',surface:'#31253f',ink:'#f4effa',muted:'#c4b4d3',accent:'#d8b7ee',onAccent:'#2b1b3a'}
].map(theme=>Object.freeze(theme)));

export function resolveTheme(id,prefersDark=false){
 return colorThemes.find(theme=>theme.id===id)||colorThemes[prefersDark?1:0];
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
 return colorThemes.map(theme=>`<label class="theme-option"><input type="radio" name="color-theme" value="${theme.id}" ${theme.id===selected?'checked':''}><span class="theme-option-card"><span class="theme-preview" aria-hidden="true" style="--preview-bg:${theme.bg};--preview-surface:${theme.surface};--preview-ink:${theme.ink};--preview-accent:${theme.accent}"><span class="theme-preview-bar"><i></i><i></i></span><span class="theme-preview-content"><span class="theme-preview-lines"><i></i><i></i><i></i></span><span class="theme-preview-tile"></span></span></span><span class="theme-option-label"><span>${theme.name}</span><span class="theme-check" aria-hidden="true">${checkIcon}</span></span></span></label>`).join('');
}
