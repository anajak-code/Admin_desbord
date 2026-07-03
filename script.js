// Check Admin Permission
const currentUser = JSON.parse(localStorage.getItem('current_user'));
if (!currentUser || currentUser.role !== 'admin') {
    alert("Access Denied! Please login as Admin.");
    window.location.href = "index.html";
} else {
    document.getElementById('admin-name').innerText = currentUser.name;
    initAdmin();
}

function initAdmin() {
    loadStats();
    renderProductsTable();
    renderUsersTable();
}

// Navigation
function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    
    document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    document.getElementById('page-title').innerText = sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
    
    // Close sidebar on mobile
    if(window.innerWidth <= 768) toggleSidebar();
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

function logout() {
    localStorage.removeItem('current_user');
    window.location.href = "index.html";
}

// Load Statistics
function loadStats() {
    const products = JSON.parse(localStorage.getItem('products')) || [];
    const users = JSON.parse(localStorage.getItem('users')) || [];
    
    document.getElementById('total-products').innerText = products.length;
    document.getElementById('total-users').innerText = users.length;
    
    // Calculate fake revenue based on user purchases
    let revenue = 0;
    users.forEach(u => {
        if(u.purchases) revenue += u.purchases.length * 10; // Just estimation logic
    });
    document.getElementById('total-revenue').innerText = '$' + revenue.toLocaleString();
}

// Render Products Table
function renderProductsTable() {
    const products = JSON.parse(localStorage.getItem('products')) || [];
    const tbody = document.getElementById('products-table-body');
    tbody.innerHTML = '';

    products.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${p.id}</td>
            <td><i class="fas ${p.icon}" style="color:var(--primary)"></i></td>
            <td>${p.title}</td>
            <td><span style="background:rgba(99,102,241,0.2); padding:2px 8px; border-radius:4px; font-size:0.8rem;">${p.category}</span></td>
            <td>$${p.price}</td>
            <td>${p.vendor}</td>
            <td>
                <button class="btn-edit" onclick="editProduct(${p.id})"><i class="fas fa-edit"></i></button>
                <button class="btn-danger" onclick="deleteProduct(${p.id})"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Render Users Table
function renderUsersTable() {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '';

    users.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${u.name}</td>
            <td>${u.email}</td>
            <td>${u.role === 'admin' ? '<span style="color:#ec4899">Admin</span>' : 'User'}</td>
            <td>${u.purchases ? u.purchases.length : 0}</td>
        `;
        tbody.appendChild(tr);
    });
}

// CRUD Operations
const modal = document.getElementById('product-modal');
const form = document.getElementById('product-form');

function openProductModal(isEdit = false) {
    modal.classList.add('active');
    document.getElementById('modal-title').innerText = isEdit ? "Edit Product" : "Add New Product";
    if(!isEdit) form.reset();
}

function closeProductModal() {
    modal.classList.remove('active');
}

function editProduct(id) {
    const products = JSON.parse(localStorage.getItem('products')) || [];
    const product = products.find(p => p.id === id);
    if(product) {
        document.getElementById('p-id').value = product.id;
        document.getElementById('p-title').value = product.title;
        document.getElementById('p-category').value = product.category;
        document.getElementById('p-price').value = product.price;
        document.getElementById('p-vendor').value = product.vendor;
        document.getElementById('p-desc').value = product.desc;
        document.getElementById('p-icon').value = product.icon;
        openProductModal(true);
    }
}

function deleteProduct(id) {
    if(confirm("Are you sure you want to delete this product?")) {
        let products = JSON.parse(localStorage.getItem('products')) || [];
        products = products.filter(p => p.id !== id);
        localStorage.setItem('products', JSON.stringify(products));
        renderProductsTable();
        loadStats();
        showToast("Product deleted successfully!");
    }
}

form.addEventListener('submit', (e) => {
    e.preventDefault();
    let products = JSON.parse(localStorage.getItem('products')) || [];
    const id = document.getElementById('p-id').value;
    
    const newProduct = {
        id: id ? parseInt(id) : Date.now(),
        title: document.getElementById('p-title').value,
        category: document.getElementById('p-category').value,
        price: parseFloat(document.getElementById('p-price').value),
        vendor: document.getElementById('p-vendor').value,
        desc: document.getElementById('p-desc').value,
        icon: document.getElementById('p-icon').value || 'fa-code'
    };

    if(id) {
        // Update
        const index = products.findIndex(p => p.id === parseInt(id));
        products[index] = newProduct;
    } else {
        // Create
        products.push(newProduct);
    }

    localStorage.setItem('products', JSON.stringify(products));
    closeProductModal();
    renderProductsTable();
    loadStats();
    showToast(id ? "Product updated!" : "New product added!");
});

// Utils
function showToast(msg) {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}
