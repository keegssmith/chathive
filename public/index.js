import { auth, db } from "./app.js";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

// -----------------------------
// Hive (Folder) Functionality
// -----------------------------

// Default hive object (cannot be deleted)
const defaultHive = {
  Unhived: { default: true, createdAt: new Date().toISOString() }
};

// Load user data and ensure a hives field exists
const loadUserData = async (userId) => {
  const userDocRef = doc(db, "users", userId);
  const userDoc = await getDoc(userDocRef);
  if (userDoc.exists()) {
    let userData = userDoc.data();
    if (!userData.hives) {
      userData.hives = defaultHive;
      await setDoc(userDocRef, userData);
    }
    return userData;
  } else {
    const newData = { hives: defaultHive };
    await setDoc(userDocRef, newData);
    return newData;
  }
};

// Render hives in the chat menu
const renderHives = (hives) => {
  const chatMenu = document.getElementById("chat-menu");
  chatMenu.innerHTML = ""; // Clear previous content

  for (const hiveName in hives) {
    const hiveContainer = document.createElement("div");
    hiveContainer.classList.add("hive-container");

    const hiveButton = document.createElement("button");
    hiveButton.classList.add("hex-container");
    hiveButton.innerHTML = `
      <img src="unselected-button.png" alt="Hive Button" class="button-hive" />
      <span class="hive-text">${hiveName}</span>
    `;

    // Hover effect: change image on mouseover/mouseout
    hiveButton.addEventListener("mouseover", () => {
      const img = hiveButton.querySelector(".button-hive");
      img.src = "selected-button.png";
    });
    hiveButton.addEventListener("mouseout", () => {
      const img = hiveButton.querySelector(".button-hive");
      img.src = "unselected-button.png";
    });

    hiveButton.addEventListener("click", () => loadHiveChats(hiveName));
    hiveContainer.appendChild(hiveButton);

    // Only add a delete button if it's not the default hive
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

  // Create the "Create Hive" button and append it at the bottom
  const createHiveBtn = document.createElement("button");
  createHiveBtn.textContent = "Create Hive";
  createHiveBtn.classList.add("create-hive-btn"); // Optional: add styling via CSS
  createHiveBtn.addEventListener("click", () => {
    const hiveName = prompt("Enter a name for your new hive:");
    if (hiveName) {
      createHive(hiveName);
    }
  });
  chatMenu.appendChild(createHiveBtn);
};

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

// Dummy function to load chats for a given hive
function loadHiveChats(hiveName) {
  alert(`Loading chats for hive: ${hiveName}`);
}

// -----------------------------
// Chat and UI Functionality
// -----------------------------
document.addEventListener("DOMContentLoaded", function () {
  setupChat();
  setupDropdownMenu();
  setupLogoutButton();

  // Load and render user hives when authentication state changes
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log("User logged in:", user.email);
      const userData = await loadUserData(user.uid);
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
