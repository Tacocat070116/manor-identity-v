import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {validateReleaseLog,refreshPackage} from './release-tools.mjs';

const log=JSON.parse(fs.readFileSync('dist/releases.json','utf8'));
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
validateReleaseLog(log,pkg.version);
const args=process.argv.slice(2);
const announce=args[0]==='--announce';
const [bump,title,...notes]=announce?args.slice(1):args;
if(!announce)assert.ok(!args.length||(args.length===1&&bump==='--refresh'),'패치 공지는 운영자가 공개를 요청한 때만 작성합니다. 일반 수정은 npm run release -- --refresh를 사용하세요.');
if(announce){
 assert.ok(['patch','minor','major'].includes(bump)&&title?.trim()&&notes.length,'사용법: npm run release -- --announce patch "제목" "수정: 변경 내용"');
 const parts=log.version.split('.').map(Number),index={major:0,minor:1,patch:2}[bump];
 parts[index]++;for(let i=index+1;i<3;i++)parts[i]=0;
 const version=parts.join('.');
 const changes=notes.map(note=>{const index=note.indexOf(':');assert.ok(index>0,'변경 유형과 내용을 콜론으로 구분하세요.');return {type:note.slice(0,index).trim(),text:note.slice(index+1).trim()};});
 const date=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date());
 log.releases.unshift({id:'beta-'+version.replaceAll('.','-'),version,date,title:title.trim(),changes,commits:[]});
 log.version=version;pkg.version=version;
 validateReleaseLog(log,pkg.version);
 fs.writeFileSync('dist/releases.json',JSON.stringify(log,null,2)+'\n');
 fs.writeFileSync('package.json',JSON.stringify(pkg,null,2)+'\n');
}
execFileSync('python3',['scripts/public_payload.py','--write'],{stdio:'inherit'});
console.log(`BETA v${log.version} · 캐시와 ${refreshPackage()}개 파일의 검증 해시를 갱신했습니다.`);
