let editingProductId = null;
let revenueChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('admin_logged_in') !== 'true') {
        window.location.href = 'login/';
        return;
    }
    initNavigation();
    loadSection('overview');
});

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
    const loaders = { overview: loadOverview, products: loadProducts, orders: loadOrders, users: loadUsers, tickets: loadTickets, discounts: loadDiscounts, settings: loadSettings };
    if (loaders[section]) loaders[section]();
}

async function loadOverview() {
    try {
        const stats = await API.getStats();
        document.getElementById('stats-grid').innerHTML = `
            <div class="stat-card"><div class="stat-label">Total Revenue</div><div class="stat-value">$${stats.total_revenue?.toFixed(2) || '0'}</div></div>
            <div class="stat-card"><div class="stat-label">Total Orders</div><div class="stat-value">${stats.total_orders || 0}</div></div>
            <div class="stat-card"><div class="stat-label">Total Plugins</div><div class="stat-value">${stats.total_products || 0}</div></div>
            <div class="stat-card"><div class="stat-label">Total Users</div><div class="stat-value">${stats.total_users || 0}</div></div>
        `;
        renderRevenueChart();
        loadRecentOrders();
    } catch (e) { document.getElementById('stats-grid').innerHTML = '<p class="empty-state">Failed to load stats</p>'; }
}

function renderRevenueChart() {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    if (revenueChartInstance) revenueChartInstance.destroy();
    revenueChartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], datasets: [{ label: 'Revenue ($)', data: [120, 190, 150, 250, 220, 300, 280], borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', tension: 0.4, fill: true }] },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#334155' } }, x: { grid: { display: false } } } }
    });
}

async function loadRecentOrders() {
    try {
        const orders = (await API.getOrders()).slice(0, 5);
        document.getElementById('recent-orders-list').innerHTML = orders.map(o => `
            <div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border);">
                <div><strong style="color:white;">#${o.id}</strong><br><small style="color:var(--text-muted)">${o.customer_name}</small></div>
                <div style="text-align:right"><strong style="color:var(--primary);">$${o.total_price.toFixed(2)}</strong><br><span class="badge ${o.status==='completed'?'badge-success':'badge-warning'}">${o.status}</span></div>
            </div>
        `).join('') || '<p class="empty-state">No recent orders</p>';
    } catch (e) {}
}

async function loadProducts() {
    try {
        const products = await API.getProducts();
        document.getElementById('products-tbody').innerHTML = products.map(p => `
            <tr>
                <td>#${p.id}</td>
                <td><div style="display:flex;align-items:center;gap:10px;"><img src="${p.image_url?API_BASE+p.image_url:''}" style="width:40px;height:40px;border-radius:8px;object-fit:cover;" onerror="this.style.display='none'"><span style="font-weight:600;">${p.name}</span></div></td>
                <td><strong style="color:var(--primary);">$${p.price.toFixed(2)}</strong></td>
                <td><span class="badge ${p.stock>0?'badge-success':'badge-danger'}">${p.stock}</span></td>
                <td>${p.sales_count || 0}</td>
                <td><div style="display:flex;gap:8px;"><button class="btn btn-outline btn-sm" onclick="editProduct(${p.id})"><i class="fas fa-edit"></i></button><button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id},'${p.name.replace(/'/g,"\\'")}')"><i class="fas fa-trash"></i></button></div></td>
            </tr>
        `).join('') || '<tr><td colspan="6"><p class="empty-state">No products found</p></td></tr>';
    } catch (e) { document.getElementById('products-tbody').innerHTML = '<tr><td colspan="6"><p class="empty-state">Failed to load</p></td></tr>'; }
}

function openProductModal() {
    editingProductId = null;
    document.getElementById('modal-product-title').textContent = 'Add New Plugin';
    document.getElementById('product-form').reset();
    document.getElementById('product-modal').classList.add('show');
}

async function editProduct(id) {
    try {
        const p = await API.getProduct(id);
        editingProductId = id;
        document.getElementById('modal-product-title').textContent = 'Edit Plugin';
        document.getElementById('prod-name').value = p.name;
        document.getElementById('prod-price').value = p.price;
        document.getElementById('prod-stock').value = p.stock;
        document.getElementById('prod-desc').value = p.description || '';
        document.getElementById('prod-image-url').value = p.image_url || '';
        document.getElementById('prod-file-url').value = p.file_url || '';
        document.getElementById('product-modal').classList.add('show');
    } catch (e) { showToast('Failed to load product', 'error'); }
}

async function saveProduct(e) {
    e.preventDefault();
    const data = { name: document.getElementById('prod-name').value, price: parseFloat(document.getElementById('prod-price').value), stock: parseInt(document.getElementById('prod-stock').value) || 0, description: document.getElementById('prod-desc').value, image_url: document.getElementById('prod-image-url').value, file_url: document.getElementById('prod-file-url').value };
    try {
        if (editingProductId) { await API.updateProduct(editingProductId, data); showToast('Plugin updated!', 'success'); } 
        else { await API.addProduct(data); showToast('Plugin added!', 'success'); }
        closeModal('product-modal'); loadProducts();
    } catch (err) { showToast('Failed to save plugin', 'error'); }
}

async function deleteProduct(id, name) {
    if (!confirm(`Delete "${name}"?`)) return;
    try { await API.deleteProduct(id); showToast('Plugin deleted!', 'success'); loadProducts(); } catch (e) { showToast('Failed to delete', 'error'); }
}

async function loadOrders() {
    try {
        const orders = await API.getOrders();
        document.getElementById('orders-tbody').innerHTML = orders.map(o => `
            <tr>
                <td>#${o.id}</td><td><strong>${o.customer_name}</strong><br><small style="color:var(--text-muted)">${o.customer_email}</small></td>
                <td><strong style="color:var(--primary);">$${o.total_price.toFixed(2)}</strong></td>
                <td><span class="badge ${o.status==='completed'?'badge-success':o.status==='cancelled'?'badge-danger':'badge-warning'}">${o.status}</span></td>
                <td>${new Date(o.created_at).toLocaleDateString()}</td>
                <td><button class="btn btn-outline btn-sm" onclick="alert('Order #${o.id}\\nTotal: $${o.total_price.toFixed(2)}\\nItems: ${o.items.map(i=>i.product_name).join(', ')}')"><i class="fas fa-eye"></i> View</button></td>
            </tr>
        `).join('') || '<tr><td colspan="6"><p class="empty-state">No orders yet</p></td></tr>';
    } catch (e) { document.getElementById('orders-tbody').innerHTML = '<tr><td colspan="6"><p class="empty-state">Failed to load</p></td></tr>'; }
}

async function loadUsers() {
    try {
        const users = await API.getUsers();
        document.getElementById('users-tbody').innerHTML = users.map(u => `
            <tr>
                <td>#${u.id}</td><td><strong>${u.name}</strong></td><td>${u.email}</td>
                <td><span class="badge ${u.status==='banned'?'badge-danger':'badge-success'}">${u.status}</span></td>
                <td><div style="display:flex;gap:8px;">
                    ${u.status==='banned' ? `<button class="btn btn-success btn-sm" onclick="unbanUser(${u.id})"><i class="fas fa-check"></i> Unban</button>` : `<button class="btn btn-warning btn-sm" onclick="banUser(${u.id})"><i class="fas fa-ban"></i> Ban</button>`}
                    <button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id},'${u.name.replace(/'/g,"\\'")}')"><i class="fas fa-trash"></i></button>
                </div></td>
            </tr>
        `).join('') || '<tr><td colspan="5"><p class="empty-state">No users registered</p></td></tr>';
    } catch (e) { document.getElementById('users-tbody').innerHTML = '<tr><td colspan="5"><p class="empty-state">Failed to load</p></td></tr>'; }
}

async function banUser(id) { if (!confirm('Ban this user?')) return; try { await API.banUser(id); showToast('User banned', 'success'); loadUsers(); } catch (e) { showToast('Failed', 'error'); } }
async function unbanUser(id) { if (!confirm('Unban this user?')) return; try { await API.unbanUser(id); showToast('User unbanned', 'success'); loadUsers(); } catch (e) { showToast('Failed', 'error'); } }
async function deleteUser(id, name) { if (!confirm(`Delete "${name}" permanently?`)) return; try { await API.deleteUser(id); showToast('User deleted', 'success'); loadUsers(); } catch (e) { showToast('Failed', 'error'); } }

async function loadTickets() {
    try {
        const tickets = await API.getTickets();
        document.getElementById('tickets-tbody').innerHTML = tickets.map(t => `
            <tr>
                <td>#${t.id}</td><td><strong>${t.name}</strong><br><small style="color:var(--text-muted)">${t.email}</small></td>
                <td>${t.subject}</td>
                <td><span class="badge ${t.status==='open'?'badge-success':t.status==='closed'?'badge-danger':'badge-warning'}">${t.status}</span></td>
                <td>${new Date(t.date).toLocaleDateString()}</td>
                <td><button class="btn btn-success btn-sm" onclick="closeTicket(${t.id})"><i class="fas fa-check"></i> Close</button></td>
            </tr>
        `).join('') || '<tr><td colspan="6"><p class="empty-state">No tickets found</p></td></tr>';
    } catch (e) { document.getElementById('tickets-tbody').innerHTML = '<tr><td colspan="6"><p class="empty-state">Failed to load</p></td></tr>'; }
}

async function closeTicket(id) { if (!confirm('Close this ticket?')) return; try { await API.closeTicket(id); showToast('Ticket closed', 'success'); loadTickets(); } catch (e) { showToast('Failed', 'error'); } }

async function loadDiscounts() {
    try {
        const discounts = await API.getDiscounts();
        document.getElementById('discounts-tbody').innerHTML = discounts.map(d => `
            <tr>
                <td><strong>${d.code}</strong></td><td><span class="badge badge-success">${d.percent}%</span></td>
                <td>${d.used_count}</td><td>${d.max_uses}</td>
                <td>${d.expires_at ? new Date(d.expires_at).toLocaleDateString() : 'Never'}</td>
                <td><button class="btn btn-danger btn-sm" onclick="showToast('Delete not implemented yet', 'info')"><i class="fas fa-trash"></i></button></td>
            </tr>
        `).join('') || '<tr><td colspan="6"><p class="empty-state">No discount codes</p></td></tr>';
    } catch (e) { document.getElementById('discounts-tbody').innerHTML = '<tr><td colspan="6"><p class="empty-state">Failed to load</p></td></tr>'; }
}

function openDiscountModal() { document.getElementById('discount-form').reset(); document.getElementById('discount-modal').classList.add('show'); }

async function saveDiscount(e) {
    e.preventDefault();
    const data = { code: document.getElementById('disc-code').value, percent: parseFloat(document.getElementById('disc-percent').value), max_uses: parseInt(document.getElementById('disc-max-uses').value) || 100, expires_at: document.getElementById('disc-expires').value || null };
    try { await API.addDiscount(data); showToast('Discount code created!', 'success'); closeModal('discount-modal'); loadDiscounts(); } catch (err) { showToast('Failed to create code', 'error'); }
}

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

function closeModal(id) { document.getElementById(id).classList.remove('show'); }

function showToast(msg, type = 'info') {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `<i class="fas ${type==='success'?'fa-check-circle':type==='error'?'fa-exclamation-circle':'fa-info-circle'}"></i> ${msg}`;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity='0'; t.style.transform='translateX(100%)'; t.style.transition='all 0.4s'; setTimeout(()=>t.remove(),400); }, 3000);
}

function toggleSidebar() { document.querySelector('.sidebar').classList.toggle('open'); }

function logout() {
    if(confirm('Log out from Admin Panel?')) {
        localStorage.removeItem('admin_logged_in');
        localStorage.removeItem('admin_email');
        window.location.href = 'login/';
    }
}

document.addEventListener('click', (e) => { if(e.target.classList.contains('modal-overlay')) e.target.classList.remove('show'); });
