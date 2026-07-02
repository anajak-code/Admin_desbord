// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get, update, remove, onValue, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyC42F7V4_h1VmAtAWuoFL8TxW-b3ym-524",
    authDomain: "ahnajakcode.firebaseapp.com",
    databaseURL: "https://ahnajakcode-default-rtdb.firebaseio.com",
    projectId: "ahnajakcode",
    storageBucket: "ahnajakcode.firebasestorage.app",
    messagingSenderId: "540215503567",
    appId: "1:540215503567:web:c05f16eb75d1da6c3da5ba"
};

// Initialize
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

console.log('✅ Firebase Connected!');

// Global variables
let editingProductId = null;

// ========== LOGIN ==========
function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (username === 'admin' && password === '123456') {
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        loadProducts();
        loadOrders();
        setupRealTimeListener();
    } else {
        alert('Wrong username or password!');
    }
}

function logout() {
    location.reload();
}

// ========== NAVIGATION ==========
document.addEventListener('DOMContentLoaded', () => {
    // Navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.getElementById(this.dataset.section + 'Section').classList.add('active');
        });
    });
    
    // Modal close button
    document.querySelector('.close-btn').addEventListener('click', closeModal);
    
    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        const modal = document.getElementById('productModal');
        if (e.target === modal) {
            closeModal();
        }
    });
});

// ========== PRODUCTS ==========
function loadProducts() {
    const productsRef = ref(db, 'products');
    
    onValue(productsRef, (snapshot) => {
        const data = snapshot.val();
        const tbody = document.getElementById('productsTable');
        
        if (!data) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">No products yet. Click "Add Product" to create one!</td></tr>';
            return;
        }
        
        const products = Object.entries(data).map(([id, value]) => ({ id, ...value }));
        
        tbody.innerHTML = products.map(p => `
            <tr>
                <td>#${p.id}</td>
                <td><img src="${p.image || 'https://via.placeholder.com/50'}" alt="${p.name}" style="width:50px;height:50px;object-fit:cover;border-radius:5px;"></td>
                <td>${p.name}</td>
                <td>$${parseFloat(p.price).toFixed(2)}</td>
                <td>${p.stock}</td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="editProduct('${p.id}')">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">Delete</button>
                </td>
            </tr>
        `).join('');
    });
}

// ✅ OPEN MODAL - ដំណោះស្រាយសំខាន់!
function showAddProductModal() {
    console.log('🔵 Opening Add Product Modal...');
    editingProductId = null;
    
    document.getElementById('modalTitle').textContent = 'Add New Product';
    document.getElementById('productName').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productStock').value = '';
    document.getElementById('productImage').value = '';
    document.getElementById('productDescription').value = '';
    
    document.getElementById('productModal').classList.add('active');
    console.log('✅ Modal opened!');
}

// EDIT PRODUCT
async function editProduct(id) {
    console.log('✏️ Editing product:', id);
    
    const productRef = ref(db, 'products/' + id);
    const snapshot = await get(productRef);
    const product = snapshot.val();
    
    if (!product) {
        alert('Product not found!');
        return;
    }
    
    editingProductId = id;
    document.getElementById('modalTitle').textContent = 'Edit Product';
    document.getElementById('productName').value = product.name;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productStock').value = product.stock;
    document.getElementById('productImage').value = product.image || '';
    document.getElementById('productDescription').value = product.description || '';
    
    document.getElementById('productModal').classList.add('active');
}

// ✅ SAVE PRODUCT - ដំណោះស្រាយសំខាន់!
async function saveProduct() {
    console.log('💾 Saving product...');
    
    const name = document.getElementById('productName').value.trim();
    const price = parseFloat(document.getElementById('productPrice').value);
    const stock = parseInt(document.getElementById('productStock').value);
    const image = document.getElementById('productImage').value.trim();
    const description = document.getElementById('productDescription').value.trim();
    
    // Validation
    if (!name) {
        alert('Please enter product name!');
        return;
    }
    
    if (isNaN(price) || price <= 0) {
        alert('Please enter a valid price!');
        return;
    }
    
    if (isNaN(stock) || stock < 0) {
        alert('Please enter a valid stock quantity!');
        return;
    }
    
    try {
        if (editingProductId) {
            // Update existing product
            console.log('🔄 Updating product:', editingProductId);
            const productRef = ref(db, 'products/' + editingProductId);
            await update(productRef, {
                name: name,
                price: price,
                stock: stock,
                image: image,
                description: description
            });
            console.log('✅ Product updated!');
        } else {
            // Add new product
            console.log('➕ Creating new product...');
            
            const productsRef = ref(db, 'products');
            const snapshot = await get(productsRef);
            const products = snapshot.val() || {};
            
            // Generate new ID
            const newId = Object.keys(products).length > 0 
                ? Math.max(...Object.keys(products).map(k => parseInt(k))) + 1 
                : 1;
            
            const newProduct = {
                id: newId,
                name: name,
                price: price,
                stock: stock,
                image: image,
                description: description,
                createdAt: new Date().toISOString()
            };
            
            await set(ref(db, 'products/' + newId), newProduct);
            console.log('✅ Product created with ID:', newId);
        }
        
        // Close modal and show success
        closeModal();
        alert('✅ Product saved successfully! Check user dashboard at /products');
        
    } catch (error) {
        console.error('❌ Error saving product:', error);
        alert('Error saving product: ' + error.message);
    }
}

// DELETE PRODUCT
async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) {
        return;
    }
    
    try {
        console.log('🗑️ Deleting product:', id);
        await remove(ref(db, 'products/' + id));
        alert('Product deleted!');
    } catch (error) {
        console.error('Error deleting product:', error);
        alert('Error deleting product');
    }
}

// CLOSE MODAL
function closeModal() {
    document.getElementById('productModal').classList.remove('active');
    editingProductId = null;
}

// ========== ORDERS ==========
function loadOrders() {
    const ordersRef = ref(db, 'orders');
    
    onValue(ordersRef, (snapshot) => {
        const data = snapshot.val();
        const tbody = document.getElementById('ordersTable');
        
        if (!data) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px;">No orders yet</td></tr>';
            return;
        }
        
        const orders = Object.entries(data).map(([id, value]) => ({ id, ...value })).reverse();
        
        tbody.innerHTML = orders.map(o => `
            <tr>
                <td>#${o.id}</td>
                <td>${o.userName}</td>
                <td>${o.productName}</td>
                <td>${o.quantity}</td>
                <td>$${parseFloat(o.total).toFixed(2)}</td>
                <td>${o.date}</td>
                <td><span class="status status-${o.status.toLowerCase()}">${o.status}</span></td>
                <td>
                    <select onchange="updateOrderStatus('${o.id}', this.value)" style="padding:5px;border-radius:5px;">
                        <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Completed" ${o.status === 'Completed' ? 'selected' : ''}>Completed</option>
                        <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </td>
            </tr>
        `).join('');
    });
}

// UPDATE ORDER STATUS
async function updateOrderStatus(id, status) {
    try {
        await update(ref(db, 'orders/' + id), { status: status });
        console.log('Order status updated to:', status);
    } catch (error) {
        console.error('Error updating order status:', error);
    }
}

// ========== REAL-TIME LISTENERS ==========
function setupRealTimeListener() {
    console.log('🔄 Setting up real-time listeners...');
    
    // Listen for products changes
    onValue(ref(db, 'products'), (snapshot) => {
        console.log('📦 Products updated in database');
        // Auto-refresh handled by loadProducts()
    });
    
    // Listen for orders changes
    onValue(ref(db, 'orders'), (snapshot) => {
        console.log('🛒 Orders updated in database');
        // Auto-refresh handled by loadOrders()
    });
}

// ========== STATS ==========
function loadStats() {
    const productsRef = ref(db, 'products');
    const ordersRef = ref(db, 'orders');
    
    Promise.all([get(productsRef), get(ordersRef)]).then(([productsSnap, ordersSnap]) => {
        const products = productsSnap.val() || {};
        const orders = ordersSnap.val() || {};
        
        const totalProducts = Object.keys(products).length;
        const totalOrders = Object.keys(orders).length;
        const totalRevenue = Object.values(orders)
            .filter(o => o.status === 'Completed')
            .reduce((sum, o) => sum + parseFloat(o.total), 0);
        
        document.getElementById('statsGrid').innerHTML = `
            <div class="stat-card">
                <h3><i class="fas fa-box"></i> Total Products</h3>
                <div class="value">${totalProducts}</div>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);">
                <h3><i class="fas fa-dollar-sign"></i> Total Revenue</h3>
                <div class="value">$${totalRevenue.toFixed(2)}</div>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);">
                <h3><i class="fas fa-shopping-cart"></i> Total Orders</h3>
                <div class="value">${totalOrders}</div>
            </div>
        `;
    }).catch(error => {
        console.error('Error loading stats:', error);
    });
}

// ========== MAKE FUNCTIONS GLOBAL ==========
// ដំណោះស្រាយសំខាន់បំផុត! ធ្វើអោយ function អាចប្រើពី HTML បាន
window.login = login;
window.logout = logout;
window.showAddProductModal = showAddProductModal;
window.saveProduct = saveProduct;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.closeModal = closeModal;
window.updateOrderStatus = updateOrderStatus;
window.loadStats = loadStats;

console.log('✅ Admin script loaded successfully!');
console.log('📝 Functions available:', Object.keys(window).filter(k => typeof window[k] === 'function').filter(k => !k.startsWith('_')).join(', '));
