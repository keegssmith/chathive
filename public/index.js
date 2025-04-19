import { auth, db } from "./app.js";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, deleteField } from "firebase/firestore";


let currentUserData = null;

const defaultHives = {
  Unhived: { default: true, createdAt: new Date().toISOString() },
};

const loadUserData = async (userId) => {
  const userDocRef = doc(db, "users", userId);
  const userDoc = await getDoc(userDocRef);

  const defaultData = {
    hives: defaultHives,
    chats: {},
    friends: [],
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

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userRef = doc(db, "users", user.uid);

   
    await setDoc(userRef, { email: user.email }, { merge: true });

    const snap = await getDoc(userRef);
    const data = snap.data();

    // Ensure default hive exists
    if (!data.hives || Object.keys(data.hives).length === 0) {
      await updateDoc(userRef, {
        hives: {
          Unhived: { default: true, createdAt: new Date().toISOString() }
        }
      });
      data.hives = {
        Unhived: { default: true, createdAt: new Date().toISOString() }
      };
    }

    currentUserData = data;
    renderHives(currentUserData.hives);
  } else {
    window.location.href = "auth.html";
  }
});

function renderHives(hives) {
  const chatMenu = document.getElementById("chat-menu");
  chatMenu.innerHTML = "";

  const topButtons = document.createElement("div");
  topButtons.className = "chat-menu-top-buttons";
  topButtons.innerHTML = `
    <button id="hive-button" class="menu-top-button">Hive</button>
    <button id="chat-button" class="menu-top-button">Chat</button>
  `;
  chatMenu.appendChild(topButtons);

  document.getElementById("hive-button").addEventListener("click", async () => {
    const hiveName = prompt("Enter a name for your new hive:");
    if (!hiveName || !hiveName.trim()) return;

    const userId = auth.currentUser.uid;
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data();

    const hives = userData.hives || {};
    if (hives[hiveName]) {
      alert("A hive with that name already exists.");
      return;
    }

    hives[hiveName] = { createdAt: new Date().toISOString() };
    await updateDoc(userRef, {
      [`hives.${hiveName}`]: { createdAt: new Date().toISOString() }
    });
    currentUserData.hives = hives;
    renderHives(hives);
  });

  document.getElementById("chat-button").addEventListener("click", showFriendChatPopup);

  
  const sortedHives = Object.keys(hives).sort((a, b) => {
    if (a === "Unhived") return -1;
    if (b === "Unhived") return 1;
    return a.localeCompare(b);
  });

  for (const hiveName of sortedHives) {
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

    const hiveControls = document.createElement("div");
    hiveControls.style.display = "flex";
    hiveControls.style.alignItems = "center";
    hiveControls.style.gap = "8px";

    hiveControls.appendChild(hiveButton);

    if (hiveName !== "Unhived") {
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "×";
      deleteBtn.className = "friend-btn";
      deleteBtn.style.padding = "5px 10px";
      deleteBtn.style.fontSize = "1rem";
      deleteBtn.title = `Delete hive "${hiveName}"`;

      deleteBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (confirm(`Delete the hive "${hiveName}"?`)) {
          await deleteHive(hiveName);
        }
      });

      hiveControls.appendChild(deleteBtn);
    }

    hiveContainer.appendChild(hiveControls);
    chatMenu.appendChild(hiveContainer);
  }
}


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

    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.alignItems = "center";
    container.style.justifyContent = "space-between";
    container.style.margin = "10px 0";

    const chatBtn = document.createElement("button");
    chatBtn.textContent = `Chat with ${friendEmail}`;
    chatBtn.className = "friend-btn";

    // Dropdown for hive selection
    const hiveSelect = document.createElement("select");
    hiveSelect.className = "hive-dropdown";

    for (const name in currentUserData.hives) {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      if (name === chat.hive) option.selected = true;
      hiveSelect.appendChild(option);
    }

    hiveSelect.addEventListener("change", async (e) => {
      const newHive = e.target.value;
      const userId = auth.currentUser.uid;
      const userRef = doc(db, "users", userId);

      const updatedChats = { ...currentUserData.chats };
      updatedChats[friendEmail].hive = newHive;

      await updateDoc(userRef, { chats: updatedChats });
      currentUserData.chats = updatedChats;
      renderChats(hiveName, updatedChats);
    });

    container.appendChild(chatBtn);
    container.appendChild(hiveSelect);
    chatMenu.appendChild(container);
  }
}


async function deleteHive(hiveName) {
  if (hiveName === "Unhived") {
    return alert("The default 'Unhived' hive cannot be deleted.");
  }

  const userId = auth.currentUser.uid;
  const userRef = doc(db, "users", userId);

  try {
    await updateDoc(userRef, {
      [`hives.${hiveName}`]: deleteField()
    });

    delete currentUserData.hives[hiveName];
    renderHives(currentUserData.hives);
  } catch (err) {
    console.error("Failed to delete hive:", err);
    alert("Something went wrong while deleting the hive.");
  }
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
      await setDoc(userRef, { ...userData, chats: newChats }, { merge: true });
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

document.addEventListener("DOMContentLoaded", function () {
  setupChat();
  setupDropdownMenu();
  setupLogoutButton();
});
