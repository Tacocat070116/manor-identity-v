// Keep installation independent of guide data and account initialization.
const standalone = matchMedia('(display-mode: standalone)');
const dialog = document.getElementById('install-dialog');
let installPrompt;

function updateDisplayMode() {
  document.documentElement.toggleAttribute('data-installed', standalone.matches || navigator.standalone === true);
}
function updateConnection() {
  document.getElementById('connection-note').hidden = navigator.onLine;
}
updateDisplayMode();
updateConnection();
standalone.addEventListener('change', updateDisplayMode);
window.addEventListener('online', updateConnection);
window.addEventListener('offline', updateConnection);
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
});
window.addEventListener('appinstalled', () => {
  installPrompt = undefined;
  document.documentElement.setAttribute('data-installed', '');
  if (dialog.open) dialog.close();
});

function installGuide() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'Safari의 공유 메뉴에서 ‘홈 화면에 추가’를 선택하세요. ‘웹 앱으로 열기’가 표시되면 켜고 ‘추가’를 누르세요.';
  }
  if (/Android/.test(ua)) return '브라우저 메뉴에서 ‘앱 설치’ 또는 ‘홈 화면에 추가’를 선택하세요. 앱 안에서 보고 있다면 Chrome으로 열어 주세요.';
  if (/Macintosh/.test(ua) && /Version\/[\d.]+.*Safari\//.test(ua)) return 'Safari의 파일 메뉴에서 ‘Dock에 추가’를 선택하세요.';
  return '브라우저 주소 표시줄이나 메뉴에서 MANOR 설치를 선택하세요. 설치 기능이 보이지 않으면 Chrome 또는 Edge에서 열어 주세요.';
}

document.addEventListener('click', async event => {
  if (!event.target.closest('[data-install-manor]')) return;
  const toggle = document.querySelector('[data-nav-toggle]');
  // The install item becomes inert when the menu closes. Restore a keyboard
  // user's tab position, but let a tap return to the page without a focus ring.
  if (event.detail > 0 || event.pointerType) {
    if (document.activeElement?.closest('.category-nav')) document.activeElement.blur();
  } else {
    toggle?.focus({preventScroll:true});
  }
  if (toggle?.getAttribute('aria-expanded') === 'true') toggle.click();
  const prompt = installPrompt;
  if (prompt) {
    installPrompt = undefined;
    try {
      await prompt.prompt();
      await prompt.userChoice;
      return;
    } catch { /* A retired browser prompt falls back to manual installation. */ }
  }
  document.getElementById('install-guide').textContent = installGuide();
  if (!dialog.open) dialog.showModal();
});

if ('serviceWorker' in navigator && window.isSecureContext) {
  const workers = navigator.serviceWorker;
  const pageBuild = document.documentElement.dataset.manorBuild;
  let registration, checking = false, lastCheck = -Infinity;
  let activeBuild, reloading = false, retryReload;

  function applyUpdate() {
    clearTimeout(retryReload);
    if (!activeBuild || activeBuild === pageBuild || reloading || document.visibilityState !== 'visible') return;
    // The OAuth return document has no install module. Also protect the login page,
    // open editors, and replies while the user is composing or submitting them.
    if (location.search && !/^\?v=[a-f0-9]{7,64}$/.test(location.search)) return;
    const login = new URLSearchParams(location.hash.slice(1)).get('v') === 'recovery';
    const editor = document.querySelector('dialog[open], [aria-busy="true"], .sy-editor, .tip-form, .fb-compose, .fb-response-form');
    const draft = [...document.querySelectorAll('form textarea')].some(field => field.value !== field.defaultValue);
    if (login || editor || draft) {
      retryReload = setTimeout(applyUpdate, 3000);
      return;
    }
    // If the OS evicted the cache mid-update, a network fallback may still serve
    // this same document. Limit retries for this exact transition across reloads.
    const key = 'manor-reload:' + pageBuild + ':' + activeBuild;
    try {
      const lastReload = Number(sessionStorage.getItem('manor-last-reload-time'));
      if (sessionStorage.getItem('manor-last-reload') === key && Date.now() - lastReload < 60000) return;
      sessionStorage.setItem('manor-last-reload', key);
      sessionStorage.setItem('manor-last-reload-time', String(Date.now()));
    } catch { /* The cached entry can still be opened when session storage is disabled. */ }
    reloading = true;
    location.reload();
  }
  function askBuild() {
    workers.controller?.postMessage({type:'MANOR_GET_BUILD'});
  }
  workers.addEventListener('controllerchange', askBuild);
  workers.addEventListener('message', event => {
    if (event.source !== workers.controller || event.data?.type !== 'MANOR_BUILD') return;
    activeBuild = event.data.revision;
    applyUpdate();
  });

  async function checkUpdate(force = false) {
    if (document.visibilityState !== 'visible') return;
    askBuild(); // Also covers a document restored after another window activated the update.
    if (checking || !navigator.onLine || (!force && Date.now() - lastCheck < 30000)) return;
    checking = true;
    lastCheck = Date.now();
    try {
      registration ??= await workers.register('./sw.js', {scope:'./', updateViaCache:'none'});
      if (registration.active && !registration.installing) await registration.update();
    } catch { /* Retry on the next foreground or reconnect; the saved build still works. */ }
    finally { checking = false; }
  }
  window.addEventListener('online', () => checkUpdate(true));
  window.addEventListener('pageshow', () => checkUpdate());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkUpdate();
  });
  setInterval(checkUpdate, 5 * 60 * 1000);
  checkUpdate();
}
