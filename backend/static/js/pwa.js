import { currentLang } from './i18n.js';

export function initPWA() {
  const installBtn = document.getElementById('installBtn');
  let deferredPrompt;

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/static/sw.js').catch(() => {});
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.style.display = 'inline-flex';
  });

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      installBtn.style.display = 'none';
    });
  }

  const fd = document.getElementById('footerDate');
  if (fd) fd.textContent = new Date().toLocaleDateString(currentLang === 'en' ? 'en-US' : 'fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}
