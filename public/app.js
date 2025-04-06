import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCZc8mRCRKckk5VVZpsgVq_ptcIrfQwvNg",
  authDomain: "chat-hive6.firebaseapp.com",
  projectId: "chat-hive6",
  storageBucket: "chat-hive6.firebasestorage.app",
  messagingSenderId: "954137080780",
  appId: "1:954137080780:web:bdbcef777da526ab89a369",
  measurementId: "G-NCYTCK4LK0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
