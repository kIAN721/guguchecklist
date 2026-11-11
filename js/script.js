import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";

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

const firebaseConfig = {
  apiKey: "AIzaSyCW4hXkBZwElR2FmvqiOyRbETzyiXrXips",
  authDomain: "my-little-guguchecklist.firebaseapp.com",
  projectId: "my-little-guguchecklist",
  storageBucket: "my-little-guguchecklist.firebasestorage.app",
  messagingSenderId: "630691137594",
  appId: "1:630691137594:web:74823b1c884ef29e1f0d03"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Every phone/browser connects to this exact same cloud checklist!
const GLOBAL_ROOM_ID = "gugu-shared-checklist";
const NAME_STORAGE_KEY = "gugu_checklist_username";


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
// 3. APPLICATION STATE & ELEMENTS
// ======================================

let currentUserName = localStorage.getItem(NAME_STORAGE_KEY) || "Gu Gu";
let items = [];
let activeCategory = "All";
let editingId = null;
let statusTimeout = null;

const $ = id => document.getElementById(id);

const categories = $("categories");
const list = $("list");
const search = $("search");
const modal = $("modal");
const itemInput = $("itemInput");
const categoryInput = $("categoryInput");


// ======================================
// 4. STATUS & ERROR HANDLING
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

function handleError(error) {
  console.error(error);
  if (error.code === "permission-denied") {
    showStatus("Please set Firestore Rules to 'allow read, write: if true;' in Firebase Console.");
  } else {
    showStatus("Connection problem. Please check your internet.");
  }
}


// ======================================
// 5. USER DISPLAY NAME
// ======================================

function updateNameUI() {
  $("userName").textContent = currentUserName + " ♡";
  $("userAvatar").textContent = currentUserName.charAt(0).toUpperCase();
}

$("changeNameBtn").addEventListener("click", () => {
  const newName = prompt("Enter your name (shown when you check off items):", currentUserName);
  if (newName && newName.trim()) {
    currentUserName = newName.trim();
    localStorage.setItem(NAME_STORAGE_KEY, currentUserName);
    updateNameUI();
    showStatus("Name updated to " + currentUserName + " ♡");
  }
});


// ======================================
// 6. AUTO-INITIALIZE GLOBAL CLOUD ROOM
// ======================================

function roomRef() {
  return doc(db, "rooms", GLOBAL_ROOM_ID);
}

function itemsRef() {
  return collection(db, "rooms", GLOBAL_ROOM_ID, "items");
}

async function initGlobalChecklist() {
  updateNameUI();

  try {
    const snapshot = await getDoc(roomRef());

    // First time ever opening the app: seed the starter items in the cloud
    if (!snapshot.exists()) {
      await setDoc(roomRef(), {
        title: "Our little checklist",
        createdAt: serverTimestamp()
      });

      const batch = writeBatch(db);
      starterItems.forEach(([category, name]) => {
        const itemDoc = doc(itemsRef());
        batch.set(itemDoc, {
          name,
          category,
          done: false,
          updatedByName: currentUserName,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();
    }

    // Listen to real-time updates from any phone or computer
    onSnapshot(
      itemsRef(),
      snap => {
        items = snap.docs.map(document => ({
          id: document.id,
          ...document.data()
        }));

        items.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

        renderCategories();
        renderItems();
        updateProgress();
        updateActivity();
      },
      error => handleError(error)
    );

  } catch (error) {
    handleError(error);
  }
}


// ======================================
// 7. RENDER CATEGORIES & CHECKLIST
// ======================================

function renderCategories() {
  categories.innerHTML = "";
  const allCategories = ["All", ...categoryNames];

  allCategories.forEach(category => {
    const button = document.createElement("button");
    button.className = "category-btn" + (activeCategory === category ? " active" : "");
    button.textContent = category;

    button.addEventListener("click", () => {
      activeCategory = category;
      renderCategories();
      renderItems();
    });

    categories.appendChild(button);
  });
}

function renderItems() {
  list.innerHTML = "";
  const query = search.value.toLowerCase();

  const filtered = items.filter(item =>
    (activeCategory === "All" || item.category === activeCategory) &&
    item.name.toLowerCase().includes(query)
  );

  $("listTitle").textContent = activeCategory === "All" ? "Your checklist" : activeCategory;
  $("itemCount").textContent = filtered.length + " items";

  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No items found. ♡";
    list.appendChild(empty);
    return;
  }

  filtered.forEach(item => {
    const row = document.createElement("div");
    row.className = "item" + (item.done ? " done" : "");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = !!item.done;
    checkbox.setAttribute("aria-label", "Mark " + item.name + " complete");

    checkbox.addEventListener("change", () => {
      changeItem(item.id, { done: checkbox.checked });
    });

    const details = document.createElement("div");
    details.className = "item-name";

    const name = document.createElement("div");
    name.textContent = item.name;

    const meta = document.createElement("div");
    meta.className = "item-meta";
    meta.textContent = "Updated by " + (item.updatedByName || "Gu Gu");

    details.append(name, meta);

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const edit = document.createElement("button");
    edit.className = "icon-btn";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => openModal(item.id));

    const remove = document.createElement("button");
    remove.className = "icon-btn";
    remove.textContent = "Delete";
    remove.addEventListener("click", () => removeItem(item.id));

    actions.append(edit, remove);
    row.append(checkbox, details, actions);
    list.appendChild(row);
  });
}


// ======================================
// 8. PROGRESS BAR
// ======================================

function updateProgress() {
  const total = items.length;
  const completed = items.filter(item => item.done).length;
  const percentage = total ? Math.round((completed / total) * 100) : 0;

  $("percentage").textContent = percentage + "%";
  $("progress").style.width = percentage + "%";
  $("progressText").textContent = `${completed} of ${total} items completed`;
}


// ======================================
// 9. ADD / EDIT / DELETE ITEMS
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
    categoryInput.value = activeCategory === "All" ? "Bedding" : activeCategory;
  }

  modal.classList.add("show");
  itemInput.focus();
}

function closeModal() {
  modal.classList.remove("show");
  editingId = null;
}

$("addBtn").addEventListener("click", () => openModal());
$("cancelBtn").addEventListener("click", closeModal);
$("saveBtn").addEventListener("click", saveItem);

itemInput.addEventListener("keydown", event => {
  if (event.key === "Enter") saveItem();
});

async function saveItem() {
  const name = itemInput.value.trim();
  const category = categoryInput.value;

  if (!name) {
    showStatus("Please enter an item name.");
    return;
  }

  try {
    $("saveBtn").disabled = true;

    if (editingId) {
      await changeItem(editingId, { name, category }, false);
    } else {
      await addDoc(itemsRef(), {
        name,
        category,
        done: false,
        updatedByName: currentUserName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    closeModal();
    showStatus(editingId ? "Item updated! ♡" : "New item added! ♡");
  } catch (error) {
    handleError(error);
  } finally {
    $("saveBtn").disabled = false;
  }
}

async function changeItem(id, changes, notify = true) {
  try {
    const itemDocument = doc(db, "rooms", GLOBAL_ROOM_ID, "items", id);
    await updateDoc(itemDocument, {
      ...changes,
      updatedByName: currentUserName,
      updatedAt: serverTimestamp()
    });

    if (notify) showStatus("Saved! ♡");
  } catch (error) {
    handleError(error);
  }
}

async function removeItem(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;

  if (!confirm(`Delete "${item.name}"?`)) return;

  try {
    await deleteDoc(doc(db, "rooms", GLOBAL_ROOM_ID, "items", id));
    showStatus("Item deleted.");
  } catch (error) {
    handleError(error);
  }
}


// ======================================
// 10. GLOBAL RESETS, SEARCH & DOWNLOAD
// ======================================

search.addEventListener("input", renderItems);

// Uncheck all items
$("resetBtn").addEventListener("click", async () => {
  if (!confirm("Uncheck ALL items in this checklist?")) return;

  try {
    const batch = writeBatch(db);
    items
      .filter(item => item.done)
      .forEach(item => {
        batch.update(doc(db, "rooms", GLOBAL_ROOM_ID, "items", item.id), {
          done: false,
          updatedByName: currentUserName,
          updatedAt: serverTimestamp()
        });
      });

    await batch.commit();
    showStatus("All items unchecked! ♡");
  } catch (error) {
    handleError(error);
  }
});

// Global Reset: Restores all original starter items
$("restoreDefaultBtn").addEventListener("click", async () => {
  if (!confirm("Global Reset: Restore all original default items and uncheck everything?")) {
    return;
  }

  try {
    const batch = writeBatch(db);

    items.forEach(item => {
      batch.delete(doc(db, "rooms", GLOBAL_ROOM_ID, "items", item.id));
    });

    starterItems.forEach(([category, name]) => {
      const newItemRef = doc(itemsRef());
      batch.set(newItemRef, {
        name,
        category,
        done: false,
        updatedByName: currentUserName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });

    await batch.commit();
    showStatus("Checklist completely reset to default! ♡");
  } catch (error) {
    handleError(error);
  }
});

$("downloadBtn").addEventListener("click", () => {
  const content = categoryNames.map(category => {
    const group = items.filter(item => item.category === category);
    if (!group.length) return "";

    return category + "\n" +
      group.map(item => `${item.done ? "[x]" : "[ ]"} ${item.name}`).join("\n");
  }).filter(Boolean).join("\n\n");

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
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

function updateActivity() {
  const latest = [...items].sort((a, b) => {
    const aTime = a.updatedAt?.toMillis?.() || 0;
    const bTime = b.updatedAt?.toMillis?.() || 0;
    return bTime - aTime;
  })[0];

  if (!latest) {
    $("activityText").textContent = "No activity yet.";
    return;
  }

  const date = latest.updatedAt?.toDate?.();

  $("activityText").textContent =
    `Last update: ${latest.updatedByName || "Gu Gu"} — ${latest.name}` +
    (date ? " · " + date.toLocaleString() : "");
}

// Start immediately on page load!
initGlobalChecklist();