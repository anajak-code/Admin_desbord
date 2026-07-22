// ============================================
// ADMIN DASHBOARD - MAIN LOGIC
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Init navigation
    initNavigation();

    // Load default section
    loadSection('overview');
});

// ============================================
// NAVIGATION
// ============================================
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.getElementById(`section-${section}`).classList.add('active');
            
            document.getElementById('page-title').textContent = item.textContent.trim();
            
            loadSection(section);

            // Close mobile sidebar
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

// ============================================
// OVERVIEW
// ============================================
async function loadOverview() {
    const statsEl = document.getElementById('stats-grid');
    statsEl.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';

    try {
        const stats = await API.getStats();
        statsEl.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon">💰</div>
                <div class="stat-value">$${stats.total_revenue?.toFixed(2) || '0.00'}</div>
                <div class="stat-label">Total Revenue</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">🛒</div>
                <div class="stat-value">${stats.total_orders || 0}</div>
                <div class="stat-label">Total Orders</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">📦</div>
                <div class="stat-value">${stats.total_products || 0}</div>
                <div class="stat-label">Total Products</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">👥</div>
                <div class="stat-value">${stats.total_users || 0}</div>
                <div class="stat-label">Total Users</div>
            </div>
        `;

        // Load chart
        loadChart();
    } catch (err) {
        statsEl.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Failed to load stats. Check server connection.</p></div>`;
    }
}

async function loadChart() {
    try {
        const orders = await API.getOrders();
        const chartEl = document.getElementById('chart-area');
        
        // Group by last 7 days
        const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const dayCounts = new Array(7).fill(0);
        
        orders.forEach(order => {
            const d = new Date(order.created_at).getDay();
            dayCounts[d]++;
        });

        const maxVal = Math.max(...dayCounts, 1);
        
        let barsHTML = '';
        dayCounts.forEach((count, i) => {
            const height = (count / maxVal) * 160;
            barsHTML += `
                <div class="chart-bar" style="height: ${height}px;">
                    <span class="bar-value">${count}</span>
                    <span class="bar-label">${days[i]}</span>
                </div>
            `;
        });

        chartEl.innerHTML = `<div class="chart-bar-group">${barsHTML}</div>`;
    } catch(e) {
        document.getElementById('chart-area').innerHTML = '<p style="color:#999;text-align:center;">No data available</p>';
    }
}

// ============================================
// PRODUCTS
// ============================================
let editingProductId = null;

async function loadProducts() {
    const tbody = document.getElementById('products-tbody');
    tbody.innerHTML = '<tr><td colspan="6" class="loading"><div class="spinner"></div>Loading...</td></tr>';

    try {
        const products = await API.getProducts();
        
        if (products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><div class="icon">📦</div><p>No products yet</p></div></td></tr>';
            return;
        }

        tbody.innerHTML = products.map(p => `
            <tr>
                <td>#${p.id}</td>
                <td>
                    <div class="product-img-cell">
                        ${p.image_url ? `<img src="${API_BASE}${p.image_url}" class="img-preview" onerror="this.style.display='none'">` : ''}
                        <span>${p.name}</span>
                    </div>
                </td>
                <td>$${p.price.toFixed(2)}</td>
                <td><span class="badge ${p.stock > 0 ? 'badge-success' : 'badge-danger'}">${p.stock}</span></td>
                <td>${new Date().toLocaleDateString()}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-warning btn-sm" onclick="editProduct(${p.id})">✏️ Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id}, '${p.name.replace(/'/g,"\\'")}')">🗑️ Delete</button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch(err) {
        tbody.innerHTML = '<tr><td colspan="6" style="color:red;">Failed to load products</td></tr>';
    }
}

function openAddProductModal() {
    editingProductId = null;
    document.getElementById('modal-product-title').textContent = 'Add New Product';
    document.getElementById('product-form').reset();
    document.getElementById('product-image-preview').innerHTML = '';
    document.getElementById('product-modal').classList.add('show');
}

async function editProduct(id) {
    try {
        const product = await API.getProduct(id);
        editingProductId = id;
        
        document.getElementById('modal-product-title').textContent = 'Edit Product';
        document.getElementById('prod-name').value = product.name;
        document.getElementById('prod-price').value = product.price;
        document.getElementById('prod-stock').value = product.stock;
        document.getElementById('prod-desc').value = product.description || '';
        
        if (product.image_url) {
            document.getElementById('product-image-preview').innerHTML = 
                `<img src="${API_BASE}${product.image_url}" style="max-width:100px;border-radius:6px;margin-top:10px;">`;
        }
        
        document.getElementById('product-modal').classList.add('show');
    } catch(err) {
        showToast('Failed to load product', 'error');
    }
}

async function saveProduct(e) {
    e.preventDefault();
    
    const data = {
        name: document.getElementById('prod-name').value,
        price: parseFloat(document.getElementById('prod-price').value),
        stock: parseInt(document.getElementById('prod-stock').value) || 0,
        description: document.getElementById('prod-desc').value,
        image_url: document.getElementById('prod-image-url').value || ''
    };

    try {
        if (editingProductId) {
            await API.updateProduct(editingProductId, data);
            showToast('Product updated!', 'success');
        } else {
            await API.addProduct(data);
            showToast('Product added!', 'success');
        }
        closeModal('product-modal');
        loadProducts();
    } catch(err) {
        showToast('Failed to save product', 'error');
    }
}

async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const preview = document.getElementById('product-image-preview');
    preview.innerHTML = '<div class="spinner" style="width:20px;height:20px;margin:10px auto;"></div>';

    try {
        const result = await API.uploadFile(file);
        if (result.url) {
            document.getElementById('prod-image-url').value = result.url;
            preview.innerHTML = `<img src="${API_BASE}${result.url}" style="max-width:100px;border-radius:6px;margin-top:10px;">`;
            showToast('Image uploaded!', 'success');
        }
    } catch(err) {
        preview.innerHTML = '<p style="color:red;font-size:12px;">Upload failed</p>';
    }
}

async function deleteProduct(id, name) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    
    try {
        await API.deleteProduct(id);
        showToast('Product deleted!', 'success');
        loadProducts();
    } catch(err) {
        showToast('Failed to delete', 'error');
    }
}

// ============================================
// ORDERS
// ============================================
async function loadOrders() {
    const tbody = document.getElementById('orders-tbody');
    tbody.innerHTML = '<tr><td colspan="6" class="loading"><div class="spinner"></div>Loading...</td></tr>';

    try {
        const orders = await API.getOrders();
        
        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><div class="icon">🛒</div><p>No orders yet</p></div></td></tr>';
            return;
        }

        tbody.innerHTML = orders.map(o => {
            const statusClass = o.status === 'completed' ? 'badge-success' : 
                               o.status === 'cancelled' ? 'badge-danger' : 'badge-warning';
            const itemsStr = o.items.map(i => `${i.product_name} x${i.quantity}`).join(', ');
            
            return `
                <tr>
                    <td>#${o.id}</td>
                    <td>
                        <strong>${o.customer_name}</strong><br>
                        <small style="color:#999;">${o.customer_email}</small>
                    </td>
                    <td><small>${itemsStr}</small></td>
                    <td><strong>$${o.total_price.toFixed(2)}</strong></td>
                    <td><span class="badge ${statusClass}">${o.status}</span></td>
                    <td>${new Date(o.created_at).toLocaleString()}</td>
                </tr>
            `;
        }).join('');
    } catch(err) {
        tbody.innerHTML = '<tr><td colspan="6" style="color:red;">Failed to load orders</td></tr>';
    }
}

// ============================================
// USERS
// ============================================
async function loadUsers() {
    const tbody = document.getElementById('users-tbody');
    tbody.innerHTML = '<tr><td colspan="5" class="loading"><div class="spinner"></div>Loading...</td></tr>';

    try {
        const users = await API.getUsers();
        
        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><div class="icon">👥</div><p>No users registered</p></div></td></tr>';
            return;
        }

        tbody.innerHTML = users.map(u => {
            const isBanned = u.status === 'banned';
            return `
                <tr>
                    <td>#${u.id}</td>
                    <td><strong>${u.name}</strong></td>
                    <td>${u.email}</td>
                    <td><span class="badge ${isBanned ? 'badge-danger' : 'badge-success'}">${isBanned ? 'Banned' : 'Active'}</span></td>
                    <td>
                        <div class="btn-group">
                            ${isBanned 
                                ? `<button class="btn btn-success btn-sm" onclick="unbanUser(${u.id})">✅ Unban</button>`
                                : `<button class="btn btn-warning btn-sm" onclick="banUser(${u.id})">🚫 Ban</button>`
                            }
                            <button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id}, '${u.name.replace(/'/g,"\\'")}')">🗑️ Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    } catch(err) {
        tbody.innerHTML = '<tr><td colspan="5" style="color:red;">Failed to load users</td></tr>';
    }
}

async function banUser(id) {
    if (!confirm('Ban this user?')) return;
    try {
        await API.banUser(id);
        showToast('User banned', 'success');
        loadUsers();
    } catch(err) {
        showToast('Failed to ban user', 'error');
    }
}

async function unbanUser(id) {
    if (!confirm('Unban this user?')) return;
    try {
        await API.unbanUser(id);
        showToast('User unbanned', 'success');
        loadUsers();
    } catch(err) {
        showToast('Failed to unban user', 'error');
    }
}

async function deleteUser(id, name) {
    if (!confirm(`Permanently delete "${name}"? This cannot be undone!`)) return;
    try {
        await API.deleteUser(id);
        showToast('User deleted', 'success');
        loadUsers();
    } catch(err) {
        showToast('Failed to delete user', 'error');
    }
}

// ============================================
// SETTINGS
// ============================================
function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('shop_settings') || '{}');
    if (settings.shop_name) document.getElementById('set-shop-name').value = settings.shop_name;
    if (settings.shop_email) document.getElementById('set-shop-email').value = settings.shop_email;
    if (settings.shop_phone) document.getElementById('set-shop-phone').value = settings.shop_phone;
    if (settings.shop_address) document.getElementById('set-shop-address').value = settings.shop_address;
    if (settings.currency) document.getElementById('set-currency').value = settings.currency;
}

function saveSettings(e) {
    e.preventDefault();
    const settings = {
        shop_name: document.getElementById('set-shop-name').value,
        shop_email: document.getElementById('set-shop-email').value,
        shop_phone: document.getElementById('set-shop-phone').value,
        shop_address: document.getElementById('set-shop-address').value,
        currency: document.getElementById('set-currency').value
    };
    localStorage.setItem('shop_settings', JSON.stringify(settings));
    showToast('Settings saved!', 'success');
}

// ============================================
// UTILITIES
// ============================================
function closeModal(id) {
    document.getElementById(id).classList.remove('show');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('open');
}

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('show');
    }
});
