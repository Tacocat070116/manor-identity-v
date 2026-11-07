import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import vm from 'node:vm';
import {performance} from 'node:perf_hooks';

const base=process.argv[2]||'1bc9644efd0e8a155f94458b97aa892499509d10';
const before=path=>execFileSync('git',['show',`${base}:dist/${path}`],{maxBuffer:32*1024*1024});
const after=path=>fs.readFileSync('dist/'+path);
function startup(read){
 const files=new Set(['index.html']),html=read('index.html').toString();
 for(const match of html.matchAll(/<link rel="stylesheet" href="([^"?]+)(?:\?[^\"]*)?"/g))files.add(match[1]);
 function visit(file){
  if(files.has(file))return;files.add(file);
  for(const match of read(file).toString().matchAll(/^(?:import\s+(?:.*?\sfrom\s+)?|export\s+.*?\sfrom\s+)['"]\.\/([^'"?]+\.js)(?:\?[^'"]*)?['"]/gm))visit(match[1]);
 }
 visit('app.js');
 const boot=read('app.js').toString().split('async function boot()')[1];
 for(const match of boot.matchAll(/fetch\('([^'?]+\.json)/g))files.add(match[1]);
 const resources=[...files].map(file=>({file,bytes:read(file).length,gzipBytes:gzipSync(read(file)).length}));
 return {resources,requests:files.size,bytes:resources.reduce((n,r)=>n+r.bytes,0),gzipBytes:resources.reduce((n,r)=>n+r.gzipBytes,0)};
}
function evaluate(read,file,exports,context={}){
 const source=read(file).toString().replace(/^import[^\n]*\n/gm,'').replace(/^export\s+\{[^\n]*\n/gm,'').replace(/^export /gm,'');
 vm.runInNewContext(source+`\nglobalThis.api={${exports}};`,context);return context.api;
}
function median(fn){
 fn();const samples=[];
 for(let i=0;i<5;i++){const start=performance.now();fn();samples.push(performance.now()-start);}
 return Number(samples.sort((a,b)=>a-b)[2].toFixed(3));
}
const data=JSON.parse(after('data.json')),matches=JSON.parse(after('matches.json')),bans=JSON.parse(after('bans.json'));
function measure(read,optimized){
 const skills=evaluate(read,'skill-names.js','skillNamesFor,skillTextParts');
 const model=evaluate(read,'model.js','filterRows');
 const stats=evaluate(read,'statistics-model.js',optimized?'createTournamentStatistics':'tournamentStatistics',{...model,matchesCharacter:()=>true});
 const aggregate=optimized?stats.createTournamentStatistics(data.characters):(m,b,f)=>stats.tournamentStatistics(m,b,data.characters,f);
 return {
  repeatedStatistics20Ms:median(()=>{for(let i=0;i<20;i++)aggregate(matches,bans,{days:0,sort:i%2?'win':'pick'});}),
  skillFormatting267ParagraphsMs:median(()=>{for(const c of data.characters)for(const key of ['use','hold','caution'])skills.skillTextParts(c[key],skills.skillNamesFor(c.id));})
 };
}
const report={base,method:'Uncompressed bytes and independent gzip sizes of startup HTML/CSS/static JS imports/boot JSON; excludes images, headers and cache effects. Timings are local Node medians, not browser page-load measurements.',before:{startup:startup(before),cpu:measure(before,false)},after:{startup:startup(after),cpu:measure(after,true)}};
report.reduction={startupBytesPercent:Number((100*(1-report.after.startup.bytes/report.before.startup.bytes)).toFixed(1)),startupGzipPercent:Number((100*(1-report.after.startup.gzipBytes/report.before.startup.gzipBytes)).toFixed(1))};
console.log(JSON.stringify(report,null,2));
