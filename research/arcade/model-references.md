# 아케이드 도트의 원본 대조 기록

2026년 11월 28일 기준. 아케이드 24개 상황에 쓰이는 기본 외형을 검토했다. 표의 링크는 실제로 열어 본 NetEase의 공식 배포본이다. 캐릭터 파일에는 무기나 부속품이 포함되지만, 같은 캐릭터가 생성하는 투사체와 지형 효과는 별도 오브젝트일 수 있다.

| 대상 | 3D 대조 자료 | 확인 범위 |
| --- | --- | --- |
| 정원사 | [PMX](https://www.identityvgame.com/data/moxingzip/yuanding-pmx.zip) | 정점 5,290개, 삼각형 6,796개. 밀짚모자의 어두운 띠, 접어 올린 흰 소매, 덧댄 녹색 앞치마, 허리 도구, 청색 바지와 녹색 공구함을 대조했다. 단추눈의 교차 실과 주근깨는 얼굴 자료와 함께 확인했다. 대화창은 이 특징이 작은 크기에서도 보이도록 별도의 64픽셀 초상화로 그렸다. |
| 붉은 나비 | [glTF](https://www.identityvgame.com/data/role/hongdie/h55_butcher_banshee.gltf) · [PMX](https://www.identityvgame.com/data/moxingzip/hongdie-pmx.zip) | PMX와 기본형 glTF의 의상이 달라 나타날 때의 붉은 기모노·머리·흰 부채는 glTF의 네 메시를 기준으로 삼았다. 돌진할 때는 가면, 녹색·자주색 옷자락과 어두운 부채로 바뀐다. |
| 노란 옷의 왕 | [PMX](https://www.identityvgame.com/data/moxingzip/huangyizhizhu-pmx.zip) | 부속 무기 파일 wuqi.pmx에서 정점 1,047개, 삼각형 1,142개, 뼈 7개와 512×512 텍스처를 확인했다. 소환 촉수의 밑동과 휘두르는 모습은 게임 화면을 대조했다. |
| 재앙의 도마뱀 | [glTF](https://www.identityvgame.com/data/role/niexi/h55_lizard_idle.gltf) | 머리·몸·무기 메시에서 납작한 얼굴, 구릿빛 땋은 머리, 해진 코트와 휘어진 칼날, 구부린 뒷발과 꼬리를 확인했다. |
| 블러디 퀸 | [glTF](https://www.identityvgame.com/data/role/hongfuren/h55_redqu.gltf) | 머리·몸·다리·무기 메시에서 말아 올린 머리, 주름 칼라, 속치마가 드러나는 드레스와 손에 쥔 유리 파편을 확인했다. 거울상의 색과 투명도는 게임 화면을 참고했다. |
| 사냥터지기 | [glTF](https://www.identityvgame.com/data/role/lutou/lutou.gltf) | 갈퀴의 입이 벌어진 상어 뼈 모양과 마디가 이어진 몸체를 확인했다. 덫은 별도로 대조했다. |
| 수위 26호 | [glTF](https://www.identityvgame.com/data/role/26hsw/h55_bon_idle.gltf) | bomber_weapon01의 리벳, 어두운 구형 몸체와 붉은 윗부분, 옆면의 돌기와 원판을 확인했다. |
| 광대 | [glTF](https://www.identityvgame.com/data/role/xiaochou/xiaochou.gltf) | 로켓의 줄무늬, 원통과 코 부분의 색을 확인했다. |
| 사도 | [glTF](https://www.identityvgame.com/data/role/shitu/joan_idle.gltf) | 독립된 joan_cat 메시에서 가늘고 긴 체형, 뾰족한 귀, 등과 다리 사이의 색 차이를 확인했다. |
| 나이아스 | [glTF](https://www.identityvgame.com/data/role/yunv/h55_yunv_idle.gltf) | 작살을 포함한 yunv_peijian의 윤곽을 확인했다. 물길은 스킬 연출이다. |
| 조각가 | [glTF](https://www.identityvgame.com/data/role/diaokeshi/diaokeshi.gltf) | 공개 메시 세 개는 머리·몸·휠체어다. 소환하는 조각상과 합체는 게임 화면과 기술 아이콘을 대조했다. |
| 리퍼 | [glTF](https://www.identityvgame.com/data/role/jk/jieke.gltf) | 캐릭터 모델로 발톱을 확인했다. 날아가는 안개는 별도 시각 효과다. |
| 거미 | [glTF](https://www.identityvgame.com/data/role/zhizhu/zhizhu.gltf) | 캐릭터 본체와 기계 다리를 확인했다. 발사된 실은 별도 시각 효과다. |
| 밀랍인형사 | [glTF](https://www.identityvgame.com/data/role/laxiangshi/wax_destroy.gltf) | 본체와 붙어 있는 밀랍인형, 무기 메시를 확인했다. 분사된 밀랍과 응고한 덩어리는 별도 효과다. |
| 바이올리니스트 | [glTF](https://www.identityvgame.com/data/role/tiqinjia/H55_paganini_skin_idle.gltf) | 캐릭터의 바이올린과 무기 메시를 확인했다. 두 음표 사이의 현은 게임 연출이다. |
| 광기의 눈 | [glTF](https://www.identityvgame.com/data/role/fengyan/burke_lv2_idle.gltf) | 캐릭터의 머리·몸·무기 메시를 확인했다. 솟아오르는 격벽은 이 세 메시에 포함되지 않는다. |
| 우산의 영혼 | [glTF](https://www.identityvgame.com/data/susan-gai/wuchang.gltf) | 캐릭터와 손에 든 부속품을 대조했다. 종의 울림은 도트로 표현했다. |
| 기계공 | [glTF](https://www.identityvgame.com/data/role/jixieshi/jixieshi.gltf) · [PMX](https://www.identityvgame.com/data/moxingzip/jixieshi-pmx.zip) | 캐릭터와 조종기(remote)를 확인했다. 조종기는 조종 대상인 인형과 구분했다. |
| 작곡가 | [glTF](https://www.identityvgame.com/data/role/yinyuejia/yinyuejia.gltf) · [PMX](https://www.identityvgame.com/data/moxingzip/zuoqujia-pmx.zip) | 본체와 손에 드는 소품 메시를 확인했다. 조율의 음표와 박자선은 2D 표시다. |

정원사의 얼굴 모델은 2026년 1월 개선 공지가 있어, 공개 배포본이 현재 클라이언트와 동일한 빌드라고 단정할 수 없다. 그림은 게임에 표시되는 크기에 맞춰 다시 그렸다. [공식 캐릭터 모델](https://www.identityvgame.com/jp/character/index.html) · [공식 개선 공지](https://www.identityvgame.com/jp/news/update/20260114/35356_1281822.html) · [개선 후 외형 참고](https://id5.fandom.com/wiki/Gardener/Gallery)

### 게임 장면으로 확인한 엔티티

| 장면 | 도트에 적용한 단서 | 참고 자료 |
| --- | --- | --- |
| 조각상의 합체 | 각진 받침대 위 망토의 주름, 합체 전 두 조각의 서로 다른 윤곽과 합체 뒤 어깨 형태 | [NetEase 공략에 실린 경기 장면](https://game.xiaomi.com/viewpoint/1160758920_1617380460725_16) |
| 노란 옷의 왕의 촉수 | 땅에 박힌 밑동을 축으로 끝이 휘어지고 내려치는 순서. 공개 무기 메시와 소환물 메시의 동일 여부는 미확인 | [게임 장면](https://game.xiaomi.com/viewpoint/1408505475_1640010577518_13) |
| 블러디 퀸의 거울상 | 유리 파편을 휘두르는 실루엣과 푸른 투영색 | [게임 장면](https://www.9game.cn/dwrg/11552584.html) |
| 광기의 눈의 격벽 | 지면에서 올라오는 벽의 단면과 연결 구조 | [공식 소개](https://www.identityv.jp/news/gonggao/2018/11/29/29435_787622.html) |
| 해독기와 기계공의 인형 | 해독기 상단의 키보드·회전부와 받침대, 인형의 얼굴과 관절 | [해독기](https://id5.fandom.com/wiki/Cipher_Machine) · [인형](https://gamerch.com/identityv/855174) |
| 산제비나비 | 기본 외형의 날개 색과 비행 실루엣 | [스킬 자료](https://id5.fandom.com/wiki/Dancing_in_Misery) |

실과 안개 칼날, 물길, 밀랍, 음표처럼 움직일 때 보이는 효과는 아케이드의 예고·공격 프레임에 맞춰 그렸다. 이 기록에서 확인한 파일은 공식 사이트가 공개한 배포본이다. 설치판 전용 메시와 이펙트의 일치 여부는 미확인이다.
