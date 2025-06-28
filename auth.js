// auth.js – Trustcode Full Auth System

// 1. Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBV9_0Iw5GbKTSIdvaMEwSNpKA0sYcH2sg",
  authDomain: "trustcode-b3e36.firebaseapp.com",
  projectId: "trustcode-b3e36",
  storageBucket: "trustcode-b3e36.firebasestorage.app",
  messagingSenderId: "978590002424",
  appId: "1:978590002424:web:8f0e1597a7dbbb0b1a9f0d"
};

// 2. Initialize Firebase (only once)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

const LOCAL_STORAGE_KEY = "tc_user";

// 3. Store user locally
function storeUserLocally(userData) {
  if (!userData?.uid) return;
  userData.lastUpdated = Date.now();
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(userData));
}

// 4. Get user from localStorage or Firebase session
function getCurrentUser() {
  const fbUser = auth.currentUser;
  const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY));

  if (fbUser?.uid) {
    if (!stored || stored.uid !== fbUser.uid) {
      return { uid: fbUser.uid, email: fbUser.email };
    }
    return stored;
  }

  return stored?.uid ? stored : null;
}

// 5. Check if data is older than 1 hour
function isDataStale(user) {
  return !user?.lastUpdated || Date.now() - user.lastUpdated > 60 * 60 * 1000;
}

// 6. Load fresh user data from Firestore
async function loadUserData(uid) {
  try {
    const doc = await db.collection("users").doc(uid).get();
    if (!doc.exists) return null;
    const data = doc.data();
    data.uid = uid;
    storeUserLocally(data);
    return data;
  } catch (err) {
    console.error("loadUserData failed:", err);
    return null;
  }
}

// 7. Sign up a new user
async function signUpUser(email, password, fullName, phone) {
  try {
    const userCred = await auth.createUserWithEmailAndPassword(email, password);
    const uid = userCred.user.uid;

    const userData = {
      uid,
      email,
      fullName,
      phone,
      role: "user",
      wallet: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    await db.collection("users").doc(uid).set(userData);
    storeUserLocally(userData);
    return { success: true };
  } catch (err) {
    console.error("Sign up error:", err);
    return { success: false, message: err.message };
  }
}

// 8. Login a user
async function loginUser(email, password) {
  try {
    const userCred = await auth.signInWithEmailAndPassword(email, password);
    const uid = userCred.user.uid;
    const data = await loadUserData(uid);
    if (data) return { success: true };
    else return { success: false, message: "User data missing" };
  } catch (err) {
    console.error("Login error:", err);
    return { success: false, message: err.message };
  }
}

// 9. Logout the user
function logoutUser(message = null) {
  auth.signOut().finally(() => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    if (message) alert(message);
    window.location.href = "login.html";
  });
}

// 10. Protect a page
async function protectPage(requiredRole = null) {
  let user = getCurrentUser();

  if (!user?.uid) {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    window.location.href = "login.html";
    return;
  }

  if (isDataStale(user) || !user.fullName) {
    const fresh = await loadUserData(user.uid);
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

// 11. Redirect to dashboard if already logged in
function redirectIfLoggedIn() {
  const user = getCurrentUser();
  if (user && !isDataStale(user)) {
    window.location.href = "index.html";
  }
}

// 12. Keep user in sync after login
auth.onAuthStateChanged(async (firebaseUser) => {
  if (firebaseUser?.uid) {
    const data = await loadUserData(firebaseUser.uid);
    if (data) storeUserLocally(data);
  }
});

// 13. Expose to global window
window.getCurrentUser = getCurrentUser;
window.storeUserLocally = storeUserLocally;
window.loadUserData = loadUserData;
window.signUpUser = signUpUser;
window.loginUser = loginUser;
window.logoutUser = logoutUser;
window.protectPage = protectPage;
window.redirectIfLoggedIn = redirectIfLoggedIn;