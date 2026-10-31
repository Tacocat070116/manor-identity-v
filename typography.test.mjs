import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSeparators,inlineTextParts} from './dist/typography.js';

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
