// auth.js - Trustcode Authentication Helper

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBV9_0Iw5GbKTSIdvaMEwSNpKA0sYcH2sg",
  authDomain: "trustcode-b3e36.firebaseapp.com",
  projectId: "trustcode-b3e36",
  storageBucket: "trustcode-b3e36.appspot.com",
  messagingSenderId: "978590002424",
  appId: "1:978590002424:web:8f0e1597a7dbbb0b1a9f0d"
};

// Initialize Firebase if not already
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// 🔄 Updated localStorage key to match all pages
const LOCAL_STORAGE_KEY = "user";

/**
 * Get current user from localStorage
 */
function getCurrentUser() {
  try {
    const user = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY));
    if (user && user.uid) return user;
    return null;
  } catch (err) {
    console.warn("⚠️ getCurrentUser() failed:", err);
    return null;
  }
}

/**
 * Save user data locally with a timestamp
 */
function storeUserLocally(data) {
  if (!data || !data.uid) {
    console.error("❌ storeUserLocally: Missing UID");
    return;
  }
  data.lastUpdated = Date.now();
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
}

/**
 * Check if user data is stale (older than 1 hour)
 */
function isDataStale(user) {
  if (!user || !user.lastUpdated) return true;
  return Date.now() - user.lastUpdated > (60 * 60 * 1000); // 1 hour
}

/**
 * Load user data fresh from Firestore
 */
async function loadUserData(uid) {
  try {
    const doc = await db.collection("users").doc(uid).get();
    if (doc.exists) {
      const data = doc.data();
      data.uid = uid;
      storeUserLocally(data);
      return data;
    } else {
      console.warn("⚠️ No user found in Firestore for UID:", uid);
      return null;
    }
  } catch (error) {
    console.error("❌ loadUserData failed:", error);
    return null;
  }
}

/**
 * Protect page: Require login and optionally check role
 */
async function protectPage(roleRequired = null) {
  let user = getCurrentUser();

  // If missing or corrupted
  if (!user || !user.uid) {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    window.location.href = "login.html";
    return;
  }

  // Refresh user data if stale
  if (isDataStale(user)) {
    const refreshed = await loadUserData(user.uid);
    if (!refreshed) {
      logoutUser("Session expired. Please log in again.");
      return;
    }
    user = refreshed;
  }

  // Role check
  if (roleRequired && user.role !== roleRequired) {
    alert("🚫 You are not authorized to view this page.");
    window.location.href = "index.html";
  }
}

/**
 * Redirect to dashboard if already logged in
 */
function redirectIfLoggedIn() {
  const user = getCurrentUser();
  if (user && user.uid && !isDataStale(user)) {
    window.location.href = "index.html";
  }
}

/**
 * Log out the user and optionally show a message
 */
function logoutUser(message = null) {
  auth.signOut().finally(() => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    if (message) alert(message);
    window.location.href = "login.html";
  });
}

// Export globally
window.getCurrentUser = getCurrentUser;
window.storeUserLocally = storeUserLocally;
window.protectPage = protectPage;
window.redirectIfLoggedIn = redirectIfLoggedIn;
window.logoutUser = logoutUser;
window.loadUserData = loadUserData;
window.isDataStale = isDataStale;