import { auth, db } from "./app.js";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { renderHives } from "./hives.js";
import { onSnapshot } from "firebase/firestore";

export let currentUserData = null;
export let currentChatFriend = null;
export let unsubscribeChatListener = null;

export const loadUserData = async (userId) => {
  const userDocRef = doc(db, "users", userId);
  const userDoc = await getDoc(userDocRef);

  const defaultData = {
    hives: {
      All: { default: true, createdAt: new Date().toISOString() }
    },
    chats: {},
    friends: []
  };

  if (userDoc.exists()) {
    let userData = userDoc.data();
    let updated = false;
    for (const key in defaultData) {
      if (!userData.hasOwnProperty(key)) {
        userData[key] = defaultData[key];
        updated = true;
      }
    }
    if (updated) {
      await setDoc(userDocRef, userData, { merge: true });
    }
    return userData;
  } else {
    await setDoc(userDocRef, defaultData);
    return defaultData;
  }
};

export function listenToUserData(userId, onUpdate) {
  const userDocRef = doc(db, "users", userId);
  return onSnapshot(userDocRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      currentUserData = data;
      onUpdate(data);
    }
  });
}

export function setupDropdownMenu() {
  const menuButton = document.getElementById("menu-button");
  const menuDropdown = document.getElementById("menu-dropdown");

  menuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    menuDropdown.classList.toggle("hidden");
  });

  document.addEventListener("click", (event) => {
    if (!menuButton.contains(event.target) && !menuDropdown.contains(event.target)) {
      menuDropdown.classList.add("hidden");
    }
  });
}

export function setupLogoutButton() {
  const logoutButton = document.getElementById("logout-button");
  logoutButton.addEventListener("click", () => {
    signOut(auth)
      .then(() => alert("Logged out successfully!"))
      .catch((error) => alert(error.message));
  });
}

export async function initializePage() {
  setupDropdownMenu();
  setupLogoutButton();

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      listenToUserData(user.uid, (data) => {
        renderHives(data.hives);
        // Optional: always render "All" chats too
        if (data.chats) {
          import("./chats.js").then(({ renderChats }) => {
            renderChats("All", data.chats);
          });
        }
      });
    }
     else {
      window.location.href = "auth.html";
    }
  });
}
