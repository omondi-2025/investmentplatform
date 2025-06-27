// signup.js

// Firebase SDK config
const firebaseConfig = {
  apiKey: "AIzaSyBV9_0Iw5GbKTSIdvaMEwSNpKA0sYcH2sg",
  authDomain: "trustcode-b3e36.firebaseapp.com",
  projectId: "trustcode-b3e36",
  storageBucket: "trustcode-b3e36.firebasestorage.app",
  messagingSenderId: "978590002424",
  appId: "1:978590002424:web:8f0e1597a7dbbb0b1a9f0d"
};

// Initialize Firebase if not already done
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

const signupForm = document.getElementById("signupForm");
const signupMessage = document.getElementById("signupMessage");
const loginLink = document.getElementById("loginLink");

// Get referral code from URL
const urlParams = new URLSearchParams(window.location.search);
const referredBy = urlParams.get("ref") || null;
if (referredBy && loginLink) {
  loginLink.href = `login.html?ref=${referredBy}`;
}

// Generate random referral code
function generateRefCode() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

// Handle sign-up form submission
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fullName = document.getElementById("fullName").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const refCode = generateRefCode();

  signupMessage.textContent = "";
  signupMessage.className = "";

  // Validate Kenyan phone number
  if (!/^0(1|7)[0-9]{8}$/.test(phone)) {
    signupMessage.textContent = "❌ Please enter a valid Kenyan phone number.";
    signupMessage.className = "alert error";
    return;
  }

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    const userData = {
      uid: user.uid,
      fullName,
      phone,
      email,
      refCode,
      referredBy,
      wallet: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    // Save user in Firestore
    await db.collection("users").doc(user.uid).set(userData);

    // Save locally using auth.js helper
    if (typeof storeUserLocally === "function") {
      storeUserLocally({ ...userData, lastUpdated: Date.now() });
    } else {
      localStorage.setItem("user", JSON.stringify({ ...userData, lastUpdated: Date.now() }));
    }

    signupMessage.textContent = "✅ Account created successfully! Redirecting...";
    signupMessage.className = "alert success";

    setTimeout(() => {
      window.location.href = "index.html";
    }, 1500);
  } catch (err) {
    console.error("Signup error:", err);
    signupMessage.textContent = "❌ Failed to create account. Please try again.";
    signupMessage.className = "alert error";
  }
});