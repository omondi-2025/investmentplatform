// login.js

// Firebase SDK config
const firebaseConfig = {
  apiKey: "AIzaSyBV9_0Iw5GbKTSIdvaMEwSNpKA0sYcH2sg",
  authDomain: "trustcode-b3e36.firebaseapp.com",
  projectId: "trustcode-b3e36",
  storageBucket: "trustcode-b3e36.firebasestorage.app",
  messagingSenderId: "978590002424",
  appId: "1:978590002424:web:8f0e1597a7dbbb0b1a9f0d"
};

// Initialize Firebase if not already initialized
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const signupLink = document.getElementById("signupLink");

// Preserve referral code in signup link
const urlParams = new URLSearchParams(window.location.search);
const refCode = urlParams.get("ref");
if (refCode && signupLink) {
  signupLink.href = `signup.html?ref=${refCode}`;
}

// Handle form submission
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  loginMessage.textContent = "";
  loginMessage.className = "";

  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Fetch Firestore data
    const doc = await db.collection("users").doc(user.uid).get();
    if (!doc.exists) {
      throw new Error("Account data not found.");
    }

    const data = doc.data();
    data.uid = user.uid;

    // Save to localStorage via auth.js helper (if available)
    if (typeof storeUserLocally === "function") {
      storeUserLocally(data);
    } else {
      localStorage.setItem("user", JSON.stringify(data));
    }

    loginMessage.textContent = "✅ Login successful! Redirecting...";
    loginMessage.className = "alert success";

    setTimeout(() => {
      window.location.href = "index.html";
    }, 1500);
  } catch (err) {
    console.error("Login error:", err);
    loginMessage.textContent = "❌ Invalid email or password. Please try again.";
    loginMessage.className = "alert error";
  }
});