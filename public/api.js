(function () {
  const TOKEN_KEY = 'tc_token';
  const USER_KEY = 'tc_user';
  const REMEMBER_KEY = 'tc_remember_me';
  const SAVED_EMAIL_KEY = 'tc_saved_email';

  function getApiBase() {
    return ['localhost', '127.0.0.1'].includes(window.location.hostname)
      ? window.location.origin
      : 'https://investmentplatform.onrender.com';
  }

  function getActiveStorage() {
    if (sessionStorage.getItem(TOKEN_KEY)) return sessionStorage;
    if (localStorage.getItem(TOKEN_KEY)) return localStorage;
    if (localStorage.getItem(REMEMBER_KEY) === '1') return localStorage;
    return sessionStorage;
  }

  function getToken() {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || '';
  }

  function getStoredUser() {
    try {
      const raw = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
      const user = JSON.parse(raw || 'null');
      return user && user._id ? user : null;
    } catch (err) {
      return null;
    }
  }

  function isRememberMeEnabled() {
    return localStorage.getItem(REMEMBER_KEY) === '1';
  }

  function getSavedEmail() {
    return localStorage.getItem(SAVED_EMAIL_KEY) || '';
  }

  function setSession(user, token, rememberMe) {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    const storage = rememberMe ? localStorage : sessionStorage;
    if (token) storage.setItem(TOKEN_KEY, token);
    if (user && user._id) {
      storage.setItem(USER_KEY, JSON.stringify({ ...user, lastUpdated: Date.now() }));
    }

    if (rememberMe) {
      localStorage.setItem(REMEMBER_KEY, '1');
      if (user && user.email) localStorage.setItem(SAVED_EMAIL_KEY, user.email);
    } else {
      localStorage.removeItem(REMEMBER_KEY);
      localStorage.removeItem(SAVED_EMAIL_KEY);
    }
  }

  function clearSession() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(REMEMBER_KEY);
    localStorage.removeItem(SAVED_EMAIL_KEY);
  }

  async function apiFetch(path, options) {
    const opts = options || {};
    const headers = Object.assign({}, opts.headers || {});

    if (opts.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const token = getToken();
    if (token) {
      headers.Authorization = 'Bearer ' + token;
    }

    const res = await fetch(getApiBase() + path, Object.assign({}, opts, { headers }));

    if (res.status === 401 && path.indexOf('/api/login') === -1 && path.indexOf('/api/signup') === -1) {
      clearSession();
      const page = window.location.pathname.split('/').pop() || 'index.html';
      if (!['login.html', 'signup.html', 'admin.html'].includes(page)) {
        window.location.replace('login.html');
      }
    }

    return res;
  }

  window.API = {
    getApiBase: getApiBase,
    getToken: getToken,
    getStoredUser: getStoredUser,
    getActiveStorage: getActiveStorage,
    isRememberMeEnabled: isRememberMeEnabled,
    getSavedEmail: getSavedEmail,
    setSession: setSession,
    clearSession: clearSession,
    apiFetch: apiFetch
  };
})();
