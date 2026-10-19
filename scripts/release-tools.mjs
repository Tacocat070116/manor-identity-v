import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const versionPattern=/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
export function compareVersions(a,b){
 assert.match(a,versionPattern);assert.match(b,versionPattern);
 const left=a.split('.').map(Number),right=b.split('.').map(Number);
 for(let i=0;i<3;i++)if(left[i]!==right[i])return left[i]-right[i];
 return 0;
}
export function validateReleaseLog(log,packageVersion){
 assert.equal(log.stage,'BETA','모든 공개 버전에는 BETA 표시가 필요합니다.');
 assert.match(log.version,versionPattern);
 assert.equal(log.version,packageVersion,'패치노트와 package.json 버전이 다릅니다.');
 const validDate=date=>typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date;
 assert.ok(validDate(log.openedAt),'오픈일을 확인하세요.');
 assert.ok(Array.isArray(log.releases)&&log.releases.length>0,'패치노트가 필요합니다.');
 assert.equal(log.releases[0].version,log.version,'최신 패치노트의 버전이 일치해야 합니다.');
 const ids=new Set(),versions=new Set(),commits=new Set();let previousDate='9999-12-31',previousVersion=null;
 for(const release of log.releases){
  assert.match(release.id,/^[a-z0-9-]+$/);assert.ok(!ids.has(release.id),'중복 패치노트 ID');ids.add(release.id);
  assert.ok(validDate(release.date)&&release.date>=log.openedAt&&release.date<=previousDate,'패치노트는 최신 날짜부터 정렬해야 합니다.');previousDate=release.date;
  assert.ok(typeof release.title==='string'&&release.title.trim(),'업데이트 제목이 필요합니다.');
  assert.ok(release.changes?.length>0,'변경 내용이 필요합니다.');
  for(const change of release.changes){assert.ok(['추가','개선','수정','데이터'].includes(change.type));assert.ok(typeof change.text==='string'&&change.text.trim());}
  if(release.version!==null){
   assert.match(release.version,versionPattern);assert.ok(!versions.has(release.version),'중복 버전');versions.add(release.version);
   if(previousVersion)assert.ok(compareVersions(previousVersion,release.version)>0,'버전은 최신 순이어야 합니다.');previousVersion=release.version;
  }
  assert.ok(Array.isArray(release.commits));
  for(const commit of release.commits){assert.match(commit,/^[a-f0-9]{40}$/);assert.ok(!commits.has(commit),'중복 변경 이력');commits.add(commit);}
 }
 assert.equal(log.releases.find(release=>release.id==='opening')?.date,log.openedAt,'오픈 기록을 보존하세요.');
}
export function validateReleaseUpdate(current,previous){
 assert.ok(compareVersions(current.version,previous.version)>0,'사이트 변경 시 BETA 버전을 올리고 패치노트를 추가하세요.');
 assert.ok(!previous.releases.some(release=>release.id===current.releases[0].id),'새 업데이트 기록을 추가하세요.');
 const currentIds=new Set(current.releases.map(release=>release.id));
 for(const release of previous.releases)assert.ok(currentIds.has(release.id),'기존 패치노트를 삭제할 수 없습니다: '+release.id);
 assert.ok(current.releases.some(release=>release.version===previous.version),'이전 버전 기록을 보존하세요.');
 assert.equal(current.openedAt,previous.openedAt,'확인된 사이트 오픈일을 보존하세요.');
}
export function refreshPackage(root=process.cwd()){
 const dist=path.join(root,'dist'),done=new Map(),visiting=new Set();
 const hash=buffer=>createHash('sha256').update(buffer).digest('hex');
 function visit(file){
  if(done.has(file))return done.get(file);
  assert.ok(!visiting.has(file),'순환된 캐시 참조: '+file);visiting.add(file);
  let contents=fs.readFileSync(file);
  if(/\.(?:html|js)$/.test(file)){
   const before=contents.toString();
   const after=before.replace(/(['"])([./\w-]+\.(?:css|js|json))\?v=[\w.-]+\1/g,(match,quote,url)=>{
    const target=path.resolve(path.dirname(file),url);
    assert.ok(target.startsWith(dist+path.sep)&&fs.existsSync(target),'잘못된 캐시 참조: '+url);
    return quote+url+'?v='+visit(target).slice(0,12)+quote;
   });
   if(before!==after)fs.writeFileSync(file,after);
   contents=Buffer.from(after);
  }
  const digest=hash(contents);visiting.delete(file);done.set(file,digest);return digest;
 }
 visit(path.join(dist,'index.html'));
 const files=[...new Set(execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8'}).split('\0'))].filter(file=>file&&!['SHA256SUMS.txt','qa-summary.json'].includes(file)&&fs.existsSync(path.join(root,file))).sort();
 fs.writeFileSync(path.join(root,'SHA256SUMS.txt'),files.map(file=>hash(fs.readFileSync(path.join(root,file)))+'  '+file+'\n').join(''));
 return files.length;
}
