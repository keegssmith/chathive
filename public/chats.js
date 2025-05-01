import { auth, db } from "./app.js";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { renderHives } from "./hives.js";
import { openChat } from "./messages.js";
import { currentUserData } from "./setup.js";

export function renderChats(hiveName, chats) {
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
    document.getElementById("create-hive-popup").classList.remove("hidden");
  });
  

  document.getElementById("chat-button").addEventListener("click", () => {
    document.dispatchEvent(new CustomEvent("openFriendChatPopup"));
  });

  document.getElementById("back-button").addEventListener("click", () => {
    renderHives(currentUserData.hives);
  });

  for (const friendEmail in chats) {
    const chat = chats[friendEmail];
    if (!chat.hives || !chat.hives.includes(hiveName)) continue;

    const chatBtn = document.createElement("button");
    chatBtn.textContent = friendEmail;
    chatBtn.className = "chat-entry";

    chatBtn.addEventListener("click", () => openChat(friendEmail));

    chatBtn.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      showChatContextMenu(e.pageX, e.pageY, friendEmail);
    });
    
    chatMenu.appendChild(chatBtn);
  }
}

export function initializeChats() {
  document.addEventListener("openFriendChatPopup", showFriendChatPopup);
  document.addEventListener("createNewHive", (e) => {
    import("./hives.js").then(module => module.createHive(e.detail.hiveName));
  });
  document.addEventListener("click", () => {
    const menu = document.getElementById("chat-context-menu");
    if (!menu.classList.contains("hidden")) {
      menu.classList.add("hidden");
    }
  });  
    // Create Hive Popup Logic
  document.getElementById("confirm-create-hive").onclick = () => {
    const hiveName = document.getElementById("new-hive-name").value.trim();
    if (hiveName) {
      document.dispatchEvent(new CustomEvent("createNewHive", { detail: { hiveName } }));
    }
    document.getElementById("new-hive-name").value = "";
    document.getElementById("create-hive-popup").classList.add("hidden");
  };

  document.getElementById("cancel-create-hive").onclick = () => {
    document.getElementById("new-hive-name").value = "";
    document.getElementById("create-hive-popup").classList.add("hidden");
  };

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
btn.textContent = friendEmail;

if (alreadyChatted) {
  btn.classList.add("dimmed-chat-button");
  btn.disabled = true;
} else {
  btn.textContent = `Chat with ${friendEmail}`;
  btn.addEventListener("click", () => {
    openCreateChatHivesPopup(friendEmail);
    popup.classList.add("hidden");
  });
}

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
    const selected = Array.from(
      form.querySelectorAll("input[type='checkbox']:checked")
    ).map(cb => cb.value);
    const finalHives = ["All", ...selected];
    const creatorId = auth.currentUser.uid;
    const creatorEmail = auth.currentUser.email;
    const creatorRef = doc(db, "users", creatorId);
    const creatorSnap = await getDoc(creatorRef);
    const creatorData = creatorSnap.data();

    creatorData.chats[friendEmail] = {
      hives: finalHives,
      createdAt: new Date().toISOString()
    };
    await setDoc(creatorRef, creatorData, { merge: true });

    const q = query(
      collection(db, "users"),
      where("email", "==", friendEmail)
    );
    const friendSnap = await getDocs(q);
    if (!friendSnap.empty) {
      const friendDoc = friendSnap.docs[0];
      const friendData = friendDoc.data();
      friendData.chats = friendData.chats || {};
      friendData.chats[creatorEmail] = {
        hives: ["All"],
        createdAt: new Date().toISOString()
      };
      await setDoc(friendDoc.ref, friendData, { merge: true });
    }

    popup.classList.add("hidden");
    import("./setup.js").then(module => {
      module.currentUserData = updated;
      renderHives(updated.hives);
      renderChats("All", updated.chats);

    });
   

  };

  popup.classList.remove("hidden");
}

function showChatContextMenu(x, y, friendEmail) {
  const menu = document.getElementById("chat-context-menu");
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  menu.classList.remove("hidden");

  const editBtn = document.getElementById("edit-hives-btn");
  editBtn.onclick = () => {
    openEditHivesPopup(friendEmail);
    menu.classList.add("hidden");
  };
}

function openEditHivesPopup(friendEmail) {
  const popup = document.getElementById("edit-hives-popup");
  const form = document.getElementById("hive-checkbox-form");
  const saveBtn = document.getElementById("edit-hives-save");
  const cancelBtn = document.getElementById("edit-hives-cancel");

  form.innerHTML = "";

  const allHives = Object.keys(currentUserData.hives || {}).filter(h => h !== "All");
  const currentHives = currentUserData.chats?.[friendEmail]?.hives || [];

  allHives.forEach(hive => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = hive;
    checkbox.checked = currentHives.includes(hive);

    label.appendChild(checkbox);
    label.append(` ${hive}`);
    form.appendChild(label);
  });

  cancelBtn.onclick = () => popup.classList.add("hidden");

  saveBtn.onclick = async () => {
    const selectedHives = Array.from(
      form.querySelectorAll("input[type='checkbox']:checked")
    ).map(cb => cb.value);

    // "All" is not shown, but always included
    const finalHives = ["All", ...selectedHives];

    const userId = auth.currentUser.uid;
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data();

    userData.chats[friendEmail].hives = finalHives;
    await setDoc(userRef, userData, { merge: true });

    // update local state and UI
    currentUserData.chats[friendEmail].hives = finalHives;
    renderHives(currentUserData.hives);
    popup.classList.add("hidden");
  };

  popup.classList.remove("hidden");
}
