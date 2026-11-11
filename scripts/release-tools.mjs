import assert from 'node:assert/strict';
import {releaseTypes} from '../dist/releases.js';
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
  for(const change of release.changes){assert.ok(releaseTypes.includes(change.type));assert.ok(typeof change.text==='string'&&change.text.trim());}
  if(release.version!==null){
   assert.match(release.version,versionPattern);assert.ok(!versions.has(release.version),'중복 버전');versions.add(release.version);
   if(previousVersion)assert.ok(compareVersions(previousVersion,release.version)>0,'버전은 최신 순이어야 합니다.');previousVersion=release.version;
  }
  assert.ok(Array.isArray(release.commits));
  for(const commit of release.commits){assert.match(commit,/^[a-f0-9]{40}$/);assert.ok(!commits.has(commit),'중복 변경 이력');commits.add(commit);}
 }
 assert.equal(log.releases.find(release=>release.id==='opening')?.date,log.openedAt,'오픈 기록을 보존하세요.');
}
export const releaseDigest=log=>createHash('sha256').update(JSON.stringify(log)).digest('hex');
function validateConsolidation(current,previous,record){
 const message='공지 통합은 같은 날짜의 원본 항목·유형·커밋과 오픈 정보를 보존해야 합니다.';
 assert.equal(record.grouping,'same-day-asia-seoul',message);
 assert.ok(compareVersions(current.version,previous.version)<0,'공지 통합의 버전 재정렬을 확인하세요.');
 assert.ok(current.releases.length<previous.releases.length,message);
 const metadata=({version,releases,...rest})=>rest;
 assert.deepEqual(metadata(current),metadata(previous),message);
 assert.equal(record.groups.length,current.releases.length,message);
 assert.deepEqual([...record.groups].reverse().flatMap(group=>group.sourceIds),[...previous.releases].reverse().map(release=>release.id),message);
 assert.equal(new Set(record.groups.map(group=>group.date)).size,record.groups.length,message);
 const sources=new Map(previous.releases.map(release=>[release.id,release]));
 const edits=new Map();
 for(const edit of record.versionReferenceEdits||[]){
  const source=sources.get(edit.sourceId),key=edit.sourceId+':'+edit.changeIndex;
  assert.ok(source&&Number.isInteger(edit.changeIndex)&&edit.changeIndex>=0&&edit.changeIndex<source.changes.length,message);
  assert.ok(!edits.has(key)&&edit.reason?.trim()&&typeof edit.after==='string'&&edit.after.trim(),message);
  assert.equal(source.changes[edit.changeIndex].text,edit.before,message);
  assert.match(edit.before,/\bv\d+\.\d+\.\d+/,'통합 문구 교정은 이전 버전 참조에 한정합니다.');
  edits.set(key,edit.after);
 }
 for(const [index,group] of record.groups.entries()){
  assert.ok(group.sourceIds.length>0,message);
  const originals=group.sourceIds.map(id=>sources.get(id));
  assert.ok(originals.every(release=>release&&release.date===group.date),message);
  const changes=originals.flatMap(release=>release.changes.map((change,i)=>({...change,text:edits.get(release.id+':'+i)??change.text})));
  const expected={id:group.id,version:group.version,date:group.date,title:group.title,changes,commits:originals.flatMap(release=>release.commits)};
  assert.deepEqual(current.releases[index],expected,message);
 }
 const chronological=[...current.releases].reverse();
 let expectedVersion=[1,0,0];
 for(const [index,release] of chronological.entries()){
  if(index){
   if(release.changes.some(change=>change.type==='추가')){expectedVersion[1]++;expectedVersion[2]=0;}
   else expectedVersion[2]++;
  }
  assert.equal(release.version,expectedVersion.join('.'),'통합 버전은 기능 추가 시 minor, 그 외에는 patch를 순서대로 올립니다.');
 }
 assert.equal(chronological[0].id,'opening',message);
 assert.equal(chronological[0].date,current.openedAt,message);
}
export function validateReleaseUpdate(current,previous,{copyEdits=[],consolidations=[]}={}){
 const consolidation=consolidations.find(entry=>entry.requestedBy==='owner'&&entry.reason?.trim()&&entry.noAnnouncement===true&&entry.beforeVersion===previous.version&&entry.afterVersion===current.version&&entry.beforeSha256===releaseDigest(previous)&&entry.afterSha256===releaseDigest(current));
 if(consolidation){validateConsolidation(current,previous,consolidation);return;}
 if(current.version===previous.version){
  const edit=copyEdits.find(entry=>entry.requestedBy==='owner'&&entry.reason?.trim()&&entry.noAnnouncement===true&&entry.version===current.version&&entry.beforeSha256===releaseDigest(previous)&&entry.afterSha256===releaseDigest(current));
  if(edit){
   const metadata=({historyNote,...rest})=>({...rest,releases:rest.releases.map(({title,changes,...release})=>({...release,changes:changes.map(({text,...change})=>change)}))});
   assert.deepEqual(metadata(current),metadata(previous),'문구 교정은 기존 기록·순서·버전·날짜·변경 유형을 보존해야 합니다.');
   return;
  }
  assert.deepEqual(current,previous,'공지 대기 중에는 공개 버전과 기존 패치 기록을 그대로 유지하세요.');
  return;
 }
 assert.ok(compareVersions(current.version,previous.version)>0,'공개 공지의 BETA 버전을 이전보다 높게 지정하세요.');
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
  if(/\.(?:html|js|css)$/.test(file)){
   const before=contents.toString();
   const withModuleKeys=before.replace(/(\bfrom\s*|\bimport\s*(?:\(\s*)?)(['"])(\.\/[\w./-]+\.js)\2/g,'$1$2$3?v=pending$2');
   const after=withModuleKeys.replace(/(['"])([./\w-]+\.(?:css|js|json|svg))\?v=[\w.-]+\1/g,(match,quote,url)=>{
    const target=path.resolve(path.dirname(file),url);
    assert.ok(target.startsWith(dist+path.sep)&&fs.existsSync(target),'잘못된 캐시 참조: '+url);
    return quote+url+'?v='+visit(target).slice(0,12)+quote;
   });
   if(before!==after)fs.writeFileSync(file,after);
   contents=Buffer.from(after);
  }
  const digest=hash(contents);visiting.delete(file);done.set(file,digest);return digest;
 }
 // Standalone login callbacks need the same transitive cache keys as the app.
 for(const file of fs.readdirSync(dist).filter(file=>file.endsWith('.html')))visit(path.join(dist,file));
 const files=[...new Set(execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8'}).split('\0'))].filter(file=>file&&!['SHA256SUMS.txt','qa-summary.json'].includes(file)&&fs.existsSync(path.join(root,file))).sort();
 fs.writeFileSync(path.join(root,'SHA256SUMS.txt'),files.map(file=>hash(fs.readFileSync(path.join(root,file)))+'  '+file+'\n').join(''));
 return files.length;
}
