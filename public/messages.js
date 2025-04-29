import { auth, db } from "./app.js";
import { doc, getDoc, setDoc, query, where, collection, getDocs, onSnapshot } from "firebase/firestore";
import { currentChatFriend, unsubscribeChatListener } from "./setup.js";

let chatHistory;
let messageInput;
let sendButton;

export function initializeMessages() {
  chatHistory = document.getElementById("chat-history");
  messageInput = document.getElementById("message");
  sendButton = document.getElementById("send-message");

  sendButton.addEventListener("click", sendMessage);
  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
}

export async function sendMessage() {
  const text = messageInput.value.trim();
  if (text === "") return;

  const friendEmail = window.currentChatFriend;
  if (!friendEmail) return alert("No chat selected!");

  const userId = auth.currentUser.uid;
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.data();

  const timestamp = new Date().toISOString();
  const newMessage = {
    sender: auth.currentUser.email,
    text: text,
    timestamp: timestamp,
  };

  if (!userData.chats[friendEmail].messages) {
    userData.chats[friendEmail].messages = [];
  }
  userData.chats[friendEmail].messages.push(newMessage);
  await setDoc(userRef, userData);

  const friendQuery = query(collection(db, "users"), where("email", "==", friendEmail));
  const friendSnap = await getDocs(friendQuery);
  if (!friendSnap.empty) {
    const friendDoc = friendSnap.docs[0];
    const friendData = friendDoc.data();
    if (!friendData.chats[auth.currentUser.email]) {
      friendData.chats[auth.currentUser.email] = {
        hives: ["All"],
        createdAt: new Date().toISOString(),
        messages: []
      };
    }
    if (!friendData.chats[auth.currentUser.email].messages) {
      friendData.chats[auth.currentUser.email].messages = [];
    }
    friendData.chats[auth.currentUser.email].messages.push(newMessage);
    await setDoc(friendDoc.ref, friendData, { merge: true });
  }

  messageInput.value = "";
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

export function displayMessage(message) {
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message");
  messageDiv.textContent = `${message.sender}: ${message.text}`;
  chatHistory.appendChild(messageDiv);
}

export function openChat(friendEmail) {

  // Shrink chat menu
  const chatMenu = document.getElementById("chat-menu");
  chatMenu.style.width = "20%";

  // Show the chat container
  const chatContainer = document.getElementById("chat-container");
  chatContainer.classList.remove("hidden");
  
  window.currentChatFriend = friendEmail;
  chatHistory.innerHTML = "";

  const userId = auth.currentUser.uid;
  const chatRef = doc(db, "users", userId);

  if (window.unsubscribeChatListener) {
    window.unsubscribeChatListener();
  }

  window.unsubscribeChatListener = onSnapshot(chatRef, (docSnap) => {
    const data = docSnap.data();
    const chat = data.chats?.[friendEmail];
    if (chat && chat.messages) {
      chatHistory.innerHTML = "";
      chat.messages.sort((a, b) => a.timestamp.localeCompare(b.timestamp)).forEach(displayMessage);
    }
  });
}
