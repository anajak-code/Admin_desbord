// ============================================
// DASHBOARD
// ============================================
async function loadDashboard() {
    console.log('🔄 Loading dashboard...');
    
    const token = getToken();
    if (!token) {
        console.error('❌ No token - redirecting');
        window.location.href = 'login/index.html';
        return;
    }
    
    try {
        const res = await fetchWithAuth(`${API_URL}/admin/stats`);
        
        if (!res) {
            showErrorMessage('Cannot connect to server');
            return;
        }
        
        if (res.status !== 200) {
            showErrorMessage(`Server error: ${res.status}`);
            return;
        }
        
        const stats = await res.json();
        console.log('✅ Stats loaded:', stats);
        
        const revenueEl = document.getElementById('stat-revenue');
        const ordersEl = document.getElementById('stat-orders');
        const productsEl = document.getElementById('stat-products');
        const usersEl = document.getElementById('stat-users');
        
        if (revenueEl) revenueEl.innerText = `$${(stats.total_revenue || 0).toLocaleString()}`;
        if (ordersEl) ordersEl.innerText = stats.total_orders || 0;
        if (productsEl) productsEl.innerText = stats.total_products || 0;
        if (usersEl) usersEl.innerText = stats.total_users || 0;
        
        const pendingBadge = document.getElementById('pending-orders-badge');
        if (pendingBadge) pendingBadge.innerText = stats.pending_orders || 0;
        
        const notifBadge = document.getElementById('notif-badge');
        if (notifBadge) {
            const total = (stats.low_stock_count || 0) + (stats.pending_orders || 0);
            notifBadge.innerText = total;
            notifBadge.style.display = total > 0 ? 'flex' : 'none';
        }
        
        const rtActive = document.getElementById('rt-active');
        const rtNewUsers = document.getElementById('rt-new-users');
        const rtNewOrders = document.getElementById('rt-new-orders');
        const rtLowStock = document.getElementById('rt-low-stock');
        
        if (rtActive) rtActive.innerText = stats.pending_orders || 0;
        if (rtNewUsers) rtNewUsers.innerText = stats.total_users || 0;
        if (rtNewOrders) rtNewOrders.innerText = stats.total_orders || 0;
        if (rtLowStock) rtLowStock.innerText = stats.low_stock_count || 0;
        
        await loadChart();
        
    } catch (err) {
        console.error('❌ Dashboard error:', err);
        showErrorMessage('Failed to load data: ' + err.message);
    }
}

async function loadChart() {
    try {
        const res = await fetchWithAuth(`${API_URL}/admin/order-analytics`);
        if (!res) return;
        
        const data = await res.json();
        const ctx = document.getElementById('revenueChart');
        
        if (!ctx) {
            console.warn('⚠️ revenueChart not found');
            return;
        }
        
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
                        fill: true, tension: 0.4 
                    },
                    { 
                        label: 'Revenue ($)', 
                        data: data.revenues, 
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.05)',
                        fill: true, tension: 0.4 
                    }
                ]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top', align: 'end' } },
                scales: { y: { beginAtZero: true } }
            }
        });
    } catch (err) {
        console.error('❌ Chart error:', err);
    }
}

async function refreshChart() { 
    showToast('Refreshing chart...', 'warning'); 
    await loadChart(); 
}

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
            console.error('⚠️ Realtime error:', e); 
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
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">No products found</td></tr>';
            return;
        }
        
        products.forEach(p => {
            const imgUrl = p.image_url ? `${API_URL}${p.image_url}` : 'https://via.placeholder.com/50';
            const stockColor = p.stock <= (p.min_stock || 5) ? 'var(--danger)' : 'var(--success)';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img src="${imgUrl}" class="product-img" onerror="this.src='https://via.placeholder.com/50'"></td>
                <td><strong>${p.name}</strong><br><small style="color:var(--text-secondary);">${p.sku || '-'}</small></td>
                <td>$${p.price}</td>
                <td><span style="color:${stockColor}; font-weight:600;">${p.stock}</span></td>
                <td>${p.category || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-primary" data-action="edit" data-id="${p.id}"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" data-action="delete" data-id="${p.id}"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        // Attach event listeners
        tbody.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', () => editProduct(parseInt(btn.dataset.id)));
        });
        tbody.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', () => deleteProduct(parseInt(btn.dataset.id)));
        });
        
    } catch (err) { 
        console.error('❌ Products error:', err); 
        showToast('Failed to load products', 'error'); 
    }
}

async function editProduct(id) {
    console.log('✏️ Editing product:', id);
    try {
        const res = await fetchWithAuth(`${API_URL}/products/${id}`);
        if (!res) return;
        const p = await res.json();
        
        const title = document.getElementById('productModalTitle');
        if (title) title.innerText = 'កែសម្រួលផលិតផល';
        
        const fields = {
            prodId: p.id, prodName: p.name, prodPrice: p.price,
            prodCost: p.cost_price || 0, prodStock: p.stock,
            prodMinStock: p.min_stock || 5, prodCategory: p.category || '',
            prodSku: p.sku || '', prodDesc: p.description || ''
        };
        
        Object.keys(fields).forEach(key => {
            const el = document.getElementById(key);
            if (el) el.value = fields[key];
        });
        
        const modal = document.getElementById('productModal');
        if (modal) modal.classList.add('active');
    } catch (err) { 
        showToast('Failed to load product', 'error'); 
    }
}

async function handleProductSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('prodId').value;
    const fileInput = document.getElementById('prodImage');
    let imageUrl = '';
    
    if (fileInput && fileInput.files.length > 0) {
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
            console.error('❌ Upload error:', err); 
        }
    }
    
    const getValue = (id) => {
        const el = document.getElementById(id);
        return el ? el.value : '';
    };
    
    const productData = { 
        name: getValue('prodName'), 
        price: parseFloat(getValue('prodPrice')), 
        cost_price: parseFloat(getValue('prodCost')) || 0, 
        stock: parseInt(getValue('prodStock')), 
        min_stock: parseInt(getValue('prodMinStock')) || 5, 
        category: getValue('prodCategory'), 
        sku: getValue('prodSku'), 
        description: getValue('prodDesc'), 
        image_url: imageUrl 
    };
    
    try {
        if (id) { 
            await fetchWithAuth(`${API_URL}/admin/products/${id}`, { 
                method: 'PUT', body: JSON.stringify(productData) 
            }); 
            showToast('ផលិតផលត្រូវបានកែសម្រួល!', 'success'); 
        } else { 
            await fetchWithAuth(`${API_URL}/admin/products`, { 
                method: 'POST', body: JSON.stringify(productData) 
            }); 
            showToast('ផលិតផលត្រូវបានបន្ថែម!', 'success'); 
        }
        closeProductModal(); 
        loadProducts();
    } catch (err) { 
        showToast('មានកំហុសក្នុងការរក្សាទុក', 'error'); 
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
        const orders = data.orders || [];
        
        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">No orders found</td></tr>';
            return;
        }
        
        orders.forEach(order => {
            const statusClass = order.status || 'pending';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>#${order.order_number || order.id}</strong></td>
                <td>
                    <div class="customer-cell">
                        <div class="customer-avatar">${(order.customer_name || '?').charAt(0).toUpperCase()}</div>
                        <div>
                            <div class="customer-name">${order.customer_name}</div>
                            <div class="customer-email">${order.customer_email}</div>
                        </div>
                    </div>
                </td>
                <td><strong>$${order.total_price}</strong></td>
                <td><span class="status-badge ${statusClass}">${statusClass}</span></td>
                <td>${new Date(order.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-primary" data-action="view" data-id="${order.id}"><i class="fas fa-eye"></i></button>
                    <button class="btn btn-sm btn-success" data-action="print" data-id="${order.id}"><i class="fas fa-print"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        tbody.querySelectorAll('[data-action="view"]').forEach(btn => {
            btn.addEventListener('click', () => viewOrder(parseInt(btn.dataset.id)));
        });
        tbody.querySelectorAll('[data-action="print"]').forEach(btn => {
            btn.addEventListener('click', () => printInvoice(parseInt(btn.dataset.id)));
        });
        
    } catch (err) {
        console.error('❌ Orders error:', err);
    }
}

async function viewOrder(id) {
    try {
        const res = await fetchWithAuth(`${API_URL}/admin/orders/${id}`);
        if (!res) return;
        const order = await res.json();
        const itemsList = order.items.map(i => `- ${i.product_name} x${i.quantity} = $${i.subtotal}`).join('\n');
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
            const invoicePrint = document.getElementById('invoice-print');
            if (invoicePrint) {
                printWindow.document.write(`<html><head><title>Invoice #${order.order_number || order.id}</title></head><body>${invoicePrint.innerHTML}</body></html>`);
                printWindow.document.close();
                printWindow.print();
            }
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
        const users = data.users || [];
        
        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">No users found</td></tr>';
            return;
        }
        
        users.forEach(user => {
            const statusClass = user.is_banned ? 'banned' : 'active';
            const statusText = user.is_banned ? 'Banned' : 'Active';
            const actionText = user.is_banned ? 'Unban' : 'Ban';
            const actionIcon = user.is_banned ? 'fa-unlock' : 'fa-ban';
            const actionClass = user.is_banned ? 'btn-success' : 'btn-danger';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div class="customer-cell">
                        <div class="customer-avatar">${(user.name || '?').charAt(0).toUpperCase()}</div>
                        <strong>${user.name}</strong>
                    </div>
                </td>
                <td>${user.email}</td>
                <td><span class="status-badge active">${user.role}</span></td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn btn-sm ${actionClass}" data-action="ban" data-id="${user.id}" data-name="${user.name}" data-banned="${user.is_banned}">
                        <i class="fas ${actionIcon}"></i> ${actionText}
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        tbody.querySelectorAll('[data-action="ban"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const isBanned = btn.dataset.banned === 'true';
                openBanModal(parseInt(btn.dataset.id), btn.dataset.name, !isBanned);
            });
        });
        
    } catch (err) {
        console.error('❌ Users error:', err);
    }
}

async function handleBanSubmit(e) {
    e.preventDefault();
    
    const userId = document.getElementById('banUserId').value;
    const action = document.getElementById('banAction').value;
    const reason = document.getElementById('banReason').value;
    
    try {
        await fetchWithAuth(`${API_URL}/admin/users/${userId}`, { 
            method: 'PUT', 
            body: JSON.stringify({ is_banned: action === 'ban', banned_reason: reason }) 
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
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">No discounts found</td></tr>';
            return;
        }
        
        data.forEach(d => {
            const statusClass = d.is_expired || !d.is_active ? 'cancelled' : 'active';
            const statusText = d.is_expired ? 'Expired' : (!d.is_active ? 'Inactive' : 'Active');
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong style="color:var(--primary); font-family:monospace;">${d.code}</strong></td>
                <td>${d.description || '-'}</td>
                <td>${d.percent}%</td>
                <td>${d.used} / ${d.limit === 999999 ? '∞' : d.limit}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn btn-sm btn-danger" data-action="delete" data-id="${d.id}"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        tbody.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', () => deleteDiscount(parseInt(btn.dataset.id)));
        });
        
    } catch (err) {
        console.error('❌ Discounts error:', err);
    }
}

async function handleDiscountSubmit(e) {
    e.preventDefault();
    
    const getValue = (id) => {
        const el = document.getElementById(id);
        return el ? el.value : '';
    };
    
    const limitType = getValue('discLimitType');
    const expiryType = getValue('discExpiryType');
    
    const data = { 
        code: getValue('discCode').toUpperCase(), 
        description: getValue('discDesc'), 
        percent: parseFloat(getValue('discPercent')), 
        min_purchase: parseFloat(getValue('discMinPurchase')) || 0, 
        max_discount: parseFloat(getValue('discMaxDiscount')) || 999999, 
        limit_type: limitType, 
        limit: limitType === 'fixed' ? parseInt(getValue('discLimit')) : 999999, 
        expiry_type: expiryType, 
        expiry_value: expiryType !== 'unlimited' ? parseInt(getValue('discExpiryValue')) : null 
    };
    
    try {
        await fetchWithAuth(`${API_URL}/admin/discounts`, { 
            method: 'POST', body: JSON.stringify(data) 
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
// STOCK
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
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">No products</td></tr>';
            return;
        }
        
        products.forEach(p => {
            total++;
            if (p.stock <= (p.min_stock || 5)) low++; else ok++;
            const stockColor = p.stock <= (p.min_stock || 5) ? 'var(--danger)' : 'var(--success)';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${p.name}</strong></td>
                <td><code>${p.sku || '-'}</code></td>
                <td><span style="color:${stockColor}; font-weight:700; font-size:16px;">${p.stock}</span></td>
                <td>${p.min_stock || 5}</td>
                <td>
                    <button class="btn btn-sm btn-primary" data-action="stock" data-id="${p.id}" data-name="${p.name}" data-stock="${p.stock}">
                        <i class="fas fa-edit"></i> កែស្តុក
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        tbody.querySelectorAll('[data-action="stock"]').forEach(btn => {
            btn.addEventListener('click', () => {
                openStockModal(parseInt(btn.dataset.id), btn.dataset.name, parseInt(btn.dataset.stock));
            });
        });
        
        const stockTotal = document.getElementById('stock-total');
        const stockLow = document.getElementById('stock-low');
        const stockOk = document.getElementById('stock-ok');
        
        if (stockTotal) stockTotal.innerText = total;
        if (stockLow) stockLow.innerText = low;
        if (stockOk) stockOk.innerText = ok;
        
    } catch (err) {
        console.error('❌ Stock error:', err);
    }
}

async function handleStockSubmit(e) {
    e.preventDefault();
    
    const productId = document.getElementById('stockProductId').value;
    const type = document.getElementById('stockType').value;
    let quantity = parseInt(document.getElementById('stockQuantity').value);
    
    if (type === 'sale') quantity = -quantity;
    
    const notes = document.getElementById('stockNotes');
    
    const data = { 
        product_id: parseInt(productId), 
        quantity: quantity, 
        movement_type: type, 
        notes: notes ? notes.value : '', 
        created_by: 'Admin' 
    };
    
    try {
        await fetchWithAuth(`${API_URL}/admin/stock-movements`, { 
            method: 'POST', body: JSON.stringify(data) 
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
        console.error('❌ Settings error:', err);
    }
}

async function saveSettings() {
    const getValue = (id) => {
        const el = document.getElementById(id);
        return el ? el.value : '';
    };
    
    const data = { 
        store_name: getValue('setting-store-name'), 
        admin_email: getValue('setting-email'), 
        phone: getValue('setting-phone'), 
        address: getValue('setting-address') 
    };
    
    try { 
        await fetchWithAuth(`${API_URL}/admin/settings`, { 
            method: 'PUT', body: JSON.stringify(data) 
        }); 
        showToast('ការកំណត់ត្រូវបានរក្សាទុក!', 'success'); 
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
            
            const modal = document.getElementById('inventoryModal');
            if (modal) modal.classList.add('active');
        });
}

// ============================================
// ✅ EXPOSE ALL FUNCTIONS TO GLOBAL SCOPE
// ============================================
Object.assign(window, {
    loadDashboard, loadProducts, loadOrders, loadUsers, loadDiscounts, loadStock, loadSettings,
    saveSettings, refreshChart,
    editProduct, deleteProduct, handleProductSubmit,
    viewOrder, printInvoice,
    handleBanSubmit,
    handleDiscountSubmit, deleteDiscount,
    handleStockSubmit,
    showInventoryAlerts,
    showToast
});

console.log('✅ Real data functions exposed to window');
