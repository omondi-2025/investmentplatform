// Must load after api.js
(function () {
  if (!window.API || typeof window.API.guardPage !== 'function') {
    document.documentElement.classList.add('auth-protected');
    window.location.replace('login.html');
    return;
  }
  API.guardPage();
})();
