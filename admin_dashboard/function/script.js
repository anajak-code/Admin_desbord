let revenueChart = null;
let realtimeInterval = null;

// ============================================
// DASHBOARD FUNCTIONS
// ============================================
async function loadDashboard() {
    console.log('🔄 Loading dashboard...');
    
    const token = getToken();
    if (!token) {
        console.error('❌ No token found - redirecting to login');
        window.location.href = 'login/index.html';
        return;
    }
    
    try {
        const res = await fetchWithAuth(`${API_URL}/admin/stats`);
        
        if (!res) {
            console.error('❌ No response from API');
            showErrorMessage('Cannot connect to server');
            return;
        }
        
        if (res.status !== 200) {
            console.error('❌ API returned status:', res.status);
            showErrorMessage(`Server error: ${res.status}`);
            return;
        }
        
        const stats = await res.json();
        console.log('✅ Stats loaded:', stats);
        
        // Update stats with null checks
        const revenueEl = document.getElementById('stat-revenue');
        const ordersEl = document.getElementById('stat-orders');
        const productsEl = document.getElementById('stat-products');
        const usersEl = document.getElementById('stat-users');
        
        if (revenueEl) revenueEl.innerText = `$${stats.total_revenue.toLocaleString()}`;
        if (ordersEl) ordersEl.innerText = stats.total_orders;
        if (productsEl) productsEl.innerText = stats.total_products;
        if (usersEl) usersEl.innerText = stats.total_users;
        
        // Update badges
        const pendingBadge = document.getElementById('pending-orders-badge');
        if (pendingBadge) pendingBadge.innerText = stats.pending_orders || 0;
        
        const notifBadge = document.getElementById('notif-badge');
        if (notifBadge) {
            const total = (stats.low_stock_count || 0) + (stats.pending_orders || 0);
            notifBadge.innerText = total;
            notifBadge.style.display = total > 0 ? 'flex' : 'none';
        }
        
        // Update realtime stats
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
        console.error('❌ Error loading dashboard:', err);
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
            console.warn('⚠️ revenueChart element not found');
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
                        fill: true, 
                        tension: 0.4 
                    },
                    { 
                        label: 'Revenue ($)', 
                        data: data.revenues, 
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.05)',
                        fill: true, 
                        tension: 0.4 
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
            console.error(' Realtime error:', e); 
        }
    }
    
    fetchStatus();
    clearInterval(realtimeInterval);
    realtimeInterval = setInterval(fetchStatus, 10000);
}

// ============================================
// PRODUCT FUNCTIONS
// ============================================
async function loadProducts() {
    try {
        const res = await fetch(`${API_URL}/products`);
        const data = await res.json();
        
        const tbody = document.getElementById('product-table-body');
        if (!tbody) {
            console.warn('⚠️ product-table-body not found');
            return;
        }
        
        tbody.innerHTML = '';
        const products = data.products || data || [];
        
        if (products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">No products found</td></tr>';
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
        console.error('❌ Products load error:', err); 
        showToast('Failed to load products', 'error'); 
    }
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
            console.error('❌ Upload error:', err); 
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
            showToast('ផលិតផលត្រូវបានកែសមរួល!', 'success'); 
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
        showToast('មានកំហុសក្នុងការរក្ាទុក', 'error'); 
    }
}

async function deleteProduct(id) {
    if (!confirm('តើអ្កប្រាកដជាចង់លុបផលិតផលនេះ?')) return;
    try { 
        await fetchWithAuth(`${API_URL}/admin/products/${id}`, { method: 'DELETE' }); 
        showToast('ផលិតផលត្រូវបានលុប!', 'success'); 
        loadProducts(); 
    } catch (err) { 
        showToast('មានកំហុសក្នុងការលុប', 'error'); 
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

// ============================================
// HELPER FUNCTIONS
// ============================================
function showErrorMessage(msg) {
    const dashboard = document.getElementById('section-dashboard');
    if (dashboard) {
        dashboard.innerHTML = `
            <div style="text-align:center; padding:40px; color:var(--danger);">
                <i class="fas fa-exclamation-triangle" style="font-size:48px; margin-bottom:16px;"></i>
                <h3>Error Loading Data</h3>
                <p>${msg}</p>
                <button onclick="location.reload()" class="btn btn-primary" style="margin-top:16px;">
                    <i class="fas fa-sync"></i> Retry
                </button>
            </div>
        `;
    } else {
        alert('Error: ' + msg);
    }
}

// Add other functions (loadOrders, loadUsers, loadDiscounts, loadStock, etc.) following the same pattern with null checks
