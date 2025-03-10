// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const analytics = getAnalytics(app);
const auth = getAuth(app);