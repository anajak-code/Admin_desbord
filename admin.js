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
}

// ==================== APP STATE ====================
let appData = loadData();
let currentSection = 'dashboard';
let editingProductId = null;

// ==================== DOM REFS ====================
const sections = {
  dashboard: document.getElementById('section-dashboard'),
  products: document.getElementById('section-products'),
  orders: document.getElementById('section-orders'),
  users: document.getElementById('section-users'),
  settings: document.getElementById('section-settings')
};
const navLinks = document.querySelectorAll('.nav-link');
const pageTitle = document.getElementById('pageTitle');

// Stats
const statProducts = document.getElementById('statProducts');
const statOrders = document.getElementById('statOrders');
const statUsers = document.getElementById('statUsers');
const statRevenue = document.getElementById('statRevenue');
const recentOrdersList = document.getElementById('recentOrdersList');
const topProductsList = document.getElementById('topProductsList');

// Tables
const productsTbody = document.getElementById('productsTableBody');
const ordersTbody = document.getElementById('ordersTableBody');
const usersTbody = document.getElementById('usersTableBody');

// Modals
const productModal = document.getElementById('productModal');
const productModalTitle = document.getElementById('productModalTitle');
const productForm = document.getElementById('productForm');
const productId = document.getElementById('productId');
const pName = document.getElementById('pName');
const pDesc = document.getElementById('pDesc');
const pPrice = document.getElementById('pPrice');
const pStock = document.getElementById('pStock');
const pCategory = document.getElementById('pCategory');
const pImage = document.getElementById('pImage');
const productModalSave = document.getElementById('productModalSave');
const productModalCancel = document.getElementById('productModalCancel');
const productModalClose = document.getElementById('productModalClose');

const orderModal = document.getElementById('orderModal');
const orderDetailBody = document.getElementById('orderDetailBody');
const orderModalClose = document.getElementById('orderModalClose');

// Settings
const storeNameInput = document.getElementById('storeName');
const storeEmailInput = document.getElementById('storeEmail');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const resetDataBtn = document.getElementById('resetDataBtn');

// ==================== NAVIGATION ====================
function navigateTo(section) {
  // Hide all sections
  Object.values(sections).forEach(el => el.classList.remove('active'));
  // Show target
  if (sections[section]) sections[section].classList.add('active');
  // Update nav
  navLinks.forEach(link => {
    link.classList.toggle('active', link.dataset.section === section);
  });
  // Update title
  const titles = {
    dashboard: 'Dashboard',
    products: 'Products',
    orders: 'Orders',
    users: 'Users',
    settings: 'Settings'
  };
  pageTitle.textContent = titles[section] || 'Dashboard';
  currentSection = section;
  // Refresh data for section
  if (section === 'dashboard') renderDashboard();
  else if (section === 'products') renderProducts();
  else if (section === 'orders') renderOrders();
  else if (section === 'users') renderUsers();
  else if (section === 'settings') loadSettings();
}

navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo(link.dataset.section);
  });
});

// ==================== DASHBOARD ====================
function renderDashboard() {
  const products = appData.products;
  const orders = appData.orders;
  const users = appData.users;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);

  statProducts.textContent = products.length;
  statOrders.textContent = orders.length;
  statUsers.textContent = users.length;
  statRevenue.textContent = `$${totalRevenue.toFixed(2)}`;

  // Recent orders (last 5)
  const recent = orders.slice(-5).reverse();
  if (recent.length) {
    recentOrdersList.innerHTML = recent.map(o =>
      `<div class="recent-item"><span>#${o.id} - ${o.customerName}</span><span>$${o.total.toFixed(2)}</span></div>`
    ).join('');
  } else {
    recentOrdersList.innerHTML = '<p class="empty-msg">No orders yet</p>';
  }

  // Top products by quantity sold
  const productSales = {};
  orders.forEach(order => {
    order.products.forEach(p => {
      productSales[p.id] = (productSales[p.id] || 0) + p.qty;
    });
  });
  const sorted = Object.entries(productSales).sort((a,b) => b[1] - a[1]);
  if (sorted.length) {
    topProductsList.innerHTML = sorted.slice(0, 5).map(([id, qty]) => {
      const prod = products.find(p => p.id == id);
      return prod ? `<div class="recent-item"><span>${prod.name}</span><span>${qty} sold</span></div>` : '';
    }).join('');
  } else {
    topProductsList.innerHTML = '<p class="empty-msg">No products sold yet</p>';
  }
}

// ==================== PRODUCTS ====================
function renderProducts() {
  const products = appData.products;
  if (!products.length) {
    productsTbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;">No products added yet</td></tr>`;
    return;
  }
  productsTbody.innerHTML = products.map(p => `
    <tr>
      <td><img src="${p.image || 'https://via.placeholder.com/200'}" alt="${p.name}" /></td>
      <td><strong>${p.name}</strong><br/><small>${p.description || ''}</small></td>
      <td>${p.category || 'Other'}</td>
      <td>$${p.price.toFixed(2)}</td>
      <td>${p.stock}</td>
      <td class="actions">
        <button class="btn-sm edit" data-id="${p.id}"><i class="fas fa-edit"></i></button>
        <button class="btn-sm delete" data-id="${p.id}"><i class="fas fa-trash"></i></button>
      </td>
    </tr>
  `).join('');

  // Attach events
  productsTbody.querySelectorAll('.edit').forEach(btn => {
    btn.addEventListener('click', () => openEditProduct(parseInt(btn.dataset.id)));
  });
  productsTbody.querySelectorAll('.delete').forEach(btn => {
    btn.addEventListener('click', () => deleteProduct(parseInt(btn.dataset.id)));
  });
}

function openEditProduct(id) {
  const product = appData.products.find(p => p.id === id);
  if (!product) return;
  editingProductId = id;
  productModalTitle.textContent = 'Edit Product';
  productId.value = id;
  pName.value = product.name;
  pDesc.value = product.description || '';
  pPrice.value = product.price;
  pStock.value = product.stock;
  pCategory.value = product.category || 'Other';
  pImage.value = product.image || '';
  productModal.classList.add('active');
}

function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  appData.products = appData.products.filter(p => p.id !== id);
  // Also remove from orders? Not necessary, but keep order product references.
  saveData(appData);
  renderProducts();
  renderDashboard();
  // If orders view is open, refresh it
  if (currentSection === 'orders') renderOrders();
}

function addProduct() {
  editingProductId = null;
  productModalTitle.textContent = 'Add Product';
  productForm.reset();
  productId.value = '';
  pName.value = '';
  pDesc.value = '';
  pPrice.value = '';
  pStock.value = '';
  pCategory.value = 'Electronics';
  pImage.value = '';
  productModal.classList.add('active');
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

  const id = productId.value ? parseInt(productId.value) : Date.now(); // simple unique id

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
    // Edit
    const idx = appData.products.findIndex(p => p.id === editingProductId);
    if (idx !== -1) appData.products[idx] = productData;
  } else {
    // Add
    appData.products.push(productData);
  }

  saveData(appData);
  productModal.classList.remove('active');
  renderProducts();
  renderDashboard();
  if (currentSection === 'orders') renderOrders();
}

// ==================== ORDERS ====================
function renderOrders() {
  const orders = appData.orders;
  if (!orders.length) {
    ordersTbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;">No orders</td></tr>`;
    return;
  }
  ordersTbody.innerHTML = orders.map(o => {
    const productNames = o.products.map(p => {
      const prod = appData.products.find(pr => pr.id === p.id);
      return prod ? `${prod.name} (${p.qty})` : `Product ${p.id}`;
    }).join(', ');
    const statusClass = o.status === 'Delivered' ? 'status delivered' : o.status === 'Shipped' ? 'status shipped' : 'status pending';
    return `
      <tr>
        <td>#${o.id}</td>
        <td>${o.customerName || 'Unknown'}</td>
        <td>${productNames}</td>
        <td>$${o.total.toFixed(2)}</td>
        <td><span class="badge ${statusClass}">${o.status}</span></td>
        <td>${o.date}</td>
        <td class="actions">
          <button class="btn-sm view" data-id="${o.id}"><i class="fas fa-eye"></i></button>
          <button class="btn-sm status" data-id="${o.id}"><i class="fas fa-sync"></i></button>
        </td>
      </tr>
    `;
  }).join('');

  ordersTbody.querySelectorAll('.view').forEach(btn => {
    btn.addEventListener('click', () => viewOrder(parseInt(btn.dataset.id)));
  });
  ordersTbody.querySelectorAll('.status').forEach(btn => {
    btn.addEventListener('click', () => toggleOrderStatus(parseInt(btn.dataset.id)));
  });
}

function viewOrder(id) {
  const order = appData.orders.find(o => o.id === id);
  if (!order) return;
  const productDetails = order.products.map(p => {
    const prod = appData.products.find(pr => pr.id === p.id);
    return prod ? `${prod.name} x${p.qty} = $${(prod.price * p.qty).toFixed(2)}` : `Product ${p.id} x${p.qty}`;
  }).join('<br/>');
  orderDetailBody.innerHTML = `
    <p><strong>Order ID:</strong> #${order.id}</p>
    <p><strong>Customer:</strong> ${order.customerName || 'Unknown'}</p>
    <p><strong>Date:</strong> ${order.date}</p>
    <p><strong>Status:</strong> ${order.status}</p>
    <p><strong>Products:</strong><br/>${productDetails}</p>
    <p><strong>Total:</strong> $${order.total.toFixed(2)}</p>
  `;
  orderModal.classList.add('active');
}

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
function renderUsers() {
  const users = appData.users;
  if (!users.length) {
    usersTbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;">No users</td></tr>`;
    return;
  }
  usersTbody.innerHTML = users.map(u => `
    <tr>
      <td>${u.id}</td>
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td>${u.role || 'User'}</td>
      <td>${u.joined || ''}</td>
      <td>
        <button class="btn-sm delete" data-id="${u.id}"><i class="fas fa-trash"></i></button>
      </td>
    </tr>
  `).join('');

  usersTbody.querySelectorAll('.delete').forEach(btn => {
    btn.addEventListener('click', () => deleteUser(parseInt(btn.dataset.id)));
  });
}

function deleteUser(id) {
  if (!confirm('Delete this user?')) return;
  appData.users = appData.users.filter(u => u.id !== id);
  saveData(appData);
  renderUsers();
  renderDashboard();
}

// ==================== SETTINGS ====================
function loadSettings() {
  storeNameInput.value = appData.settings.storeName || '';
  storeEmailInput.value = appData.settings.storeEmail || '';
}

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
// Add product button
document.getElementById('addProductBtn').addEventListener('click', addProduct);

// Product modal controls
productModalSave.addEventListener('click', saveProductFromForm);
productModalCancel.addEventListener('click', () => productModal.classList.remove('active'));
productModalClose.addEventListener('click', () => productModal.classList.remove('active'));
productModal.addEventListener('click', (e) => {
  if (e.target === productModal) productModal.classList.remove('active');
});

// Order modal controls
orderModalClose.addEventListener('click', () => orderModal.classList.remove('active'));
orderModal.addEventListener('click', (e) => {
  if (e.target === orderModal) orderModal.classList.remove('active');
});

// Settings
saveSettingsBtn.addEventListener('click', saveSettings);
resetDataBtn.addEventListener('click', resetAllData);

// Logout
document.getElementById('adminLogout').addEventListener('click', () => {
  if (confirm('Logout?')) {
    // In a real app, redirect to login; here we just reload
    location.reload();
  }
});

// Mobile sidebar toggle
document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// ==================== INIT ====================
navigateTo('dashboard');
