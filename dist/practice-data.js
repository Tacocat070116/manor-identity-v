// These authored scenes are deliberately limited. Never infer missing matchups.
export const practiceData = {
  version: '2026-10-19.1',
  stage: 'BETA',
  reviewedAt: '2026-10-19',
  reviewLabel: '공개 자료 대조 · 게임 내 재현 미실시',
  scope: '블러디 퀸 · 조향사 · 선지자 · 공군',
  sources: [
    {id:'perfumer',title:'조향사 · 향수의 기록과 복귀',type:'일본어 공동편집 공략',url:'https://wikiwiki.jp/identity5ch/調香師',support:'향수 사용 시점의 상태·위치를 기록하는 기전과 복귀의 제약을 참고했습니다.'},
    {id:'perfumer-patch',title:'2026-01-29 공식 업데이트',type:'공식 패치 · 해당 날짜 기준',url:'https://www.identityvgame.com/en/news/announcement/20260129/35288_1284409.html',support:'향수 복귀 후 피해 경감 효과가 별도로 있음을 확인했습니다. 현재 패치 전체를 검증한 자료는 아닙니다.'},
    {id:'queen',title:'블러디 퀸 · 본체와 거울상',type:'일본어 공동편집 공략',url:'https://wikiwiki.jp/identity5ch/血の女王',support:'거울상과 본체의 구분, 거울상에 대한 생존자 공격의 제약을 참고했습니다.'},
    {id:'queen-guide',title:'블러디 퀸 공략 · 공군 대응',type:'일본어 공략 매체',url:'https://kamigame.jp/identity5/page/377359983953609614.html',support:'신호총이 닿지 않는 장애물 너머에서 거울로 공격하는 상황을 대조했습니다.'},
    {id:'seer',title:'선지자 · 부엉이 보호',type:'일본어 공동편집 공략',url:'https://wikiwiki.jp/identity5ch/占い師',support:'보호가 적용되는 시점과 한 차례의 공격을 막는 기전을 참고했습니다.'}
  ],
  scenarios: [
    {
      id:'perfume-order',status:'beta',own:'c72',opponent:'c16',title:'향수는 언제의 상태를 기억할까요?',topic:'추격 · 향수 복귀',
      summary:'같은 피격이어도 향수를 쓴 순서에 따라 기대할 수 있는 효과가 달라집니다.',
      evidenceIds:['M085'],sourceIds:['perfumer','perfumer-patch'],
      mechanic:'향수는 사용한 순간의 상태와 위치를 기록합니다. 사용 전에 받은 피해까지 되돌리는 기능은 아닙니다.',
      limits:['향수 복귀 버튼을 사용할 수 있고, 쓰러지거나 행동 불능이 아닌 장면입니다.','복귀 지점의 즉시 후속 공격과 위기 모면 등 별도의 피해 처리 효과는 제외했습니다.','복귀 후 피해 경감은 별도 효과입니다. 늦게 쓴 향수의 모든 활용이 사라지는 것은 아닙니다.'],
      variationLabel:'향수를 사용한 시점',
      actions:[{id:'recover',label:'복귀해서 방금 받은 피해를 되돌리겠습니다.'},{id:'reposition',label:'이전 피해의 회복보다 위치 이동·복귀 효과를 따져보겠습니다.'},{id:'immune',label:'복귀하면 다음 공격도 계속 막을 수 있다고 생각합니다.'}],
      reasons:[{id:'record',label:'향수를 사용한 순간에 기록된 상태가 기준이기 때문입니다.'},{id:'anytime',label:'향수는 사용 순서와 관계없이 건강 상태로 돌아가기 때문입니다.'},{id:'lasting',label:'향수 복귀는 계속 유지되는 무적 효과이기 때문입니다.'}],
      variants:[
        {id:'before',label:'피격 전에 사용',prompt:'건강할 때 향수를 쓰고, 거울 공격으로 한 번 부상당했습니다. 어떤 효과를 기대하며 행동할까요?',
         facts:[{id:'record',label:'기록된 상태',value:'건강 · 피격 전에 향수 사용'},{id:'now',label:'현재 상태',value:'부상 · 복귀 버튼 사용 가능'},{id:'return',label:'복귀 지점',value:'이 장면에서는 즉시 후속 공격 없음'}],
         flow:[['기록','건강할 때 향수 사용'],['피격','거울 공격으로 부상'],['현재','복귀할 수 있는 상태']],
         reasonId:'record',reasonExplanation:'이번에는 피격보다 향수 사용이 먼저입니다. 기록된 상태가 건강했다는 점이 피해 복귀의 근거입니다.',
         takeaway:'향수 사용 → 피격 순서인지 먼저 확인합니다.',
         feedback:{
           recover:{kind:'supported',title:'제시한 조건에서 피해 복귀를 기대할 수 있습니다.',text:'피격 전에 건강 상태를 기록했습니다. 복귀가 가능한 지금은 그 기록으로 돌아가는 선택에 근거가 있습니다.',clues:['record','now']},
           reposition:{kind:'conditional',title:'위치 판단도 중요하지만, 이번에는 피해 복귀도 가능합니다.',text:'복귀 지점의 위험을 살피는 접근은 유효합니다. 이 장면은 즉시 후속 공격이 없다고 주어졌으므로 건강 상태로 돌아갈 기회도 함께 고려합니다.',clues:['record','return']},
           immune:{kind:'caution',title:'피해를 되돌리는 것과 계속 무적인 것은 다릅니다.',text:'기록으로 돌아가는 효과를 이후의 모든 공격에 대한 보호로 확대하지 않습니다. 복귀 직후에도 다음 공격과 이동 경로를 확인해야 합니다.',clues:['now','return']}
         }},
        {id:'after',label:'피격 후에 사용',prompt:'거울 공격으로 부상당한 뒤 향수를 썼습니다. 이 향수로 무엇을 기대할 수 있을까요?',
         facts:[{id:'record',label:'기록된 상태',value:'부상 · 피격 후에 향수 사용'},{id:'now',label:'현재 상태',value:'부상 · 복귀 버튼 사용 가능'},{id:'return',label:'복귀 지점',value:'이 장면에서는 즉시 후속 공격 없음'}],
         flow:[['피격','거울 공격으로 부상'],['기록','부상 상태에서 향수 사용'],['현재','복귀할 수 있는 상태']],
         reasonId:'record',reasonExplanation:'이번에는 이미 부상한 상태를 기록했습니다. 기록 이전의 피해를 되돌리는 것과 위치 복귀·별도 경감 효과를 구분합니다.',
         takeaway:'피격 후에 쓴 향수로 피격 전 건강 상태까지 되돌릴 수는 없습니다.',
         feedback:{
           recover:{kind:'caution',title:'이번 향수에는 피격 전 건강 상태가 기록돼 있지 않습니다.',text:'부상한 뒤 향수를 사용했습니다. 복귀로 그 이전의 피해를 없앨 수 있다고 기대하면 판단이 어긋납니다.',clues:['record','now']},
           reposition:{kind:'supported',title:'기록된 부상 상태와 다른 복귀 효과를 구분한 선택입니다.',text:'이전 피해의 회복은 기대하기 어렵습니다. 위치 복귀와 별도의 피해 경감이 필요한지는 다음 공격·동선을 함께 살펴야 합니다.',clues:['record','return']},
           immune:{kind:'caution',title:'부상 기록도, 이후 공격의 위험도 없어지지 않습니다.',text:'복귀는 지속 무적이 아닙니다. 늦게 쓴 향수의 활용을 판단할 때도 이후 공격을 모두 막는다고 가정해서는 안 됩니다.',clues:['record','now']}
         }}
      ]
    },
    {
      id:'signal-target',status:'beta',own:'c40',opponent:'c16',title:'신호총을 겨눌 대상은 어디에 있나요?',topic:'추격 · 본체와 거울상',
      summary:'눈앞의 거울상과 신호총이 닿을 수 있는 본체를 구분합니다.',
      evidenceIds:['M084'],sourceIds:['queen','queen-guide'],
      mechanic:'거울상과 본체는 같은 표적이 아닙니다. 거울상을 직접 기절시킬 목적으로 신호총을 쓰는 판단은 피합니다.',
      limits:['일반적인 1대4 추격 장면이며 구출·풍선 견제는 다루지 않습니다.','개념도는 실제 맵이나 사거리 축척이 아닙니다.','본체에 사격하는 선택도 흥분·회피·장애물과 실제 명중 여부에 영향을 받습니다.'],
      variationLabel:'블러디 퀸 본체의 위치',
      actions:[{id:'mirror',label:'가까운 거울상을 직접 기절시키려고 신호총을 쓰겠습니다.'},{id:'body',label:'본체에 신호총이 닿는 조건을 확인하고 사격을 고려하겠습니다.'},{id:'move',label:'거울 공격을 피하며 본체와의 사선을 다시 확인하겠습니다.'}],
      reasons:[{id:'target',label:'신호총을 쓸 수 있는 본체의 위치·사선이 중요하기 때문입니다.'},{id:'nearest',label:'눈앞에서 가장 가까운 형체에 쏘면 되기 때문입니다.'},{id:'always',label:'블러디 퀸에게 신호총은 어떤 상황에서도 소용없기 때문입니다.'}],
      variants:[
        {id:'blocked',label:'본체는 벽 너머',prompt:'거울상은 가까이 있지만 본체는 신호총이 통과하지 못하는 벽 너머입니다. 무엇을 고려할까요?',
         facts:[{id:'target',label:'눈앞의 대상',value:'블러디 퀸의 거울상'},{id:'body',label:'본체 위치',value:'신호총 사선이 막힌 벽 너머'},{id:'resource',label:'내 자원',value:'신호총 1회 사용 가능'}],
         flow:[['본체','벽 너머 · 사선 차단'],['거울상','공군 가까이 접근'],['공군','신호총 사용 가능']],
         reasonId:'target',reasonExplanation:'가까운 형체가 거울상이라는 사실과 본체에 총이 닿는지를 함께 확인해야 합니다.',
         takeaway:'거울상의 거리보다 실제 본체에 닿는 사선을 확인합니다.',
         feedback:{
           mirror:{kind:'caution',title:'가까운 거울상을 직접 기절시키는 선택은 기전에 맞지 않습니다.',text:'거울상이 가까워도 신호총의 유효한 견제 대상을 확보한 것은 아닙니다. 본체를 구분해야 합니다.',clues:['target','body']},
           body:{kind:'unknown',title:'현재 주어진 위치에서는 본체 사격 조건이 없습니다.',text:'본체의 사선을 먼저 보려는 접근은 맞습니다. 다만 이 장면에서는 벽에 막혀 있으므로, 사선이 열리기 전 명중을 기대할 수 없습니다.',clues:['body']},
           move:{kind:'supported',title:'현재 자원을 쓰기 전에 거울 공격과 본체 사선을 살피는 선택입니다.',text:'벽 너머 본체에는 총이 닿지 않습니다. 특정 회피 경로의 성공까지 보장하지는 않지만, 거울상을 총으로 막을 수 있다고 가정하는 오류는 피합니다.',clues:['target','body']}
         }},
        {id:'clear',label:'본체가 사선 안에 있음',prompt:'거울상과 별개로 본체가 보이며, 장애물 없는 신호총 사거리 안입니다. 선택이 어떻게 달라질까요?',
         facts:[{id:'target',label:'구분한 대상',value:'거울상과 별개의 본체 확인'},{id:'body',label:'본체 위치',value:'장애물 없는 신호총 사거리 안'},{id:'resource',label:'내 자원',value:'신호총 1회 · 흥분 여부 미확인'}],
         flow:[['본체','사거리 안 · 사선 확보'],['거울상','본체와 구분 완료'],['공군','흥분·명중 조건 추가 확인']],
         reasonId:'target',reasonExplanation:'본체가 사선 안에 들어오면 사격을 검토할 수 있습니다. 거울상을 직접 기절시키는 것과는 다른 조건입니다.',
         takeaway:'본체 사선이 열리면 선택지가 늘지만, 총의 성공이 확정되지는 않습니다.',
         feedback:{
           mirror:{kind:'caution',title:'본체가 보이더라도 거울상을 직접 기절시키는 효과는 생기지 않습니다.',text:'현재 달라진 것은 본체에 총이 닿을 수 있는 조건입니다. 본체와 거울상의 구분을 유지해야 합니다.',clues:['target','body']},
           body:{kind:'conditional',title:'본체 사격을 검토할 수 있는 조건입니다.',text:'사거리와 장애물 조건은 충족했습니다. 흥분이나 회피 등 남은 변수를 확인해야 하므로 즉시 사용이 항상 최선이라고 단정하지 않습니다.',clues:['body','resource']},
           move:{kind:'conditional',title:'총을 아끼며 이동하는 선택도 남아 있습니다.',text:'본체에 총이 닿는다고 반드시 지금 써야 하는 것은 아닙니다. 다음 회피 공간과 자원의 필요성을 비교합니다.',clues:['body','resource']}
         }}
      ]
    },
    {
      id:'owl-window',status:'beta',own:'c58',opponent:'c16',title:'부엉이가 막을 공격은 언제 들어오나요?',topic:'추격 · 보호 시점',
      summary:'피격 전 보호와 이미 받은 피해의 복구를 구분합니다.',
      evidenceIds:['M086'],sourceIds:['seer'],
      mechanic:'부엉이는 보호가 적용된 동안의 공격을 한 차례 막는 수단입니다. 이미 받은 피해를 되돌리는 회복 수단은 아닙니다.',
      limits:['선지자 자신의 추격 장면으로, 부엉이 사용 가능 상태가 주어집니다.','이 장면은 일반적인 한 차례의 거울 공격만 다루며 모든 스킬 피해로 일반화하지 않습니다.','실제 보호 적용 지연이나 정확한 입력 시간을 시뮬레이션하지 않습니다.'],
      variationLabel:'거울 공격의 진행 상태',
      actions:[{id:'protect',label:'예상되는 다음 타격 전에 보호를 적용하고 이동하겠습니다.'},{id:'restore',label:'부엉이로 이미 받은 피해를 되돌리겠습니다.'},{id:'observe',label:'추가 공격 위험을 확인하며 보호 자원을 아끼겠습니다.'}],
      reasons:[{id:'timing',label:'보호가 적용되는 시점과 공격 순서를 봐야 하기 때문입니다.'},{id:'healing',label:'부엉이는 받은 피해를 회복시키기 때문입니다.'},{id:'unlimited',label:'보호 시간 동안 모든 공격을 계속 막기 때문입니다.'}],
      variants:[
        {id:'incoming',label:'타격 전',prompt:'아직 부상하지 않았고 거울 타격이 임박했습니다. 보호를 적용할 여유가 주어진다면 어떻게 쓸까요?',
         facts:[{id:'timing',label:'공격 상태',value:'첫 타격 전 · 거울 공격 임박'},{id:'owl',label:'부엉이',value:'사용 가능 · 아직 보호 미적용'},{id:'window',label:'연습 조건',value:'타격 전에 보호를 적용할 여유 있음'}],
         flow:[['관찰','거울 타격 위험 확인'],['보호','타격 전에 적용할 여유'],['이동','보호 후에도 회피 지속']],
         reasonId:'timing',reasonExplanation:'이 장면에는 타격 전에 보호할 여유가 주어져 있습니다. 보호 적용 이후의 공격에 대비하는 선택입니다.',
         takeaway:'보호는 공격 전에 적용됐는지를 확인합니다.',
         feedback:{
           protect:{kind:'supported',title:'주어진 타격 시점에 맞춘 보호 선택입니다.',text:'보호 적용이 먼저라는 연습 조건에 맞습니다. 한 차례 막았다고 그 자리에 계속 머물러도 안전한 것은 아닙니다.',clues:['timing','window']},
           restore:{kind:'caution',title:'부엉이를 피해 복구 수단으로 생각하지 않습니다.',text:'이 장면은 아직 피격 전입니다. 이후 보호를 보내더라도 보호 이전의 피해를 취소하는 기능으로 바뀌지는 않습니다.',clues:['timing','owl']},
           observe:{kind:'conditional',title:'자원을 아끼려면 이번 타격을 피할 다른 수단이 필요합니다.',text:'타격이 임박한 조건입니다. 보호를 미루는 선택은 회피할 여유와 다른 수단을 확인해야 합니다.',clues:['timing','window']}
         }},
        {id:'landed',label:'타격 후',prompt:'첫 거울 타격을 이미 받아 부상했습니다. 아직 사용하지 않은 부엉이를 어떻게 생각해야 할까요?',
         facts:[{id:'timing',label:'공격 상태',value:'첫 타격이 이미 적중 · 부상'},{id:'owl',label:'부엉이',value:'사용 가능 · 아직 보호 미적용'},{id:'window',label:'다음 공격',value:'추가 타격 가능 시점은 미확인'}],
         flow:[['피격','첫 거울 타격 적중'],['현재','부상 · 부엉이는 남아 있음'],['다음','추가 타격 위험 확인 필요']],
         reasonId:'timing',reasonExplanation:'이미 적중한 공격은 보호를 뒤늦게 적용해 취소하지 못합니다. 남은 부엉이는 다음 공격을 기준으로 판단합니다.',
         takeaway:'이미 받은 피해와 앞으로 막을 피해를 구분합니다.',
         feedback:{
           protect:{kind:'conditional',title:'다음 공격을 막는 목적이라면 검토할 수 있습니다.',text:'지금의 부상을 없애는 효과는 아닙니다. 다음 타격 시점을 확인해야 보호를 적용할 때를 판단할 수 있습니다.',clues:['timing','window']},
           restore:{kind:'caution',title:'뒤늦은 보호로 이전 피해를 되돌리지는 못합니다.',text:'부엉이가 남아 있다는 사실은 이미 받은 피해의 복구 가능성을 뜻하지 않습니다.',clues:['timing','owl']},
           observe:{kind:'supported',title:'다음 타격의 위험을 먼저 확인하는 선택입니다.',text:'추가 타격 시점이 주어지지 않았습니다. 이동을 이어가며 다음 공격을 확인하고, 그 공격 전에 보호할 수 있는지 판단합니다.',clues:['window']}
         }}
      ]
    },
    {
      id:'queen-owl',status:'beta',own:'c16',opponent:'c58',title:'부엉이를 보고 바로 공격할까요?',topic:'감시자 · 조건부 판단',
      summary:'기다리기와 공격하기를 하나의 정답으로 고정하지 않고 필요한 정보를 확인합니다.',
      evidenceIds:['M086'],sourceIds:['seer'],
      mechanic:'유효한 부엉이 보호가 남아 있다면 해당 공격을 막을 수 있습니다. 보호 종료 후에는 그 보호를 다음 타격의 방어로 계산하지 않습니다.',
      limits:['현재 추격 중인 선지자에게서 관찰한 보호 상태만 다룹니다.','거울 지속시간·거리·이동 공간은 일부러 미확인으로 남겼습니다. 실전 최선의 행동을 확정하는 문제가 아닙니다.','공격·대기는 각각 조건부 대안이며, 승률이나 성공 시간을 계산하지 않습니다.'],
      variationLabel:'관찰한 보호 상태',
      actions:[{id:'attack',label:'지금 공격해서 추격을 이어가겠습니다.'},{id:'wait',label:'보호가 끝나기를 기다리겠습니다.'},{id:'check',label:'보호 상태·남은 거울 시간·거리를 함께 확인하겠습니다.'}],
      reasons:[{id:'context',label:'보호 상태와 추격에 남은 시간이 함께 중요하기 때문입니다.'},{id:'alwayswait',label:'부엉이를 봤으면 언제나 기다리는 것이 유리하기 때문입니다.'},{id:'alwayshit',label:'거울 타격은 부엉이를 항상 무시하기 때문입니다.'}],
      variants:[
        {id:'active',label:'보호가 남아 있음',prompt:'선지자에게 아직 유효한 부엉이 보호가 보입니다. 남은 보호 시간과 거울 시간은 모릅니다. 지금 행동을 확정할 수 있을까요?',
         facts:[{id:'owl',label:'보호 상태',value:'유효한 보호 확인 · 아직 미소모'},{id:'mirror',label:'거울 상태',value:'사용 중 · 남은 시간 미확인'},{id:'distance',label:'추격 조건',value:'정확한 거리·다음 이동 공간 미확인'}],
         flow:[['관찰','부엉이 보호가 남아 있음'],['미확인','보호·거울의 남은 시간'],['비교','공격과 대기의 조건']],
         reasonId:'context',reasonExplanation:'보호 기전은 확인할 수 있어도 기다리거나 공격하는 선택의 우열까지 정할 정보는 부족합니다.',
         takeaway:'부엉이를 봤다는 사실만으로 공격·대기의 우열을 확정하지 않습니다.',
         feedback:{
           attack:{kind:'conditional',title:'보호를 소모시키는 선택은 가능하지만 피해를 확정할 수는 없습니다.',text:'공격에 보호가 적용될 수 있습니다. 이후 추격을 이어갈 시간과 거리를 알아야 선택의 가치를 비교할 수 있습니다.',clues:['owl','mirror']},
           wait:{kind:'conditional',title:'기다리기도 가능하지만 추격 시간을 잃을 수 있습니다.',text:'기다리는 동안 상대가 이동하거나 거울이 끝날 수 있습니다. 남은 시간과 거리 없이 항상 유리한 선택이라고 말할 수 없습니다.',clues:['mirror','distance']},
           check:{kind:'supported',title:'부족한 정보를 확인하는 것이 이번 연습의 핵심입니다.',text:'이 장면은 즉시 공격과 대기 중 하나를 정답으로 정하지 않습니다. 보호 상태와 추격에 남은 자원을 함께 살핍니다.',clues:['owl','mirror','distance']}
         }},
        {id:'ended',label:'보호 종료를 확인함',prompt:'선지자의 부엉이 보호가 끝난 것을 확인했습니다. 다른 추격 조건은 여전히 모릅니다. 판단에서 무엇이 달라질까요?',
         facts:[{id:'owl',label:'보호 상태',value:'보호 종료 확인 · 새 보호는 없음'},{id:'mirror',label:'거울 상태',value:'사용 중 · 남은 시간 미확인'},{id:'distance',label:'추격 조건',value:'정확한 거리·다음 이동 공간 미확인'}],
         flow:[['관찰','보호 종료를 확인함'],['미확인','남은 거울 시간·거리'],['비교','실제 타격 가능한지 확인']],
         reasonId:'context',reasonExplanation:'끝난 보호를 기다릴 필요는 없지만, 타격 가능 여부와 이후 추격까지 확정되는 것은 아닙니다.',
         takeaway:'종료된 보호와 아직 모르는 추격 조건을 분리합니다.',
         feedback:{
           attack:{kind:'conditional',title:'끝난 부엉이는 이번 타격을 막지 않지만, 명중 조건은 따로 봅니다.',text:'거리와 공격 기회가 있다면 공격을 검토할 수 있습니다. 보호 종료만으로 명중이나 다운을 보장하지 않습니다.',clues:['owl','distance']},
           wait:{kind:'caution',title:'이미 끝난 보호를 기다린다는 이유는 맞지 않습니다.',text:'다른 전술적 이유로 기다릴 수는 있지만, 이 장면에서 부엉이 종료를 기다릴 필요는 없습니다.',clues:['owl']},
           check:{kind:'supported',title:'종료된 보호를 제외하고 남은 조건을 확인합니다.',text:'이제는 실제 타격 거리와 남은 거울 시간 등을 기준으로 선택을 비교합니다.',clues:['owl','mirror','distance']}
         }}
      ]
    }
  ]
};
