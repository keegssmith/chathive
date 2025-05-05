// setup.js
import { auth, db } from "./app.js";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { renderHives } from "./hives.js";

export let currentUserData = null;
export let currentChatFriend = null;
export let unsubscribeChatListener = null;

// Ensures a new user gets the default "All" hive, then returns their data
export const loadUserData = async (userId) => {
  const userRef = doc(db, "users", userId);
  const snap = await getDoc(userRef);

  const defaultData = {
    hives: { All: { default: true, createdAt: new Date().toISOString() } },
    chats: {},
    friends: []
  };

  if (snap.exists()) {
    const data = snap.data();
    let updated = false;
    for (const k in defaultData) {
      if (!(k in data)) {
        data[k] = defaultData[k];
        updated = true;
      }
    }
    if (updated) await setDoc(userRef, data, { merge: true });
    return data;
  } else {
    await setDoc(userRef, defaultData);
    return defaultData;
  }
};

// Listens for *changes* (and initial load) to the user doc
export function listenToUserData(userId, onUpdate) {
  const userRef = doc(db, "users", userId);
  return onSnapshot(userRef, (snap) => {
    if (snap.exists()) {
      currentUserData = snap.data();
      onUpdate(currentUserData);
    }
  });
}

export function setupDropdownMenu() {
  const menuButton = document.getElementById("menu-button");
  const menuDropdown = document.getElementById("menu-dropdown");
  menuButton.addEventListener("click", (e) => {
    e.stopPropagation();
    menuDropdown.classList.toggle("hidden");
  });
  document.addEventListener("click", (e) => {
    if (!menuButton.contains(e.target) && !menuDropdown.contains(e.target)) {
      menuDropdown.classList.add("hidden");
    }
  });
}

export function setupLogoutButton() {
  document.getElementById("logout-button")
    .addEventListener("click", () => {
      signOut(auth)
        .then(() => alert("Logged out successfully!"))
        .catch(err => alert(err.message));
    });
}

export async function initializePage() {
  setupDropdownMenu();
  setupLogoutButton();

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "auth.html";
      return;
    }

    const data = await loadUserData(user.uid);

    renderHives(data.hives);

    listenToUserData(user.uid, (updated) => {
      renderHives(updated.hives);
    });
  });
}