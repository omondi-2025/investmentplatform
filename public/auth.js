// auth.js – Trustcode Auth System (MongoDB Version)

const LOCAL_STORAGE_KEY = "tc_user";

// 1. Store user locally
function storeUserLocally(userData) {
  if (!userData?._id) return;
  userData.lastUpdated = Date.now();
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(userData));
}

// 2. Get current user
function getCurrentUser() {
  try {
    const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY));
    return stored?._id ? stored : null;
  } catch {
    return null;
  }
}

// 3. Check if local data is stale
function isDataStale(user) {
  return !user?.lastUpdated || Date.now() - user.lastUpdated > 60 * 60 * 1000;
}

// 4. Load fresh user data from MongoDB
async function loadUserData(userId) {
  try {
    const res = await fetch(`http://localhost:3000/api/user/${userId}`);
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

// 5. Sign up a new user
async function signUpUser(email, password, fullName, phone) {
  try {
    const res = await fetch("http://localhost:3000/api/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password, fullName, phone })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      storeUserLocally(data.user);
      return { success: true };
    } else {
      return { success: false, message: data.message || "Signup failed" };
    }
  } catch (err) {
    console.error("Signup error:", err);
    return { success: false, message: "Server error" };
  }
}

// 6. Login user
async function loginUser(email, password) {
  try {
    const res = await fetch("http://localhost:3000/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      storeUserLocally(data.user);
      return { success: true };
    } else {
      return { success: false, message: data.message || "Login failed" };
    }
  } catch (err) {
    console.error("Login error:", err);
    return { success: false, message: "Server error" };
  }
}

// 7. Logout user
function logoutUser(message = null) {
  localStorage.removeItem(LOCAL_STORAGE_KEY);
  if (message) alert(message);
  window.location.href = "login.html";
}

// 8. Protect page
async function protectPage(requiredRole = null) {
  let user = getCurrentUser();

  if (!user?._id) {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    window.location.href = "login.html";
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

// 9. Redirect if already logged in
function redirectIfLoggedIn() {
  const user = getCurrentUser();
  if (user && !isDataStale(user)) {
    window.location.href = "index.html";
  }
}

// 10. Expose to global scope
window.getCurrentUser = getCurrentUser;
window.storeUserLocally = storeUserLocally;
window.loadUserData = loadUserData;
window.signUpUser = signUpUser;
window.loginUser = loginUser;
window.logoutUser = logoutUser;
window.protectPage = protectPage;
window.redirectIfLoggedIn = redirectIfLoggedIn;
