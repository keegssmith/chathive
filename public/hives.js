import { auth, db } from "./app.js";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { renderChats } from "./chats.js";
import { currentUserData } from "./setup.js";

export function renderHives(hives) {
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
    document.getElementById("create-hive-popup").classList.remove("hidden");
  });
  

  document.getElementById("chat-button").addEventListener("click", () => {
    document.dispatchEvent(new CustomEvent("openFriendChatPopup"));
  });

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
      renderChats(hiveName, currentUserData.chats || {});
    });

    if (hiveName !== "All") {
      hiveButton.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        showHiveContextMenu(e.pageX, e.pageY, hiveName);
      });
    }    

    hiveContainer.appendChild(hiveButton);
    chatMenu.appendChild(hiveContainer);
  }

  document.addEventListener("click", () => {
    const hiveMenu = document.getElementById("hive-context-menu");
    if (!hiveMenu.classList.contains("hidden")) {
      hiveMenu.classList.add("hidden");
    }
  });

}

export async function createHive(hiveName) {
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

export function showHiveContextMenu(x, y, hiveName) {
  const menu = document.getElementById("hive-context-menu");
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  menu.classList.remove("hidden");

  const renameBtn = document.getElementById("rename-hive");
  const deleteBtn = document.getElementById("delete-hive");

  renameBtn.onclick = async () => {
    document.getElementById("rename-hive-popup").classList.remove("hidden");
    document.getElementById("rename-hive-input").value = hiveName;

    document.getElementById("confirm-rename-hive").onclick = async () => {
      const newName = document.getElementById("rename-hive-input").value.trim();
      if (!newName || newName === hiveName) return;

      const userId = auth.currentUser.uid;
      const userRef = doc(db, "users", userId);
      const snap = await getDoc(userRef);
      const data = snap.data();

      if (data.hives[newName]) {
        alert("That hive already exists.");
        return;
      }

      data.hives[newName] = data.hives[hiveName];
      delete data.hives[hiveName];

      for (const chat of Object.values(data.chats)) {
        if (chat.hives?.includes(hiveName)) {
          chat.hives = chat.hives.map(h => h === hiveName ? newName : h);
        }
      }

      await setDoc(userRef, data);
      renderHives(data.hives);
      document.getElementById("rename-hive-popup").classList.add("hidden");
      document.getElementById("hive-context-menu").classList.add("hidden");
    };

    document.getElementById("cancel-rename-hive").onclick = () => {
      document.getElementById("rename-hive-popup").classList.add("hidden");
    };

    if (!newName || newName === hiveName) return;

    const userId = auth.currentUser.uid;
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);
    const data = snap.data();

    if (data.hives[newName]) {
      alert("That hive already exists.");
      return;
    }

    data.hives[newName] = data.hives[hiveName];
    delete data.hives[hiveName];

    for (const chat of Object.values(data.chats)) {
      if (chat.hives?.includes(hiveName)) {
        chat.hives = chat.hives.map(h => h === hiveName ? newName : h);
      }
    }

    await setDoc(userRef, data);
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

    for (const chat of Object.values(data.chats)) {
      if (chat.hives?.includes(hiveName)) {
        chat.hives = chat.hives.filter(h => h !== hiveName);
      }
    }

    await setDoc(userRef, data);
    renderHives(data.hives);
    menu.classList.add("hidden");
  };
}

// Popup controls for creating a hive
document.getElementById("confirm-create-hive").onclick = async () => {
  const hiveName = document.getElementById("new-hive-name").value.trim();
  if (hiveName) {
    await createHive(hiveName);
  }
  document.getElementById("new-hive-name").value = "";
  document.getElementById("create-hive-popup").classList.add("hidden");
};

document.getElementById("cancel-create-hive").onclick = () => {
  document.getElementById("new-hive-name").value = "";
  document.getElementById("create-hive-popup").classList.add("hidden");
};

