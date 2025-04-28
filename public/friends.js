import { auth, db } from "./app.js";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
    doc, getDoc, updateDoc, query,
    where, collection, getDocs,
    arrayUnion, arrayRemove,
    deleteField, FieldPath
} from "firebase/firestore";

// DOM elements
const form = document.getElementById('add-friend-form');
const input = document.getElementById('friend-name');
const friendsList = document.getElementById('friends-list');
const requestList = document.getElementById('incoming-requests');
const outgoingList = document.getElementById('outgoing-requests');

let currentUserRef = null;
let currentUserEmail = null;

// Helper: render a confirmed friend entry
function renderFriend(email) {
    const li = document.createElement("li");
    li.className = "friend-item";
    const nameSpan = document.createElement("span");
    nameSpan.className = "friend-name";
    nameSpan.textContent = email;
    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.className = "remove-btn";
    removeBtn.onclick = () => removeFriend(email);
    const actions = document.createElement("div");
    actions.className = "friend-actions";
    actions.appendChild(removeBtn);
    li.append(nameSpan, actions);
    friendsList.appendChild(li);
}

// Helper: render an incoming request with Accept/Decline
function renderRequest(email) {
    const li = document.createElement("li");
    li.className = "friend-item";
    const span = document.createElement("span");
    span.className = "friend-name";
    span.textContent = email;
    const actions = document.createElement("div");
    actions.className = "friend-actions";
    const acceptBtn = document.createElement("button");
    acceptBtn.textContent = "Accept";
    acceptBtn.className = "friend-btn";
    acceptBtn.onclick = () => acceptRequest(email);
    const declineBtn = document.createElement("button");
    declineBtn.textContent = "Decline";
    declineBtn.className = "friend-btn";
    declineBtn.onclick = () => declineRequest(email);
    actions.append(acceptBtn, declineBtn);
    li.append(span, actions);
    requestList.append(li);
}

// Helper: render an outgoing request
function renderOutgoing(email) {
    const li = document.createElement("li");
    li.className = "friend-item";
    const span = document.createElement("span");
    span.className = "friend-name";
    span.textContent = `${email} (Pending…)`;
    li.appendChild(span);
    outgoingList.appendChild(li);
}

// Lookup a user document by email
async function userExistsByEmail(email) {
    const q = query(collection(db, "users"), where("email", "==", email));
    const snap = await getDocs(q);
    return snap.empty ? null : snap.docs[0];
}

// Accept a friend request (no chat creation)
async function acceptRequest(senderEmail) {
    try {
    await updateDoc(currentUserRef, {
        friends: arrayUnion(senderEmail),
        "friendRequests.incoming": arrayRemove(senderEmail)
    });
    const senderDoc = await userExistsByEmail(senderEmail);
    if (senderDoc) {
        await updateDoc(senderDoc.ref, {
        friends: arrayUnion(currentUserEmail),
        "friendRequests.outgoing": arrayRemove(currentUserEmail)
        });
    }
    location.reload();
    } catch (err) {
    console.error("acceptRequest error:", err);
    alert("Error accepting request: " + err.message);
    }
}

// Remove a friend and delete all chats from both users
async function removeFriend(email) {
    if (!confirm(`Remove ${email} and delete all chat history?`)) return;

    try {
    
    await updateDoc(
        currentUserRef,
        // delete the map entry at chats.email
        new FieldPath("chats", email), deleteField(),
        // then remove them from your friends array
        "friends", arrayRemove(email)
    );

    
    const friendDoc = await userExistsByEmail(email);
    if (friendDoc) {
        await updateDoc(
        friendDoc.ref,
        new FieldPath("chats", currentUserEmail), deleteField(),
        "friends", arrayRemove(currentUserEmail)
        );
    }

    alert(`${email} removed; chat history wiped.`);
    location.reload();
    } catch (err) {
    console.error("removeFriend error:", err);
    alert("Error removing friend: " + err.message);
    }
}

// Decline an incoming request
async function declineRequest(senderEmail) {
    if (!confirm(`Decline ${senderEmail}’s request?`)) return;
    try {
    await updateDoc(currentUserRef, {
        "friendRequests.incoming": arrayRemove(senderEmail)
    });
    const senderDoc = await userExistsByEmail(senderEmail);
    if (senderDoc) {
        await updateDoc(senderDoc.ref, {
        "friendRequests.outgoing": arrayRemove(currentUserEmail)
        });
    }
    location.reload();
    } catch (err) {
    console.error("declineRequest error:", err);
    alert("Error declining request: " + err.message);
    }
}

// Dropdown menu toggling
function setupDropdownMenu() {
    const btn = document.getElementById("menu-button");
    const menu = document.getElementById("menu-dropdown");
    btn.addEventListener("click", e => { 
    e.stopPropagation(); 
    menu.classList.toggle("hidden"); 
    });
    document.addEventListener("click", e => {
    if (!btn.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.add("hidden");
    }
    });
}

// Logout button
function setupLogoutButton() {
    document.getElementById("logout-button")
    .addEventListener("click", () =>
        signOut(auth)
        .then(() => alert("Logged out"))
        .catch(err => alert(err.message))
    );
}

// Initialization on page load
document.addEventListener("DOMContentLoaded", () => {
    setupDropdownMenu();
    setupLogoutButton();

    onAuthStateChanged(auth, async user => {
    if (!user) return window.location.href = "auth.html";
    currentUserEmail = user.email;
    currentUserRef = doc(db, "users", user.uid);
    const snap = await getDoc(currentUserRef);
    const data = snap.data();
    (data.friendRequests?.incoming || []).forEach(renderRequest);
    (data.friendRequests?.outgoing || []).forEach(renderOutgoing);
    (data.friends || []).forEach(renderFriend);
    });

    // Send a friend request
    form.addEventListener("submit", async e => {
    e.preventDefault();
    const email = input.value.trim().toLowerCase();
    if (!email || email === currentUserEmail) return alert("Invalid email");

    const target = await userExistsByEmail(email);
    if (!target) return alert("User not found");

    const snap = await getDoc(currentUserRef);
    const fr = snap.data().friendRequests || {};
    const outgoing = fr.outgoing || [];
    if (outgoing.includes(email)) return alert("Request already sent");

    await updateDoc(currentUserRef, {
        "friendRequests.outgoing": arrayUnion(email)
    });
    await updateDoc(target.ref, {
        "friendRequests.incoming": arrayUnion(currentUserEmail)
    });

    renderOutgoing(email);
    input.value = "";
    });
});