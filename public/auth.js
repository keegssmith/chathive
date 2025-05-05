import { auth, db } from "./app.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";

// Register a new user
export const registerUser = (email, password) => {
  createUserWithEmailAndPassword(auth, email, password)
    .then(async (userCredential) => {
      const user = userCredential.user;
      console.log("User registered and signed in:", user);

      // seed their Firestore document
      await setDoc(
        doc(db, "users", user.uid),
        { email: user.email },
        { merge: true }
      );

      // now redirect straight into the app
      window.location.href = "index.html";
    })
    .catch((error) => {
      console.error("Error registering user:", error.message);
      alert(error.message);
    });
};

// Login a user
export const loginUser = (email, password) => {
  console.log("Attempting login for:", email);
  signInWithEmailAndPassword(auth, email, password)
    .then(async (userCredential) => {
      const user = userCredential.user;
      console.log("User logged in:", user);

      
      await setDoc(doc(db, "users", user.uid), {
        email: user.email
      }, { merge: true });

      alert("Login successful!");
      window.location.href = "index.html";
    })
    .catch((error) => {
      console.error("Error logging in:", error.message);
      alert(error.message);
    });
};

// Logout a user
export const logoutUser = () => {
  signOut(auth)
    .then(() => {
        console.log("User signed out");
        alert("Logged out successfully!");
    })
    .catch((error) => {
        console.error("Error signing out:", error.message);
        alert(error.message);
    });
};
