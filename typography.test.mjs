import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSeparators,inlineTextParts} from './dist/typography.js';
import {characterSkillNames,skillNamesFor,skillTextParts} from './dist/skill-names.js';
import {researchHighlights} from './dist/research-highlights.js';

test('separator variants share one glyph and narrow nonbreaking spaces without extra elements',()=>{
 const expected='본명\u202f·\u202f별명\u202f·\u202f초성\u202f·\u202f영문 자판';
 for(const dot of ['·','•','ㆍ','∙','‧']){
  assert.equal(normalizeSeparators(`본명${dot}별명 ${dot} 초성  ${dot}  영문 자판`),expected);
 }
 assert.equal(normalizeSeparators(expected),expected);
 assert.deepEqual(inlineTextParts('본명·별명·초성·영문 자판'),[{text:expected,strong:false}]);
 assert.equal(normalizeSeparators('첫 줄\nㆍ 둘째 줄'),'첫 줄\n\u202f·\u202f둘째 줄');
});

test('quotation emphasis preserves words, particles and adjacent separators',()=>{
 assert.deepEqual(inlineTextParts('‘층운’과 “따뜻한 비”·\'비늘 경화\'를 사용합니다.'),[
  {text:'층운',strong:true},{text:'과 ',strong:false},{text:'따뜻한 비',strong:true},
  {text:'\u202f·\u202f',strong:false},{text:'비늘 경화',strong:true},{text:'를 사용합니다.',strong:false}
 ]);
 assert.deepEqual(inlineTextParts('"내 참여 글"'),[{text:'내 참여 글',strong:true}]);
 assert.deepEqual(inlineTextParts('‘닫히지 않은 문장'),[{text:'‘닫히지 않은 문장',strong:false}]);
});

test('URLs, apostrophes and user text are not interpreted as HTML or edited data',()=>{
 const url="https://example.com/'스킬'·기록?q=“원문”";
 assert.deepEqual(inlineTextParts(url),[{text:url,strong:false}]);
 assert.deepEqual(inlineTextParts("don't change O'Neil's name"),[{text:"don't change O'Neil's name",strong:false}]);
 assert.deepEqual(inlineTextParts('‘<img src=x onerror=alert(1)>’'),[{text:'<img src=x onerror=alert(1)>',strong:true}]);
});

test('skill names are emphasized without quotation marks and retain Korean particles',()=>{
 const parts=inlineTextParts('강풍으로 밀고 층운을 사용한 뒤 따뜻한 비로 회복합니다.',skillNamesFor('c45'));
 assert.deepEqual(parts.filter(p=>p.strong).map(p=>p.text),['강풍','층운','따뜻한 비']);
 assert.equal(parts.map(p=>p.text).join(''),'강풍으로 밀고 층운을 사용한 뒤 따뜻한 비로 회복합니다.');
 assert.deepEqual(inlineTextParts('‘층운’과 따뜻한 비를 씁니다.',skillNamesFor('c45')).filter(p=>p.strong).map(p=>p.text),['층운','따뜻한 비']);
 assert.equal(Object.keys(characterSkillNames).length,89);
});

test('scoped skill matching preserves ordinary words, URLs and unmatched text',()=>{
 const text='관찰한 시간에 관을 설치합니다. https://example.com/관/재생';
 const parts=skillTextParts(text,skillNamesFor('c47'));
 assert.deepEqual(parts.filter(p=>p.strong).map(p=>p.text),['관']);
 assert.equal(parts.map(p=>p.text).join(''),text);
 assert.deepEqual(skillNamesFor('unknown'),[]);
 assert.deepEqual(skillTextParts('기록과 재생',skillNamesFor('c58')).filter(p=>p.strong),[]);
 assert.deepEqual(skillTextParts('부엉이와 비늘 경화를 함께 씁니다.',skillNamesFor('c58')).filter(p=>p.strong).map(p=>p.text),['부엉이','비늘 경화']);
 assert.deepEqual(skillTextParts('그림자를 그립니다.',skillNamesFor('c86')).filter(p=>p.strong),[]);
});

test('adopted research has no empty promotion block and retains conditions and source links',()=>{
 assert.equal(researchHighlights([],'c58',{}),'');
 const post={id:'sample',topic:'combination',characterIds:['c58','c41'],title:'<검토된 조합>',body:'활용법',caution:'같은 공격에 겹치지 않기',proposal:{reason:'조건 확인'}};
 const html=researchHighlights([post],'c58',{c58:{name:'선지자'},c41:{name:'교수'}});
 assert.match(html,/연구실에서 반영한 전략/);
 assert.match(html,/같은 공격에 겹치지 않기/);
 assert.match(html,/조건 확인/);
 assert.match(html,/원문·토론/);
 assert.match(html,/&lt;검토된 조합&gt;/);
});
