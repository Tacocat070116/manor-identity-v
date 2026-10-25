import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeChannel,normalizeVideo,normalizeTag,normalizeCreator,videoThumbnail,CREATOR_COUNTRIES} from './dist/creators-model.js';
import {creatorCard,creatorEditor} from './dist/creators.js';
const characters={c16:{id:'c16',name:'블러디 퀸',portrait:'assets/portraits/c16.webp'}};
const roster=new Map(Object.entries(characters));
const base=()=>({title:'새내기 채널',channelUrl:'youtube.com/@new-channel',tagline:'처음 시작하는 제5인격 이야기',body:'',videoUrl:'',tags:[],characterIds:[],badges:[],tiers:[],server:'unspecified',color:'mint'});
test('channel links canonicalize handles and official channel IDs without accepting video links or lookalikes',()=>{
 assert.deepEqual(normalizeChannel('http://m.youtube.com/@MANOR/videos?si=tracking'),{url:'https://www.youtube.com/@MANOR',key:'handle:manor'});
 assert.equal(normalizeChannel('youtube.com/channel/UCabcdefghijklmnopqrstuv/about').key,'channel:UCabcdefghijklmnopqrstuv');
 assert.equal(normalizeChannel('https://youtube.com/@장원').url,'https://www.youtube.com/@%EC%9E%A5%EC%9B%90');
 for(const url of ['javascript:alert(1)','https://youtube.com.evil.invalid/@a','https://youtube.com@evil.invalid/@a','https://evil@youtube.com/@a','https://youtube.com:9000/@a','https://youtube.com/@a%22','https://youtu.be/abcdefghijk','https://youtube.com/watch?v=abcdefghijk','https://youtube.com/redirect?q=evil'])assert.throws(()=>normalizeChannel(url));
});
test('video links yield one safe canonical URL and a fixed-host thumbnail',()=>{
 for(const url of ['youtu.be/abcdefghijk?t=5','youtube.com/shorts/abcdefghijk','youtube.com/live/abcdefghijk','youtube.com/watch?v=abcdefghijk&list=evil'])assert.equal(normalizeVideo(url),'https://www.youtube.com/watch?v=abcdefghijk');
 assert.equal(videoThumbnail('youtu.be/abcdefghijk'),'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg');
 assert.equal(videoThumbnail('javascript:alert(1)'),'');assert.equal(normalizeVideo('   '),'');assert.throws(()=>normalizeVideo(42),/대표 영상/);
});
test('any newcomer can submit, while custom tags and historical achievements stay within supported limits',()=>{
 const v=normalizeCreator(base(),roster);assert.deepEqual(v.badges,[]);assert.deepEqual(v.tiers,[]);
 assert.equal(normalizeTag('#차분한해설'),'차분한해설');assert.throws(()=>normalizeTag('공백 태그'));
 assert.throws(()=>normalizeCreator({...base(),tags:['English','english']},roster),/중복/);
 assert.throws(()=>normalizeCreator({...base(),tags:Array.from({length:7},(_,i)=>'태그'+i)},roster),/6개/);
 const history={...base(),badges:[{characterId:'c16',grade:'A',season:'시즌 40'},{characterId:'c16',grade:'S',season:'시즌 42'}],tiers:[{side:'hunter',tier:'히드라',season:'시즌 42'}]};
 assert.equal(normalizeCreator(history,roster).badges.length,2);
 for(const bad of [{side:'hunter',tier:'사베르투스'},{side:'constructor',tier:'anything'}])assert.throws(()=>normalizeCreator({...base(),tiers:[bad]},roster),/최고 티어/);
 assert.throws(()=>normalizeCreator({...history,badges:[...history.badges,history.badges[0]]},roster),/하나만/);
});
test('rendered cards escape user copy, reject external links and label achievement claims accurately',()=>{
 const c={...base(),id:'sample',title:'<script>alert(1)</script>',tagline:'<img src=x onerror=alert(1)>',body:'<svg onload=alert(1)>',tags:['<b>태그</b>'],channelUrl:'javascript:alert(1)',videoUrl:'https://evil.invalid/image.jpg',tiers:[{side:'hunter',tier:'히드라',season:'<script>'}],badges:[{characterId:'c16',grade:'S',season:'시즌 42'}]};
 const html=creatorCard(c,characters,{detail:true});assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script|<svg onload|<img src=x|href="javascript:|src="https:\/\/evil/);
 assert.match(html,/작성자가 입력한 이력/);assert.doesNotMatch(html,/인증 완료|검증 완료/);
 const valid=creatorCard({...base(),videoUrl:'youtu.be/abcdefghijk'},characters);assert.match(valid,/rel="noopener noreferrer"/);assert.match(valid,/i\.ytimg\.com/);
});
test('editor keeps tiers and badges optional and safely restores entered copy',()=>{
 const html=creatorEditor({...base(),title:'" autofocus onfocus="alert(1)'},characters);
 assert.match(html,/value="&quot; autofocus onfocus=&quot;alert\(1\)"/);
 assert.match(html,/없어도 등록할 수 있어요/);assert.doesNotMatch(html,/<select name="tier-[^"]+"[^>]*required/);
 assert.match(html,/name="customTag"/);assert.match(html,/name="color"/);assert.match(html,/data-cr-preview/);assert.doesNotMatch(html,/name="uid"|구독자 수.*required/);
});


test('country tags stay distinct from game servers and never imply a curated channel submitted its own post',()=>{
 assert.equal(Object.keys(CREATOR_COUNTRIES).length,250);
 const v=normalizeCreator({...base(),country:'KR',server:'naeu'},roster);assert.equal(v.country,'KR');assert.equal(v.server,'naeu');
 assert.equal(normalizeCreator(base(),roster).country,'unspecified');assert.throws(()=>normalizeCreator({...base(),country:'ZZ'},roster),/국가/);
 const html=creatorCard({...base(),country:'JP',origin:'curated'},characters,{detail:true});
 assert.match(html,/#일본/);assert.match(html,/MANOR 소개/);assert.match(html,/직접 등록한 글은 아닙니다/);assert.doesNotMatch(html,/인증 완료|검증 완료/);
 const card=creatorCard({...base(),country:'KR'},characters);assert.match(card,/data-cr="country" data-country="KR"/);
 const editor=creatorEditor({...base(),country:'KR'},characters);assert.match(editor,/name="country"/);assert.match(editor,/<option value="KR" selected>한국/);
});
