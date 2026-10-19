"""Collect the public official archive; raw pages stay in an external cache.

Requires Python 3 + lxml. Run from the repository with --cache outside the repo.
This inventory deliberately keeps notice dates separate from effective dates.
"""
import argparse, concurrent.futures, hashlib, json, re, time, urllib.request
from pathlib import Path
from urllib.parse import urljoin, urlparse
from lxml import html

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://www.identityvgame.com'
MONTHS = {m.lower(): i+1 for i,m in enumerate('January February March April May June July August September October November December'.split())}
MONTHS.update({key[:3]:value for key,value in list(MONTHS.items())})
MONTHS.update({'janurary':1,'feburary':2,'sept':9})

def clean(value):
    return re.sub(r'\s+', ' ', value.replace('\u3000',' ').replace('\xa0',' ')).strip()

def canonical(url):
    url = urljoin(ORIGIN, url)
    return re.sub(r'https?://(?:www\.)?idv\.163\.com', ORIGIN, url)

def get(url, cache):
    path = cache / (hashlib.sha256(url.encode()).hexdigest()+'.html')
    if path.exists(): return path.read_text()
    for attempt in range(3):
        try:
            req=urllib.request.Request(url,headers={'User-Agent':'MANOR-Patch-Archive/1.0 (public official notices)'})
            with urllib.request.urlopen(req,timeout=35) as response:
                body=response.read().decode('utf-8')
            if len(body)<500: raise ValueError('Unexpectedly short document')
            path.write_text(body)
            return body
        except Exception:
            if attempt==2: raise
            time.sleep(0.4*(attempt+1))

def effective(title, posted):
    # Do not infer a maintenance date from URL paths or an arbitrary body date.
    match=re.search(r'(20\d{2})\s*[-/年년]\s*(\d{1,2})\s*[-/月월]\s*(\d{1,2})',title)
    if match: return '-'.join([match[1],match[2].zfill(2),match[3].zfill(2)]), 'title'
    matches=re.findall(r'\b('+'|'.join(MONTHS)+r')\.?\s*(\d{1,2})\b',title,re.I)
    if matches and posted:
        month,day=matches[-1];year=int(posted[:4]);month=MONTHS[month.lower()]
        if int(posted[5:7])==12 and month==1: year+=1
        if int(posted[5:7])==1 and month==12: year-=1
        return f'{year:04}-{month:02}-{int(day):02}', 'title'
    return None, 'unconfirmed'

def parse_article(item, cache):
    raw=get(item['url'],cache);doc=html.fromstring(raw)
    titles=doc.xpath('//*[contains(concat(" ",normalize-space(@class)," ")," newsTitle ")]')
    title=clean(titles[0].text_content()) if titles else item['title']
    wraps=doc.xpath('//*[@id="NIE-art"]')
    if not wraps:
        wraps=doc.xpath('//*[contains(concat(" ",normalize-space(@class)," ")," news-content-content ")]/*[contains(concat(" ",normalize-space(@class)," ")," content ")]')
    if not wraps: raise ValueError('Official article body missing: '+item['url'])
    body=wraps[0]
    # Several English notices put the whole article in one paragraph with brs.
    for br in body.xpath('.//br'): br.tail='\n'+(br.tail or '')
    parts=[]
    for node in body.xpath('.//p|.//li|.//h3|.//h4|.//h2|.//div'):
        if node.xpath('.//p|.//li|.//div|.//h3|.//h4|.//h2'): continue
        for line in node.text_content().splitlines():
            text=clean(line)
            if text and (not parts or text!=parts[-1]): parts.append(text)
    if not parts: parts=[clean(body.text_content())]
    date,method=effective(title,item.get('posted',''))
    kind='test' if re.search(r'test server|テストサーバ|共研服|테스트 서버',title,re.I) else 'live'
    conflict=[]
    if date:
        for m,d in re.findall(r'[（(](\d{1,2})[/月](\d{1,2})',title):
            if f'{int(m):02}-{int(d):02}' != date[5:]: conflict.append('title-date-conflict')
    return {**item,'title':title,'effectiveDate':date,'dateMethod':method,'kind':kind,'issues':conflict,'sha256':hashlib.sha256(raw.encode()).hexdigest(),'paragraphs':parts}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--cache',required=True);parser.add_argument('--workers',type=int,default=6)
    args=parser.parse_args();cache=Path(args.cache);cache.mkdir(parents=True,exist_ok=True)
    targets=[('ja','/jp/news/update/',32),('en','/en/news/announcement/',19),('ko','/kr/news/announcement/',2),('ko','/kr/news/update/',2)]
    pages=[(lang,ORIGIN+prefix+('' if n==1 else f'index_{n}.html')) for lang,prefix,count in targets for n in range(1,count+1)]
    items={};failures=[]
    def list_page(target):
        lang,url=target;doc=html.fromstring(get(url,cache));found=[]
        for a in doc.xpath('//a[@href]'):
            href=canonical(a.get('href'))
            if re.search(r'/(?:jp|en|kr)/news/(?:update|announcement)/\d{8}/\d+_\d+\.html$',urlparse(href).path):
                text=clean(a.text_content());dates=re.findall(r'20\d{2}-\d{2}-\d{2}',text)
                posted=dates[-1] if dates else ''
                title=text[:-len(posted)].strip() if posted and text.endswith(posted) else text
                found.append({'url':href,'language':lang,'title':title,'posted':posted,'index':url})
        return found
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures={pool.submit(list_page,p):p for p in pages}
        for future in concurrent.futures.as_completed(futures):
            try:
                for item in future.result(): items[item['url']]=item
            except Exception as error: failures.append({'url':futures[future][1],'stage':'index','error':str(error)})
    extras=ROOT/'research/patches/additional-sources.json'
    if extras.exists():
        for item in json.loads(extras.read_text()):items.setdefault(item['url'],item)
    (cache/'index-inventory.json').write_text(json.dumps(list(items.values()),ensure_ascii=False,indent=2))
    print(f'INDEX: {len(items)} official articles, {len(failures)} failed pages',flush=True)
    articles=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures={pool.submit(parse_article,item,cache):item for item in items.values()}
        for future in concurrent.futures.as_completed(futures):
            try: articles.append(future.result())
            except Exception as error: failures.append({'url':futures[future]['url'],'stage':'article','error':str(error)})
            if len(articles)%50==0:
                (cache/'articles.json').write_text(json.dumps(articles,ensure_ascii=False))
                print(f'ARTICLES: {len(articles)}/{len(items)}, errors {len(failures)}',flush=True)
    articles.sort(key=lambda x:(x.get('effectiveDate') or x.get('posted',''),x['language']),reverse=True)
    (cache/'articles.json').write_text(json.dumps(articles,ensure_ascii=False))
    (cache/'failures.json').write_text(json.dumps(failures,ensure_ascii=False,indent=2))
    print(json.dumps({'articles':len(articles),'indexCount':len(items),'failures':failures},ensure_ascii=False),flush=True)

if __name__=='__main__': main()
