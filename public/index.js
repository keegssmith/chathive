import { auth, db } from "./app.js";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

let currentUserData = null; // cache for switching between hives and chats

const defaultHive = {
  Unhived: { default: true, createdAt: new Date().toISOString() }
};

const loadUserData = async (userId) => {
  const userDocRef = doc(db, "users", userId);
  const userDoc = await getDoc(userDocRef);

  const defaultData = {
    hives: { Unhived: { default: true, createdAt: new Date().toISOString() } },
    chats: {},
    friends: [],
  };

  if (userDoc.exists()) {
    let userData = userDoc.data();

    // Add missing fields without overwriting existing data
    let updated = false;
    for (const key in defaultData) {
      if (!userData.hasOwnProperty(key)) {
        userData[key] = defaultData[key];
        updated = true;
      }
    }

    if (updated) {
      await setDoc(userDocRef, userData); // update the doc
    }

    return userData;
  } else {
    await setDoc(userDocRef, defaultData);
    return defaultData;
  }
};

const renderHives = (hives) => {
  const chatMenu = document.getElementById("chat-menu");
  chatMenu.innerHTML = "";

  const topButtons = document.createElement("div");
  topButtons.className = "chat-menu-top-buttons";
  topButtons.innerHTML = `
    <button id="hive-button" class="menu-top-button">Hive</button>
    <button id="chat-button" class="menu-top-button">Chat</button>
  `;
  chatMenu.appendChild(topButtons);

  document.getElementById("hive-button").addEventListener("click", showFriendChatPopup);
  document.getElementById("chat-button").addEventListener("click", showFriendChatPopup);

  for (const hiveName in hives) {
    const hiveContainer = document.createElement("div");
    hiveContainer.classList.add("hive-container");

    const hiveButton = document.createElement("button");
    hiveButton.classList.add("hex-container");
    hiveButton.innerHTML = `
      <img src="unselected-button.png" alt="Hive Button" class="button-hive" />
      <span class="hive-text">${hiveName}</span>
    `;

    hiveButton.addEventListener("mouseover", () => {
      hiveButton.querySelector(".button-hive").src = "selected-button.png";
    });
    hiveButton.addEventListener("mouseout", () => {
      hiveButton.querySelector(".button-hive").src = "unselected-button.png";
    });

    hiveButton.addEventListener("click", async () => {
      const userId = auth.currentUser.uid;
      const userSnap = await getDoc(doc(db, "users", userId));
      const userData = userSnap.data();
      currentUserData = userData;
      renderChats(hiveName, userData.chats || {});
    });

    hiveContainer.appendChild(hiveButton);

    if (hiveName !== "Unhived") {
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (confirm(`Delete the hive "${hiveName}"?`)) {
          deleteHive(hiveName);
        }
      });
      hiveContainer.appendChild(deleteBtn);
    }

    chatMenu.appendChild(hiveContainer);
  }
};

function renderChats(hiveName, chats) {
  const chatMenu = document.getElementById("chat-menu");
  chatMenu.innerHTML = "";

  const topButtons = document.createElement("div");
  topButtons.className = "chat-menu-top-buttons";
  topButtons.innerHTML = `
    <button id="hive-button" class="menu-top-button">Hive</button>
    <button id="back-button" class="menu-top-button">Back</button>
    <button id="chat-button" class="menu-top-button">Chat</button>
  `;
  chatMenu.appendChild(topButtons);

  document.getElementById("hive-button").addEventListener("click", showFriendChatPopup);
  document.getElementById("chat-button").addEventListener("click", showFriendChatPopup);
  document.getElementById("back-button").addEventListener("click", () => {
    renderHives(currentUserData.hives);
  });

  for (const friendEmail in chats) {
    const chat = chats[friendEmail];
    if (chat.hive !== hiveName) continue;

    const chatBtn = document.createElement("button");
    chatBtn.textContent = friendEmail;
    chatBtn.className = "chat-entry";
    chatMenu.appendChild(chatBtn);
  }
}

async function createHive(hiveName) {
  if (!hiveName.trim()) return alert("Hive name cannot be empty");
  const userId = auth.currentUser.uid;
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  let userData = userSnap.exists() ? userSnap.data() : { hives: {} };

  userData.hives = userData.hives || {};

  if (userData.hives[hiveName]) {
    return alert("A hive with that name already exists");
  }

  userData.hives[hiveName] = { createdAt: new Date().toISOString() };
  await setDoc(userRef, userData);
  renderHives(userData.hives);
}

async function deleteHive(hiveName) {
  if (hiveName === "Unhived") {
    return alert("The default 'Unhived' hive cannot be deleted.");
  }
  const userId = auth.currentUser.uid;
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  let userData = userSnap.exists() ? userSnap.data() : null;

  if (!userData || !userData.hives || !userData.hives[hiveName]) {
    return alert("Hive not found");
  }

  delete userData.hives[hiveName];
  await setDoc(userRef, userData);
  renderHives(userData.hives);
}

async function showFriendChatPopup() {
  const popup = document.getElementById("chat-popup");
  const list = document.getElementById("friend-list-popup");
  const closeBtn = document.getElementById("close-popup");

  list.innerHTML = "";

  const userId = auth.currentUser.uid;
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.data();

  const friends = userData.friends || [];
  const chats = userData.chats || {};

  friends.forEach((friendEmail) => {
    const alreadyChatted = chats[friendEmail];
    const btn = document.createElement("button");
    btn.textContent = alreadyChatted ? `${friendEmail} (Chat Exists)` : `Chat with ${friendEmail}`;
    btn.disabled = !!alreadyChatted;

    btn.addEventListener("click", async () => {
      const newChats = {
        ...chats,
        [friendEmail]: { hive: "Unhived", createdAt: new Date().toISOString() }
      };
      await setDoc(userRef, { ...userData, chats: newChats });
      popup.classList.add("hidden");
      alert(`Chat with ${friendEmail} created!`);
      const updatedUserData = await loadUserData(userId);
      currentUserData = updatedUserData;
      renderHives(updatedUserData.hives);
    });

    const li = document.createElement("li");
    li.appendChild(btn);
    list.appendChild(li);
  });

  closeBtn.onclick = () => popup.classList.add("hidden");
  popup.classList.remove("hidden");
}

// -----------------------------
// Chat and UI Functionality
// -----------------------------
document.addEventListener("DOMContentLoaded", function () {
  setupChat();
  setupDropdownMenu();
  setupLogoutButton();

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log("User logged in:", user.email);
      const userData = await loadUserData(user.uid);
      currentUserData = userData;
      if (userData && userData.hives) {
        renderHives(userData.hives);
      }
    } else {
      console.log("No user is logged in.");
      const pathname = window.location.pathname;
      if (pathname.endsWith("index.html") || pathname === "/") {
        window.location.href = "auth.html";
      }
    }
  });
});

function setupChat() {
  const sendButton = document.getElementById("send-message");
  const messageInput = document.getElementById("message");
  const chatHistory = document.getElementById("chat-history");

  sendButton.addEventListener("click", sendMessage);
  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  function sendMessage() {
    const text = messageInput.value.trim();
    if (text !== "") {
      const messageDiv = document.createElement("div");
      messageDiv.classList.add("message");
      messageDiv.textContent = text;
      chatHistory.appendChild(messageDiv);
      messageInput.value = "";
      chatHistory.scrollTop = chatHistory.scrollHeight;
    }
  }
}

function setupDropdownMenu() {
  const menuButton = document.getElementById("menu-button");
  const menuDropdown = document.getElementById("menu-dropdown");

  menuButton.addEventListener("click", function (event) {
    event.stopPropagation();
    menuDropdown.classList.toggle("hidden");
  });

  document.addEventListener("click", function (event) {
    if (!menuButton.contains(event.target) && !menuDropdown.contains(event.target)) {
      menuDropdown.classList.add("hidden");
    }
  });
}

function setupLogoutButton() {
  const logoutButton = document.getElementById("logout-button");
  logoutButton.addEventListener("click", function () {
    signOut(auth)
      .then(() => {
        console.log("User signed out");
        alert("Logged out successfully!");
      })
      .catch((error) => {
        console.error("Error signing out:", error.message);
        alert(error.message);
      });
  });
}
