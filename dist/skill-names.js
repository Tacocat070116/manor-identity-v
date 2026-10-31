// Names already used by the guide. Scoped by character so ordinary words in
// navigation, unrelated guides and player submissions are not emphasized.
export const characterSkillNames={
 c01:['거미줄','고치형','고치'],
 c02:['원한의 그림자','꼭두각시'],
 c03:['콘솔','모니터','격벽'],
 c04:['추진기','바람 날개','개조 드릴','로켓 돌진'],
 c05:['신도','기생'],
 c06:['작살','물웅덩이','습기','회유'],
 c07:['바람의 힘'],
 c08:['촉수'],
 c09:['메인 볼'],
 c10:['안개 칼날','차가운 안개','은신'],
 c11:['추적 표식','도약','추격 공격'],
 c12:['촛농','밀랍옷'],
 c13:['마력의 음색','음표','현'],
 c14:['에너지 부하','서지'],
 c15:['산제비나비','찰나의 생멸'],
 c16:['물거울','거울상','거울'],
 c17:['갈퀴 사슬','덫'],
 c18:['고양이','마비 구역','위협'],
 c19:['사진 속 세계','촬영'],
 c20:['기록','재생','판결'],
 c21:['폭탄','연쇄 폭발'],
 c22:['이스인','침식의 조각','침식도'],
 c23:['엿보기','까마귀'],
 c24:['곤충 떼','벌침'],
 c25:['그림자 구역','잔영'],
 c26:['진혼산','섭혼','탕백'],
 c27:['안식의 길','나무','원령'],
 c28:['극성','자기장'],
 c29:['흡수'],
 c30:['낙하 공격','연속 도약','도약'],
 c31:['케이지'],
 c32:['상형 무덤','조각상'],
 c33:['구강경','광선 치료 구역','광막'],
 c34:['가시','덫'],
 c35:['곡괭이','불안정 구역','붕괴'],
 c36:['깜짝 표식','분신'],
 c37:['폭탄'],
 c38:['곤충 떼'],
 c39:['퉁소'],
 c40:['신호총'],
 c41:['비늘 경화','비늘 표피','비늘'],
 c42:['화살','중상'],
 c43:['기계 인형'],
 c44:['예측'],
 c45:['강풍','층운','따뜻한 비'],
 c46:['판자용 환영','구출용 환영','환영'],
 c47:['관','재생'],
 c48:['손전등'],
 c49:['마술봉','환영','은신'],
 c50:['맹인용 지팡이','지팡이'],
 c51:['걸리버 여행기','암호 페이지'],
 c52:['땅속 잠행','잠행','삽'],
 c53:['우산 무대','공연'],
 c54:['빠른 리듬 오르골','느린 리듬 오르골','슬라이드 스텝','오르골'],
 c55:['도블린 술','도블린 베이스'],
 c56:['지도'],
 c57:['직선 통로','긴 통로','통로'],
 c58:['부엉이'],
 c59:['위치 교환'],
 c60:['흙공'],
 c61:['감정이입','휘슬','스트레스'],
 c62:['멧돼지','분노','돌진'],
 c63:['추억 조각','기억 동기화'],
 c64:['강철 팔꿈치 보호대','보호대'],
 c65:['로켓'],
 c66:['편지','우편배달견'],
 c67:['진정제','약물 증강제'],
 c68:['루이','두려움 상실'],
 c69:['조율'],
 c70:['발사기','목제 행글라이더','도약','활공'],
 c71:['회상','보호막'],
 c72:['망각의 향','향수'],
 c73:['전하'],
 c74:['원숭이 조각상','저주'],
 c75:['응원','격려','사기 진작'],
 c76:['올가미'],
 c77:['크리켓볼','크리켓 배트','폭발 상태'],
 c78:['연막'],
 c79:['자석','극성'],
 c80:['천','돌진'],
 c81:['폭로 진행도','아로마 스틱','묘수'],
 c82:['럭비공'],
 c83:['분사','체공'],
 c84:['해신의 회중시계','회중시계'],
 c85:['행운보따리'],
 c86:['그림'],
 c87:['에어백'],
 c88:['정물 투영','투영'],
 c89:['갈고리']
};
const contextualNames=new Set(['고치','기생','습기','도약','활공','추격 공격','은신','현','위협','촬영','기록','재생','판결','나무','극성','자기장','흡수','낙하 공격','연속 도약','가시','덫','붕괴','분신','화살','중상','예측','강풍','환영','관','지팡이','잠행','삽','공연','지도','통로','위치 교환','스트레스','분노','돌진','보호대','편지','회상','보호막','향수','전하','저주','응원','격려','연막','자석','천','분사','체공','그림','투영','갈고리']);
const sharedNames=[...new Set(Object.values(characterSkillNames).flat())].filter(name=>!contextualNames.has(name));
export function skillNamesFor(ids){
 const scoped=String(ids||'').split(/\s+/).flatMap(id=>characterSkillNames[id]||[]);
 return scoped.length?[...new Set([...sharedNames,...scoped])].sort((a,b)=>b.length-a.length):[];
}

export function skillTextParts(value,names){
 const text=String(value),parts=[];
 if(!names?.length)return [{text,strong:false}];
 const escaped=names.map(name=>name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
 const pattern=new RegExp('https?:\\/\\/[^\\s]+|'+escaped.join('|'),'gu');
 let offset=0;
 for(const match of text.matchAll(pattern)){
  if(match[0].startsWith('http'))continue;
  const before=text.slice(0,match.index),after=text.slice(match.index+match[0].length);
  if(/[\p{L}\p{N}_]$/u.test(before))continue;
  if(!/^(?:$|[^\p{L}\p{N}_]|으로|로|은|는|이|가|을|를|과|와|의|도|만|에|부터|까지|보다|처럼|조차|마저|이나|라)/u.test(after))continue;
  if(match.index>offset)parts.push({text:text.slice(offset,match.index),strong:false});
  parts.push({text:match[0],strong:true});offset=match.index+match[0].length;
 }
 if(offset<text.length)parts.push({text:text.slice(offset),strong:false});
 return parts;
}
