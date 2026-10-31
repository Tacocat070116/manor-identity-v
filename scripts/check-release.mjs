import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {validateReleaseLog,validateReleaseUpdate,compareVersions} from './release-tools.mjs';

const log=JSON.parse(fs.readFileSync('dist/releases.json','utf8'));
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
validateReleaseLog(log,pkg.version);
const args=process.argv.slice(2),base=args[0]==='--base'?args[1]:process.env.RELEASE_BASE_SHA;
if(base&&!/^0+$/.test(base)){
 assert.match(base,/^(?:[a-f0-9]{7,40}|HEAD(?:\^|~\d+)?)$/,'확인할 기준 커밋이 올바르지 않습니다.');
 const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
 git('rev-parse','--verify',base+'^{commit}');
 const changed=git('diff','--name-only',base,'--','dist');
 const added=git('ls-files','--others','--exclude-standard','--','dist');
 if(changed||added){
  const priorFiles=git('ls-tree','-r','--name-only',base).split('\n');
  if(priorFiles.includes('dist/releases.json')){
   const previous=JSON.parse(git('show',base+':dist/releases.json'));
   const editsPath='operations/release-copy-edits.json';
   const copyEdits=fs.existsSync(editsPath)?JSON.parse(fs.readFileSync(editsPath,'utf8')).edits:[];
   validateReleaseUpdate(log,previous,{copyEdits});
  }
  else assert.ok(compareVersions(log.version,JSON.parse(git('show',base+':package.json')).version)>0,'버전 관리 도입 시 사이트 버전을 올려야 합니다.');
 }
}
console.log(`PASS: BETA v${log.version}, ${log.releases.length}개 패치노트와 버전 일치 확인.`);
