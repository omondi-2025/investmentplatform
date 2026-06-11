// auth.js – Trustcode Auth System (MongoDB Version)
const LOCAL_STORAGE_KEY = "tc_user";
const TOKEN_KEY = "tc_token";

function storeUserLocally(userData, token, rememberMe) {
  if (window.API && window.API.setSession) {
    window.API.setSession(userData, token, !!rememberMe);
    return;
  }
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (!userData?._id) return;
  userData.lastUpdated = Date.now();
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(userData));
}

function getCurrentUser() {
  try {
    if (window.API && window.API.getStoredUser) {
      return window.API.getStoredUser();
    }
    const token = sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
    const stored = JSON.parse(sessionStorage.getItem(LOCAL_STORAGE_KEY) || localStorage.getItem(LOCAL_STORAGE_KEY) || "null");
    if (!token || !stored?._id) return null;
    return stored;
  } catch {
    return null;
  }
}

function isDataStale(user) {
  return !user?.lastUpdated || Date.now() - user.lastUpdated > 60 * 60 * 1000;
}

async function loadUserData(userId) {
  try {
    const res = window.API
      ? await window.API.apiFetch(`/api/user/${userId}`)
      : await fetch(`${window.location.origin}/api/user/${userId}`);
    const user = await res.json();
    if (user?._id) {
      storeUserLocally(user);
      return user;
    }
    return null;
  } catch (err) {
    console.error("loadUserData failed:", err);
    return null;
  }
}

async function signUpUser(email, password, fullName, phone) {
  try {
    const res = window.API
      ? await window.API.apiFetch("/api/signup", {
          method: "POST",
          body: JSON.stringify({ email, password, fullName, phone })
        })
      : await fetch(`${window.location.origin}/api/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, fullName, phone })
        });
    const data = await res.json();
    if (res.ok && data.success) {
      storeUserLocally(data.user, data.token);
      return { success: true };
    }
    return { success: false, message: data.message || "Signup failed" };
  } catch (err) {
    console.error("Signup error:", err);
    return { success: false, message: "Server error" };
  }
}

async function loginUser(email, password) {
  try {
    const res = window.API
      ? await window.API.apiFetch("/api/login", {
          method: "POST",
          body: JSON.stringify({ email, password })
        })
      : await fetch(`${window.location.origin}/api/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });
    const data = await res.json();
    if (res.ok && data.success) {
      storeUserLocally(data.user, data.token);
      return { success: true };
    }
    return { success: false, message: data.message || "Login failed" };
  } catch (err) {
    console.error("Login error:", err);
    return { success: false, message: "Server error" };
  }
}

function logoutUser(message = null) {
  if (window.API && window.API.clearSession) {
    window.API.clearSession();
  } else {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(LOCAL_STORAGE_KEY);
  }
  if (message) alert(message);
  window.location.href = "login.html";
}

async function protectPage(requiredRole = null) {
  let user = getCurrentUser();

  if (!user?._id) {
    logoutUser();
    return;
  }

  if (isDataStale(user) || !user.fullName) {
    const fresh = await loadUserData(user._id);
    if (!fresh) {
      logoutUser("Session expired. Please log in again.");
      return;
    }
    user = fresh;
  }

  if (requiredRole && user.role !== requiredRole) {
    alert("Access denied.");
    window.location.href = "index.html";
  }
}

function redirectIfLoggedIn() {
  const user = getCurrentUser();
  if (user && !isDataStale(user)) {
    window.location.href = "index.html";
  }
}

window.getCurrentUser = getCurrentUser;
window.storeUserLocally = storeUserLocally;
window.loadUserData = loadUserData;
window.signUpUser = signUpUser;
window.loginUser = loginUser;
window.logoutUser = logoutUser;
window.protectPage = protectPage;
window.redirectIfLoggedIn = redirectIfLoggedIn;
