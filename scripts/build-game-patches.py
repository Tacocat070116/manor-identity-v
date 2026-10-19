"""Build a source-linked official notice archive. No raw article bodies are published.

Run after collect-game-patches.py with --cache pointing to its external cache.
Editorial date exceptions and latest-character summaries are retained in research/patches.
"""
import argparse, collections, hashlib, importlib.util, json, re, unicodedata
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
CHECKED='2026-10-19'
ORDER=['balance','fix','new','system','event','cosmetic','other']
LABELS={'balance':'전투·밸런스','fix':'오류 수정','new':'캐릭터·콘텐츠 추가','system':'시스템·편의 기능','event':'이벤트','cosmetic':'스킨·상점','other':'기타 안내'}
def read(path): return json.loads(path.read_text())
def write(path,value):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(value,ensure_ascii=False,separators=(',',':'))+'\n')
def normalized(text): return unicodedata.normalize('NFKC',text).replace('“','"').replace('”','"').replace('’',"'")
PREVIEW=re.compile(r"next (?:week|update)|来週の|次週の|次回のアップデート|다음.*(?:업데이트|점검).*예고",re.I)
COSMETIC=re.compile(r'衣装|携帯品|アイコン|落書き|待機モーション|展示|costume|accessor(?:y|ies)|portrait|graffiti|standby motion|emotes?|interactive action|感情表現|特殊アクション|코스튬|스킨|액세서리|프로필',re.I)
MODE=re.compile(r'コピーキャット|ペン先の空想|手記の加筆|森のお伽話|タロット|協力狩り|ブラックジャック|悪夢の影|水晶玉|Copycat|Scribbled Ideas|Cryptic Notes|Hide and Seek|Enchanted Forest|Tarot|Duo Hunters|Blackjack|Chasing Shadows|A Bringer of Doom',re.I)
def heading(text):
    t=text.strip('【】[]：: -*—').strip()
    if len(t)>80:return None
    if PREVIEW.search(t):return 'preview'
    if re.fullmatch(r'.*(?:不具合の修正|不具合修正|バグ修正|Bug Fixes|문제 수정|오류 수정|버그 수정).*',t,re.I):return 'fix'
    if re.fullmatch(r'(?:対戦|対戦に関する(?:変更|調整)|キャラ調整|キャラクター(?:の)?調整|戦闘(?:調整)?|バランス調整|Combat(?: Adjustments)?|Character Adjustments|Talent Adjustments|Balance Adjustments|대전|대전 관련 조정|캐릭터 조정)',t,re.I):return 'balance'
    if re.fullmatch(r'(?:新キャラ|新サバイバー|新ハンター|新シーズン|新マップ|New Character|New Survivor|New Hunter|New Season|New Map|신규 캐릭터|신규 생존자|신규 감시자|신규 시즌|새로운 시즌)',t,re.I):return 'new'
    if re.fullmatch(r'(?:ゲームの改善|ゲーム改善|システム(?:改善|調整)?|Experience Improvements|Improvements|Optimizations|게임 개선|시스템 개선)',t,re.I):return 'system'
    if re.fullmatch(r'(?:.*ショップ|Shop|Event Shop|.*Costumes|.*衣装.*|.*真髄|.*Essence|.*상점|.*의상.*)',t,re.I):return 'cosmetic'
    if re.fullmatch(r'(?:.*イベント|イベント.*|.*Event|.*Crossover|.*コラボ.*|キャラの日.*|Character Day|.*이벤트|.*콜라보.*)',t,re.I):return 'event'
    if re.fullmatch(r'(?:大会|Tournament|娯楽モード|公共マップ|居館ホール|ペン先の空想|手記の加筆|Cryptic Notes|Scribbled Ideas|コピーキャットゲーム|Copycat|森のお伽話|Enchanted Forest|五人ランク戦|.*処罰のお知らせ|Penalties for Violations|대회|오락 모드)',t,re.I):return 'other'
    return None

def matches(text,language,aliases):
    text=normalized(text);found=[]
    for c in aliases:
        names=c.get(language,[]) if language!='ko' else [c['ko']]
        for name in names:
            name=normalized(name)
            if language=='en':
                # Case-sensitive English titles prevent "look forward" and common nouns.
                yes=re.search(r'(?<![A-Za-z])'+re.escape(name)+r'(?![A-Za-z])',text)
            else:yes=name in text
            if yes and name=='Nightmare' and re.search(r'Nightmare difficulty',text) and '"Nightmare"' not in text:yes=False
            if yes:found.append(c['id']);break
    return found

def classify(article,aliases):
    types=set();changes=collections.defaultdict(set);current=None
    for line in article['paragraphs']:
        kind=heading(line)
        if kind=='preview':break
        if kind:
            current=kind;types.add(kind);continue
        # The earliest notices use an inline bracketed category instead of headings.
        if re.search(r'^[-—]*(?:【|\[)(?:調整|対戦|キャラ調整)',line):current='balance';types.add(current)
        elif re.search(r'^[-—]*(?:【|\[)(?:不具合|バグ)',line):current='fix';types.add(current)
        elif re.search(r'^[-—]*(?:【|\[)(?:キャラ|キャラクター)',line):current='new';types.add(current)
        elif re.search(r'^[-—]*(?:【|\[)(?:ショップ|衣装)',line):current='cosmetic';types.add(current)
        elif re.search(r'^[-—]*(?:【|\[)(?:イベント|新イベント)',line):current='event';types.add(current)
        elif re.search(r'^[-—]*(?:【|\[)',line):current='other';types.add(current)
        if not current:continue
        kind='cosmetic' if COSMETIC.search(line) else 'other' if MODE.search(line) else 'system' if re.search(r'bonus|bonus points|演繹得点|인지 점수|연역 점수',line,re.I) and re.search(r'points|得点|점수|bonus \"',line,re.I) else current
        for cid in matches(line,article['language'],aliases):changes[cid].add(kind)
    return types or {'other'},changes

def build(cache):
    spec=importlib.util.spec_from_file_location('collector',ROOT/'scripts/collect-game-patches.py');collector=importlib.util.module_from_spec(spec);spec.loader.exec_module(collector)
    articles=[collector.parse_article(a,cache) for a in read(cache/'articles.json')]
    existing={a['url'] for a in articles}
    additional=ROOT/'research/patches/additional-sources.json'
    if additional.exists():
        for item in read(additional):
            if item['url'] not in existing:articles.append(collector.parse_article(item,cache))
    extra={'url':'https://www.identityvgame.com/jp/news/official/20210723/35355_955966.html','language':'ja','title':'Android版リリースのお知らせ','posted':'2018-07-10','index':'https://www.identityvgame.com/jp/news/official/'}
    articles.append(collector.parse_article(extra,cache))
    aliases=read(ROOT/'research/patches/character-aliases.json');names={c['id']:c['ko'] for c in aliases}
    exceptions=read(ROOT/'research/patches/date-exceptions.json')['entries']
    groups=collections.defaultdict(list);inventory=[];excluded=[]
    for article in articles:
        x=exceptions.get(article['url'],{});date=x.get('effectiveDate',article['effectiveDate'])
        scope=x.get('kind',article['kind']);document=x.get('documentType','maintenance')
        if document=='test-server':scope='test'
        if x.get('excludeFromArchive') or document in ['unrelated-announcement','non-patch-announcement','enforcement-report','tournament-rules','community-contest','contest-announcement']:
            excluded.append({'url':article['url'],'title':article['title'],'reason':x.get('note',document)});continue
        if not re.search(r'maintenance|update|hotfix|ゲームアップデート|メンテナンス|점검|업데이트|テストサーバ',article['title'],re.I) and document not in ['launch-announcement','test-server','live-maintenance','live-maintenance-supplement']:
            excluded.append({'url':article['url'],'title':article['title'],'reason':'점검·패치 공지가 아닌 일반 공지'});continue
        status='confirmed' if date else 'conflict' if article['issues'] else 'unknown'
        if article['issues'] and not x:date=None;status='conflict'
        if date and date>CHECKED:
            raise ValueError('Future effective date needs review: '+article['url']+' '+date)
        shown=date or x.get('displayedDate') or article['posted']
        if not shown:raise ValueError('Missing all dates: '+article['url'])
        key=(scope,date or shown,document if document=='launch-announcement' else 'maintenance',status)
        article={**article,'effectiveDate':date,'date':shown,'dateStatus':status,'scope':scope,'exception':x}
        groups[key].append(article)
        inventory.append({'url':article['url'],'language':article['language'],'title':article['title'],'noticeDate':article['posted'],'effectiveDate':date,'dateStatus':status,'scope':scope,'sha256':article['sha256']})
    entries=[]
    for (scope,date,document,status),sources in groups.items():
        sources.sort(key=lambda a:({'ko':0,'en':1,'ja':2}[a['language']],a['url']))
        types=set();changes=collections.defaultdict(set)
        # Use every language to recover old names and supplementary correction notices.
        for a in sources:
            kinds,related=classify(a,aliases);types.update(kinds)
            for cid,kinds in related.items():changes[cid].update(kinds)
        if document=='launch-announcement':
            types={'new'};cid=next(c['id'] for c in aliases if c['ko']=='포워드');changes[cid].add('new')
            summary=['글로벌 Android 버전 출시와 생존자 포워드 추가 안내입니다. 당일 전체 점검 내역을 담은 공지는 아닙니다.']
        else:
            summary=[]
            for kind in ORDER:
                if kind not in types:continue
                ids=[cid for cid in changes if kind in changes[cid]]
                if kind in ['balance','fix','new'] and ids:
                    label=' · '.join(names[cid] for cid in ids[:7]);more=f' 외 {len(ids)-7}명' if len(ids)>7 else ''
                    summary.append(f'{LABELS[kind]} 항목: {label}{more} 관련 내용이 포함되어 있습니다.')
            other=[LABELS[kind] for kind in ORDER if kind in types and kind not in ['balance','fix','new']]
            if other:summary.append('함께 안내된 내용: '+', '.join(other)+'.')
            if not summary:summary=['정기 점검 및 게임 업데이트에 관한 공식 안내입니다. 전체 변경 항목은 연결된 원문에서 확인하세요.']
        entry={'id':scope+'-'+date+('-launch' if document=='launch-announcement' else '-unconfirmed' if status!='confirmed' else ''),'date':date,'effectiveDate':sources[0]['effectiveDate'],'dateStatus':status,'scope':scope,'title':date.replace('-','.')+(' Android 출시 안내' if document=='launch-announcement' else ' 테스트 서버 업데이트' if scope=='test' else ' 게임 업데이트'),'types':[kind for kind in ORDER if kind in types],'characterIds':sorted(changes,key=lambda cid:names[cid]),'characterChanges':{cid:[kind for kind in ORDER if kind in kinds] for cid,kinds in changes.items()},'summary':summary,'sources':[{'url':a['url'],'language':a['language'],'title':a['title'],'noticeDate':a['posted']} for a in sources]}
        notes=list(dict.fromkeys(a['exception'].get('note','') for a in sources if a['exception'].get('note')))
        if status!='confirmed':notes.insert(0,'적용일을 확정하지 못해 공지 표기일로 정렬했습니다. 복귀 날짜 이후 필터 및 최근 변경 카드에서는 제외합니다.')
        if notes:entry['dateNote']=' '.join(notes)
        entries.append(entry)
    entries.sort(key=lambda a:(a['date'],a['id']),reverse=True)
    lookup={source['url']:entry for entry in entries for source in entry['sources']}
    editorial=ROOT/'research/patches/latest-character-changes.json';latest={}
    if editorial.exists():
        for cid,change in read(editorial)['characters'].items():
            entry=lookup.get(change['sourceUrl'])
            if not entry or entry['scope']!='live' or entry['effectiveDate']!=change['date'] or entry['dateStatus']!='confirmed':raise ValueError('Editorial latest source/date mismatch: '+cid)
            latest[cid]={key:change[key] for key in ['date','sourceUrl','sourceLanguage','types','summary']};latest[cid]['patchId']=entry['id']
            if cid not in entry['characterIds']:entry['characterIds'].append(cid)
            entry['characterChanges'].setdefault(cid,[])
            for kind in change['types']:
                if kind not in entry['characterChanges'][cid]:entry['characterChanges'][cid].append(kind)
                if kind not in entry['types']:entry['types'].append(kind)
            entry.setdefault('highlights',[]).append({'characterId':cid,'type':change['types'][0],'text':names[cid]+': '+' '.join(change['summary'])})
    live=[e for e in entries if e['scope']=='live'];years=collections.Counter(e['date'][:4] for e in live)
    meta={'checkedAt':CHECKED,'startDate':min(e['date'] for e in live),'latestDate':max(e['date'] for e in live),'sourceCount':len(inventory),'coverageText':'2018년부터 현재까지 확보한 글로벌 정식 서버의 공식 점검·업데이트 기록입니다. 같은 적용일의 여러 언어 공지는 한 기록으로 연결했습니다.','limitations':['확보한 첫 기록은 2018년 7월 11일 Android 출시 안내입니다. 출시 초기와 삭제된 공지까지 모두 복원했다는 뜻은 아닙니다.','공식 일본어 업데이트 목록 32페이지, 영어 공지 목록 19페이지, 한국어 공지 목록 2페이지와 업데이트 목록을 대조했습니다. 이전 일본어 공식 목록 31페이지에서 원문 7개를 보충했습니다.','날짜는 공지 제목·본문·다른 언어 원문을 대조했습니다. 이전된 웹 주소의 날짜와 실제 적용일은 다를 수 있습니다.','캐릭터 연결과 변경 분야는 원문에서 확인된 언급을 기준으로 합니다. 스킬명만 적힌 일부 과거 항목은 캐릭터 검색에서 빠질 수 있습니다. 전체 번역은 제공하지 않으며 세부 조건은 원문을 확인하세요.','테스트 서버는 별도 필터로 제공하며 중국 서버 전용 공지는 수집 범위에 포함하지 않습니다.','자료 확인일 이후의 업데이트는 자동 반영되지 않습니다.'], 'years':[{'year':year,'count':count} for year,count in sorted(years.items(),reverse=True)]}
    write(ROOT/'dist/patches/archive.json',{'meta':meta,'entries':entries})
    write(ROOT/'dist/patches/characters.json',{'meta':{'checkedAt':CHECKED,'count':len(latest),'basis':'검토한 글로벌 정식 서버 공지의 최근 전투 조정·오류 수정'},'characters':latest})
    write(ROOT/'research/patches/source-inventory.json',{'checkedAt':CHECKED,'sources':inventory,'excluded':excluded})
    print(json.dumps({'entries':len(entries),'live':len(live),'test':len(entries)-len(live),'sources':len(inventory),'excluded':len(excluded),'latestCharacters':len(latest),'years':years,'unconfirmed':[e['id'] for e in entries if e['dateStatus']!='confirmed']},ensure_ascii=False))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--cache',required=True);args=parser.parse_args();build(Path(args.cache))
