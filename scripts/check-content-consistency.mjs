import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {contentBundles,validateContentReviews} from './content-consistency.mjs';
const names=['data','specialties','introductions'];
const read=name=>JSON.parse(fs.readFileSync(`dist/${name}.json`,'utf8'));
const register=JSON.parse(fs.readFileSync('research/editorial/content-review.json','utf8'));
const args=process.argv.slice(2),base=args[0]==='--base'?args[1]:process.env.RELEASE_BASE_SHA;
let previous=null;
if(base&&!/^0+$/.test(base)){
 assert.match(base,/^(?:[a-f0-9]{7,40}|HEAD(?:\^|~\d+)?)$/);
 previous=contentBundles(...names.map(name=>JSON.parse(execFileSync('git',['show',`${base}:dist/${name}.json`],{encoding:'utf8',maxBuffer:8*1024*1024}))));
}
const count=validateContentReviews(contentBundles(...names.map(read)),register,previous);
console.log(`PASS: ${count}명 역할·소개·운용 설명의 검토 기록 일치. 게임 사실의 정확성은 편집 검토 대상입니다.`);
