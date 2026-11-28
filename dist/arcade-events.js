// Each entry is one playable encounter. The timing and scoring belong to the arcade.
const entries = [
 ['조각가', '숭고의 형상', 'statue', 'dodge', '조각가가 조각을 사용했어요!', '두 조각이 부딪혔어요. 풀존재 조각이 날아와요!', 'fusion'],
 ['리퍼', '안개 칼날', 'fog', 'dodge', '리퍼가 안개 칼날을 사용했어요.', '안개 칼날이 날아와요!'],
 ['사냥터지기', '갈퀴 사슬', 'chain', 'dodge', '사냥터지기가 갈퀴 사슬을 사용했어요.', '갈퀴가 날아와요!'],
 ['거미', '실 뱉기', 'web', 'dodge', '거미가 실 뱉기를 사용했어요.', '거미줄이 날아와요!'],
 ['노란 옷의 왕', '악몽의 습격', 'tentacle', 'dodge', '노란 옷의 왕이 촉수를 불러냈어요.', '촉수가 내려쳐요!', 'drop'],
 ['재앙의 도마뱀', '치명 추격', 'lizard', 'dodge', '루키노가 뛰어올랐어요. 발밑에 그림자가 보여요.', '도마뱀이 착지해요!', 'drop'],
 ['블러디 퀸', '거울 그림자', 'mirror', 'dodge', '블러디 퀸이 물거울을 세웠어요.', '거울상이 칼을 휘둘러요!', 'slash'],
 ['붉은 나비', '찰나의 생멸', 'butterfly', 'tap', '미치코가 산제비나비를 날렸어요.', '미치코가 튀어나왔어요! 지금 바라보세요.'],
 ['붉은 나비', '연이은 생멸', 'butterfly', 'tap', '미치코가 다시 산제비나비를 날렸어요.', '다시 돌진해요! 지금 바라보세요.'],
 ['밀랍인형사', '밀랍 사격', 'wax', 'tap', '밀랍인형사가 밀랍 사격을 시작했어요.', '밀랍이 쏟아져요! 지금 숨으세요.'],
 ['수위 26호', '폭탄 연쇄', 'bomb', 'lane', '수위 26호가 철문 앞에 폭탄을 놓았어요.', '폭탄이 터져요!'],
 ['광대', '로켓 돌진', 'rocket', 'dodge', '광대가 로켓에 시동을 걸었어요.', '광대가 돌진해요!'],
 ['바이올리니스트', '소나타', 'violin', 'lane', '바이올리니스트가 첫 음표를 연주했어요.', '두 음표 사이로 현이 생겨요!'],
 ['나이아스', '물고기 사냥', 'water', 'lane', '나이아스가 물고기 사냥을 시작했어요.', '물길이 닫혀요!'],
 ['광기의 눈', '격벽', 'fence', 'lane', '발크가 격벽을 작동시켰어요. 바닥을 살피세요.', '바닥에 붉은 선이 켜졌어요!'],
 ['사도', '습격', 'cat', 'lane', '사도가 검은 고양이를 풀었어요.', '고양이가 둘로 갈라져요!'],
 ['사냥터지기', '덫', 'trap', 'lane', '사냥터지기가 풀숲에 덫을 놓았어요.', '발밑에 덫이에요!'],
 ['밀랍인형사', '응고', 'wax-drop', 'lane', '밀랍인형사가 응고를 사용했어요.', '파라핀 덩어리가 떨어져요!', 'drop'],
 ['해독기', '해독기 교정', 'cipher', 'gauge', '해독기에서 교정 신호가 울려요.', '바늘이 밝은 구간에 들어오면 누르세요.'],
 ['기계공', '인형의 해독기 교정', 'puppet', 'gauge', '기계공의 인형이 해독기를 돌리고 있어요.', '인형의 교정 타이밍을 맞히세요.'],
 ['우산의 영혼', '탕백', 'bell', 'gauge', '범무구가 탕혼령을 들어 올렸어요.', '종이 울렸어요! 교정하세요.', 'reverse'],
 ['해독기', '연속 교정', 'cipher', 'gauge', '해독기 바늘이 연달아 튀어요.', '교정을 두 번 연속으로 맞히세요.', 'double'],
 ['작곡가', '조율', 'note', 'beat', '작곡가가 첫 박자를 짚었어요.', '음표가 박자선에 닿으면 누르세요.'],
 ['작곡가', '두 박자 조율', 'note', 'beat', '악보에 음표 두 개가 이어져 있어요.', '두 음표를 차례대로 맞히세요.', 'double'],
 ['사진사', '사진관의 섬광', 'camera', 'tap', '사진사가 카메라 덮개를 걷었어요.', '플래시가 터져요! 지금 숨으세요.'],
 ['우산의 영혼', '날아드는 검은 우산', 'umbrella', 'dodge', '우산의 영혼이 검은 우산을 펼쳤어요.', '우산이 정원사 쪽으로 떨어져요!'],
 ['울보', '원혼의 급습', 'soul', 'dodge', '울보가 나무 사이에서 원혼을 불러냈어요.', '원혼이 방향을 틀어 날아와요!'],
 ['파멸의 바퀴', '가시 바퀴 돌진', 'wheel', 'dodge', '화면 밖에서 바퀴가 구르는 소리가 들려요.', '가시 바퀴가 돌진해요!'],
 ['정원사', '판자 사이로', 'pallet', 'lane', '앞서 달리던 생존자가 판자에 손을 얹었어요.', '판자가 넘어져요! 빈틈으로 달리세요.'],
 ['탈출구', '마지막 비밀번호', 'gate', 'gauge', '철문 옆 번호판에 불이 들어왔어요.', '표시가 겹칠 때 마지막 숫자를 누르세요.']
];
const singles = entries.map(([hunter,name,effect,kind,warning,cue,variant='']) =>
 ({hunter,name,effect,kind,warning,cue,variant}));
const byName = new Map(singles.map(move=>[move.name,move]));

// Each list is one stage. Choose its move once, so pausing never rerolls an ambush.
const routes = [
 ['판자 뒤의 매복', ['판자 사이로'], ['갈퀴 사슬','안개 칼날']],
 ['암실에서 탈출', ['사진관의 섬광'], ['마지막 비밀번호','해독기 교정']],
 ['안개 속 신호', ['해독기 교정','인형의 해독기 교정'], ['안개 칼날','원혼의 급습']],
 ['조각상 사이의 길', ['숭고의 형상'], ['격벽','덫']],
 ['종소리 뒤의 추격', ['탕백'], ['날아드는 검은 우산','찰나의 생멸']],
 ['끊어진 물길', ['물고기 사냥'], ['악몽의 습격','치명 추격']],
 ['철문 앞 추격전', ['가시 바퀴 돌진','로켓 돌진'], ['갈퀴 사슬','거울 그림자'], ['마지막 비밀번호']],
 ['장원의 마지막 연주', ['두 박자 조율','조율'], ['소나타'], ['원혼의 급습','실 뱉기']]
];
const sequences=routes.map(([name,...stages])=>({
 name, stages:stages.map(options=>options.map(key=>byName.get(key))),
 kind:byName.get(stages[0][0]).kind, hunter:byName.get(stages[0][0]).hunter
}));
export const encounters=[...singles,...sequences];

export function dealStages(card,random=Math.random) {
 return card.stages ? card.stages.map(options=>options[Math.floor(random()*options.length)]) : [card];
}

export function shuffleEncounters(random=Math.random, previous='', previousCard=null,difficulty='nightmare') {
 const pool=(difficulty==='nightmare'?encounters:singles).slice();
 for(let i=pool.length-1;i>0;i--){
  const j=Math.floor(random()*(i+1));
  [pool[i],pool[j]]=[pool[j],pool[i]];
 }
 const deck=[];
 while(pool.length){
  const last=deck.at(-1);
  const wantNewKind=last ? deck.at(-2)?.kind===last.kind : !!previous;
  const lastKind=last?.kind||previous;
  const needSequence=difficulty==='nightmare'&&deck.length>=6 && deck.slice(-6).every(card=>!card.stages);
  const different=card=>(deck.length>0||card!==previousCard)&&(!needSequence||card.stages)&&(!last||card.hunter!==last.hunter)&&(!wantNewKind||card.kind!==lastKind);
  let i=pool.findIndex(different);
  if(i<0)i=pool.findIndex(card=>card.kind!==lastKind);
  deck.push(pool.splice(Math.max(0,i),1)[0]);
 }
 return deck;
}

// The second beat is chosen at deal time so pausing cannot reroll the attack.
const replies = {
 rocket:['로켓 돌진'], wheel:['가시 바퀴 돌진'], fence:['격벽'],
 statue:['숭고의 형상'], tentacle:['악몽의 습격'], lizard:['치명 추격'],
 bomb:['폭탄 연쇄'], butterfly:['연이은 생멸'], violin:['소나타'],
 trap:['갈퀴 사슬'], chain:['덫','갈퀴 사슬'], wax:['응고'], 'wax-drop':['밀랍 사격'],
 bell:['날아드는 검은 우산'], umbrella:['탕백'], water:['물고기 사냥'],
 cipher:['연속 교정'], puppet:['인형의 해독기 교정'], note:['두 박자 조율']
};
export function roundStages(card, difficulty, random=Math.random){
 const moves=dealStages(card,random);
 if(difficulty==='nightmare'&&!card.stages){
  const choices=replies[card.effect]||[card.name];
  moves.push(byName.get(choices[Math.floor(random()*choices.length)]));
  if(['bomb','statue','tentacle','butterfly','wheel'].includes(card.effect)&&random()<.28)moves.push(moves[1]);
 }
 const stages=[];
 for(const move of moves){
  const previous=stages.at(-1);
  const repeat=previous?.move.effect===move.effect;
  const pace=.86+random()*.30;
  const wait=800+Math.floor(random()*2201);
  let safeSide=random()<.5?'left':'right', facing=random()<.5?'reverse':'normal';
  if(repeat){
   facing=previous.facing==='reverse'?'normal':'reverse';
   if(move.kind==='lane')safeSide=previous.safeSide==='left'?'right':'left';
  }
  stages.push({move,repeat,pace,wait,safeSide,facing});
 }
 return stages;
}
