(() => {
  if (window.__creditiSharePrivacyV39) return;
  window.__creditiSharePrivacyV39 = true;

  // Only sharing preferences are removed from Storage. Admin authentication,
  // vehicle records and offline vehicle snapshots are not routing preferences.
  const sharingKey = /(^|[_.:-])(instagram|insta|ig|share|sharing|compartilhar|compartilhamento)([_.:-]|$)/i;
  function clearPreferences() {
    for (const storageName of ['localStorage', 'sessionStorage']) {
      try {
        const storage = window[storageName];
        const keys = Array.from({length: storage.length}, (_, i) => storage.key(i));
        for (const key of keys) if (key && sharingKey.test(key)) storage.removeItem(key);
      } catch (_) { /* Storage may be unavailable in private/restricted contexts. */ }
    }
  }
  function clearCookies() {
    try {
      const names = document.cookie.split(';').map(item => item.split('=')[0].trim()).filter(Boolean);
      const paths = new Set(['/']);
      let current = '';
      for (const part of location.pathname.split('/').filter(Boolean)) {
        current += '/' + part;
        paths.add(current); paths.add(current + '/');
      }
      // Do not target the parent domain: it can host other Crediti applications.
      const domains = ['', `; Domain=${location.hostname}`];
      for (const name of names) for (const path of paths) for (const domain of domains) {
        document.cookie = `${name}=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=${path}${domain}; SameSite=Lax; Secure`;
      }
    } catch (_) { /* HttpOnly and other apps' cookies are outside this page's access. */ }
  }
  function clear() { clearPreferences(); clearCookies(); }
  window.CreditiSharePrivacy = Object.freeze({clear});
  clear();
  window.addEventListener('pageshow', clear);
})();
