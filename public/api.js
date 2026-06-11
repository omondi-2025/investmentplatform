(function () {
  const TOKEN_KEY = 'tc_token';
  const USER_KEY = 'tc_user';
  const REMEMBER_KEY = 'tc_remember_me';
  const SAVED_EMAIL_KEY = 'tc_saved_email';
  const PUBLIC_PAGES = ['login.html', 'signup.html', 'admin.html'];

  function getApiBase() {
    return ['localhost', '127.0.0.1'].includes(window.location.hostname)
      ? window.location.origin
      : 'https://investmentplatform.onrender.com';
  }

  function decodeTokenPayload(token) {
    if (!token || typeof token !== 'string') return null;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(
        atob(base64)
          .split('')
          .map(function (c) { return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2); })
          .join('')
      );
      return JSON.parse(json);
    } catch (err) {
      return null;
    }
  }

  function isTokenValid(token) {
    const payload = decodeTokenPayload(token);
    if (!payload) return false;
    if (!payload.exp) return true;
    return Date.now() < payload.exp * 1000;
  }

  function isRememberMeEnabled() {
    return localStorage.getItem(REMEMBER_KEY) === '1';
  }

  function getSavedEmail() {
    return localStorage.getItem(SAVED_EMAIL_KEY) || '';
  }

  function readPairFromStorage(storage) {
    const token = storage.getItem(TOKEN_KEY) || '';
    const userRaw = storage.getItem(USER_KEY);
    if (!token || !userRaw || !isTokenValid(token)) return null;
    try {
      const user = JSON.parse(userRaw);
      if (!user || !user._id) return null;
      return { token: token, user: user, storage: storage };
    } catch (err) {
      return null;
    }
  }

  function getActiveSession() {
    if (isRememberMeEnabled()) {
      return readPairFromStorage(localStorage) || readPairFromStorage(sessionStorage);
    }
    return readPairFromStorage(sessionStorage) || readPairFromStorage(localStorage);
  }

  function getToken() {
    const session = getActiveSession();
    return session ? session.token : '';
  }

  function getStoredUser() {
    const session = getActiveSession();
    return session ? session.user : null;
  }

  function hasValidSession() {
    return !!getActiveSession();
  }

  function purgeInvalidSessionData() {
    [sessionStorage, localStorage].forEach(function (storage) {
      const token = storage.getItem(TOKEN_KEY) || '';
      if (!token || !isTokenValid(token)) {
        storage.removeItem(TOKEN_KEY);
        storage.removeItem(USER_KEY);
      }
    });
  }

  function setSession(user, token, rememberMe) {
    purgeInvalidSessionData();

    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    const storage = rememberMe ? localStorage : sessionStorage;
    if (token) storage.setItem(TOKEN_KEY, token);
    if (user && user._id) {
      storage.setItem(USER_KEY, JSON.stringify(Object.assign({}, user, { lastUpdated: Date.now() })));
    }

    if (rememberMe) {
      localStorage.setItem(REMEMBER_KEY, '1');
      if (user && user.email) localStorage.setItem(SAVED_EMAIL_KEY, user.email);
    } else {
      localStorage.removeItem(REMEMBER_KEY);
      localStorage.removeItem(SAVED_EMAIL_KEY);
    }
  }

  function clearSession(options) {
    const keepRememberPrefs = options && options.keepRememberPrefs;
    const savedEmail = keepRememberPrefs ? getSavedEmail() : '';
    const remember = keepRememberPrefs && isRememberMeEnabled();

    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    if (keepRememberPrefs && remember) {
      localStorage.setItem(REMEMBER_KEY, '1');
      if (savedEmail) localStorage.setItem(SAVED_EMAIL_KEY, savedEmail);
    } else {
      localStorage.removeItem(REMEMBER_KEY);
      localStorage.removeItem(SAVED_EMAIL_KEY);
    }
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
      clearSession({ keepRememberPrefs: true });
      const page = window.location.pathname.split('/').pop() || 'index.html';
      if (PUBLIC_PAGES.indexOf(page) === -1) {
        window.location.replace('login.html');
      }
    }

    return res;
  }

  function guardPage() {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    if (PUBLIC_PAGES.indexOf(page) !== -1) return true;

    document.documentElement.classList.add('auth-protected');
    purgeInvalidSessionData();

    if (!hasValidSession()) {
      clearSession({ keepRememberPrefs: true });
      window.location.replace('login.html');
      return false;
    }

    document.documentElement.classList.add('auth-verified');
    return true;
  }

  window.API = {
    getApiBase: getApiBase,
    getToken: getToken,
    getStoredUser: getStoredUser,
    hasValidSession: hasValidSession,
    isRememberMeEnabled: isRememberMeEnabled,
    getSavedEmail: getSavedEmail,
    setSession: setSession,
    clearSession: clearSession,
    apiFetch: apiFetch,
    guardPage: guardPage,
    isTokenValid: isTokenValid
  };
})();
