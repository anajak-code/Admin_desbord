let editingProductId = null;
let revenueChartInstance = null;
let uploadedImageUrl = null;
let uploadedFileUrl = null;
let uploadedFileName = null;

// ============================================
// SOUND EFFECTS (Web Audio API)
// ============================================
const SoundFX = {
    context: null,
    
    init() {
        if (!this.context) {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
        }
    },
    
    playSuccess() {
        this.init();
        const ctx = this.context;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        oscillator.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
        
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.4);
    },
    
    playError() {
        this.init();
        const ctx = this.context;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(200, ctx.currentTime);
        oscillator.frequency.setValueAtTime(150, ctx.currentTime + 0.15);
        
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
    },
    
    playInfo() {
        this.init();
        const ctx = this.context;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, ctx.currentTime); // A4
        
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.2);
    }
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('admin_logged_in') !== 'true') {
        window.location.href = 'login/';
        return;
    }
    
    // Description character counter
    const descField = document.getElementById('prod-desc');
    if (descField) {
        descField.addEventListener('input', function() {
            const count = this.value.length;
            const counter = document.getElementById('char-count');
            if (counter) {
                counter.textContent = `${count}/500`;
                if (count > 450) {
                    counter.style.color = 'var(--warning)';
                } else if (count >= 500) {
                    counter.style.color = 'var(--danger)';
                } else {
                    counter.style.color = 'var(--primary)';
                }
            }
        });
    }
    
    initNavigation();
    loadSection('overview');
});

// ============================================
// NAVIGATION
// ============================================
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
    const loaders = { 
        overview: loadOverview, 
        products: loadProducts, 
        orders: loadOrders, 
        users: loadUsers, 
        tickets: loadTickets, 
        discounts: loadDiscounts, 
        settings: loadSettings 
    };
    if (loaders[section]) loaders[section]();
}

// ============================================
// TOGGLE FUNCTIONS
// ============================================
function togglePriceInput() {
    const priceType = document.getElementById('price-type').value;
    const priceGroup = document.getElementById('price-input-group');
    const priceInput = document.getElementById('prod-price');
    
    if (priceType === 'free') {
        priceGroup.style.display = 'none';
        priceInput.value = '0';
        priceInput.removeAttribute('required');
    } else {
        priceGroup.style.display = 'block';
        priceInput.setAttribute('required', 'required');
    }
}

function toggleStockInput() {
    const stockType = document.getElementById('stock-type').value;
    const stockGroup = document.getElementById('stock-input-group');
    const stockInput = document.getElementById('prod-stock');
    
    if (stockType === 'unlimited') {
        stockGroup.style.display = 'none';
        stockInput.value = '999999'; // Large number for unlimited
        stockInput.removeAttribute('required');
    } else {
        stockGroup.style.display = 'block';
        stockInput.setAttribute('required', 'required');
    }
}

// ============================================
// FILE UPLOAD HANDLERS
// ============================================
async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file', 'error');
        return;
    }
    
    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
        showToast('Image size must be less than 5MB', 'error');
        return;
    }
    
    try {
        showToast('Uploading image...', 'info');
        const result = await API.uploadFile(file);
        
        if (result.url) {
            uploadedImageUrl = result.url;
            document.getElementById('prod-image-url').value = result.url;
            
            // Show preview
            const preview = document.getElementById('image-preview');
            const previewImg = document.getElementById('image-preview-img');
            previewImg.src = API_BASE + result.url;
            preview.style.display = 'block';
            document.getElementById('image-upload-area').style.display = 'none';
            
            showToast('Image uploaded successfully!', 'success');
        } else {
            throw new Error('Upload failed');
        }
    } catch (error) {
        showToast('Failed to upload image', 'error');
    }
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.name.endsWith('.jar')) {
        showToast('Please select a .jar file', 'error');
        return;
    }
    
    // Validate file size (50MB)
    if (file.size > 50 * 1024 * 1024) {
        showToast('File size must be less than 50MB', 'error');
        return;
    }
    
    try {
        showToast('Uploading file...', 'info');
        const result = await API.uploadFile(file);
        
        if (result.url) {
            uploadedFileUrl = result.url;
            uploadedFileName = result.filename || file.name;
            document.getElementById('prod-file-url').value = result.url;
            
            // Show file info
            document.getElementById('file-name').textContent = uploadedFileName;
            document.getElementById('file-info').style.display = 'block';
            document.getElementById('file-upload-area').style.display = 'none';
            
            showToast('File uploaded successfully!', 'success');
        } else {
            throw new Error('Upload failed');
        }
    } catch (error) {
        showToast('Failed to upload file', 'error');
    }
}

function removeImage() {
    uploadedImageUrl = null;
    document.getElementById('prod-image-url').value = '';
    document.getElementById('image-preview').style.display = 'none';
    document.getElementById('image-upload-area').style.display = 'block';
    document.getElementById('prod-image-file').value = '';
    showToast('Image removed', 'info');
}

function removeFile() {
    uploadedFileUrl = null;
    uploadedFileName = null;
    document.getElementById('prod-file-url').value = '';
    document.getElementById('file-info').style.display = 'none';
    document.getElementById('file-upload-area').style.display = 'block';
    document.getElementById('prod-file-file').value = '';
    showToast('File removed', 'info');
}

// ============================================
// OVERVIEW
// ============================================
async function loadOverview() {
    try {
        const stats = await API.getStats();
        document.getElementById('stats-grid').innerHTML = `
            <div class="stat-card">
                <div class="stat-label">Total Revenue</div>
                <div class="stat-value">$${stats.total_revenue?.toFixed(2) || '0'}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total Orders</div>
                <div class="stat-value">${stats.total_orders || 0}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total Plugins</div>
                <div class="stat-value">${stats.total_products || 0}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total Users</div>
                <div class="stat-value">${stats.total_users || 0}</div>
            </div>
        `;
        renderRevenueChart();
        loadRecentOrders();
    } catch (e) { 
        document.getElementById('stats-grid').innerHTML = '<p class="empty-state">Failed to load stats</p>'; 
    }
}

function renderRevenueChart() {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    if (revenueChartInstance) revenueChartInstance.destroy();
    revenueChartInstance = new Chart(ctx, {
        type: 'line',
        data: { 
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], 
            datasets: [{ 
                label: 'Revenue ($)', 
                data: [120, 190, 150, 250, 220, 300, 280], 
                borderColor: '#6366f1', 
                backgroundColor: 'rgba(99,102,241,0.1)', 
                tension: 0.4, 
                fill: true 
            }] 
        },
        options: { 
            responsive: true, 
            plugins: { legend: { display: false } }, 
            scales: { 
                y: { beginAtZero: true, grid: { color: '#334155' } }, 
                x: { grid: { display: false } } 
            } 
        }
    });
}

async function loadRecentOrders() {
    try {
        const orders = (await API.getOrders()).slice(0, 5);
        document.getElementById('recent-orders-list').innerHTML = orders.map(o => `
            <div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border);">
                <div>
                    <strong style="color:white;">#${o.id}</strong><br>
                    <small style="color:var(--text-muted)">${o.customer_name}</small>
                </div>
                <div style="text-align:right">
                    <strong style="color:var(--primary);">$${o.total_price.toFixed(2)}</strong><br>
                    <span class="badge ${o.status==='completed'?'badge-success':o.status==='cancelled'?'badge-danger':'badge-warning'}">${o.status}</span>
                </div>
            </div>
        `).join('') || '<p class="empty-state">No recent orders</p>';
    } catch (e) {}
}

// ============================================
// PRODUCTS
// ============================================
async function loadProducts() {
    try {
        const products = await API.getProducts();
        document.getElementById('products-tbody').innerHTML = products.map(p => {
            const priceDisplay = p.price === 0 ? '<span class="badge badge-success">FREE</span>' : `<strong style="color:var(--primary);">$${p.price.toFixed(2)}</strong>`;
            const stockDisplay = p.stock >= 999999 ? '<span class="badge badge-success">♾️ Unlimited</span>' : `<span class="badge ${p.stock>0?'badge-success':'badge-danger'}">${p.stock}</span>`;
            
            return `
                <tr>
                    <td>#${p.id}</td>
                    <td>
                        <div style="display:flex;align-items:center;gap:10px;">
                            <img src="${p.image_url?API_BASE+p.image_url:''}" style="width:40px;height:40px;border-radius:8px;object-fit:cover;" onerror="this.style.display='none'">
                            <span style="font-weight:600;">${p.name}</span>
                        </div>
                    </td>
                    <td>${priceDisplay}</td>
                    <td>${stockDisplay}</td>
                    <td>${p.sales_count || 0}</td>
                    <td>
                        <div style="display:flex;gap:8px;">
                            <button class="btn btn-outline btn-sm" onclick="editProduct(${p.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id},'${p.name.replace(/'/g,"\\'")}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('') || '<tr><td colspan="6"><p class="empty-state">No products found</p></td></tr>';
    } catch (e) { 
        document.getElementById('products-tbody').innerHTML = '<tr><td colspan="6"><p class="empty-state">Failed to load</p></td></tr>'; 
    }
}

function openProductModal() {
    editingProductId = null;
    uploadedImageUrl = null;
    uploadedFileUrl = null;
    uploadedFileName = null;
    
    document.getElementById('modal-product-title').textContent = 'Add New Plugin';
    document.getElementById('product-form').reset();
    document.getElementById('price-type').value = 'free';
    document.getElementById('stock-type').value = 'unlimited';
    togglePriceInput();
    toggleStockInput();
    
    // Reset uploads
    document.getElementById('image-preview').style.display = 'none';
    document.getElementById('image-upload-area').style.display = 'block';
    document.getElementById('file-info').style.display = 'none';
    document.getElementById('file-upload-area').style.display = 'block';
    document.getElementById('prod-image-url').value = '';
    document.getElementById('prod-file-url').value = '';
    
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
        
        // Set price type
        const priceType = p.price === 0 ? 'free' : 'buy';
        document.getElementById('price-type').value = priceType;
        togglePriceInput();
        
        // Set stock type
        const stockType = p.stock >= 999999 ? 'unlimited' : 'amount';
        document.getElementById('stock-type').value = stockType;
        toggleStockInput();
        
        // Set image
        if (p.image_url) {
            uploadedImageUrl = p.image_url;
            document.getElementById('prod-image-url').value = p.image_url;
            document.getElementById('image-preview-img').src = API_BASE + p.image_url;
            document.getElementById('image-preview').style.display = 'block';
            document.getElementById('image-upload-area').style.display = 'none';
        }
        
        // Set file
        if (p.file_url) {
            uploadedFileUrl = p.file_url;
            uploadedFileName = p.file_url.split('/').pop();
            document.getElementById('prod-file-url').value = p.file_url;
            document.getElementById('file-name').textContent = uploadedFileName;
            document.getElementById('file-info').style.display = 'block';
            document.getElementById('file-upload-area').style.display = 'none';
        }
        
        document.getElementById('product-modal').classList.add('show');
    } catch (e) { 
        showToast('Failed to load product', 'error'); 
    }
}

async function saveProduct(e) {
    e.preventDefault();
    
    // Validation
    const name = document.getElementById('prod-name').value.trim();
    const priceType = document.getElementById('price-type').value;
    const stockType = document.getElementById('stock-type').value;
    const description = document.getElementById('prod-desc').value.trim();
    const imageUrl = document.getElementById('prod-image-url').value;
    const fileUrl = document.getElementById('prod-file-url').value;
    
    if (!name) {
        showToast('Product name is required', 'error');
        return;
    }
    
    if (description.length < 1 || description.length > 500) {
        showToast('Description must be 1-500 characters', 'error');
        return;
    }
    
    let price = 0;
    if (priceType === 'buy') {
        price = parseFloat(document.getElementById('prod-price').value);
        if (isNaN(price) || price < 0.01 || price > 50) {
            showToast('Price must be between $0.01 and $50.00', 'error');
            return;
        }
    }
    
    let stock = 999999;
    if (stockType === 'amount') {
        stock = parseInt(document.getElementById('prod-stock').value);
        if (isNaN(stock) || stock < 1) {
            showToast('Stock must be at least 1', 'error');
            return;
        }
    }
    
    if (!imageUrl) {
        showToast('Please upload a product image', 'error');
        return;
    }
    
    if (!fileUrl) {
        showToast('Please upload a .jar file', 'error');
        return;
    }
    
    const data = {
        name: name,
        price: price,
        stock: stock,
        description: description,
        image_url: imageUrl,
        file_url: fileUrl,
        is_free: priceType === 'free',
        is_unlimited: stockType === 'unlimited'
    };
    
    try {
        if (editingProductId) {
            await API.updateProduct(editingProductId, data);
            showToast('Plugin updated successfully!', 'success');
        } else {
            await API.addProduct(data);
            showToast('Plugin added successfully!', 'success');
        }
        closeModal('product-modal');
        loadProducts();
    } catch (err) { 
        showToast('Failed to save plugin', 'error'); 
    }
}

async function deleteProduct(id, name) {
    if (!confirm(`Delete "${name}"? This will also delete the uploaded file.`)) return;
    try { 
        await API.deleteProduct(id); 
        showToast('Plugin deleted!', 'success'); 
        loadProducts(); 
    } catch (e) { 
        showToast('Failed to delete', 'error'); 
    }
}

// ============================================
// ORDERS
// ============================================
async function loadOrders() {
    try {
        const orders = await API.getOrders();
        document.getElementById('orders-tbody').innerHTML = orders.map(o => `
            <tr>
                <td>#${o.id}</td>
                <td>
                    <strong>${o.customer_name}</strong><br>
                    <small style="color:var(--text-muted)">${o.customer_email}</small>
                </td>
                <td><strong style="color:var(--primary);">$${o.total_price.toFixed(2)}</strong></td>
                <td><span class="badge ${o.status==='completed'?'badge-success':o.status==='cancelled'?'badge-danger':'badge-warning'}">${o.status}</span></td>
                <td>${new Date(o.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="alert('Order #${o.id}\\nTotal: $${o.total_price.toFixed(2)}\\nItems: ${o.items.map(i=>i.product_name).join(', ')}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="6"><p class="empty-state">No orders yet</p></td></tr>';
    } catch (e) { 
        document.getElementById('orders-tbody').innerHTML = '<tr><td colspan="6"><p class="empty-state">Failed to load</p></td></tr>'; 
    }
}

// ============================================
// USERS
// ============================================
async function loadUsers() {
    try {
        const users = await API.getUsers();
        document.getElementById('users-tbody').innerHTML = users.map(u => `
            <tr>
                <td>#${u.id}</td>
                <td><strong>${u.name}</strong></td>
                <td>${u.email}</td>
                <td><span class="badge ${u.status==='banned'?'badge-danger':'badge-success'}">${u.status}</span></td>
                <td>
                    <div style="display:flex;gap:8px;">
                        ${u.status==='banned' ? 
                            `<button class="btn btn-success btn-sm" onclick="unbanUser(${u.id})"><i class="fas fa-check"></i> Unban</button>` : 
                            `<button class="btn btn-warning btn-sm" onclick="banUser(${u.id})"><i class="fas fa-ban"></i> Ban</button>`
                        }
                        <button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id},'${u.name.replace(/'/g,"\\'")}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="5"><p class="empty-state">No users registered</p></td></tr>';
    } catch (e) { 
        document.getElementById('users-tbody').innerHTML = '<tr><td colspan="5"><p class="empty-state">Failed to load</p></td></tr>'; 
    }
}

async function banUser(id) { 
    if (!confirm('Ban this user?')) return; 
    try { 
        await API.banUser(id); 
        showToast('User banned', 'success'); 
        loadUsers(); 
    } catch (e) { 
        showToast('Failed', 'error'); 
    } 
}

async function unbanUser(id) { 
    if (!confirm('Unban this user?')) return; 
    try { 
        await API.unbanUser(id); 
        showToast('User unbanned', 'success'); 
        loadUsers(); 
    } catch (e) { 
        showToast('Failed', 'error'); 
    } 
}

async function deleteUser(id, name) { 
    if (!confirm(`Delete "${name}" permanently?`)) return; 
    try { 
        await API.deleteUser(id); 
        showToast('User deleted', 'success'); 
        loadUsers(); 
    } catch (e) { 
        showToast('Failed', 'error'); 
    } 
}

// ============================================
// TICKETS
// ============================================
async function loadTickets() {
    try {
        const tickets = await API.getTickets();
        document.getElementById('tickets-tbody').innerHTML = tickets.map(t => `
            <tr>
                <td>#${t.id}</td>
                <td>
                    <strong>${t.name}</strong><br>
                    <small style="color:var(--text-muted)">${t.email}</small>
                </td>
                <td>${t.subject}</td>
                <td><span class="badge ${t.status==='open'?'badge-success':t.status==='closed'?'badge-danger':'badge-warning'}">${t.status}</span></td>
                <td>${new Date(t.date).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-success btn-sm" onclick="closeTicket(${t.id})">
                        <i class="fas fa-check"></i> Close
                    </button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="6"><p class="empty-state">No tickets found</p></td></tr>';
    } catch (e) { 
        document.getElementById('tickets-tbody').innerHTML = '<tr><td colspan="6"><p class="empty-state">Failed to load</p></td></tr>'; 
    }
}

async function closeTicket(id) { 
    if (!confirm('Close this ticket?')) return; 
    try { 
        await API.closeTicket(id); 
        showToast('Ticket closed', 'success'); 
        loadTickets(); 
    } catch (e) { 
        showToast('Failed', 'error'); 
    } 
}

// ============================================
// DISCOUNTS
// ============================================
async function loadDiscounts() {
    try {
        const discounts = await API.getDiscounts();
        document.getElementById('discounts-tbody').innerHTML = discounts.map(d => `
            <tr>
                <td><strong>${d.code}</strong></td>
                <td><span class="badge badge-success">${d.percent}%</span></td>
                <td>${d.used_count}</td>
                <td>${d.max_uses}</td>
                <td>${d.expires_at ? new Date(d.expires_at).toLocaleDateString() : 'Never'}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="showToast('Delete not implemented yet', 'info')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="6"><p class="empty-state">No discount codes</p></td></tr>';
    } catch (e) { 
        document.getElementById('discounts-tbody').innerHTML = '<tr><td colspan="6"><p class="empty-state">Failed to load</p></td></tr>'; 
    }
}

function openDiscountModal() { 
    document.getElementById('discount-form').reset(); 
    document.getElementById('discount-modal').classList.add('show'); 
}

async function saveDiscount(e) {
    e.preventDefault();
    const data = { 
        code: document.getElementById('disc-code').value, 
        percent: parseFloat(document.getElementById('disc-percent').value), 
        max_uses: parseInt(document.getElementById('disc-max-uses').value) || 100, 
        expires_at: document.getElementById('disc-expires').value || null 
    };
    try { 
        await API.addDiscount(data); 
        showToast('Discount code created!', 'success'); 
        closeModal('discount-modal'); 
        loadDiscounts(); 
    } catch (err) { 
        showToast('Failed to create code', 'error'); 
    }
}

// ============================================
// SETTINGS
// ============================================
function loadSettings() {
    const s = JSON.parse(localStorage.getItem('shop_settings')||'{}');
    if(s.shop_name) document.getElementById('set-shop-name').value = s.shop_name;
    if(s.shop_email) document.getElementById('set-shop-email').value = s.shop_email;
    if(s.shop_phone) document.getElementById('set-shop-phone').value = s.shop_phone;
    if(s.shop_address) document.getElementById('set-shop-address').value = s.shop_address;
}

function saveSettings(e) {
    e.preventDefault();
    localStorage.setItem('shop_settings', JSON.stringify({ 
        shop_name: document.getElementById('set-shop-name').value, 
        shop_email: document.getElementById('set-shop-email').value, 
        shop_phone: document.getElementById('set-shop-phone').value, 
        shop_address: document.getElementById('set-shop-address').value 
    }));
    showToast('Settings saved!', 'success');
}

// ============================================
// UTILITIES
// ============================================
function closeModal(id) { 
    document.getElementById(id).classList.remove('show'); 
}

function showToast(msg, type = 'info') {
    // Play sound effect
    if (type === 'success') {
        SoundFX.playSuccess();
    } else if (type === 'error') {
        SoundFX.playError();
    } else {
        SoundFX.playInfo();
    }
    
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `<i class="fas ${type==='success'?'fa-check-circle':type==='error'?'fa-exclamation-circle':'fa-info-circle'}"></i> ${msg}`;
    c.appendChild(t);
    setTimeout(() => { 
        t.style.opacity='0'; 
        t.style.transform='translateX(100%)'; 
        t.style.transition='all 0.4s'; 
        setTimeout(()=>t.remove(),400); 
    }, 3000);
}

function toggleSidebar() { 
    document.querySelector('.sidebar').classList.toggle('open'); 
}

function logout() {
    if(confirm('Log out from Admin Panel?')) {
        localStorage.removeItem('admin_logged_in');
        localStorage.removeItem('admin_email');
        window.location.href = 'login/';
    }
}

document.addEventListener('click', (e) => { 
    if(e.target.classList.contains('modal-overlay')) 
        e.target.classList.remove('show'); 
});
