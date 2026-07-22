// ============================================
// CONFIGURATION
// ============================================
const API_URL = 'https://api.anajakcode.site/api'; // ⚠️ កែ URL នេះតាមកន្លែងដាក់ Backend របស់អ្នក
let revenueChart = null;
let realtimeInterval = null;

// ============================================
// AUTH FUNCTIONS
// ============================================
function getToken() {
    return localStorage.getItem('admin_token');
}

function setToken(token) {
    localStorage.setItem('admin_token', token);
}

function clearToken() {
    localStorage.removeItem('admin_token');
}

// Check auth immediately on load
if (!getToken()) {
    window.location.href = 'loginadmin.html';
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Admin Dashboard initializing...');
    console.log('API_URL:', API_URL);
    console.log('Token:', getToken() ? '✅ Present' : '❌ Missing');
    
    initNavigation();
    initTheme();
    initDashboard();
    setupKeyboardShortcuts();
    setupModalCloseHandlers();
});

// ============================================
// NAVIGATION
// ============================================
function initNavigation() {
    document.querySelectorAll('.menu-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            switchSection(section);
            document.querySelectorAll('.menu-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            document.getElementById('sidebar').classList.remove('mobile-open');
        });
    });

    const toggleBtn = document.getElementById('toggleSidebar');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                document.getElementById('sidebar').classList.toggle('mobile-open');
            } else {
                document.getElementById('sidebar').classList.toggle('collapsed');
            }
        });
    }

    // Close sidebar on outside click (mobile)
    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('sidebar');
        const menuBtn = document.querySelector('.toggle-sidebar');
        if (window.innerWidth <= 768 && !sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
            sidebar.classList.remove('mobile-open');
        }
    });
}

function switchSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(`section-${sectionId}`);
    if (target) target.classList.add('active');
    
    // Load data based on section
    if (sectionId === 'dashboard') {
        loadDashboard();
        startRealtimeMonitoring();
    } else if (sectionId === 'products') {
        loadProducts();
    } else if (sectionId === 'orders') {
        loadOrders();
    } else if (sectionId === 'users') {
        loadUsers();
    } else if (sectionId === 'discounts') {
        loadDiscounts();
    } else if (sectionId === 'stock') {
        loadStock();
    } else if (sectionId === 'settings') {
        loadSettings();
    }
    
    clearInterval(realtimeInterval);
}

// ============================================
// THEME
// ============================================
function initTheme() {
    const saved = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
        });
    }
}

// ============================================
// API HELPERS
// ============================================
async function fetchWithAuth(url, options = {}) {
    const headers = { 
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };
    try {
        const response = await fetch(url, { ...options, headers });
        if (response.status === 401) {
            clearToken();
            window.location.href = 'loginadmin.html';
            return null;
        }
        return response;
    } catch (error) {
        console.error('Fetch error:', error);
        showToast('Connection failed', 'error');
        return null;
    }
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function showToast(message, type = 'success', title = '') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const icons = { success: 'fa-check', error: 'fa-times', warning: 'fa-exclamation' };
    const defaultTitles = { success: 'Success', error: 'Error', warning: 'Warning' };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon"><i class="fas ${icons[type] || icons.success}"></i></div>
        <div class="toast-content">
            <div class="toast-title">${title || defaultTitles[type]}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// DASHBOARD
// ============================================
async function initDashboard() {
    await loadDashboard();
}

async function loadDashboard() {
    try {
        const res = await fetchWithAuth(`${API_URL}/admin/stats`);
        if (!res) return;
        const stats = await res.json();
        
        document.getElementById('stat-revenue').innerText = `$${stats.total_revenue.toLocaleString()}`;
        document.getElementById('stat-orders').innerText = stats.total_orders;
        document.getElementById('stat-products').innerText = stats.total_products;
        document.getElementById('stat-users').innerText = stats.total_users;
        
        const pendingBadge = document.getElementById('pending-orders-badge');
        if (pendingBadge) pendingBadge.innerText = stats.pending_orders || 0;
        
        const notifBadge = document.getElementById('notif-badge');
        if (notifBadge) {
            const total = (stats.low_stock_count || 0) + (stats.pending_orders || 0);
            notifBadge.innerText = total;
            notifBadge.style.display = total > 0 ? 'flex' : 'none';
        }
        
        await loadChart();
    } catch (err) {
        console.error('Dashboard load error:', err);
    }
}

async function loadChart() {
    try {
        const res = await fetchWithAuth(`${API_URL}/admin/order-analytics`);
        if (!res) return;
        const data = await res.json();
        
        const ctx = document.getElementById('revenueChart');
        if (!ctx) return;
        
        if (revenueChart) revenueChart.destroy();
        
        revenueChart = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Orders',
                        data: data.order_counts,
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointBackgroundColor: '#6366f1'
                    },
                    {
                        label: 'Revenue ($)',
                        data: data.revenues,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.05)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointBackgroundColor: '#10b981'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', align: 'end' }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    } catch (err) {
        console.error('Chart load error:', err);
    }
}

async function refreshChart() {
    showToast('Refreshing chart...', 'warning', 'Loading');
    await loadChart();
}

// ============================================
// REAL-TIME MONITORING
// ============================================
function startRealtimeMonitoring() {
    async function fetchStatus() {
        try {
            const res = await fetchWithAuth(`${API_URL}/admin/realtime-status`);
            if (!res) return;
            const data = await res.json();
            
            const rtActive = document.getElementById('rt-active');
            const rtNewUsers = document.getElementById('rt-new-users');
            const rtNewOrders = document.getElementById('rt-new-orders');
            const rtLowStock = document.getElementById('rt-low-stock');
            const lastUpdate = document.getElementById('lastUpdate');
            
            if (rtActive) rtActive.innerText = data.active_orders;
            if (rtNewUsers) rtNewUsers.innerText = data.new_users_today;
            if (rtNewOrders) rtNewOrders.innerText = data.new_orders_today;
            if (rtLowStock) rtLowStock.innerText = data.low_stock_count;
            if (lastUpdate) lastUpdate.innerText = 'Updated just now';
        } catch (e) {
            console.error('Realtime error:', e);
        }
    }
    
    fetchStatus();
    clearInterval(realtimeInterval);
    realtimeInterval = setInterval(fetchStatus, 10000);
}

// ============================================
// PRODUCTS
// ============================================
async function loadProducts() {
    try {
        const res = await fetch(`${API_URL}/products`);
        const data = await res.json();
        const tbody = document.getElementById('product-table-body');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        const products = data.products || data || [];
        
        if (products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No products found</td></tr>';
            return;
        }
        
        products.forEach(p => {
            const imgUrl = p.image_url ? `${API_URL}${p.image_url}` : 'https://via.placeholder.com/50';
            const stockColor = p.stock <= (p.min_stock || 5) ? 'var(--danger)' : 'var(--success)';
            tbody.innerHTML += `
                <tr>
                    <td><img src="${imgUrl}" class="product-img" onerror="this.src='https://via.placeholder.com/50'"></td>
                    <td><strong>${p.name}</strong><br><small style="color:var(--text-secondary);">${p.sku || '-'}</small></td>
                    <td>$${p.price}</td>
                    <td><span style="color:${stockColor}; font-weight:600;">${p.stock}</span></td>
                    <td>${p.category || '-'}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="editProduct(${p.id})"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-danger" onclick="deleteProduct(${p.id})"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`;
        });
    } catch (err) {
        console.error('Products load error:', err);
        showToast('Failed to load products', 'error');
    }
}

function openProductModal() {
    document.getElementById('productModalTitle').innerText = 'បន្ថែមផលិតផលថ្មី';
    document.getElementById('productForm').reset();
    document.getElementById('prodId').value = '';
    document.getElementById('productModal').classList.add('active');
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
}

async function editProduct(id) {
    try {
        const res = await fetchWithAuth(`${API_URL}/products/${id}`);
        if (!res) return;
        const p = await res.json();
        
        document.getElementById('productModalTitle').innerText = 'កែសម្រួលផលិតផល';
        document.getElementById('prodId').value = p.id;
        document.getElementById('prodName').value = p.name;
        document.getElementById('prodPrice').value = p.price;
        document.getElementById('prodCost').value = p.cost_price || 0;
        document.getElementById('prodStock').value = p.stock;
        document.getElementById('prodMinStock').value = p.min_stock || 5;
        document.getElementById('prodCategory').value = p.category || '';
        document.getElementById('prodSku').value = p.sku || '';
        document.getElementById('prodDesc').value = p.description || '';
        document.getElementById('productModal').classList.add('active');
    } catch (err) {
        showToast('Failed to load product', 'error');
    }
}

async function handleProductSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('prodId').value;
    const fileInput = document.getElementById('prodImage');
    let imageUrl = '';
    
    if (fileInput.files.length > 0) {
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        try {
            const res = await fetch(`${API_URL}/admin/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${getToken()}` },
                body: formData
            });
            const data = await res.json();
            if (data.url) imageUrl = data.url;
        } catch (err) {
            console.error('Upload error:', err);
        }
    }
    
    const productData = {
        name: document.getElementById('prodName').value,
        price: parseFloat(document.getElementById('prodPrice').value),
        cost_price: parseFloat(document.getElementById('prodCost').value) || 0,
        stock: parseInt(document.getElementById('prodStock').value),
        min_stock: parseInt(document.getElementById('prodMinStock').value) || 5,
        category: document.getElementById('prodCategory').value,
        sku: document.getElementById('prodSku').value,
        description: document.getElementById('prodDesc').value,
        image_url: imageUrl
    };
    
    try {
        if (id) {
            await fetchWithAuth(`${API_URL}/admin/products/${id}`, {
                method: 'PUT',
                body: JSON.stringify(productData)
            });
            showToast('ផលិតផលត្រូវបានកែសម្រួល!', 'success');
        } else {
            await fetchWithAuth(`${API_URL}/admin/products`, {
                method: 'POST',
                body: JSON.stringify(productData)
            });
            showToast('ផលិតផលត្រូវបានបន្ថែម!', 'success');
        }
        closeProductModal();
        loadProducts();
    } catch (err) {
        showToast('មានកំហុសក្ុងការរក្សាទុក', 'error');
    }
}

async function deleteProduct(id) {
    if (!confirm('តើអ្នកប្រាកដជាចង់លុបផលិតផលនេះ?')) return;
    try {
        await fetchWithAuth(`${API_URL}/admin/products/${id}`, { method: 'DELETE' });
        showToast('ផលិតផលត្រូវបានលុប!', 'success');
        loadProducts();
    } catch (err) {
        showToast('មានកំហុសក្នុងការលុប', 'error');
    }
}

// ============================================
// ORDERS
// ============================================
async function loadOrders() {
    try {
        const res = await fetchWithAuth(`${API_URL}/admin/orders`);
        if (!res) return;
        const data = await res.json();
        const tbody = document.getElementById('order-table-body');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        const orders = data.orders || data || [];
        
        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No orders yet</td></tr>';
            return;
        }
        
        orders.forEach(o => {
            const statusClass = o.status || 'pending';
            tbody.innerHTML += `
                <tr>
                    <td><strong>#${o.order_number || o.id}</strong></td>
                    <td>
                        <div class="customer-cell">
                            <div class="customer-avatar" style="background:linear-gradient(135deg,#6366f1,#818cf8);">
                                ${(o.customer_name || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div class="customer-name">${o.customer_name}</div>
                                <div class="customer-email">${o.customer_email}</div>
                            </div>
                        </div>
                    </td>
                    <td><strong>$${o.total_price}</strong></td>
                    <td><span class="status-badge ${statusClass}">${statusClass}</span></td>
                    <td>${new Date(o.created_at).toLocaleDateString()}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="viewOrder(${o.id})"><i class="fas fa-eye"></i></button>
                        <button class="btn btn-sm btn-success" onclick="printInvoice(${o.id})"><i class="fas fa-print"></i></button>
                    </td>
                </tr>`;
        });
    } catch (err) {
        console.error('Orders load error:', err);
    }
}

async function viewOrder(id) {
    try {
        const res = await fetchWithAuth(`${API_URL}/admin/orders/${id}`);
        if (!res) return;
        const order = await res.json();
        
        const itemsList = order.items.map(i => 
            `- ${i.product_name} x${i.quantity} = $${i.subtotal}`
        ).join('\n');
        
        alert(`Order #${order.order_number}\nCustomer: ${order.customer_name}\nTotal: $${order.total_price}\nStatus: ${order.status}\n\nItems:\n${itemsList}`);
    } catch (err) {
        showToast('Failed to load order', 'error');
    }
}

async function printInvoice(id) {
    try {
        const res = await fetchWithAuth(`${API_URL}/admin/orders/${id}`);
        if (!res) return;
        const order = await res.json();
        
        const content = document.getElementById('invoice-content');
        if (!content) return;
        
        content.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
                <div>
                    <strong>Invoice #:</strong> ${order.order_number || order.id}<br>
                    <strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString()}
                </div>
                <div style="text-align:right;">
                    <strong>Customer:</strong><br>
                    ${order.customer_name}<br>
                    ${order.customer_email}<br>
                    ${order.customer_phone || ''}
                </div>
            </div>
            <table style="width:100%; border-collapse:collapse; margin:20px 0;">
                <thead>
                    <tr style="background:#f1f5f9;">
                        <th style="padding:10px; text-align:left;">Product</th>
                        <th style="padding:10px;">Qty</th>
                        <th style="padding:10px;">Price</th>
                        <th style="padding:10px;">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${order.items.map(i => `
                        <tr style="border-bottom:1px solid #e2e8f0;">
                            <td style="padding:10px;">${i.product_name}</td>
                            <td style="padding:10px; text-align:center;">${i.quantity}</td>
                            <td style="padding:10px; text-align:right;">$${i.price}</td>
                            <td style="padding:10px; text-align:right;">$${i.subtotal}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div style="text-align:right; font-size:18px; margin-top:20px;">
                ${order.discount_code ? `<p>Discount (${order.discount_code}): -$${order.discount_amount}</p>` : ''}
                <p><strong>Total: $${order.total_price}</strong></p>
                <p style="font-size:14px;">Status: ${order.status} | Payment: ${order.payment_status}</p>
            </div>
        `;
        
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head><title>Invoice #${order.order_number || order.id}</title></head>
                    <body>${document.getElementById('invoice-print').innerHTML}</body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
        }
    } catch (err) {
        showToast('Failed to print invoice', 'error');
    }
}

// ============================================
// USERS
// ============================================
async function loadUsers() {
    try {
        const res = await fetchWithAuth(`${API_URL}/admin/users`);
        if (!res) return;
        const data = await res.json();
        const tbody = document.getElementById('user-table-body');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        const users = data.users || data || [];
        
        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No users registered yet.</td></tr>';
            return;
        }
        
        users.forEach(u => {
            const statusClass = u.is_banned ? 'banned' : 'active';
            const statusText = u.is_banned ? 'Banned' : 'Active';
            const actionBtn = u.is_banned 
                ? `<button class="btn btn-sm btn-success" onclick="openBanModal(${u.id}, '${u.name}', false)"><i class="fas fa-unlock"></i> Unban</button>`
                : `<button class="btn btn-sm btn-danger" onclick="openBanModal(${u.id}, '${u.name}', true)"><i class="fas fa-ban"></i> Ban</button>`;
            
            tbody.innerHTML += `
                <tr>
                    <td>
                        <div class="customer-cell">
                            <div class="customer-avatar" style="background:linear-gradient(135deg,#6366f1,#818cf8);">
                                ${(u.name || '?').charAt(0).toUpperCase()}
                            </div>
                            <strong>${u.name}</strong>
                        </div>
                    </td>
                    <td>${u.email}</td>
                    <td><span class="status-badge active">${u.role}</span></td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>${actionBtn}</td>
                </tr>`;
        });
    } catch (err) {
        console.error('Users load error:', err);
    }
}

function openBanModal(userId, userName, isBan) {
    document.getElementById('banUserId').value = userId;
    document.getElementById('banAction').value = isBan ? 'ban' : 'unban';
    document.getElementById('banModalTitle').innerText = isBan ? `Ban ${userName}` : `Unban ${userName}`;
    document.getElementById('banReasonGroup').style.display = isBan ? 'block' : 'none';
    document.getElementById('banSubmitBtn').innerHTML = isBan 
        ? '<i class="fas fa-ban"></i> Ban' 
        : '<i class="fas fa-unlock"></i> Unban';
    document.getElementById('banSubmitBtn').className = isBan ? 'btn btn-danger' : 'btn btn-success';
    document.getElementById('banModal').classList.add('active');
}

function closeBanModal() {
    document.getElementById('banModal').classList.remove('active');
}

async function handleBanSubmit(e) {
    e.preventDefault();
    const userId = document.getElementById('banUserId').value;
    const action = document.getElementById('banAction').value;
    const reason = document.getElementById('banReason').value;
    
    try {
        await fetchWithAuth(`${API_URL}/admin/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify({
                is_banned: action === 'ban',
                banned_reason: reason
            })
        });
        showToast(action === 'ban' ? 'User banned!' : 'User unbanned!', 'success');
        closeBanModal();
        loadUsers();
    } catch (err) {
        showToast('Failed to update user', 'error');
    }
}

// ============================================
// DISCOUNTS
// ============================================
async function loadDiscounts() {
    try {
        const res = await fetchWithAuth(`${API_URL}/admin/discounts`);
        if (!res) return;
        const data = await res.json();
        const tbody = document.getElementById('discount-table-body');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No discount codes yet</td></tr>';
            return;
        }
        
        data.forEach(d => {
            const statusClass = d.is_expired || !d.is_active ? 'cancelled' : 'active';
            const statusText = d.is_expired ? 'Expired' : (!d.is_active ? 'Inactive' : 'Active');
            tbody.innerHTML += `
                <tr>
                    <td><strong style="color:var(--primary); font-family:monospace;">${d.code}</strong></td>
                    <td>${d.description || '-'}</td>
                    <td>${d.percent}%</td>
                    <td>${d.used} / ${d.limit === 999999 ? '∞' : d.limit}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td><button class="btn btn-sm btn-danger" onclick="deleteDiscount(${d.id})"><i class="fas fa-trash"></i></button></td>
                </tr>`;
        });
    } catch (err) {
        console.error('Discounts load error:', err);
    }
}

function openDiscountModal() {
    document.getElementById('discountForm').reset();
    document.getElementById('discLimitGroup').style.display = 'none';
    document.getElementById('discExpiryGroup').style.display = 'none';
    document.getElementById('discountModal').classList.add('active');
}

function closeDiscountModal() {
    document.getElementById('discountModal').classList.remove('active');
}

function toggleDiscLimit() {
    const type = document.getElementById('discLimitType').value;
    document.getElementById('discLimitGroup').style.display = type === 'fixed' ? 'block' : 'none';
}

function toggleDiscExpiry() {
    const type = document.getElementById('discExpiryType').value;
    document.getElementById('discExpiryGroup').style.display = type === 'unlimited' ? 'none' : 'block';
}

async function handleDiscountSubmit(e) {
    e.preventDefault();
    const data = {
        code: document.getElementById('discCode').value.toUpperCase(),
        description: document.getElementById('discDesc').value,
        percent: parseFloat(document.getElementById('discPercent').value),
        min_purchase: parseFloat(document.getElementById('discMinPurchase').value) || 0,
        max_discount: parseFloat(document.getElementById('discMaxDiscount').value) || 999999,
        limit_type: document.getElementById('discLimitType').value,
        limit: document.getElementById('discLimitType').value === 'fixed' 
            ? parseInt(document.getElementById('discLimit').value) 
            : 999999,
        expiry_type: document.getElementById('discExpiryType').value,
        expiry_value: document.getElementById('discExpiryType').value !== 'unlimited'
            ? parseInt(document.getElementById('discExpiryValue').value)
            : null
    };
    
    try {
        await fetchWithAuth(`${API_URL}/admin/discounts`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        showToast('កូដបញ្ចុះតម្លៃត្រូវបានបង្កើត!', 'success');
        closeDiscountModal();
        loadDiscounts();
    } catch (err) {
        showToast('មានកំហុសក្នុងការបង្កើតកូដ', 'error');
    }
}

async function deleteDiscount(id) {
    if (!confirm('តើអ្នកប្រាកដជាចង់លុបកូដនេះ?')) return;
    try {
        await fetchWithAuth(`${API_URL}/admin/discounts/${id}`, { method: 'DELETE' });
        showToast('កូដត្រូវបានលុប!', 'success');
        loadDiscounts();
    } catch (err) {
        showToast('មានកំហុសក្នុងការលុប', 'error');
    }
}

// ============================================
// STOCK MANAGEMENT
// ============================================
async function loadStock() {
    try {
        const res = await fetch(`${API_URL}/products`);
        const data = await res.json();
        const tbody = document.getElementById('stock-table-body');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        const products = data.products || data || [];
        let total = 0, low = 0, ok = 0;
        
        if (products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No products</td></tr>';
            return;
        }
        
        products.forEach(p => {
            total++;
            if (p.stock <= (p.min_stock || 5)) low++;
            else ok++;
            
            const stockColor = p.stock <= (p.min_stock || 5) ? 'var(--danger)' : 'var(--success)';
            tbody.innerHTML += `
                <tr>
                    <td><strong>${p.name}</strong></td>
                    <td><code>${p.sku || '-'}</code></td>
                    <td><span style="color:${stockColor}; font-weight:700; font-size:16px;">${p.stock}</span></td>
                    <td>${p.min_stock || 5}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="openStockModal(${p.id}, '${p.name}', ${p.stock})">
                            <i class="fas fa-edit"></i> កែស្តុក
                        </button>
                    </td>
                </tr>`;
        });
        
        const stockTotal = document.getElementById('stock-total');
        const stockLow = document.getElementById('stock-low');
        const stockOk = document.getElementById('stock-ok');
        if (stockTotal) stockTotal.innerText = total;
        if (stockLow) stockLow.innerText = low;
        if (stockOk) stockOk.innerText = ok;
    } catch (err) {
        console.error('Stock load error:', err);
    }
}

function openStockModal(productId, productName, currentStock) {
    document.getElementById('stockProductId').value = productId;
    document.getElementById('stockProductName').value = productName;
    document.getElementById('stockCurrent').value = currentStock;
    document.getElementById('stockForm').reset();
    document.getElementById('stockProductId').value = productId;
    document.getElementById('stockProductName').value = productName;
    document.getElementById('stockCurrent').value = currentStock;
    document.getElementById('stockModal').classList.add('active');
}

function closeStockModal() {
    document.getElementById('stockModal').classList.remove('active');
}

async function handleStockSubmit(e) {
    e.preventDefault();
    const productId = document.getElementById('stockProductId').value;
    const type = document.getElementById('stockType').value;
    let quantity = parseInt(document.getElementById('stockQuantity').value);
    
    if (type === 'sale') quantity = -quantity;
    
    const data = {
        product_id: parseInt(productId),
        quantity: quantity,
        movement_type: type,
        notes: document.getElementById('stockNotes').value,
        created_by: 'Admin'
    };
    
    try {
        await fetchWithAuth(`${API_URL}/admin/stock-movements`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        showToast('ស្តុកត្រូវបានកែសម្រួល!', 'success');
        closeStockModal();
        loadStock();
    } catch (err) {
        showToast('មានកំហុសក្នុងការកែស្តុក', 'error');
    }
}

// ============================================
// SETTINGS
// ============================================
async function loadSettings() {
    try {
        const res = await fetchWithAuth(`${API_URL}/admin/settings`);
        if (!res) return;
        const data = await res.json();
        
        const storeName = document.getElementById('setting-store-name');
        const email = document.getElementById('setting-email');
        const phone = document.getElementById('setting-phone');
        const address = document.getElementById('setting-address');
        
        if (storeName) storeName.value = data.store_name || '';
        if (email) email.value = data.admin_email || '';
        if (phone) phone.value = data.phone || '';
        if (address) address.value = data.address || '';
    } catch (err) {
        console.error('Settings load error:', err);
    }
}

async function saveSettings() {
    const data = {
        store_name: document.getElementById('setting-store-name').value,
        admin_email: document.getElementById('setting-email').value,
        phone: document.getElementById('setting-phone').value,
        address: document.getElementById('setting-address').value
    };
    
    try {
        await fetchWithAuth(`${API_URL}/admin/settings`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        showToast('ការកំណត់ត្រូវបានរកសាទុក!', 'success');
    } catch (err) {
        showToast('មានកំហុសក្នុងការរក្សាទុក', 'error');
    }
}

// ============================================
// INVENTORY ALERTS
// ============================================
function showInventoryAlerts() {
    fetchWithAuth(`${API_URL}/admin/inventory-alerts`)
        .then(res => res ? res.json() : null)
        .then(alerts => {
            if (!alerts) return;
            const list = document.getElementById('inventory-list');
            if (!list) return;
            
            if (alerts.length === 0) {
                list.innerHTML = '<p style="text-align:center; color:var(--text-secondary); padding:20px;"><i class="fas fa-check-circle" style="color:var(--success); font-size:40px; margin-bottom:10px; display:block;"></i>All products are well stocked!</p>';
            } else {
                list.innerHTML = alerts.map(a => `
                    <div style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid var(--border); border-radius:8px; margin-bottom:8px; background:${a.status === 'Out of Stock' ? 'rgba(239,68,68,0.05)' : 'rgba(245,158,11,0.05)'};">
                        <div style="width:40px; height:40px; border-radius:8px; background:${a.status === 'Out of Stock' ? 'var(--danger)' : 'var(--warning)'}; color:white; display:flex; align-items:center; justify-content:center;">
                            <i class="fas fa-${a.status === 'Out of Stock' ? 'times' : 'exclamation'}"></i>
                        </div>
                        <div style="flex:1;">
                            <div style="font-weight:600;">${a.name}</div>
                            <div style="font-size:12px; color:var(--text-secondary);">${a.status} - ${a.stock} left</div>
                        </div>
                    </div>
                `).join('');
            }
            document.getElementById('inventoryModal').classList.add('active');
        });
}

function closeInventoryModal() {
    document.getElementById('inventoryModal').classList.remove('active');
}

// ============================================
// LOGOUT
// ============================================
function handleLogout() {
    if (!confirm('តើអ្នកបរាកដជាចង់ចាកចេញ?')) return;
    clearToken();
    window.location.href = 'loginadmin.html';
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+K: Search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            showToast('Search feature coming soon!', 'warning', 'Shortcut');
        }
        // Ctrl+N: New Product
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            const productsSection = document.getElementById('section-products');
            if (productsSection && productsSection.classList.contains('active')) {
                openProductModal();
            } else {
                switchSection('products');
                setTimeout(openProductModal, 100);
            }
        }
        // Escape: Close modals
        if (e.key === 'Escape') {
            closeProductModal();
            closeDiscountModal();
            closeInventoryModal();
            closeStockModal();
            closeBanModal();
        }
        // Alt+D: Dashboard
        if (e.altKey && e.key === 'd') {
            e.preventDefault();
            switchSection('dashboard');
        }
    });
}

// ============================================
// MODAL CLOSE HANDLERS
// ============================================
function setupModalCloseHandlers() {
    document.querySelectorAll('.modal').forEach(m => {
        m.addEventListener('click', (e) => {
            if (e.target === m) m.classList.remove('active');
        });
    });
}

// ============================================
// DEBUG: Global error handler
// ============================================
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
});
