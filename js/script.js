
import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut
} from
  "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  onSnapshot,
  writeBatch,
  serverTimestamp
} from
  "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";


// ======================================
// 1. FIREBASE CONFIGURATION
// ======================================

// Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyCW4hXkBZwElR2FmvqiOyRbETzyiXrXips",
    authDomain: "my-little-guguchecklist.firebaseapp.com",
    projectId: "my-little-guguchecklist",
    storageBucket: "my-little-guguchecklist.firebasestorage.app",
    messagingSenderId: "630691137594",
    appId: "1:630691137594:web:74823b1c884ef29e1f0d03"
  };

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

const provider = new GoogleAuthProvider();


// ======================================
// 2. CATEGORIES & DEFAULT ITEMS
// ======================================

const categoryNames = [
  "Bedding",
  "Clothing",
  "Toiletries",
  "Electronics",
  "Daily necessities",
  "Documents & money",
  "Health & safety",
  "Shared room"
];

const starterItems = [
  ["Bedding", "Mattress / sleeping mat"],
  ["Bedding", "Bedsheet"],
  ["Bedding", "Pillow"],
  ["Bedding", "Pillowcase"],
  ["Bedding", "Blanket"],
  ["Bedding", "Mosquito net"],
  ["Bedding", "Small fan"],

  ["Clothing", "Everyday clothes"],
  ["Clothing", "Underwear"],
  ["Clothing", "Bras"],
  ["Clothing", "Pajamas"],
  ["Clothing", "Socks"],
  ["Clothing", "Bath towel"],
  ["Clothing", "Face towel"],
  ["Clothing", "Slippers"],
  ["Clothing", "Shoes"],
  ["Clothing", "Hangers"],
  ["Clothing", "Laundry bag"],

  ["Toiletries", "Toothbrush & toothpaste"],
  ["Toiletries", "Shampoo & conditioner"],
  ["Toiletries", "Body wash / soap"],
  ["Toiletries", "Facial cleanser"],
  ["Toiletries", "Skincare products"],
  ["Toiletries", "Moisturizer"],
  ["Toiletries", "Sunscreen"],
  ["Toiletries", "Comb / hairbrush"],
  ["Toiletries", "Hair ties & clips"],
  ["Toiletries", "Deodorant"],
  ["Toiletries", "Sanitary pads"],
  ["Toiletries", "Tissue & wet wipes"],

  ["Electronics", "Phone"],
  ["Electronics", "Phone charger"],
  ["Electronics", "Power bank"],
  ["Electronics", "Earphones"],
  ["Electronics", "Extension cord (if permitted)"],
  ["Electronics", "Rechargeable fan"],

  ["Daily necessities", "Water bottle"],
  ["Daily necessities", "Water cup"],
  ["Daily necessities", "Umbrella"],
  ["Daily necessities", "Laundry detergent"],
  ["Daily necessities", "Small mirror"],
  ["Daily necessities", "Plastic bags"],
  ["Daily necessities", "Storage box"],
  ["Daily necessities", "Reusable shopping bag"],
  ["Daily necessities", "Spoon and fork"],
  ["Daily necessities", "Food container"],

  ["Documents & money", "NRC / identification"],
  ["Documents & money", "Cash"],
  ["Documents & money", "Bank card"],
  ["Documents & money", "Emergency contact numbers"],

  ["Health & safety", "Personal medication"],
  ["Health & safety", "Basic first-aid supplies"],
  ["Health & safety", "Thermometer"],
  ["Health & safety", "Face masks"],
  ["Health & safety", "Hand sanitizer"],
  ["Health & safety", "Insect repellent"],

  ["Shared room", "Small padlock"],
  ["Shared room", "Personal laundry basket"],
  ["Shared room", "Separate toiletries bag"],
  ["Shared room", "Bedside organizer"],
  ["Shared room", "Clothes hooks"],
  ["Shared room", "Headphones"],
  ["Shared room", "Eye mask"],
  ["Shared room", "Personal valuables pouch"],
  ["Shared room", "Trash bags"]
];


// ======================================
// 3. APPLICATION STATE
// ======================================

let currentUser = null;
let currentRoomId = null;
let roomUnsubscribe = null;

let items = [];
let activeCategory = "All";
let editingId = null;
let statusTimeout = null;


// ======================================
// 4. HTML ELEMENTS
// ======================================

const $ = id => document.getElementById(id);

const loginScreen = $("loginScreen");
const appScreen = $("appScreen");
const roomSetup = $("roomSetup");
const dashboard = $("dashboard");

const googleBtn = $("googleBtn");
const signOutBtn = $("signOutBtn");

const createRoomBtn = $("createRoomBtn");
const joinRoomBtn = $("joinRoomBtn");

const roomCodeInput = $("roomCodeInput");

const categories = $("categories");
const list = $("list");
const search = $("search");

const modal = $("modal");
const itemInput = $("itemInput");
const categoryInput = $("categoryInput");


// ======================================
// 5. STATUS MESSAGE
// ======================================

function showStatus(message) {
  const status = $("status");

  status.textContent = message;
  status.classList.add("show");

  clearTimeout(statusTimeout);

  statusTimeout = setTimeout(() => {
    status.classList.remove("show");
  }, 3000);
}


// ======================================
// 6. ERROR HANDLING
// ======================================

function handleError(error) {
  console.error(error);

  const messages = {
    "auth/unauthorized-domain":
      "This website domain is not authorized in Firebase.",

    "auth/popup-closed-by-user":
      "Google sign-in was cancelled.",

    "permission-denied":
      "You don't have permission to access this checklist.",

    "not-found":
      "The room doesn't exist or its invitation code is invalid.",

    "unavailable":
      "Connection problem. Please try again."
  };

  showStatus(
    messages[error.code] ||
    "Something went wrong. Please try again."
  );
}


// ======================================
// 7. GOOGLE SIGN-IN
// ======================================

googleBtn.addEventListener("click", async () => {
  try {
    googleBtn.disabled = true;
    googleBtn.textContent = "Connecting...";

    // Redirect works better on mobile browsers.
    if (window.matchMedia("(max-width: 700px)").matches) {
      await signInWithRedirect(auth, provider);
    } else {
      await signInWithPopup(auth, provider);
    }

  } catch (error) {
    handleError(error);

    googleBtn.disabled = false;
    googleBtn.textContent = "Continue with Google";
  }
});

getRedirectResult(auth).catch(handleError);


// ======================================
// 8. AUTHENTICATION STATE
// ======================================

onAuthStateChanged(auth, async user => {
  currentUser = user;

  loginScreen.hidden = !!user;
  appScreen.hidden = !user;

  if (!user) {
    stopRoomListener();
    currentRoomId = null;
    dashboard.hidden = true;
    roomSetup.hidden = true;

    return;
  }

  $("userName").textContent =
    user.displayName || "Welcome";

  $("userEmail").textContent =
    user.email || "";

  $("userAvatar").src =
    user.photoURL || "";

  roomSetup.hidden = false;

  const roomFromLink =
    new URLSearchParams(location.search).get("room");

  if (roomFromLink) {
    roomCodeInput.value = roomFromLink;

    await joinRoom(roomFromLink, true);
  }
});

signOutBtn.addEventListener("click", async () => {
  stopRoomListener();

  currentRoomId = null;

  try {
    await signOut(auth);
    showStatus("Signed out successfully.");
  } catch (error) {
    handleError(error);
  }
});


// ======================================
// 9. ROOM REFERENCES
// ======================================

function roomRef(roomId) {
  return doc(db, "rooms", roomId);
}

function memberRef(roomId, uid) {
  return doc(db, "rooms", roomId, "members", uid);
}

function itemsRef(roomId) {
  return collection(db, "rooms", roomId, "items");
}


// ======================================
// 10. CREATE A SHARED ROOM
// ======================================

createRoomBtn.addEventListener("click", createRoom);

async function createRoom() {
  if (!currentUser) return;

  try {
    createRoomBtn.disabled = true;
    createRoomBtn.textContent = "Creating...";

    // Generate an unpredictable invitation code.
    const roomId = crypto.randomUUID()
      .replaceAll("-", "");

    await setDoc(roomRef(roomId), {
      title: "Our little checklist",
      ownerUid: currentUser.uid,
      createdAt: serverTimestamp()
    });

    await setDoc(
      memberRef(roomId, currentUser.uid),
      {
        uid: currentUser.uid,
        displayName: currentUser.displayName || "Owner",
        joinedAt: serverTimestamp()
      }
    );

    // Add the default checklist.
    const batch = writeBatch(db);

    starterItems.forEach(([category, name]) => {
      const item = doc(itemsRef(roomId));

      batch.set(item, {
        name,
        category,
        done: false,
        createdBy: currentUser.uid,
        createdByName: currentUser.displayName || "User",
        updatedBy: currentUser.uid,
        updatedByName: currentUser.displayName || "User",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });

    await batch.commit();

    await openRoom(roomId);

    showStatus("Your shared checklist is ready! ♡");

  } catch (error) {
    handleError(error);

  } finally {
    createRoomBtn.disabled = false;
    createRoomBtn.textContent = "+ Create a new checklist";
  }
}


// ======================================
// 11. JOIN AN EXISTING ROOM
// ======================================

joinRoomBtn.addEventListener("click", () => {
  joinRoom(roomCodeInput.value.trim());
});

async function joinRoom(roomId, fromLink = false) {
  if (!currentUser) return;

  roomId = roomId.replace(/[^a-zA-Z0-9]/g, "");

  if (!roomId || roomId.length > 64) {
    showStatus("Please enter a valid room code.");
    return;
  }

  try {
    joinRoomBtn.disabled = true;
    joinRoomBtn.textContent = "Joining...";

    const membership = memberRef(
      roomId,
      currentUser.uid
    );

    // Check whether this user is already a member.
    const existingMember = await getDoc(membership);

    if (!existingMember.exists()) {
      // Firestore rules verify that the room exists.
      await setDoc(membership, {
        uid: currentUser.uid,
        displayName: currentUser.displayName || "Guest",
        joinedAt: serverTimestamp()
      });
    }

    // Only members can read the room document.
    const roomSnapshot = await getDoc(roomRef(roomId));

    if (!roomSnapshot.exists()) {
      throw new Error("Room not found.");
    }

    await openRoom(roomId);

    if (!fromLink) {
      showStatus("You joined the shared checklist! ♡");
    }

  } catch (error) {
    handleError(error);

  } finally {
    joinRoomBtn.disabled = false;
    joinRoomBtn.textContent = "Join shared checklist";
  }
}


// ======================================
// 12. OPEN ROOM & REAL-TIME SYNC
// ======================================

async function openRoom(roomId) {
  stopRoomListener();

  currentRoomId = roomId;
  activeCategory = "All";

  roomSetup.hidden = true;
  dashboard.hidden = false;

  search.value = "";

  $("roomCodeDisplay").textContent =
    "Room code: " + roomId;

  const newURL = new URL(location.href);

  newURL.searchParams.set("room", roomId);

  history.replaceState({}, "", newURL);

  const roomItems = itemsRef(roomId);

  roomUnsubscribe = onSnapshot(
    roomItems,

    snapshot => {
      items = snapshot.docs.map(document => ({
        id: document.id,
        ...document.data()
      }));

      items.sort((a, b) =>
        (a.name || "").localeCompare(b.name || "")
      );

      renderCategories();
      renderItems();
      updateProgress();
      updateActivity();
    },

    error => {
      handleError(error);
    }
  );
}

function stopRoomListener() {
  if (roomUnsubscribe) {
    roomUnsubscribe();
    roomUnsubscribe = null;
  }
}


// ======================================
// 13. CATEGORY FILTERS
// ======================================

function renderCategories() {
  categories.innerHTML = "";

  const allCategories = ["All", ...categoryNames];

  allCategories.forEach(category => {
    const button = document.createElement("button");

    button.className =
      "category-btn" +
      (activeCategory === category ? " active" : "");

    button.textContent = category;

    button.addEventListener("click", () => {
      activeCategory = category;

      renderCategories();
      renderItems();
    });

    categories.appendChild(button);
  });
}


// ======================================
// 14. RENDER CHECKLIST
// ======================================

function renderItems() {
  list.innerHTML = "";

  const query = search.value.toLowerCase();

  const filtered = items.filter(item =>
    (activeCategory === "All" ||
      item.category === activeCategory) &&
    item.name.toLowerCase().includes(query)
  );

  $("listTitle").textContent =
    activeCategory === "All"
      ? "Your checklist"
      : activeCategory;

  $("itemCount").textContent =
    filtered.length + " items";

  if (!filtered.length) {
    const empty = document.createElement("div");

    empty.className = "empty";
    empty.textContent = "No items found. ♡";

    list.appendChild(empty);
    return;
  }

  filtered.forEach(item => {
    const row = document.createElement("div");

    row.className =
      "item" + (item.done ? " done" : "");

    const checkbox = document.createElement("input");

    checkbox.type = "checkbox";
    checkbox.checked = !!item.done;
    checkbox.setAttribute(
      "aria-label",
      "Mark " + item.name + " complete"
    );

    checkbox.addEventListener("change", () => {
      changeItem(item.id, {
        done: checkbox.checked
      });
    });

    const details = document.createElement("div");
    details.className = "item-name";

    const name = document.createElement("div");
    name.textContent = item.name;

    const meta = document.createElement("div");
    meta.className = "item-meta";

    meta.textContent =
      "Updated by " +
      (item.updatedByName || "Someone");

    details.append(name, meta);

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const edit = document.createElement("button");

    edit.className = "icon-btn";
    edit.textContent = "Edit";

    edit.addEventListener("click", () => {
      openModal(item.id);
    });

    const remove = document.createElement("button");

    remove.className = "icon-btn";
    remove.textContent = "Delete";

    remove.addEventListener("click", () => {
      removeItem(item.id);
    });

    actions.append(edit, remove);

    row.append(checkbox, details, actions);

    list.appendChild(row);
  });
}


// ======================================
// 15. PROGRESS BAR
// ======================================

function updateProgress() {
  const total = items.length;

  const completed =
    items.filter(item => item.done).length;

  const percentage = total
    ? Math.round((completed / total) * 100)
    : 0;

  $("percentage").textContent =
    percentage + "%";

  $("progress").style.width =
    percentage + "%";

  $("progressText").textContent =
    `${completed} of ${total} items completed`;
}


// ======================================
// 16. ADD / EDIT MODAL
// ======================================

function openModal(id = null) {
  editingId = id;

  categoryInput.innerHTML = "";

  categoryNames.forEach(category => {
    const option = document.createElement("option");

    option.value = category;
    option.textContent = category;

    categoryInput.appendChild(option);
  });

  if (id) {
    const item = items.find(i => i.id === id);

    if (!item) return;

    $("modalTitle").textContent = "Edit item";

    itemInput.value = item.name;
    categoryInput.value = item.category;

  } else {
    $("modalTitle").textContent = "Add a new item";

    itemInput.value = "";

    categoryInput.value =
      activeCategory === "All"
        ? "Bedding"
        : activeCategory;
  }

  modal.classList.add("show");
  itemInput.focus();
}

function closeModal() {
  modal.classList.remove("show");
  editingId = null;
}

$("addBtn").addEventListener("click", () => {
  openModal();
});

$("cancelBtn").addEventListener("click", closeModal);

$("saveBtn").addEventListener("click", saveItem);

itemInput.addEventListener("keydown", event => {
  if (event.key === "Enter") saveItem();
});

async function saveItem() {
  if (!currentRoomId || !currentUser) return;

  const name = itemInput.value.trim();
  const category = categoryInput.value;

  if (!name) {
    showStatus("Please enter an item name.");
    return;
  }

  try {
    $("saveBtn").disabled = true;

    const userName =
      currentUser.displayName || "User";

    if (editingId) {
      await changeItem(editingId, {
        name,
        category
      }, false);

    } else {
      await addDoc(itemsRef(currentRoomId), {
        name,
        category,
        done: false,
        createdBy: currentUser.uid,
        createdByName: userName,
        updatedBy: currentUser.uid,
        updatedByName: userName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    closeModal();

    showStatus(
      editingId
        ? "Item updated! ♡"
        : "New item added! ♡"
    );

  } catch (error) {
    handleError(error);

  } finally {
    $("saveBtn").disabled = false;
  }
}


// ======================================
// 17. UPDATE ITEM
// ======================================

async function changeItem(id, changes, notify = true) {
  if (!currentRoomId || !currentUser) return;

  try {
    const itemDocument = doc(
      db,
      "rooms",
      currentRoomId,
      "items",
      id
    );

    await updateDoc(itemDocument, {
      ...changes,
      updatedBy: currentUser.uid,
      updatedByName: currentUser.displayName || "User",
      updatedAt: serverTimestamp()
    });

    if (notify) {
      showStatus("Checklist updated! ♡");
    }

  } catch (error) {
    handleError(error);
  }
}


// ======================================
// 18. DELETE ITEM
// ======================================

async function removeItem(id) {
  if (!currentRoomId) return;

  const item = items.find(i => i.id === id);

  if (!item) return;

  if (!confirm(`Delete "${item.name}"?`)) return;

  try {
    await deleteDoc(
      doc(db, "rooms", currentRoomId, "items", id)
    );

    showStatus("Item deleted.");

  } catch (error) {
    handleError(error);
  }
}


// ======================================
// 19. SEARCH
// ======================================

search.addEventListener("input", renderItems);


// ======================================
// 20. SHARE ROOM
// ======================================

$("shareBtn").addEventListener("click", async () => {
  if (!currentRoomId) return;

  const link = new URL(location.href);

  link.searchParams.set("room", currentRoomId);

  try {
    await navigator.clipboard.writeText(link.href);

    showStatus("Invitation link copied! Send it to her ♡");

  } catch (error) {
    showStatus("Copy this room code: " + currentRoomId);
  }
});


// ======================================
// 21. LEAVE ROOM
// ======================================

$("leaveRoomBtn").addEventListener("click", () => {
  if (!confirm("Leave this shared checklist?")) return;

  stopRoomListener();

  currentRoomId = null;
  items = [];
  activeCategory = "All";

  dashboard.hidden = true;
  roomSetup.hidden = false;

  const newURL = new URL(location.href);

  newURL.searchParams.delete("room");

  history.replaceState({}, "", newURL);

  showStatus("You left the checklist.");
});


// ======================================
// 22. RESET PROGRESS
// ======================================

$("resetBtn").addEventListener("click", async () => {
  if (!currentRoomId) return;

  if (!confirm("Uncheck ALL items in this shared checklist?")) {
    return;
  }

  try {
    const batch = writeBatch(db);

    items
      .filter(item => item.done)
      .forEach(item => {
        batch.update(
          doc(db, "rooms", currentRoomId, "items", item.id),
          {
            done: false,
            updatedBy: currentUser.uid,
            updatedByName:
              currentUser.displayName || "User",
            updatedAt: serverTimestamp()
          }
        );
      });

    await batch.commit();

    showStatus("Progress reset.");

  } catch (error) {
    handleError(error);
  }
});


// ======================================
// 23. DOWNLOAD CHECKLIST
// ======================================

$("downloadBtn").addEventListener("click", () => {
  const content = categoryNames.map(category => {
    const group = items.filter(
      item => item.category === category
    );

    if (!group.length) return "";

    return category + "\n" +
      group.map(item =>
        `${item.done ? "[x]" : "[ ]"} ${item.name}`
      ).join("\n");

  }).filter(Boolean).join("\n\n");

  const blob = new Blob([content], {
    type: "text/plain;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = "dorm-checklist.txt";

  link.click();

  URL.revokeObjectURL(url);
});

$("printBtn").addEventListener("click", () => {
  window.print();
});


// ======================================
// 24. LAST ACTIVITY
// ======================================

function updateActivity() {
  const latest = [...items].sort((a, b) => {
    const aTime = a.updatedAt?.toMillis?.() || 0;
    const bTime = b.updatedAt?.toMillis?.() || 0;

    return bTime - aTime;
  })[0];

  if (!latest) {
    $("activityText").textContent =
      "No activity yet.";
    return;
  }

  const date = latest.updatedAt?.toDate?.();

  $("activityText").textContent =
    `Last update: ${latest.updatedByName || "Someone"} — ${latest.name}` +
    (date ? " · " + date.toLocaleString() : "");
}
