import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = name => fs.readFileSync(new URL('./dist/' + name, import.meta.url));
const scope = 'https://example.test/manor-identity-v/';
const asset = path => new URL(path, scope).href;

function worker({failDownload = false, staleEntry = false} = {}) {
  const events = new Map();
  const stores = new Map();
  const key = request => typeof request === 'string' ? request : request.url;
  const caches = {
    keys: async () => [...stores.keys()],
    delete: async name => stores.delete(name),
    open: async name => {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        async addAll(requests) {
          if (failDownload) throw Error('interrupted download');
          for (const request of requests) {
            const filename = new URL(request.url).pathname.slice(new URL(scope).pathname.length);
            assert.equal(request.credentials, 'omit');
            store.set(request.url, new Response(staleEntry && filename === 'index.html' ? '<html>old</html>' : read(filename)));
          }
        },
        match: async request => store.get(key(request))?.clone(),
        put: async (request, response) => store.set(key(request), response)
      };
    },
    match: async (url, {cacheName}) => (await caches.open(cacheName)).match(url)
  };
  const self = {registration:{scope}, skipped:false, skipWaiting(){ this.skipped=true; }, clients:{claim() {}}, addEventListener:(type, handler) => events.set(type, handler)};
  const context = vm.createContext({self, caches, URL, Request, fetch:async () => { throw Error('offline'); }});
  context.importScripts = path => vm.runInContext(read(path.split('?')[0]).toString(), context);
  vm.runInContext(read('sw.js').toString(), context);
  return {
    self, caches, context, events,
    lifecycle(type) {
      let work;
      events.get(type)({waitUntil:promise => { work = promise; }});
      return work;
    },
    get(path, options = {}) {
      let result;
      const request = {url:asset(path), mode:'cors', method:'GET', headers:new Headers(), ...options};
      events.get('fetch')({request, respondWith:promise => { result = promise; }});
      return result;
    }
  };
}

test('installed MANOR opens its catalog, guides and favicon offline at the Pages subpath', async () => {
  const w = worker();
  await w.lifecycle('install');
  const files = Array.from(w.self.MANOR_OFFLINE.files);
  for (const route of ['./','index.html','#v=explore','index.html?v=d453dcc9f2b4#v=character']) {
    assert.match(await (await w.get(route, {mode:'navigate'})).text(), /MANOR · 제5인격 가이드/);
  }
  for (const name of ['catalog.json','specialties.json','introductions.json','releases.json','data.json','character-skills.json','favicon.svg']) {
    const file = files.find(file => file.startsWith(name + '?v='));
    assert.ok(file, name);
    assert.deepEqual(Buffer.from(await (await w.get(file)).arrayBuffer()), read(name));
  }
  assert.ok(!files.some(file => file.startsWith('ranked/') || file.startsWith('google-return.')));
  assert.match(await (await w.get('assets/c123.png', {destination:'image'})).text(), /<svg/);
  for (const url of ['?code=test','google-return.html','index.html?state=test','../other-project/']) {
    assert.equal(w.get(url, {mode:'navigate'}), undefined);
  }
  const catalog = files.find(file => file.startsWith('catalog.json?'));
  for (const options of [{method:'POST'},{cache:'no-store'},{headers:new Headers({Authorization:'test'})},{headers:new Headers({Range:'bytes=0-99'})}]) {
    assert.equal(w.get(catalog, options), undefined);
  }
  assert.equal(w.get('https://example.org/community'), undefined);
});

test('a live release serves its own entry while another version is on the server', async () => {
  const w = worker();
  const nav = {mode:'navigate'};
  w.context.fetch = async () => new Response('next release');
  assert.equal(await (await w.get('./', nav)).text(), 'next release');
  await w.lifecycle('install');
  const html = read('index.html').toString();
  assert.equal(await (await w.get('index.html', nav)).text(), html);
  const app = html.match(/src="(app\.js\?v=[a-f0-9]+)"/)[1];
  assert.equal(await (await w.get(app)).text(), read('app.js').toString());
  w.caches.match = async () => { throw Error('storage unavailable'); };
  assert.equal(await (await w.get('./', nav)).text(), 'next release');
  assert.equal(await (await w.get(app)).text(), 'next release');
});

test('statistics payloads and real Google and account request paths bypass the worker', async () => {
  const w = worker();
  await w.lifecycle('install');
  const files = Array.from(w.self.MANOR_OFFLINE.files);
  const json = files.map(f => f.split('?')[0]).filter(f => f.endsWith('.json')).sort();
  assert.deepEqual(json, ['catalog.json','character-skills.json','data.json','introductions.json','releases.json','specialties.json']);
  for (const path of ['ranked/index.json?v=abc','ranked/sample.json','matches.json','bans.json',
    'bans-observed.json','tournament-details.json','google-return.js','google-return.html#state=sample',
    'https://accounts.google.com/o/oauth2/v2/auth','https://manor-feedback.tacocat070116.chatgpt.site/api/auth/preferences']) {
    for (const mode of ['cors','navigate']) assert.equal(w.get(path, {mode}), undefined, path);
  }
});

test('updating the worker only expires MANOR caches for the installed scope', async () => {
  const w = worker();
  const namespace = 'manor-offline:' + scope + ':';
  const other = 'manor-offline:https://example.test/other/:old';
  await w.caches.open(namespace + 'oldest');
  const previous = await w.caches.open(namespace + 'old');
  const oldModule = asset('app.js?v=123456abcdef');
  await previous.put(oldModule, new Response('old module'));
  await w.caches.open(other);
  await w.lifecycle('install');
  await w.lifecycle('activate');
  assert.deepEqual((await w.caches.keys()).sort(), [other, namespace + 'old', namespace + w.self.MANOR_OFFLINE.revision].sort());
  assert.equal(await (await w.get(oldModule)).text(), 'old module');
});

test('home screen launches in standalone mode and uses valid icons on iOS and Android', () => {
  const manifest = JSON.parse(read('manifest.webmanifest'));
  assert.equal(manifest.display, 'standalone');
  for (const field of ['id','scope','start_url']) assert.equal(asset(manifest[field]), scope);
  assert.ok(manifest.icons.some(icon => icon.purpose === 'maskable'));
  for (const {src,sizes} of [...manifest.icons, {src:'assets/brand/manor-v-180.png',sizes:'180x180'}]) {
    const png = read(src);
    assert.equal(png.subarray(1,4).toString(), 'PNG');
    assert.equal(png.readUInt32BE(16) + 'x' + png.readUInt32BE(20), sizes);
  }
  assert.match(read('index.html').toString(), /rel="apple-touch-icon"[^>]+manor-v-180\.png/);
});

test('install control provides the Safari guide, consumes the Android prompt once, and reflects offline state', async () => {
  const events = new Map();
  const note = {}, guide = {}, dialog = {
    open:false, showModal(){ this.open = true; }, close(){ this.open = false; }
  };
  const attributes = new Set();
  const mode = {matches:false, addEventListener() {}};
  const navigator = {userAgent:'iPhone Safari', onLine:true};
  let expanded=true;
  const toggle={
    getAttribute:() => String(expanded), click(){ expanded=false; },
    focus(){ document.activeElement=this; }, closest:() => true,
    blur(){ document.activeElement=null; }
  };
  const document = {
    activeElement:toggle,
    getElementById:id => ({'connection-note':note, 'install-guide':guide, 'install-dialog':dialog})[id],
    documentElement:{
      toggleAttribute:(key,on) => on ? attributes.add(key) : attributes.delete(key),
      setAttribute:key => attributes.add(key)
    },
    querySelector:() => toggle,
    addEventListener:(type,handler) => events.set(type,handler)
  };
  const window = {addEventListener:(type,handler) => events.set(type,handler)};
  vm.runInNewContext(read('install.js').toString(), {window,document,navigator,matchMedia:() => mode});
  const click = (detail=1) => events.get('click')({detail,target:{closest:() => true}});
  await click();
  assert.equal(expanded,false);
  assert.equal(document.activeElement,null);
  assert.equal(dialog.open, true);
  assert.match(guide.textContent, /Safari.*공유.*홈 화면에 추가/);
  dialog.close();
  expanded=true;
  await click(0);
  assert.equal(expanded,false);
  assert.equal(document.activeElement,toggle);
  dialog.close();
  navigator.userAgent = 'Android Chrome';
  let prompts = 0;
  events.get('beforeinstallprompt')({preventDefault(){}, async prompt(){ prompts++; }, userChoice:Promise.resolve({outcome:'dismissed'})});
  await click();
  assert.equal(prompts, 1);
  assert.equal(document.activeElement,null);
  assert.equal(dialog.open, false);
  await click();
  assert.match(guide.textContent, /브라우저 메뉴.*앱 설치/);
  events.get('appinstalled')();
  assert.equal(dialog.open, false);
  assert.ok(attributes.has('data-installed'));
  navigator.onLine = false;
  events.get('offline')();
  assert.equal(note.hidden, false);
  navigator.onLine = true;
  events.get('online')();
  assert.equal(note.hidden, true);
});

test('a complete matching build takes over immediately; a broken install keeps the last working cache', async () => {
  const w = worker();
  await w.lifecycle('install');
  assert.equal(w.self.skipped, true);
  const build = w.self.MANOR_OFFLINE.revision;
  assert.ok(read('index.html').toString().includes('data-manor-build="' + build + '"'));
  assert.ok(read('sw.js').toString().includes("offline-files.js?v=" + build + "'"));
  let reply;
  w.events.get('message')({data:{type:'MANOR_GET_BUILD'},source:{postMessage:value=>{ reply=value; }}});
  assert.equal(reply.revision, build);
  const broken = worker({failDownload:true});
  const previous = 'manor-offline:' + scope + ':previous';
  await broken.caches.open(previous);
  await assert.rejects(broken.lifecycle('install'), /interrupted/);
  assert.equal(broken.self.skipped, false);
  assert.deepEqual(await broken.caches.keys(), [previous]);
  const stale = worker({staleEntry:true});
  await assert.rejects(stale.lifecycle('install'), /different MANOR build/);
  assert.equal(stale.self.skipped, false);
});

test('the installed document checks on foreground and reconnect and waits for drafts or login before one reload', async () => {
  const events = new Map(), storage = new Map();
  const on = (type, fn) => events.set(type, fn);
  let reloads=0, checks=0, asks=0, retry, interval, fields=[];
  const location = {hash:'#v=character',search:'',reload(){reloads++;}};
  const document = {visibilityState:'visible', documentElement:{dataset:{manorBuild:'first'},toggleAttribute(){}},
    addEventListener:on,getElementById:()=>({}),querySelector:()=>null,querySelectorAll:()=>fields};
  const controller = {postMessage(){ asks++; }};
  const workers = {controller, addEventListener:on,register:async()=>({active:controller,update:async()=>{ checks++; }})};
  const navigator = {serviceWorker:workers,onLine:true};
  const context = {navigator,document,location,URLSearchParams,window:{isSecureContext:true,addEventListener:on},
    matchMedia:()=>({addEventListener(){}}),setTimeout:fn=>{retry=fn;},clearTimeout(){},setInterval:fn=>{interval=fn;},
    sessionStorage:{setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k)}};
  const run = () => vm.runInNewContext(read('install.js').toString(),context);
  const report = revision => events.get('message')({source:controller,data:{type:'MANOR_BUILD',revision}});
  run();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(checks,1);
  report('first');
  assert.equal(reloads,0);
  events.get('controllerchange')();
  document.visibilityState='hidden';
  interval();
  assert.equal(asks,2);
  document.visibilityState='visible';
  events.get('visibilitychange')();
  events.get('pageshow')();
  navigator.onLine=false;
  await interval();
  assert.equal(checks,1);
  navigator.onLine=true;
  await events.get('online')();
  assert.equal(checks,2);
  fields=[{value:'작성 중',defaultValue:''}];
  report('next');
  assert.equal(reloads,0);
  fields=[];
  location.hash='#v=recovery';
  retry();
  assert.equal(reloads,0);
  location.hash='#v=character';
  retry();
  report('next');
  assert.equal(reloads,1);
  // A stale network fallback must not cause a reload loop in the same window.
  vm.runInNewContext(read('install.js').toString(),{...context});
  report('next');
  assert.equal(reloads,1);
});
