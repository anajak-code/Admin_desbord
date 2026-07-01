// ==================== DATA LAYER ====================
const STORAGE_KEY = 'storeData';

function getDefaultData() {
  return {
    products: [
      { id: 1, name: 'Wireless Headphones', description: 'Noise-cancelling over-ear', price: 99.99, stock: 20, category: 'Electronics', image: 'https://via.placeholder.com/200/3b82f6/fff?text=Headphones' },
      { id: 2, name: 'Classic T-Shirt', description: '100% cotton, comfortable fit', price: 19.99, stock: 50, category: 'Clothing', image: 'https://via.placeholder.com/200/22c55e/fff?text=T-Shirt' },
      { id: 3, name: 'Programming Book', description: 'Learn JavaScript in 30 days', price: 39.99, stock: 10, category: 'Books', image: 'https://via.placeholder.com/200/8b5cf6/fff?text=Book' }
    ],
    orders: [
      { id: 101, userId: 1, products: [{ id: 1, qty: 2 }, { id: 2, qty: 1 }], total: 219.97, status: 'Shipped', date: '2026-06-28', customerName: 'John Doe' },
      { id: 102, userId: 2, products: [{ id: 3, qty: 1 }], total: 39.99, status: 'Pending', date: '2026-06-30', customerName: 'Jane Smith' }
    ],
    users: [
      { id: 1, name: 'John Doe', email: 'john@example.com', role: 'User', joined: '2026-01-15' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User', joined: '2026-02-20' },
      { id: 3, name: 'Admin', email: 'admin@store.com', role: 'Admin', joined: '2026-01-01' }
    ],
    settings: { storeName: 'My Awesome Store', storeEmail: 'admin@store.com' }
  };
}

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const def = getDefaultData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(def));
    return def;
  }
  try { return JSON.parse(raw); }
  catch { return getDefaultData(); }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  // NEW: broadcast change to other tabs
  channel.postMessage({ type: 'refresh' });
}

// ==================== APP STATE ====================
let appData = loadData();
let currentSection = 'dashboard';
let editingProductId = null;

// ==================== BROADCAST CHANNEL ====================
const channel = new BroadcastChannel('store_channel');

// ==================== DOM REFS ====================
// ... (all existing DOM refs remain the same) ...

// ==================== NAVIGATION ====================
// ... (unchanged) ...

// ==================== DASHBOARD ====================
// ... (unchanged) ...

// ==================== PRODUCTS ====================
// ... (unchanged) ...

function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  appData.products = appData.products.filter(p => p.id !== id);
  saveData(appData);
  renderProducts();
  renderDashboard();
  if (currentSection === 'orders') renderOrders();
  // saveData already posts message, but we can keep explicit
}

function saveProductFromForm() {
  const name = pName.value.trim();
  const desc = pDesc.value.trim();
  const price = parseFloat(pPrice.value);
  const stock = parseInt(pStock.value);
  const category = pCategory.value;
  const image = pImage.value.trim();

  if (!name || isNaN(price) || isNaN(stock)) {
    alert('Please fill in all required fields (Name, Price, Stock).');
    return;
  }

  const id = productId.value ? parseInt(productId.value) : Date.now();

  const productData = {
    id,
    name,
    description: desc,
    price,
    stock,
    category,
    image: image || 'https://via.placeholder.com/200'
  };

  if (editingProductId) {
    const idx = appData.products.findIndex(p => p.id === editingProductId);
    if (idx !== -1) appData.products[idx] = productData;
  } else {
    appData.products.push(productData);
  }

  saveData(appData);
  productModal.classList.remove('active');
  renderProducts();
  renderDashboard();
  if (currentSection === 'orders') renderOrders();
}

// ==================== ORDERS ====================
// ... (unchanged) ...

function toggleOrderStatus(id) {
  const order = appData.orders.find(o => o.id === id);
  if (!order) return;
  const statuses = ['Pending', 'Processing', 'Shipped', 'Delivered'];
  let idx = statuses.indexOf(order.status);
  if (idx === -1) idx = 0;
  idx = (idx + 1) % statuses.length;
  order.status = statuses[idx];
  saveData(appData);
  renderOrders();
  renderDashboard();
}

// ==================== USERS ====================
// ... (unchanged) ...

function deleteUser(id) {
  if (!confirm('Delete this user?')) return;
  appData.users = appData.users.filter(u => u.id !== id);
  saveData(appData);
  renderUsers();
  renderDashboard();
}

// ==================== SETTINGS ====================
// ... (unchanged) ...

function saveSettings() {
  appData.settings.storeName = storeNameInput.value.trim();
  appData.settings.storeEmail = storeEmailInput.value.trim();
  saveData(appData);
  alert('Settings saved!');
}

function resetAllData() {
  if (!confirm('This will delete all data and restore defaults. Are you sure?')) return;
  const def = getDefaultData();
  appData = def;
  saveData(def);
  navigateTo('dashboard');
  renderDashboard();
  renderProducts();
  renderOrders();
  renderUsers();
  loadSettings();
  alert('Data has been reset.');
}

// ==================== EVENT BINDINGS ====================
// ... (unchanged) ...

// ==================== INIT ====================
navigateTo('dashboard');
