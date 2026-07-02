const API_BASE = 'https://us.apsara.lol:25565/api';

document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    loadDashboard();
    loadProducts();
    setupProductModal();
});

// Navigation
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            showSection(section);
            
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

function showSection(sectionName) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(`${sectionName}Section`).classList.add('active');
    
    const titles = {
        'dashboard': 'Dashboard',
        'products': 'គ្រប់គ្រងទំនិញ',
        'orders': 'ការបញ្ជាទិញ',
        'users': 'អ្នកប្រើប្រាស់'
    };
    document.getElementById('pageTitle').textContent = titles[sectionName];
    
    if (sectionName === 'products') loadProducts();
    if (sectionName === 'orders') loadOrders();
}

// Dashboard
async function loadDashboard() {
    try {
        const [productsRes, ordersRes] = await Promise.all([
            fetch(`${API_BASE}/products/`),
            fetch(`${API_BASE}/orders/user/1`) // គំរូ
        ]);
        
        const products = await productsRes.json();
        const orders = await ordersRes.json().catch(() => []);
        
        document.getElementById('totalProducts').textContent = products.length;
        document.getElementById('totalOrders').textContent = orders.length;
        document.getElementById('totalRevenue').textContent = 
            '$' + orders.reduce((sum, o) => sum + o.total_amount, 0).toFixed(2);
    } catch (err) {
        console.error('Failed to load dashboard');
    }
}

// Products
async function loadProducts() {
    try {
        const res = await fetch(`${API_BASE}/products/`);
        const products = await res.json();
        
        const tbody = document.getElementById('productsTableBody');
        tbody.innerHTML = products.map(p => `
            <tr>
                <td><img src="${API_BASE}${p.image_url}" alt="${p.title}"></td>
                <td>${p.title}</td>
                <td>$${p.original_price}</td>
                <td>$${p.discount_price}</td>
                <td>
                    <button class="btn btn-danger" onclick="deleteProduct(${p.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        showToast('មិនអាចផ្ទុកទំនិញបាន', 'error');
    }
}

// Product Modal
function setupProductModal() {
    const modal = document.getElementById('productModal');
    const closeBtn = document.querySelector('.close-btn');
    const addBtn = document.getElementById('addProductBtn');
    const form = document.getElementById('addProductForm');

    addBtn.onclick = () => modal.classList.add('active');
    closeBtn.onclick = () => modal.classList.remove('active');
    window.onclick = (e) => {
        if (e.target === modal) modal.classList.remove('active');
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        formData.append('title', document.getElementById('productTitle').value);
        formData.append('original_price', document.getElementById('productOriginalPrice').value);
        formData.append('discount_price', document.getElementById('productDiscountPrice').value);
        formData.append('description', document.getElementById('productDescription').value);
        formData.append('image', document.getElementById('productImage').files[0]);

        try {
            const res = await fetch(`${API_BASE}/products/`, {
                method: 'POST',
                body: formData
            });
            
            if (res.ok) {
                showToast('បន្ែមទំនិញជោគជ័យ!', 'success');
                modal.classList.remove('active');
                form.reset();
                loadProducts();
                loadDashboard();
            } else {
                showToast('បន្ថែមទំនិញមិនជោគជយ', 'error');
            }
        } catch (err) {
            showToast('មានបញ្ហាក្នុងការភជាប់', 'error');
        }
    });
}

async function deleteProduct(id) {
    if (!confirm('តើអ្កពិតជាចង់លុបទំនិញនេះមែនទេ?')) return;
    
    try {
        const res = await fetch(`${API_BASE}/products/${id}`, {
            method: 'DELETE'
        });
        
        if (res.ok) {
            showToast('លុបទំនិញជោគជ័យ', 'success');
            loadProducts();
        } else {
            showToast('លុបទំនិញមិនជោគជ័យ', 'error');
        }
    } catch (err) {
        showToast('មានបញ្ហាក្នុងការភ្ជាប់', 'error');
    }
}

// Orders
async function loadOrders() {
    try {
        const res = await fetch(`${API_BASE}/orders/user/1`); // គំរូ
        const orders = await res.json();
        
        const tbody = document.getElementById('ordersTableBody');
        tbody.innerHTML = orders.map(o => `
            <tr>
                <td>#${o.id}</td>
                <td>User ${o.user_id}</td>
                <td>$${o.total_amount}</td>
                <td><span class="status-badge">${o.status}</span></td>
                <td>${new Date(o.created_at).toLocaleDateString('km-KH')}</td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Failed to load orders');
    }
}

// Toast
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}
