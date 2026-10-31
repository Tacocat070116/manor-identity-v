import {skillNamesFor,skillTextParts} from './skill-names.js?v=42deca43e1bd';
// Presentation only: keep saved text, URLs, editable values and code unchanged.
const excluded='script,style,textarea,input,select,code,pre,kbd,samp,math,svg,[contenteditable],.inline-copy';
const separators=/[ \t\u00a0\u2000-\u200a\u202f\u205f\u3000]*[·•ㆍ∙‧][ \t\u00a0\u2000-\u200a\u202f\u205f\u3000]*/g;
export function normalizeSeparators(value){
 return String(value).split(/(https?:\/\/[^\s]+)/g).map(part=>/^https?:\/\//.test(part)?part:part.replace(separators,'\u202f·\u202f')).join('');
}
export function inlineTextParts(value,skillNames=[]){
 const text=normalizeSeparators(value),parts=[];
 const quoted=/https?:\/\/[^\s]+|‘([^‘’\n]+)’|“([^“”\n]+)”|(?<![A-Za-z0-9/@])'([^'\n]+)'(?![A-Za-z0-9])|"([^"\n]+)"/g;
 let offset=0;
 for(const match of text.matchAll(quoted)){
  if(match[0].startsWith('http'))continue;
  if(match.index>offset)parts.push({text:text.slice(offset,match.index),strong:false});
  parts.push({text:match.slice(1).find(part=>part!==undefined),strong:true});
  offset=match.index+match[0].length;
 }
 if(offset<text.length)parts.push({text:text.slice(offset),strong:false});
 return parts.flatMap(part=>part.strong?[part]:skillTextParts(part.text,skillNames));
}
export function formatTypography(root){
 const doc=root.ownerDocument||root,walker=doc.createTreeWalker(root,4),nodes=[];
 for(let node=walker.nextNode();node;node=walker.nextNode()){
  if(!node.parentElement?.closest(excluded)&&(/[·•ㆍ∙‧‘’“”'"]/.test(node.data)||node.parentElement?.closest('[data-skill-characters]')))nodes.push(node);
 }
 for(const node of nodes){
  const scope=node.parentElement?.closest('[data-skill-characters]');
  const parts=inlineTextParts(node.data,node.parentElement?.closest('strong,b')?[]:skillNamesFor(scope?.dataset.skillCharacters));
  if(!parts.some(part=>part.strong)){
   const text=parts.map(part=>part.text).join('');
   if(text!==node.data)node.data=text;
   continue;
  }
  // One text flow stays one flex/grid child even when it contains emphasis.
  const flow=doc.createElement('span');flow.className='inline-copy';
  for(const part of parts){
   if(part.strong){const strong=doc.createElement('strong');strong.className='text-emphasis';strong.textContent=part.text;flow.append(strong);}
   else flow.append(doc.createTextNode(part.text));
  }
  node.replaceWith(flow);
 }
}
export const spaceSeparators=formatTypography;

if(globalThis.document?.body&&globalThis.MutationObserver){
 const root=document.body,settings={childList:true,subtree:true,characterData:true};
 const observer=new MutationObserver(records=>{
  observer.disconnect();
  const roots=new Set(records.flatMap(record=>record.type==='characterData'?[record.target.parentElement]:[...record.addedNodes].map(n=>n.nodeType===3?n.parentElement:n)).filter(n=>n?.isConnected&&n.nodeType===1));
  for(const node of roots)formatTypography(node);
  observer.observe(root,settings);
 });
 formatTypography(root);observer.observe(root,settings);
}
