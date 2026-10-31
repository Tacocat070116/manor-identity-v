import json, pathlib, urllib.request, concurrent.futures
from PIL import Image
root = pathlib.Path(__file__).parent
items = json.loads((root/'asset-manifest.json').read_text())
(root/'dist/assets').mkdir(exist_ok=True)
def download(item):
    target = root/'dist/assets'/f"{item['id']}.png"
    try:
        if not target.exists():
            req = urllib.request.Request(item['url'], headers={'User-Agent':'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=30) as response:
                target.write_bytes(response.read())
        with Image.open(target) as im:
            width, height = im.size
            if width != height:
                raise ValueError(f'Non-square image: {width}x{height}')
        return {'id':item['id'],'path':f"assets/{item['id']}.png",'size':[width,height]}
    except Exception as e:
        if target.exists(): target.unlink()
        return {'id':item['id'],'error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
    result = list(pool.map(download, items))
data = json.loads((root/'dist/data.json').read_text())
success = {r['id']:r for r in result if 'path' in r}
for character in data['characters']:
    if character['id'] in success:
        if character['portrait'].startswith('https://'):
            character['portraitOriginal'] = character['portrait']
        character['portrait'] = success[character['id']]['path']
(root/'dist/data.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
(root/'asset-verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps({'downloaded':len(success),'errors':[r for r in result if 'error' in r]},ensure_ascii=False))
