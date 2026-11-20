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

// Pin the entry page and its assets to the active worker until the next build takes over.
async function fromBuild(key, request) {
  const saved = await caches.match(key, {cacheName}).catch(() => undefined);
  return saved || fetch(request);
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
    if (url.href === scope || url.href === entry) event.respondWith(fromBuild(entry, request));
    return;
  }
  if (files.has(url.href)) {
    event.respondWith(fromBuild(url.href, request));
    return;
  }
  const file = url.href.slice(scope.length);
  if (request.destination === 'image' && /^assets\/(?:c\d+|(?:persona|traits)\/[\w-]+)\.png$/.test(file)) {
    event.respondWith(publicImage(request));
  }
});
