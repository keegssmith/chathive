import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

const auth = getAuth();

// Register a new user
export const registerUser = (email, password) => {
    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            console.log("User registered:", userCredential.user);
            alert("Registration successful! You can now log in.");
        })
        .catch((error) => {
            console.error("Error registering user:", error.message);
            alert(error.message);
        });
};

// Login a user
export const loginUser = (email, password) => {
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            console.log("User logged in:", userCredential.user);
            alert("Login successful!");
            window.location.href = "index.html"; // Redirect to chat page
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