import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCZc8mRCRKckk5VVZpsgVq_ptcIrfQwvNg",
  authDomain: "chat-hive6.firebaseapp.com",
  projectId: "chat-hive6",
  storageBucket: "chat-hive6.firebasestorage.app",
  messagingSenderId: "954137080780",
  appId: "1:954137080780:web:bdbcef777da526ab89a369",
  measurementId: "G-NCYTCK4LK0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Function to load user-specific data
const loadUserData = async (userId) => {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
        return userDoc.data();
    } else {
        return null;
    }
};

// Listen for authentication state changes
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("User logged in:", user.email);
        const userData = await loadUserData(user.uid);
        
        if (userData) {
            document.getElementById("chat-menu").innerHTML = userData.chatMenu || "";
            document.getElementById("chat-container").innerHTML = userData.chatContainer || "";
        }
    } else {
        console.log("No user is logged in.");
        // Redirect unauthenticated users away from index.html
        const pathname = window.location.pathname;
        if (pathname.endsWith("index.html") || pathname === "/") {
            window.location.href = "auth.html";
        }
    }
});

// Export the auth instance for other modules to use
export { auth };