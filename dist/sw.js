// Generated alongside the versioned app resources by the existing release script.
importScripts('./offline-files.js?v=bf72b2e1e53ae8dc');

const scope = self.registration.scope;
const namespace = 'manor-offline:' + scope + ':';
const cacheName = namespace + self.MANOR_OFFLINE.revision;
const urlFor = file => new URL(file, scope).href;
const entry = urlFor('index.html');
const files = new Set(self.MANOR_OFFLINE.files.map(urlFor));

const versionedPaths = new Set([...files].filter(url => new URL(url).search).map(url => new URL(url).pathname));
const versionedEntry = entry + '?v=' + self.MANOR_OFFLINE.revision;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    const requests = [...files].map(url => url === entry
      ? new Request(versionedEntry, {cache:'reload', credentials:'omit'})
      : new Request(url, {cache:'reload', credentials:'omit'}));
    // addAll is atomic. Do not replace the working installation after a partial download.
    try {
      await cache.addAll(requests);
      const html = await cache.match(versionedEntry);
      if (!html || !(await html.text()).includes('data-manor-build="' + self.MANOR_OFFLINE.revision + '"')) {
        throw Error('The entry page belongs to a different MANOR build.');
      }
    } catch (error) {
      await caches.delete(cacheName);
      throw error;
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // A tab finishing a draft can still request modules from the preceding build.
    const older = (await caches.keys()).filter(name => name.startsWith(namespace) && name !== cacheName);
    await Promise.all(older.slice(0,-1).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'MANOR_GET_BUILD') {
    event.source?.postMessage({type:'MANOR_BUILD', revision:self.MANOR_OFFLINE.revision});
  }
});

async function previousAsset(request) {
  const names = await caches.keys().catch(() => []);
  for (const name of names) {
    if (name === cacheName || !name.startsWith(namespace)) continue;
    const saved = await caches.match(request, {cacheName:name}).catch(() => undefined);
    if (saved) return saved;
  }
  return fetch(request);
}

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
    if ((!url.search || /^\?v=[a-f0-9]{7,64}$/.test(url.search)) &&
        (url.origin + url.pathname === scope || url.origin + url.pathname === entry)) {
      event.respondWith(fromBuild(versionedEntry, request));
    }
    return;
  }
  if (files.has(url.href)) {
    event.respondWith(fromBuild(url.href, request));
    return;
  }
  if (versionedPaths.has(url.pathname) && /^\?v=[a-f0-9]{12}$/.test(url.search)) {
    event.respondWith(previousAsset(request));
    return;
  }
  const file = url.href.slice(scope.length);
  if (request.destination === 'image' && /^assets\/(?:c\d+|(?:persona|traits)\/[\w-]+)\.png$/.test(file)) {
    event.respondWith(publicImage(request));
  }
});
