
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
  ["Shared room", "Small personal mirror"],
  ["Shared room", "Headphones"],
  ["Shared room", "Eye mask"],
  ["Shared room", "Personal valuables pouch"],
  ["Shared room", "Trash bags"]
];

let items = JSON.parse(
  localStorage.getItem("dormChecklist")
) || starterItems.map((entry, index) => ({
  id: index + 1,
  category: entry[0],
  name: entry[1],
  done: false
}));

let activeCategory = "All";
let editingId = null;

const list = document.getElementById("list");
const categories = document.getElementById("categories");
const search = document.getElementById("search");
const modal = document.getElementById("modal");
const itemInput = document.getElementById("itemInput");
const categoryInput = document.getElementById("categoryInput");

function saveData() {
  localStorage.setItem(
    "dormChecklist",
    JSON.stringify(items)
  );
}

function updateProgress() {
  const completed = items.filter(item => item.done).length;
  const total = items.length;

  const percentage = total
    ? Math.round((completed / total) * 100)
    : 0;

  document.getElementById("percentage").textContent =
    percentage + "%";

  document.getElementById("progress").style.width =
    percentage + "%";

  document.getElementById("progressText").textContent =
    `${completed} of ${total} items completed`;
}

function renderCategories() {
  categories.innerHTML = "";

  ["All", ...categoryNames].forEach(category => {
    const button = document.createElement("button");

    button.className =
      "category-btn" +
      (activeCategory === category ? " active" : "");

    button.textContent = category;

    button.onclick = () => {
      activeCategory = category;
      renderCategories();
      renderItems();
    };

    categories.appendChild(button);
  });
}

function renderItems() {
  list.innerHTML = "";

  const query = search.value.toLowerCase();

  const filtered = items.filter(item =>
    (activeCategory === "All" ||
      item.category === activeCategory) &&
    item.name.toLowerCase().includes(query)
  );

  document.getElementById("listTitle").textContent =
    activeCategory === "All"
      ? "Your checklist"
      : activeCategory;

  document.getElementById("itemCount").textContent =
    `${filtered.length} items`;

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
    checkbox.checked = item.done;

    checkbox.onchange = () => {
      item.done = checkbox.checked;
      saveData();
      renderItems();
      updateProgress();
    };

    const name = document.createElement("span");
    name.className = "item-name";
    name.textContent = item.name;

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const editButton = document.createElement("button");
    editButton.className = "icon-btn";
    editButton.textContent = "Edit";

    editButton.onclick = () => openModal(item.id);

    const deleteButton = document.createElement("button");
    deleteButton.className = "icon-btn";
    deleteButton.textContent = "Delete";

    deleteButton.onclick = () => {
      if (confirm(`Delete "${item.name}"?`)) {
        items = items.filter(i => i.id !== item.id);
        saveData();
        renderItems();
        updateProgress();
      }
    };

    actions.append(editButton, deleteButton);
    row.append(checkbox, name, actions);
    list.appendChild(row);
  });
}

function openModal(id = null) {
  editingId = id;

  categoryInput.innerHTML = "";

  categoryNames.forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryInput.appendChild(option);
  });

  if (id !== null) {
    const item = items.find(i => i.id === id);

    document.getElementById("modalTitle").textContent =
      "Edit item";

    itemInput.value = item.name;
    categoryInput.value = item.category;
  } else {
    document.getElementById("modalTitle").textContent =
      "Add a new item";

    itemInput.value = "";
    categoryInput.value = activeCategory === "All"
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

function saveItem() {
  const name = itemInput.value.trim();
  const category = categoryInput.value;

  if (!name) {
    alert("Please enter an item name.");
    return;
  }

  if (editingId !== null) {
    const item = items.find(i => i.id === editingId);
    item.name = name;
    item.category = category;
  } else {
    items.push({
      id: Date.now(),
      name,
      category,
      done: false
    });
  }

  saveData();
  closeModal();
  renderCategories();
  renderItems();
  updateProgress();
}

function resetChecks() {
  if (!confirm("Reset all completed items?")) return;

  items.forEach(item => item.done = false);

  saveData();
  renderItems();
  updateProgress();
}

function exportList() {
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
}

search.addEventListener("input", renderItems);

renderCategories();
renderItems();
updateProgress();
