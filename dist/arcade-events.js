// Each entry is one playable encounter. The timing and scoring belong to the arcade.
const entries = [
 ['조각가', '숭고의 형상', 'statue', 'dodge', '조각가가 조각을 사용했어요!', '두 조각이 부딪혔어요. 풀존재 조각이 날아와요!', 'fusion'],
 ['리퍼', '안개 칼날', 'fog', 'dodge', '안개 속에서 리퍼의 발톱이 번뜩여요.', '안개 칼날이 날아와요!'],
 ['사냥터지기', '갈퀴 사슬', 'hook', 'dodge', '풀숲 너머로 사슬 끄는 소리가 들려요.', '갈퀴가 날아와요!'],
 ['거미', '실 뱉기', 'web', 'dodge', '거미가 몸을 낮췄어요.', '거미줄이 날아와요!'],
 ['노란 옷의 왕', '악몽의 습격', 'tentacle', 'dodge', '옆에 있던 촉수가 고개를 들었어요.', '촉수가 내려쳐요!', 'drop'],
 ['재앙의 도마뱀', '치명 추격', 'shadow', 'dodge', '발밑의 그림자가 점점 커져요.', '도마뱀이 착지해요!', 'drop'],
 ['블러디 퀸', '거울 그림자', 'mirror', 'dodge', '물거울 너머에서 거울상이 다가와요.', '거울상이 칼을 휘둘러요!', 'slash'],
 ['붉은 나비', '찰나의 생멸', 'butterfly', 'hold', '산제비나비가 어깨에 붙었어요.', '붉은 나비가 다가와요! 계속 바라보세요.'],
 ['붉은 나비', '연이은 생멸', 'butterfly', 'hold', '나비가 붙었어요. 붉은 나비가 거리를 재고 있어요.', '다시 돌진해요! 시선을 유지하세요.', 'long'],
 ['밀랍인형사', '밀랍 사격', 'ice', 'hold', '벽 너머로 밀랍이 튀어요. 몸을 숨길 곳을 찾으세요.', '밀랍이 쏟아져요! 엄폐를 유지하세요.'],
 ['수위 26호', '폭탄 연쇄', 'bomb', 'lane', '밭고랑에 놓인 폭탄이 깜빡여요.', '폭탄이 터져요!'],
 ['광대', '로켓 돌진', 'rocket', 'lane', '저 멀리서 로켓에 시동이 걸렸어요.', '광대가 돌진해요!'],
 ['바이올리니스트', '소나타', 'violin', 'lane', '첫 번째 음표가 나타났어요.', '두 음표 사이로 현이 생겨요!'],
 ['나이아스', '물고기 사냥', 'hook', 'lane', '작살이 날아갔어요. 물길이 이어지고 있어요.', '물길이 닫혀요!'],
 ['광기의 눈', '격벽', 'ice', 'lane', '발밑에 긴 선이 그어졌어요.', '격벽이 솟아올라요!'],
 ['사도', '습격', 'cat', 'lane', '검은 고양이가 이쪽으로 달려와요.', '고양이가 둘로 갈라져요!'],
 ['사냥터지기', '덫', 'hook', 'lane', '길가의 풀숲에서 쇠붙이가 반짝여요.', '발밑에 덫이에요!'],
 ['밀랍인형사', '응고', 'ice', 'lane', '밀랍인형사가 포구를 들어 올렸어요.', '파라핀 덩어리가 떨어져요!', 'drop'],
 ['해독기', '해독기 교정', 'cipher', 'gauge', '해독기에서 교정 신호가 울려요.', '바늘이 밝은 구간에 들어오면 누르세요.'],
 ['기계공', '인형의 해독기 교정', 'puppet', 'gauge', '기계공의 인형이 해독기를 돌리고 있어요.', '인형의 교정 타이밍을 맞히세요.'],
 ['우산의 영혼', '탕백', 'bell', 'gauge', '범무구가 탕혼령을 들어 올렸어요.', '종이 울렸어요! 교정하세요.', 'reverse'],
 ['해독기', '연속 교정', 'cipher', 'gauge', '해독기 바늘이 연달아 튀어요.', '교정을 두 번 연속으로 맞히세요.', 'double'],
 ['작곡가', '조율', 'note', 'beat', '작곡가가 첫 박자를 짚었어요.', '음표가 박자선에 닿으면 누르세요.'],
 ['작곡가', '두 박자 조율', 'note', 'beat', '악보에 음표 두 개가 이어져 있어요.', '두 음표를 차례대로 맞히세요.', 'double']
];
export const encounters = entries.map(([hunter, name, sprite, kind, warning, cue, variant='']) =>
 ({hunter, name, sprite, kind, warning, cue, variant}));

export function shuffleEncounters(random=Math.random, previous='') {
 const pool = encounters.slice();
 for (let i=pool.length-1; i>0; i--) {
  const j = Math.floor(random()*(i+1));
  [pool[i],pool[j]] = [pool[j],pool[i]];
 }
 const deck = [];
 // Keep different controls in rotation while dealing every encounter once.
 while (pool.length) {
  const lastKind = deck.at(-1)?.kind || previous;
  let index = pool.findIndex(e => e.kind !== lastKind);
  if (index < 0) index = 0;
  deck.push(pool.splice(index,1)[0]);
 }
 return deck;
}
