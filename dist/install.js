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
  if (toggle?.getAttribute('aria-expanded') === 'true') toggle.click();
  toggle?.focus({preventScroll:true});
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
  const register = () => navigator.serviceWorker.register('./sw.js', {scope:'./', updateViaCache:'none'})
    .catch(() => { /* Browsing also works when the browser disallows offline storage. */ });
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, {once:true});
}
