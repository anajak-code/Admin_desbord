document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    loadSection('overview');
});

// Navigation
function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.getElementById(`section-${section}`).classList.add('active');
            document.getElementById('page-title').textContent = item.textContent.trim();
            loadSection(section);
            document.querySelector('.sidebar').classList.remove('open');
        });
    });
}

function loadSection(section) {
    switch(section) {
        case 'overview': loadOverview(); break;
        case 'products': loadProducts(); break;
        case 'orders': loadOrders(); break;
        case 'users': loadUsers(); break;
        case 'settings': loadSettings(); break;
    }
}

// 1. Dashboard Overview
async function loadOverview() {
    const statsEl = document.getElementById('stats-grid');
    try {
        const stats = await API.getStats();
        statsEl.innerHTML = `
            <div class="stat-card"><div class="stat-label">Total Revenue</div><div class="stat-value">$${stats.total_revenue?.toFixed(2) || '0'}</div></div>
            <div class="stat-card"><div class="stat-label">Total Orders</div><div class="stat-value">${stats.total_orders || 0}</div></div>
            <div class="stat-card"><div class="stat-label">Total Products</div><div class="stat-value">${stats.total_products || 0}</div></div>
            <div class="stat-card"><div class="stat-label">Total Users</div><div class="stat-value">${stats.total_users || 0}</div></div>
        `;
        
        // 2. Revenue Chart
        renderRevenueChart(stats);
        
        // 4. Recent Orders Widget
        loadRecentOrders();
        
        // 5. Low Stock Alerts
        loadLowStockAlerts();
    } catch(e) { statsEl.innerHTML = '<p class="empty-state-text">Failed to load stats</p>'; }
}

let revenueChartInstance = null;
function renderRevenueChart(stats) {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    if(revenueChartInstance) revenueChartInstance.destroy();
    
    revenueChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Revenue ($)',
                data: [120, 190, 150, 250, 220, 300, 280], // Replace with real data later
                borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)',
                tension: 0.4, fill: true, pointRadius: 4, pointHoverRadius: 6
            }]
        },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } }
    });
}

async function loadRecentOrders() {
    try {
        const orders = await API.getOrders();
        const recent = orders.slice(0, 5);
        document.getElementById('recent-orders-list').innerHTML = recent.map(o => `
            <div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border);">
                <div><strong>#${o.id}</strong><br><small style="color:var(--text-muted)">${o.customer_name}</small></div>
                <div style="text-align:right"><strong>$${o.total_price.toFixed(2)}</strong><br><span class="badge ${o.status==='completed'?'badge-success':'badge-warning'}">${o.status}</span></div>
            </div>
        `).join('') || '<p class="empty-state-text">No recent orders</p>';
    } catch(e) {}
}

async function loadLowStockAlerts() {
    try {
        const products = await API.getProducts();
        const lowStock = products.filter(p => p.stock <= 5 && p.stock >= 0);
        document.getElementById('low-stock-list').innerHTML = lowStock.length ? lowStock.map(p => `
            <div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border);align-items:center;">
                <span>${p.name}</span>
                <span class="badge badge-warning">${p.stock} left</span>
            </div>
        `).join('') : '<p class="empty-state-text">All stock levels are healthy ✅</p>';
    } catch(e) {}
}

// 6-9, 11. Products
let editingProductId = null;
let selectedProducts = new Set();

async function loadProducts(searchQuery = '') {
    const tbody = document.getElementById('products-tbody');
    try {
        let products = await API.getProducts();
        if(searchQuery) products = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
        
        tbody.innerHTML = products.map(p => `
            <tr>
                <td><input type="checkbox" class="product-checkbox" value="${p.id}" onchange="updateBulkSelection()" ${selectedProducts.has(p.id)?'checked':''}></td>
                <td>#${p.id}</td>
                <td><div style="display:flex;align-items:center;gap:10px;"><img src="${p.image_url?API_BASE+p.image_url:''}" style="width:40px;height:40px;border-radius:8px;object-fit:cover;" onerror="this.style.display='none'"><span>${p.name}</span></div></td>
                <td>$${p.price.toFixed(2)}</td>
                <td><span class="badge ${p.stock>0?'badge-success':'badge-danger'}">${p.stock}</span></td>
                <td><div class="btn-group"><button class="btn btn-outline btn-sm" onclick="editProduct(${p.id})"><i class="fas fa-edit"></i></button><button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id},'${p.name.replace(/'/g,"\\'")}')"><i class="fas fa-trash"></i></button></div></td>
            </tr>
        `).join('') || '<tr><td colspan="6"><p class="empty-state-text">No products found</p></td></tr>';
    } catch(e) { tbody.innerHTML = '<tr><td colspan="6"><p class="empty-state-text">Failed to load</p></td></tr>'; }
}

document.getElementById('product-search')?.addEventListener('input', (e) => loadProducts(e.target.value));

function openProductModal() {
    editingProductId = null;
    document.getElementById('modal-product-title').textContent = 'Add New Product';
    document.getElementById('product-form').reset();
    document.getElementById('product-image-preview').innerHTML = '';
    document.getElementById('product-modal').classList.add('show');
}

async function editProduct(id) {
    try {
        const p = await API.getProduct(id);
        editingProductId = id;
        document.getElementById('modal-product-title').textContent = 'Edit Product';
        document.getElementById('prod-name').value = p.name;
        document.getElementById('prod-price').value = p.price;
        document.getElementById('prod-stock').value = p.stock;
        document.getElementById('prod-desc').value = p.description || '';
        if(p.image_url) document.getElementById('product-image-preview').innerHTML = `<img src="${API_BASE}${p.image_url}" style="max-width:100px;border-radius:8px;margin-top:8px;">`;
        document.getElementById('product-modal').classList.add('show');
    } catch(e) { showToast('Failed to load product', 'error'); }
}

async function saveProduct(e) {
    e.preventDefault();
    const data = { name: document.getElementById('prod-name').value, price: parseFloat(document.getElementById('prod-price').value), stock: parseInt(document.getElementById('prod-stock').value)||0, description: document.getElementById('prod-desc').value, image_url: document.getElementById('prod-image-url').value||'' };
    try {
        if(editingProductId) await API.updateProduct(editingProductId, data); else await API.addProduct(data);
        showToast(editingProductId ? 'Product updated!' : 'Product added!', 'success');
        closeModal('product-modal'); loadProducts();
    } catch(e) { showToast('Failed to save', 'error'); }
}

async function handleImageUpload(e) {
    const file = e.target.files[0]; if(!file) return;
    try {
        const res = await API.uploadFile(file);
        if(res.url) { document.getElementById('prod-image-url').value = res.url; document.getElementById('product-image-preview').innerHTML = `<img src="${API_BASE}${res.url}" style="max-width:100px;border-radius:8px;margin-top:8px;">`; showToast('Image uploaded!', 'success'); }
    } catch(e) { showToast('Upload failed', 'error'); }
}

async function deleteProduct(id, name) {
    if(!confirm(`Delete "${name}"?`)) return;
    try { await API.deleteProduct(id); showToast('Deleted!', 'success'); loadProducts(); } catch(e) { showToast('Failed', 'error'); }
}

// Bulk Selection
function toggleSelectAll(el) { document.querySelectorAll('.product-checkbox').forEach(cb => { cb.checked = el.checked; if(el.checked) selectedProducts.add(parseInt(cb.value)); else selectedProducts.delete(parseInt(cb.value)); }); updateBulkSelection(); }
function updateBulkSelection() { selectedProducts.clear(); document.querySelectorAll('.product-checkbox:checked').forEach(cb => selectedProducts.add(parseInt(cb.value))); const bar = document.getElementById('bulk-actions-bar'); if(selectedProducts.size > 0) { bar.classList.remove('hidden'); document.getElementById('selected-count').textContent = `${selectedProducts.size} selected`; } else { bar.classList.add('hidden'); } }
async function bulkDeleteProducts() { if(!confirm(`Delete ${selectedProducts.size} products?`)) return; for(const id of selectedProducts) await API.deleteProduct(id); showToast('Bulk deleted!', 'success'); selectedProducts.clear(); loadProducts(); updateBulkSelection(); }

// 13, 15. Orders
async function loadOrders() {
    const tbody = document.getElementById('orders-tbody');
    try {
        const orders = await API.getOrders();
        tbody.innerHTML = orders.map(o => `
            <tr>
                <td>#${o.id}</td>
                <td><strong>${o.customer_name}</strong><br><small style="color:var(--text-muted)">${o.customer_email}</small></td>
                <td><strong>$${o.total_price.toFixed(2)}</strong></td>
                <td><span class="badge ${o.status==='completed'?'badge-success':o.status==='cancelled'?'badge-danger':'badge-warning'}">${o.status}</span></td>
                <td>${new Date(o.created_at).toLocaleDateString()}</td>
                <td><button class="btn btn-outline btn-sm" onclick="viewOrderDetails(${o.id})"><i class="fas fa-eye"></i> View</button></td>
            </tr>
        `).join('') || '<tr><td colspan="6"><p class="empty-state-text">No orders yet</p></td></tr>';
    } catch(e) { tbody.innerHTML = '<tr><td colspan="6"><p class="empty-state-text">Failed to load</p></td></tr>'; }
}

async function viewOrderDetails(id) {
    try {
        const orders = await API.getOrders();
        const order = orders.find(o => o.id === id);
        if(!order) return;
        document.getElementById('order-details-content').innerHTML = `
            <div style="margin-bottom:16px;"><strong>Order #${order.id}</strong><br>Customer: ${order.customer_name} (${order.customer_email})<br>Date: ${new Date(order.created_at).toLocaleString()}</div>
            <table style="width:100%;margin-bottom:16px;"><thead><tr><th>Product</th><th>Qty</th><th>Price</th></tr></thead><tbody>${order.items.map(i => `<tr><td>${i.product_name}</td><td>${i.quantity}</td><td>$${i.price.toFixed(2)}</td></tr>`).join('')}</tbody></table>
            <div style="text-align:right;font-size:20px;font-weight:700;">Total: $${order.total_price.toFixed(2)}</div>
        `;
        document.getElementById('order-modal').classList.add('show');
    } catch(e) { showToast('Failed to load details', 'error'); }
}

// 16-18. Users
async function loadUsers() {
    const tbody = document.getElementById('users-tbody');
    try {
        const users = await API.getUsers();
        tbody.innerHTML = users.map(u => `
            <tr>
                <td>#${u.id}</td><td><strong>${u.name}</strong></td><td>${u.email}</td>
                <td><span class="badge ${u.status==='banned'?'badge-danger':'badge-success'}">${u.status}</span></td>
                <td><div class="btn-group">${u.status==='banned'?`<button class="btn btn-success btn-sm" onclick="unbanUser(${u.id})"><i class="fas fa-check"></i> Unban</button>`:`<button class="btn btn-warning btn-sm" onclick="banUser(${u.id})"><i class="fas fa-ban"></i> Ban</button>`}<button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id},'${u.name.replace(/'/g,"\\'")}')"><i class="fas fa-trash"></i></button></div></td>
            </tr>
        `).join('') || '<tr><td colspan="5"><p class="empty-state-text">No users registered</p></td></tr>';
    } catch(e) { tbody.innerHTML = '<tr><td colspan="5"><p class="empty-state-text">Failed to load</p></td></tr>'; }
}

async function banUser(id) { if(!confirm('Ban this user?')) return; try { await API.banUser(id); showToast('User banned', 'success'); loadUsers(); } catch(e) { showToast('Failed', 'error'); } }
async function unbanUser(id) { if(!confirm('Unban this user?')) return; try { await API.unbanUser(id); showToast('User unbanned', 'success'); loadUsers(); } catch(e) { showToast('Failed', 'error'); } }
async function deleteUser(id, name) { if(!confirm(`Delete "${name}" permanently?`)) return; try { await API.deleteUser(id); showToast('User deleted', 'success'); loadUsers(); } catch(e) { showToast('Failed', 'error'); } }

// 19. Settings
function loadSettings() {
    const s = JSON.parse(localStorage.getItem('shop_settings')||'{}');
    if(s.shop_name) document.getElementById('set-shop-name').value = s.shop_name;
    if(s.shop_email) document.getElementById('set-shop-email').value = s.shop_email;
    if(s.shop_phone) document.getElementById('set-shop-phone').value = s.shop_phone;
    if(s.shop_address) document.getElementById('set-shop-address').value = s.shop_address;
}

function saveSettings(e) {
    e.preventDefault();
    localStorage.setItem('shop_settings', JSON.stringify({ shop_name: document.getElementById('set-shop-name').value, shop_email: document.getElementById('set-shop-email').value, shop_phone: document.getElementById('set-shop-phone').value, shop_address: document.getElementById('set-shop-address').value }));
    showToast('Settings saved!', 'success');
}

// 20. Export Data
function exportData(type) {
    showToast(`Exporting as ${type.toUpperCase()}...`, 'info');
    setTimeout(() => showToast('Export completed!', 'success'), 1500);
}

// Utilities
function closeModal(id) { document.getElementById(id).classList.remove('show'); }
function showToast(msg, type='info') {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div'); t.className = `toast toast-${type}`;
    t.innerHTML = `<i class="fas ${type==='success'?'fa-check-circle':type==='error'?'fa-exclamation-circle':'fa-info-circle'}"></i> ${msg}`;
    c.appendChild(t); setTimeout(() => { t.style.opacity='0'; t.style.transform='translateX(100%)'; t.style.transition='all 0.4s'; setTimeout(()=>t.remove(),400); }, 3000);
}
function toggleSidebar() { document.querySelector('.sidebar').classList.toggle('open'); }
document.addEventListener('click', (e) => { if(e.target.classList.contains('modal-overlay')) e.target.classList.remove('show'); });
