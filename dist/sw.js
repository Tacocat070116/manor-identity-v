// Generated alongside the versioned app resources by the existing release script.
importScripts('./offline-files.js');

const scope = self.registration.scope;
const namespace = 'manor-offline:' + scope + ':';
const cacheName = namespace + self.MANOR_OFFLINE.revision;
const urlFor = file => new URL(file, scope).href;
const entry = urlFor('index.html');
const files = new Set(self.MANOR_OFFLINE.files.map(urlFor));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(
    [...files].map(url => new Request(url, {cache:'reload', credentials:'omit'}))
  )));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(namespace) && name !== cacheName).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

async function openPage(request) {
  try {
    const response = await fetch(request);
    if (response.status < 500) return response;
    return await caches.match(entry, {cacheName}) || response;
  } catch (error) {
    const saved = await caches.match(entry, {cacheName});
    if (saved) return saved;
    throw error;
  }
}

async function publicImage(request) {
  const cache = await caches.open(cacheName).catch(() => null);
  try {
    const response = await fetch(request);
    if (cache && response.ok && !response.redirected && response.type === 'basic' &&
        response.headers.get('Content-Type')?.startsWith('image/') && !/no-store|private/i.test(response.headers.get('Cache-Control') || '')) {
      try { await cache.put(request, response.clone()); } catch { /* Storage can be full. */ }
    }
    return response;
  } catch (error) {
    const saved = await cache?.match(request) || await cache?.match(urlFor('fallback.svg'));
    if (saved) return saved;
    throw error;
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.cache === 'no-store' || request.headers.has('Authorization') ||
      request.headers.has('Range') || !request.url.startsWith(scope)) return;
  const url = new URL(request.url);
  url.hash = '';
  if (request.mode === 'navigate') {
    if (url.href === scope || url.href === entry) event.respondWith(openPage(request));
    return;
  }
  if (files.has(url.href)) {
    event.respondWith(caches.match(url.href, {cacheName}).then(saved => saved || fetch(request)));
    return;
  }
  const file = url.href.slice(scope.length);
  if (request.destination === 'image' && /^assets\/(?:c\d+|(?:persona|traits)\/[\w-]+)\.png$/.test(file)) {
    event.respondWith(publicImage(request));
  }
});
