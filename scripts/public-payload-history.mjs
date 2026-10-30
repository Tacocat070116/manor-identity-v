import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// Public v1.16.0 blobs from main commit 18c5b835e4359bf6b932da3395c79e8374aa0f65.
// Read existing Git history instead of publishing a separate metadata archive.
const sources={
 'data.json':{blob:'1af4a68fdf57d1d578f1f26812331e98b8c435c3',groups:['characters','matchups']},
 'ranked/index.json':{blob:'7027de9b3ebb659a90e0f00ec227c5b9769d102b',groups:['datasets']},
};
const root=fileURLToPath(new URL('../',import.meta.url));
const cache=new Map();

export function withRetiredFields(filename,payload){
 const source=sources[filename];
 if(!source)throw new Error('Unknown public payload: '+filename);
 if(!cache.has(filename))cache.set(filename,JSON.parse(execFileSync('git',['cat-file','blob',source.blob],{cwd:root,encoding:'utf8',maxBuffer:4*1024*1024})));
 const original=cache.get(filename),restored=structuredClone(payload);
 for(const group of source.groups){
  const byId=new Map(original[group].map(row=>[row.id,row]));
  for(const row of restored[group]){
   for(const [key,value] of Object.entries(byId.get(row.id)||{})){
    if(!Object.hasOwn(row,key))row[key]=structuredClone(value);
   }
  }
 }
 return restored;
}
