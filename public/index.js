import { auth, db } from "./app.js";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, deleteField } from "firebase/firestore";

let currentUserData = null;

const defaultHive = {
  All: { default: true, createdAt: new Date().toISOString() }
};

const loadUserData = async (userId) => {
  const userDocRef = doc(db, "users", userId);
  const userDoc = await getDoc(userDocRef);

  const defaultData = {
    hives: defaultHive,
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

  document.getElementById("hive-button").addEventListener("click", () => {
    const hiveName = prompt("Enter a name for your new hive:");
    if (hiveName) {
      createHive(hiveName);
    }
  });

  document.getElementById("chat-button").addEventListener("click", showFriendChatPopup);

  const hiveNames = Object.keys(hives).filter(name => name !== "All").sort();
  hiveNames.unshift("All");

  for (const hiveName of hiveNames) {
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

    hiveButton.addEventListener("click", () => {
      currentUserData && renderChats(hiveName, currentUserData.chats || {});
    });

    hiveButton.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      showHiveContextMenu(e.pageX, e.pageY, hiveName);
    });    

    hiveContainer.appendChild(hiveButton);
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

  document.getElementById("hive-button").addEventListener("click", () => {
    const hiveName = prompt("Enter a name for your new hive:");
    if (hiveName) {
      createHive(hiveName);
    }
  });

  document.getElementById("chat-button").addEventListener("click", showFriendChatPopup);
  document.getElementById("back-button").addEventListener("click", () => {
    renderHives(currentUserData.hives);
  });

  for (const friendEmail in chats) {
    const chat = chats[friendEmail];
    if (!chat.hives || !chat.hives.includes(hiveName)) continue;

    const chatBtn = document.createElement("button");
    chatBtn.textContent = friendEmail;
    chatBtn.className = "chat-entry";

    chatBtn.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      showChatContextMenu(e.pageX, e.pageY, friendEmail);
    });

    chatMenu.appendChild(chatBtn);
  }
}

async function createHive(hiveName) {
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
  const hives = Object.keys(userData.hives).filter(h => h !== "All");

  friends.forEach((friendEmail) => {
    const alreadyChatted = chats[friendEmail];
    const btn = document.createElement("button");
    btn.textContent = alreadyChatted ? `${friendEmail} (Chat Exists)` : `Chat with ${friendEmail}`;
    btn.disabled = !!alreadyChatted;

    btn.addEventListener("click", () => {
      openCreateChatHivesPopup(friendEmail);
      popup.classList.add("hidden");
    });
    

    const li = document.createElement("li");
    li.appendChild(btn);
    list.appendChild(li);
  });

  closeBtn.onclick = () => popup.classList.add("hidden");
  popup.classList.remove("hidden");
}

function openCreateChatHivesPopup(friendEmail) {
  const popup = document.getElementById("create-chat-hives-popup");
  const form = document.getElementById("chat-hive-checkbox-form");
  const saveBtn = document.getElementById("chat-hive-save");
  const cancelBtn = document.getElementById("chat-hive-cancel");

  form.innerHTML = "";

  const availableHives = Object.keys(currentUserData.hives || {}).filter(h => h !== "All");

  availableHives.forEach(hive => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = hive;

    label.appendChild(checkbox);
    label.append(` ${hive}`);
    form.appendChild(label);
  });

  cancelBtn.onclick = () => popup.classList.add("hidden");

  saveBtn.onclick = async () => {
    const selected = Array.from(form.querySelectorAll("input[type='checkbox']:checked")).map(cb => cb.value);
    const finalHives = ["All", ...selected];

    const userId = auth.currentUser.uid;
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);
    const data = snap.data();

    data.chats[friendEmail] = {
      hives: [...new Set(finalHives)],
      createdAt: new Date().toISOString()
    };

    await setDoc(userRef, data);
    popup.classList.add("hidden");

    const updatedUserData = await loadUserData(userId);
    currentUserData = updatedUserData;
    renderHives(updatedUserData.hives);
  };

  popup.classList.remove("hidden");
}

function showChatContextMenu(x, y, friendEmail) {
  const menu = document.getElementById("chat-context-menu");
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  menu.classList.remove("hidden");

  const addBtn = document.getElementById("add-to-hives-btn");
  addBtn.onclick = () => {
    menu.classList.add("hidden");
    openAddToHivesPopup(friendEmail);
  };
}

function openAddToHivesPopup(friendEmail) {
  const popup = document.getElementById("add-to-hives-popup");
  const form = document.getElementById("hive-checkbox-form");
  const saveBtn = document.getElementById("add-to-hives-save");
  const cancelBtn = document.getElementById("add-to-hives-cancel");

  form.innerHTML = "";

  const availableHives = Object.keys(currentUserData.hives || {}).filter(h => h !== "All");
  const chat = currentUserData.chats?.[friendEmail];
  const currentHives = chat?.hives || ["All"];

  availableHives.forEach(hive => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = hive;
    checkbox.checked = currentHives.includes(hive);

    label.appendChild(checkbox);
    label.append(` ${hive}`);
    form.appendChild(label);
  });

  saveBtn.onclick = async () => {
    const selected = Array.from(form.querySelectorAll("input[type='checkbox']:checked")).map(cb => cb.value);
    const final = ["All", ...selected];

    const userId = auth.currentUser.uid;
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);
    const data = snap.data();

    if (data.chats && data.chats[friendEmail]) {
      data.chats[friendEmail].hives = [...new Set(final)];
      await setDoc(userRef, data);
      currentUserData = data;
      renderChats("All", data.chats);
    }

    popup.classList.add("hidden");
  };

  cancelBtn.onclick = () => popup.classList.add("hidden");
  popup.classList.remove("hidden");
}

document.addEventListener("click", () => {
  document.getElementById("chat-context-menu").classList.add("hidden");
  document.getElementById("add-to-hives-popup").classList.add("hidden");
});

document.addEventListener("DOMContentLoaded", () => {
  setupChat();
  setupDropdownMenu();
  setupLogoutButton();

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const userData = await loadUserData(user.uid);
      currentUserData = userData;
      renderHives(userData.hives);
    } else {
      window.location.href = "auth.html";
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
      .then(() => alert("Logged out successfully!"))
      .catch((error) => alert(error.message));
  });
}


function showHiveContextMenu(x, y, hiveName) {
  const menu = document.getElementById("hive-context-menu");
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  menu.classList.remove("hidden");

  const renameBtn = document.getElementById("rename-hive");
  const deleteBtn = document.getElementById("delete-hive");

  renameBtn.onclick = async () => {
    const newName = prompt("Rename hive:", hiveName);
    if (!newName || newName === hiveName) return;

    const userId = auth.currentUser.uid;
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);
    const data = snap.data();

    if (data.hives[newName]) {
      alert("That hive already exists.");
      return;
    }

    // Rename the hive
    data.hives[newName] = data.hives[hiveName];
    delete data.hives[hiveName];

    // Update hive references in chats
    for (const chat of Object.values(data.chats)) {
      if (chat.hives?.includes(hiveName)) {
        chat.hives = chat.hives.map(h => h === hiveName ? newName : h);
      }
    }

    await setDoc(userRef, data);
    currentUserData = data;
    renderHives(data.hives);
    menu.classList.add("hidden");
  };

  deleteBtn.onclick = async () => {
    if (hiveName === "All") {
      alert("You can't delete the default 'All' hive.");
      return;
    }

    const userId = auth.currentUser.uid;
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);
    const data = snap.data();

    delete data.hives[hiveName];

    // Remove hive from all chat entries
    for (const chat of Object.values(data.chats)) {
      if (chat.hives?.includes(hiveName)) {
        chat.hives = chat.hives.filter(h => h !== hiveName);
      }
    }

    await setDoc(userRef, data);
    currentUserData = data;
    renderHives(data.hives);
    menu.classList.add("hidden");
  };
}

// Hide the context menu if the user clicks anywhere else
document.addEventListener("click", () => {
  const hiveMenu = document.getElementById("hive-context-menu");
  if (hiveMenu) hiveMenu.classList.add("hidden");
});
