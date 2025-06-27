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

// Initialize Firebase only once
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// LocalStorage key
const LOCAL_STORAGE_KEY = "user";

/**
 * Get current user (from Firebase Auth + LocalStorage)
 */
function getCurrentUser() {
  const firebaseUser = auth.currentUser;

  // Use Firebase Auth first
  if (firebaseUser && firebaseUser.uid) {
    const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY));
    if (!stored || stored.uid !== firebaseUser.uid) {
      // If no local or mismatched, return minimal Firebase user
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email
      };
    }
    return stored;
  }

  // Fallback to localStorage
  try {
    const user = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY));
    return user && user.uid ? user : null;
  } catch (err) {
    console.warn("⚠️ getCurrentUser() failed:", err);
    return null;
  }
}

/**
 * Save user to localStorage with lastUpdated timestamp
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
 * Check if local user data is stale (older than 1 hour)
 */
function isDataStale(user) {
  if (!user?.lastUpdated) return true;
  return Date.now() - user.lastUpdated > 60 * 60 * 1000; // 1 hour
}

/**
 * Reload user data from Firestore and store locally
 */
async function loadUserData(uid) {
  try {
    const doc = await db.collection("users").doc(uid).get();
    if (!doc.exists) {
      console.warn("⚠️ No user found in Firestore for UID:", uid);
      return null;
    }
    const data = doc.data();
    data.uid = uid;
    storeUserLocally(data);
    return data;
  } catch (err) {
    console.error("❌ loadUserData failed:", err);
    return null;
  }
}

/**
 * Protect page: Requires login, optionally restrict by role
 */
async function protectPage(requiredRole = null) {
  let user = getCurrentUser();

  // No user? redirect to login
  if (!user || !user.uid) {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    window.location.href = "login.html";
    return;
  }

  // Reload user if stale or missing full profile
  if (isDataStale(user) || !user.fullName) {
    const freshUser = await loadUserData(user.uid);
    if (!freshUser) {
      logoutUser("Your session has expired. Please log in again.");
      return;
    }
    user = freshUser;
  }

  // Role-based access control
  if (requiredRole && user.role !== requiredRole) {
    alert("You are not authorized to access this page.");
    window.location.href = "index.html";
  }
}

/**
 * Redirect to homepage if already logged in
 */
function redirectIfLoggedIn() {
  const user = getCurrentUser();
  if (user && !isDataStale(user)) {
    window.location.href = "index.html";
  }
}

/**
 * Log out user cleanly
 */
function logoutUser(message = null) {
  auth.signOut().finally(() => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    if (message) alert(message);
    window.location.href = "login.html";
  });
}

/**
 * Auto sync Firestore user on login
 */
auth.onAuthStateChanged(async (firebaseUser) => {
  if (firebaseUser && firebaseUser.uid) {
    const data = await loadUserData(firebaseUser.uid);
    if (data) {
      storeUserLocally(data);
    }
  }
});

// Export to global scope
window.getCurrentUser = getCurrentUser;
window.storeUserLocally = storeUserLocally;
window.protectPage = protectPage;
window.redirectIfLoggedIn = redirectIfLoggedIn;
window.logoutUser = logoutUser;
window.loadUserData = loadUserData;