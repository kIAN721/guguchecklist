import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";

import {
  initializeFirestore,
  doc,
  setDoc,
  onSnapshot
} from
  "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";


// ======================================
// 1. FIREBASE CLOUD CONFIG
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

const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});

const sharedDocRef = doc(db, "rooms", "gugu_shared_main");
const STORAGE_KEY = "gugu_dorm_checklist_v4";


// ======================================
// 2. CATEGORIES, ICONS & 54 CUSTOM ITEMS
// ======================================

const categoryNames = [
  "Bedding",
  "Clothing",
  "Toiletries",
  "Electronics",
  "Daily necessities",
  "Documents & money",
  "Health & safety",
  "Foods"
];

const categoryIcons = {
  "All": "🍓",
  "Bedding": "🛏️",
  "Clothing": "👗",
  "Toiletries": "🧴",
  "Electronics": "🎧",
  "Daily necessities": "🧺",
  "Documents & money": "🪪",
  "Health & safety": "🩹",
  "Foods": "🍵"
};

const starterItems = [
  // Bedding
  ["Bedding", "ခြင်ထောင် (optional)"],
  ["Bedding", "ခေါင်းအုံး"],
  ["Bedding", "ခေါင်းအုံးစွပ်"],
  ["Bedding", "စောင်"],
  ["Bedding", "ဖျာ"],
  ["Bedding", "အိပ်ယာခင်း"],

  // Clothing
  ["Clothing", "Bath towel"],
  ["Clothing", "Everyday clothes"],
  ["Clothing", "Face towel"],
  ["Clothing", "Other personal uses clothes"],
  ["Clothing", "အင်္ကျီချိတ်"],
  ["Clothing", "အနွေးထည်ပါးပါး"],

  // Toiletries
  ["Toiletries", "Body lotion"],
  ["Toiletries", "Body wash / soap"],
  ["Toiletries", "Comb / hairbrush"],
  ["Toiletries", "Facial cleanser"],
  ["Toiletries", "Hair ties & clips (အပိုတွေလည်းထည့်သွားပါ)"],
  ["Toiletries", "Moisturizer"],
  ["Toiletries", "Other personal body products"],
  ["Toiletries", "Shampoo & conditioner"],
  ["Toiletries", "Skincare products"],
  ["Toiletries", "Sunscreen"],
  ["Toiletries", "Tissue & Wet Tissues"],
  ["Toiletries", "Toothbrush & toothpaste"],

  // Electronics
  ["Electronics", "Airpods"],
  ["Electronics", "Extension cord"],
  ["Electronics", "Laptop and laptop charger (optional)"],
  ["Electronics", "Phone and phone charger"],
  ["Electronics", "Power bank and power bank charger"],
  ["Electronics", "Rechargeable fan"],
  ["Electronics", "Table lamp and charger"],

  // Daily necessities
  ["Daily necessities", "Plastic bags"],
  ["Daily necessities", "ကတ်ကြေး"],
  ["Daily necessities", "ထီး"],
  ["Daily necessities", "ပန်းကန် နဲ့ ဇွန်း"],
  ["Daily necessities", "ပန်းကန်ဆေးဆပ်ပြာနဲ့ ရေမြှုပ်"],
  ["Daily necessities", "ပလတ်စတစ်ကြိုး"],
  ["Daily necessities", "မှန်သေးသေးလေး"],
  ["Daily necessities", "ရေချိုးရန်ရေခွက်"],
  ["Daily necessities", "ရေခွက် နဲ့ ရေဘူး"],
  ["Daily necessities", "သော့နဲ့သော့ခလောက် (optional)"],
  ["Daily necessities", "အဝတ်လျှော်ဆပ်ပြာနဲ့ brush"],

  // Documents & money
  ["Documents & money", "ကျောင်းသားကဒ်"],
  ["Documents & money", "စာအုပ်အကြမ်း၊ ကျက်ရမဲ့စာရွက်တွေ"],
  ["Documents & money", "ပိုက်ဆံ"],
  ["Documents & money", "ဘောပင်၊ ခဲတံ၊ ခဲဖျက်၊ ခဲဆံ"],
  ["Documents & money", "အဆောင်မှာနေဖို့ချလန်"],

  // Health & safety
  ["Health & safety", "Air fresher (optional)"],
  ["Health & safety", "Basic first-aid supplies (Hansa plast, Betadine, Cotton,...)"],
  ["Health & safety", "Hand sanitizer (optional)"],
  ["Health & safety", "Insect repellent"],
  ["Health & safety", "Personal medication (Enervon C, Cetrine, Paracetamol,...)"],
  ["Health & safety", "ခြင်မကိုက်ဆေးရည်"],
  ["Health & safety", "ရှူဆေး (optional)"],

  // Foods
  ["Foods", "Instant noodles"],
  ["Foods", "3-in-1 Coffee / Tea mix"],
  ["Foods", "Snacks & biscuits"],
  ["Foods", "Drinking water bottles"]
];


// ======================================
// 3. AUTOMATIC SORTING BY CATEGORY & NAME
// ======================================

function sortItems(listToSort) {
  listToSort.sort((a, b) => {
    const catA = categoryNames.indexOf(a.category);
    const catB = categoryNames.indexOf(b.category);

    const validCatA = catA === -1 ? 999 : catA;
    const validCatB = catB === -1 ? 999 : catB;

    if (validCatA !== validCatB) {
      return validCatA - validCatB;
    }

    if (Boolean(a.done) !== Boolean(b.done)) {
      return a.done ? 1 : -1;
    }

    const nameA = (a.name || "").trim();
    const nameB = (b.name || "").trim();

    return nameA.localeCompare(nameB, undefined, {
      numeric: true,
      sensitivity: "base"
    });
  });
}


// ======================================
// 4. BUILD & SYNC ITEMS (LOCAL + CLOUD)
// ======================================

function buildDefaultList() {
  const list = starterItems.map(([category, name], index) => ({
    id: "item_" + index,
    category,
    name,
    done: false
  }));
  sortItems(list);
  return list;
}

function loadLocalItems() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        sortItems(parsed);
        return parsed;
      }
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
let faceTimeout = null;

const $ = id => document.getElementById(id);

const categories = $("categories");
const list = $("list");
const search = $("search");
const modal = $("modal");
const itemInput = $("itemInput");
const categoryInput = $("categoryInput");
const activityText = $("activityText");

if (activityText) {
  activityText.textContent = "Connecting to cloud sync... ♡";
}

async function saveAndSync() {
  sortItems(items);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn(e);
  }

  renderCategories();
  renderItems();
  updateProgress();

  try {
    if (activityText) activityText.textContent = "Saving to cloud... ♡";

    await setDoc(sharedDocRef, {
      items,
      updatedAt: new Date().toISOString()
    });

    if (activityText) {
      activityText.textContent = "Live synced across all phones ♡";
    }
  } catch (err) {
    console.error("Cloud Sync Error:", err);
    if (activityText) {
      activityText.textContent = "Cloud Error: " + (err.code || err.message);
    }
  }
}

onSnapshot(
  sharedDocRef,
  snapshot => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      if (Array.isArray(data.items) && data.items.length > 0) {
        items = data.items;
        sortItems(items);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        renderCategories();
        renderItems();
        updateProgress();
        if (activityText) {
          activityText.textContent = "Live synced across all phones ♡";
        }
      }
    } else {
      saveAndSync();
    }
  },
  err => {
    console.error("Snapshot Error:", err);
    if (activityText) {
      activityText.textContent = "Sync Blocked: " + (err.code || err.message);
    }
  }
);


// ======================================
// 5. STATUS POPUP MESSAGE
// ======================================

function showStatus(message) {
  const status = $("status");
  if (!status) return;

  status.textContent = message;
  status.classList.add("show");

  clearTimeout(statusTimeout);
  statusTimeout = setTimeout(() => {
    status.classList.remove("show");
  }, 2500);
}


// ======================================
// 6. RENDER TABS & GROUPED CATEGORY CARDS
// ======================================

function renderCategories() {
  categories.innerHTML = "";
  const allCategories = ["All", ...categoryNames];

  allCategories.forEach(category => {
    const button = document.createElement("button");
    button.className = "category-btn" + (activeCategory === category ? " active" : "");

    const icon = categoryIcons[category] || "✨";
    const count = category === "All"
      ? items.length
      : items.filter(i => i.category === category).length;

    const labelSpan = document.createElement("span");
    labelSpan.textContent = `${icon} ${category}`;

    const countSpan = document.createElement("span");
    countSpan.className = "cat-tab-count";
    countSpan.textContent = count;

    button.append(labelSpan, countSpan);

    button.addEventListener("click", () => {
      activeCategory = category;
      renderCategories();
      renderItems();
    });

    categories.appendChild(button);
  });
}

function createItemRow(item) {
  const row = document.createElement("div");
  row.className = "item" + (item.done ? " done" : "");

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = !!item.done;

  checkbox.addEventListener("change", () => {
    item.done = checkbox.checked;
    saveAndSync();
    if (item.done) {
      spawnCupBubbles(3);
      triggerHappyCupFace(1200);
      showStatus("Checked! 🍓♡");
    } else {
      showStatus("Unchecked");
    }
  });

  const details = document.createElement("div");
  details.className = "item-name";
  details.textContent = item.name;

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
  return row;
}

function renderItems() {
  sortItems(items);
  list.innerHTML = "";
  const query = search.value.toLowerCase();

  const filtered = items.filter(item =>
    (activeCategory === "All" || item.category === activeCategory) &&
    item.name.toLowerCase().includes(query)
  );

  sortItems(filtered);

  if ($("itemCount")) {
    $("itemCount").textContent = filtered.length + " items shown";
  }

  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No items found in this category. 🍓🍵";
    list.appendChild(empty);
    return;
  }

  const categoriesToShow = activeCategory === "All"
    ? categoryNames
    : [activeCategory];

  categoriesToShow.forEach(category => {
    const groupItems = filtered.filter(item => item.category === category);
    if (!groupItems.length) return;

    const groupCard = document.createElement("div");
    groupCard.className = "category-group-card";

    const header = document.createElement("div");
    header.className = "category-group-header";

    const titleWrap = document.createElement("div");
    titleWrap.className = "category-group-title";

    const iconSpan = document.createElement("span");
    iconSpan.className = "category-group-icon";
    iconSpan.textContent = categoryIcons[category] || "✨";

    const nameSpan = document.createElement("span");
    nameSpan.textContent = category;

    titleWrap.append(iconSpan, nameSpan);

    const doneCount = groupItems.filter(i => i.done).length;
    const badge = document.createElement("span");
    badge.className = "category-group-badge";
    badge.textContent = `${doneCount} / ${groupItems.length} packed`;

    header.append(titleWrap, badge);
    groupCard.appendChild(header);

    groupItems.forEach(item => {
      groupCard.appendChild(createItemRow(item));
    });

    list.appendChild(groupCard);
  });
}


// ======================================
// 7. PROGRESS BAR & SELF-MOVING + TAP-INTERACTIVE CUP
// ======================================

function updateProgress() {
  const total = items.length;
  const completed = items.filter(item => item.done).length;
  const percentage = total ? Math.round((completed / total) * 100) : 0;

  $("percentage").textContent = percentage + "%";
  $("progress").style.width = percentage + "%";
  $("progressText").textContent = `${completed} of ${total} items completed`;

  // Fill the Mini Glass next to percentage (bottom y=41 to top y=11, maxHeight=30)
  const liquidRect = $("cupLiquidLevel");
  if (liquidRect) {
    const maxHeight = 30;
    const fillHeight = percentage === 0 ? 0 : Math.max(3, Math.round((percentage / 100) * maxHeight));
    const newY = 41 - fillHeight;

    liquidRect.setAttribute("y", String(newY));
    liquidRect.setAttribute("height", String(fillHeight));
  }

  // Keep Happy Face permanently on if 100% packed
  const normalFace = $("cupFaceNormal");
  const happyFace = $("cupFaceHappy");
  if (normalFace && happyFace) {
    if (percentage === 100) {
      normalFace.style.display = "none";
      happyFace.style.display = "block";
    } else {
      normalFace.style.display = "block";
      happyFace.style.display = "none";
    }
  }
}

// Helper: Pop floating strawberry/matcha/heart bubbles above the cup
function spawnCupBubbles(count = 1) {
  const sparkles = $("cupSparkles");
  if (!sparkles) return;

  const icons = ["🍓", "🍵", "♡", "✨", "🫧"];
  for (let i = 0; i < count; i++) {
    const span = document.createElement("span");
    span.className = "cup-bubble";
    span.textContent = icons[Math.floor(Math.random() * icons.length)];
    const dx = (Math.random() * 52 - 26).toFixed(0) + "px";
    span.style.setProperty("--dx", dx);
    sparkles.appendChild(span);
    setTimeout(() => span.remove(), 1200);
  }
}

// Helper: Temporarily switch the cup's face to happy (^ ◡ ^) when tapped or checking an item
function triggerHappyCupFace(duration = 1400) {
  const normalFace = $("cupFaceNormal");
  const happyFace = $("cupFaceHappy");
  const mouth = $("cupMouth");
  if (!normalFace || !happyFace) return;

  normalFace.style.display = "none";
  happyFace.style.display = "block";
  if (mouth) {
    mouth.setAttribute("d", "M45.5 81 Q50 87, 54.5 81");
  }

  clearTimeout(faceTimeout);
  faceTimeout = setTimeout(() => {
    const total = items.length;
    const completed = items.filter(item => item.done).length;
    const pct = total ? Math.round((completed / total) * 100) : 0;

    if (pct < 100) {
      normalFace.style.display = "block";
      happyFace.style.display = "none";
    }
    if (mouth) {
      mouth.setAttribute("d", "M46.5 81.5 Q50 85.5, 53.5 81.5");
    }
  }, duration);
}

// 1. SELF-MOVING: Automatically float a cute bubble out of the straw every 2.2 seconds!
setInterval(() => {
  spawnCupBubbles(1);
}, 2200);

// 2. TAP-INTERACTIVE: Wiggle, happy eyes, burst of 6 bubbles & sweet message when she taps!
const drinkCup = $("drinkCup");
if (drinkCup) {
  drinkCup.addEventListener("click", () => {
    drinkCup.classList.remove("sip-bounce");
    void drinkCup.offsetWidth;
    drinkCup.classList.add("sip-bounce");

    spawnCupBubbles(6);
    triggerHappyCupFace(1600);

    const total = items.length;
    const completed = items.filter(item => item.done).length;
    const pct = total ? Math.round((completed / total) * 100) : 0;

    if (pct === 0) {
      showStatus("Sipping Strawberry Matcha! Let's start packing 🍓🥛🍵");
    } else if (pct < 35) {
      showStatus(`Sweet strawberry base poured! (${pct}% packed) 🍓`);
    } else if (pct < 70) {
      showStatus(`Creamy milk & ice added! (${pct}% packed) 🥛🍓`);
    } else if (pct < 100) {
      showStatus(`Almost there! Whisking the matcha top (${pct}% packed) 🍵🍓`);
    } else {
      showStatus("100% Packed! Enjoy your Strawberry Matcha Latte! 🍓🍵♡");
    }
  });
}


// ======================================
// 8. ADD / EDIT ITEM MODAL
// ======================================

function openModal(id = null) {
  editingId = id;
  categoryInput.innerHTML = "";

  categoryNames.forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = `${categoryIcons[category] || ""} ${category}`;
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
    showStatus("New item added! 🍓♡");
  }

  closeModal();
  saveAndSync();
}


// ======================================
// 9. BUTTONS: SEARCH, UNCHECK ALL, DOWNLOAD
// ======================================

search.addEventListener("input", renderItems);

if ($("resetBtn")) {
  $("resetBtn").addEventListener("click", () => {
    if (!confirm("Uncheck ALL items?")) return;
    items.forEach(item => { item.done = false; });
    saveAndSync();
    showStatus("All items unchecked! ♡");
  });
}

if ($("downloadBtn")) {
  $("downloadBtn").addEventListener("click", () => {
    sortItems(items);

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
}

// Render all items sorted immediately on startup!
renderCategories();
renderItems();
updateProgress();