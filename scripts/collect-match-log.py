"""Collect publicly rendered match facts; no private endpoints or credentials.
Run from the repository root. HTML cache is outside the repository.
"""
import argparse, concurrent.futures, hashlib, json, os, re, tempfile, time, urllib.request
from html.parser import HTMLParser
from pathlib import Path
CACHE=Path(os.environ.get('MANOR_MATCH_CACHE', str(Path(tempfile.gettempdir())/'manor-match-log-cache'))); CACHE.mkdir(parents=True,exist_ok=True)
OUT=Path('research/refresh/2026-10-21')
ROOT='https://identityv-match-log.vercel.app'
class Node:
 def __init__(self,tag='',attrs=()): self.tag=tag; self.attrs=dict(attrs); self.children=[]
 def all(self,tag=None,cls=None):
  return [y for x in self.children if isinstance(x,Node) for y in ([x] if (tag is None or x.tag==tag) and (cls is None or cls in x.attrs.get('class','').split()) else [])+x.all(tag,cls)]
 def one(self,tag=None,cls=None): return next(iter(self.all(tag,cls)),Node())
 def text(self): return ''.join(x.text() if isinstance(x,Node) else x for x in self.children).strip()
class DOM(HTMLParser):
 def __init__(self,s):
  super().__init__(convert_charrefs=True);self.root=Node();self.stack=[self.root];self.feed(s)
 def handle_starttag(self,t,a):
  n=Node(t,a);self.stack[-1].children.append(n)
  if t not in ('area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'):self.stack.append(n)
 def handle_startendtag(self,t,a): self.stack[-1].children.append(Node(t,a))
 def handle_endtag(self,t):
  for i in range(len(self.stack)-1,0,-1):
   if self.stack[i].tag==t:self.stack=self.stack[:i];break
 def handle_data(self,d):self.stack[-1].children.append(d)
def fetch(path):
 f=CACHE/(path.strip('/').replace('/','-') or 'index')
 if f.exists():return f.read_text()
 for attempt in range(3):
  try:
   s=urllib.request.urlopen(ROOT+path,timeout=30).read().decode();f.write_text(s);return s
  except Exception:
   if attempt==2:raise
   time.sleep(1)
def numeric(s):
 s=s.strip().replace('%','')
 return float(s) if re.fullmatch(r'\d+(?:\.\d+)?',s) else None
def previous_matches(path):
 snapshot=json.loads(path.read_text())
 parent=snapshot.get('incremental',{}).get('previousPath')
 matches={}
 if parent:
  parent=Path(parent)
  assert hashlib.sha256(parent.read_bytes()).hexdigest()==snapshot['incremental']['previousSha256']
  matches.update(previous_matches(parent))
 matches.update({m['id']:m for m in snapshot['matches']})
 return matches
def parse(mid):
 s=fetch('/matches/'+str(mid));d=DOM(s).root;date=d.one(cls='match-date').text().replace('/','-')
 a=[]
 for n,r in enumerate(d.all(cls='match-round'),1):
  h=r.one(cls='match-side-hunter');sv=r.one(cls='match-side-survivor')
  hunter=h.one(cls='match-hunter-chara').text();ht=h.one(cls='match-side-score').text();st=sv.one(cls='match-side-score').text()
  hscore=int(re.match(r'\d+',ht)[0]) if re.match(r'\d+',ht) else None
  sscore=int(re.match(r'\d+',st)[0]) if re.match(r'\d+',st) else None
  escaped=int(re.search(r'脱出\s*(\d+)',st)[1]) if re.search(r'脱出\s*(\d+)',st) else None
  survivors=[]
  for tr in r.one(cls='match-survivor-table').all('tr'):
   td=[x for x in tr.children if isinstance(x,Node) and x.tag=='td']
   if not td:continue
   assert len(td)==9,(mid,n,len(td))
   char=td[1].one('img',cls='char-icon').attrs.get('alt')
   p=[i.attrs.get('alt') for i in td[1].one(cls='match-persona-icons').all('img')]
   survivors.append(dict(name=char,decode=numeric(td[2].text()),pallets=numeric(td[3].text()),rescues=numeric(td[4].text()),heals=numeric(td[5].text()),kite=td[6].text(),escaped=td[7].text()=='ESC',hatch=bool(td[8].text()),personas=p))
  bans=[]
  for row in r.all(cls='ban-row'):
   bans.append(dict(label=row.one(cls='ban-label').text(),characters=[im.attrs.get('alt') for im in row.all('img')]))
  # Only active major talent nodes (opacity 1) in the rendered hunter tree.
  hp=[]
  for g in h.all('g'):
   title=g.one('title').text();im=g.one('image')
   if title and im.attrs.get('opacity')=='1':hp.append(title)
  a.append(dict(id=f'{mid}-{n}',date=date,set=r.one(cls='match-round-set').text(),map=r.one(cls='match-round-map').text(),hunter=hunter,hunterScore=hscore,survivorScore=sscore,escaped=escaped,survivors=survivors,bans=bans,hunterPersonas=hp,source=ROOT+'/matches/'+str(mid)))
 return dict(id=mid,league=next((a.attrs['href'].split('/')[-1] for a in d.one(cls='breadcrumb').all('a') if re.fullmatch(r'/leagues/\d+',a.attrs.get('href',''))),None),url=ROOT+'/matches/'+str(mid),sha256=hashlib.sha256(s.encode()).hexdigest(),date=date,rounds=a)
if __name__=='__main__':
 args=argparse.ArgumentParser(description=__doc__)
 args.add_argument('--date',default='2026-10-21')
 args.add_argument('--previous',type=Path)
 args=args.parse_args()
 assert re.fullmatch(r'\d{4}-\d{2}-\d{2}',args.date)
 OUT=Path('research/refresh')/args.date; OUT.mkdir(parents=True,exist_ok=True)
 previous=json.loads(args.previous.read_text()) if args.previous else None
 retained={mid:m for mid,m in previous_matches(args.previous).items() if m['rounds']} if previous else {}
 leagues=sorted(set(re.findall(r'href="(/leagues/\d+)"',fetch('/'))))
 pages=list(concurrent.futures.ThreadPoolExecutor(3).map(fetch,leagues))
 ids=sorted(set(int(x) for s in pages for x in re.findall(r'href="/matches/(\d+)"',s)))
 print('leagues',leagues,'matches',len(ids),flush=True)
 results=[m for mid,m in retained.items() if mid in ids];errors=[]
 fresh_ids=[mid for mid in ids if mid not in retained]
 print('retained completed matches',len(results),'fetching',len(fresh_ids),flush=True)
 with concurrent.futures.ThreadPoolExecutor(4) as ex:
  pending={ex.submit(parse,i):i for i in fresh_ids}
  for f in concurrent.futures.as_completed(pending):
   try:results.append(f.result())
   except Exception as e:errors.append(dict(id=pending[f],error=str(e)))
   if (len(results)+len(errors))%20==0: print('collected',len(results),'errors',len(errors),flush=True)
 results.sort(key=lambda r:r['id'])
 out=dict(collectedAt=args.date,source=ROOT,leagues=leagues,matches=results,errors=errors)
 if previous:
  out['matches']=[m for m in results if m['id'] in fresh_ids]
  out['incremental']={'previousCollectedAt':previous['collectedAt'],'previousPath':str(args.previous),'previousSha256':hashlib.sha256(args.previous.read_bytes()).hexdigest(),'retainedCompletedMatches':len(retained),'discoveredMatches':len(ids),'refetchedMatchIds':fresh_ids}
 (OUT/'match-log.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':'))+'\n')
 print('DONE',len(results),'rounds',sum(len(x['rounds']) for x in results),'errors',errors,flush=True)
