import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";

import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot
} from
  "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";


// ======================================
// 1. FIREBASE CLOUD CONFIGURATION
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

// Single cloud document that holds the entire checklist for all phones
const sharedDocRef = doc(db, "shared_checklists", "gugu_main_list");
const STORAGE_KEY = "gugu_dorm_checklist_v1";


// ======================================
// 2. CATEGORIES & YOUR 59 DEFAULT ITEMS
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
// 3. BUILD & SYNC ITEMS (LOCAL + CLOUD)
// ======================================

function buildDefaultList() {
  return starterItems.map(([category, name], index) => ({
    id: "item_" + index,
    category,
    name,
    done: false
  }));
}

function loadLocalItems() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn(e);
  }
  return buildDefaultList();
}

let items = loadLocalItems();
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

// Save changes to both phone storage AND Firebase Cloud
async function saveAndSync() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn(e);
  }

  renderCategories();
  renderItems();
  updateProgress();

  try {
    await setDoc(sharedDocRef, {
      items,
      updatedAt: new Date().toISOString()
    });
    $("activityText").textContent = "Synced across all phones ♡";
  } catch (err) {
    console.warn("Cloud sync waiting for Firestore rules:", err.message);
    $("activityText").textContent = "Saved on this device ♡";
  }
}

// Listen for live changes when someone adds/checks an item on another phone
onSnapshot(
  sharedDocRef,
  snapshot => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      if (Array.isArray(data.items) && data.items.length > 0) {
        items = data.items;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        renderCategories();
        renderItems();
        updateProgress();
        $("activityText").textContent = "Live synced across all phones ♡";
      }
    } else {
      // First time connecting to cloud: upload the 59 default items
      saveAndSync();
    }
  },
  err => {
    console.warn("Using local mode until Firestore rules allow public read/write:", err.message);
  }
);


// ======================================
// 4. STATUS POPUP MESSAGE
// ======================================

function showStatus(message) {
  const status = $("status");
  status.textContent = message;
  status.classList.add("show");

  clearTimeout(statusTimeout);
  statusTimeout = setTimeout(() => {
    status.classList.remove("show");
  }, 2500);
}


// ======================================
// 5. RENDER CATEGORIES & CHECKLIST
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

    checkbox.addEventListener("change", () => {
      item.done = checkbox.checked;
      saveAndSync();
    });

    const details = document.createElement("div");
    details.className = "item-name";

    const name = document.createElement("div");
    name.textContent = item.name;

    const meta = document.createElement("div");
    meta.className = "item-meta";
    meta.textContent = item.category;

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
    remove.addEventListener("click", () => {
      if (!confirm(`Delete "${item.name}"?`)) return;
      items = items.filter(i => i.id !== item.id);
      saveAndSync();
      showStatus("Item deleted.");
    });

    actions.append(edit, remove);
    row.append(checkbox, details, actions);
    list.appendChild(row);
  });
}


// ======================================
// 6. PROGRESS BAR
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
// 7. ADD / EDIT ITEM MODAL
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

function saveItem() {
  const name = itemInput.value.trim();
  const category = categoryInput.value;

  if (!name) {
    showStatus("Please enter an item name.");
    return;
  }

  if (editingId) {
    const target = items.find(i => i.id === editingId);
    if (target) {
      target.name = name;
      target.category = category;
    }
    showStatus("Item updated! ♡");
  } else {
    items.push({
      id: "item_" + Date.now(),
      name,
      category,
      done: false
    });
    showStatus("New item added! ♡");
  }

  closeModal();
  saveAndSync();
}


// ======================================
// 8. BUTTONS: SEARCH, RESET, DOWNLOAD, PRINT
// ======================================

search.addEventListener("input", renderItems);

$("resetBtn").addEventListener("click", () => {
  if (!confirm("Uncheck ALL items?")) return;
  items.forEach(item => { item.done = false; });
  saveAndSync();
  showStatus("All items unchecked! ♡");
});

$("restoreDefaultBtn").addEventListener("click", () => {
  if (!confirm("Restore all 59 original default items?")) return;
  items = buildDefaultList();
  saveAndSync();
  showStatus("Default checklist restored! ♡");
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

// Render all 59 items immediately on startup!
renderCategories();
renderItems();
updateProgress();