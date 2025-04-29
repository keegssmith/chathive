import { initializePage } from "./setup.js";
import { initializeChats } from "./chats.js";
import { initializeMessages } from "./messages.js";

document.addEventListener("DOMContentLoaded", async () => {
  await initializePage();
  initializeChats();
  initializeMessages();
});
