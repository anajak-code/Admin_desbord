import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get, update, remove, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyC42F7V4_h1VmAtAWuoFL8TxW-b3ym-524",
    authDomain: "ahnajakcode.firebaseapp.com",
    databaseURL: "https://ahnajakcode-default-rtdb.firebaseio.com",
    projectId: "ahnajakcode",
    storageBucket: "ahnajakcode.firebasestorage.app",
    messagingSenderId: "540215503567",
    appId: "1:540215503567:web:c05f16eb75d1da6c3da5ba"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

console.log('✅ Firebase initialized!');

let editingProductId = null;

window.login = function() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (username === 'admin' && password === '123456') {
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        loadAllData();
        listenForChanges();
    } else {
        alert('Invalid credentials! Use: admin / 123456');
    }
}

window.logout = function() {
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('dashboard').style.display = 'none';
}

function listenForChanges() {
    console.log('🔄 Listening for real-time changes...');
    
    const productsRef = ref(database, 'products');
    onValue(productsRef, (snapshot) => {
        console.log('📦 Products updated');
        loadProductsTable();
        loadStats();
    });
    
    const ordersRef = ref(database, 'orders');
    onValue(ordersRef, (snapshot) => {
        console.log(' Orders updated');
        loadOrdersTable();
        loadStats();
    });
    
    const usersRef = ref(database, 'users');
    onValue(usersRef, (snapshot) => {
        console.log('👥 Users updated');
        loadUsersTable();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.getElementById(btn.dataset.section + 'Section').classList.add('active');
        });
    });
});

function loadAllData() {
    loadProductsTable();
    loadOrdersTable();
    loadUsersTable();
    loadStats();
}

function loadProductsTable() {
    const productsRef = ref(database, 'products');
    get(productsRef).then((snapshot) => {
        const products = snapshot.val() || {};
        const productsArray = Object.entries(products).map(([id, data]) => ({
            id: id,
            ...data
        }));
        
        const tbody = document.getElementById('productsTable');
        
        if (productsArray.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No products yet</td></tr>';
            return;
        }
        
        tbody.innerHTML = productsArray.map(p => `
            <tr>
                <td>#${p.id}</td>
                <td><img src="${p.image || 'https://via.placeholder.com/50'}" alt="${p.name}"></td>
                <td>${p.name}</td>
                <td>$${parseFloat(p.price).toFixed(2)}</td>
                <td>${p.stock}</td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="editProduct('${p.id}')">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">Delete</button>
                </td>
            </tr>
        `).join('');
    }).catch((error) => {
        console.error('Error loading products:', error);
    });
}

window.showAddProductModal = function() {
    editingProductId = null;
    document.getElementById('modalTitle').textContent = 'Add New Product';
    document.getElementById('productName').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productStock').value = '';
    document.getElementById('productImage').value = '';
    document.getElementById('productDescription').value = '';
    document.getElementById('productModal').classList.add('active');
}

window.editProduct = async function(id) {
    try {
        const productRef = ref(database, 'products/' + id);
        const snapshot = await get(productRef);
        const product = snapshot.val();
        
        if (!product) return;
        
        editingProductId = id;
        document.getElementById('modalTitle').textContent = 'Edit Product';
        document.getElementById('productName').value = product.name;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productStock').value = product.stock;
        document.getElementById('productImage').value = product.image || '';
        document.getElementById('productDescription').value = product.description || '';
        document.getElementById('productModal').classList.add('active');
    } catch (error) {
        console.error('Error editing product:', error);
    }
}

window.saveProduct = async function() {
    const name = document.getElementById('productName').value.trim();
    const price = parseFloat(document.getElementById('productPrice').value);
    const stock = parseInt(document.getElementById('productStock').value);
    const image = document.getElementById('productImage').value.trim();
    const description = document.getElementById('productDescription').value.trim();
    
    if (!name || isNaN(price) || isNaN(stock)) {
        alert('Please fill all required fields!');
        return;
    }
    
    try {
        if (editingProductId) {
            const productRef = ref(database, 'products/' + editingProductId);
            await update(productRef, { name, price, stock, image, description });
        } else {
            const productsRef = ref(database, 'products');
            const snapshot = await get(productsRef);
            const products = snapshot.val() || {};
            
            const newId = Object.keys(products).length > 0 
                ? Math.max(...Object.keys(products).map(k => parseInt(k))) + 1 
                : 1;
            
            await set(ref(database, 'products/' + newId), { name, price, stock, image, description });
        }
        
        closeModal();
        alert('Product saved successfully!');
    } catch (error) {
        console.error('Error saving product:', error);
        alert('Error saving product. Please try again.');
    }
}

window.deleteProduct = async function(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
        const productRef = ref(database, 'products/' + id);
        await remove(productRef);
        alert('Product deleted!');
    } catch (error) {
        console.error('Error deleting product:', error);
        alert('Error deleting product. Please try again.');
    }
}

window.closeModal = function() {
    document.getElementById('productModal').classList.remove('active');
}

function loadOrdersTable() {
    const ordersRef = ref(database, 'orders');
    get(ordersRef).then((snapshot) => {
        const orders = snapshot.val() || {};
        const ordersArray = Object.entries(orders).map(([id, data]) => ({
            id: id,
            ...data
        }));
        
        const tbody = document.getElementById('ordersTable');
        
        if (ordersArray.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No orders yet</td></tr>';
            return;
        }
        
        tbody.innerHTML = ordersArray.map(o => `
            <tr>
                <td>#${o.id}</td>
                <td>${o.userName}</td>
                <td>${o.productName}</td>
                <td>${o.quantity}</td>
                <td>$${parseFloat(o.total).toFixed(2)}</td>
                <td>${o.date}</td>
                <td><span class="status status-${o.status.toLowerCase()}">${o.status}</span></td>
                <td>
                    <select onchange="updateOrderStatus('${o.id}', this.value)">
                        <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Completed" ${o.status === 'Completed' ? 'selected' : ''}>Completed</option>
                        <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </td>
            </tr>
        `).join('');
    }).catch((error) => {
        console.error('Error loading orders:', error);
    });
}

window.updateOrderStatus = async function(id, status) {
    try {
        const orderRef = ref(database, 'orders/' + id);
        await update(orderRef, { status });
    } catch (error) {
        console.error('Error updating order:', error);
    }
}

function loadUsersTable() {
    const usersRef = ref(database, 'users');
    get(usersRef).then((snapshot) => {
        const users = snapshot.val() || {};
        const usersArray = Object.entries(users).map(([id, data]) => ({
            id: id,
            ...data
        }));
        
        const tbody = document.getElementById('usersTable');
        
        tbody.innerHTML = usersArray.map(u => `
            <tr>
                <td>#${u.id}</td>
                <td>${u.name}</td>
                <td>${u.email}</td>
                <td>${u.registeredDate}</td>
                <td>${u.ordersCount || 0}</td>
            </tr>
        `).join('');
    }).catch((error) => {
        console.error('Error loading users:', error);
    });
}

function loadStats() {
    const productsRef = ref(database, 'products');
    const ordersRef = ref(database, 'orders');
    
    Promise.all([
        get(productsRef),
        get(ordersRef)
    ]).then(([productsSnap, ordersSnap]) => {
        const products = Object.keys(productsSnap.val() || {}).length;
        const orders = ordersSnap.val() || {};
        const ordersArray = Object.values(orders);
        
        const totalRevenue = ordersArray
            .filter(o => o.status === 'Completed')
            .reduce((sum, o) => sum + parseFloat(o.total), 0);
        
        const pendingOrders = ordersArray.filter(o => o.status === 'Pending').length;
        
        document.getElementById('statsGrid').innerHTML = `
            <div class="stat-card">
                <h3>Total Products</h3>
                <div class="value">${products}</div>
            </div>
            <div class="stat-card">
                <h3>Total Revenue</h3>
                <div class="value">$${totalRevenue.toFixed(2)}</div>
            </div>
            <div class="stat-card">
                <h3>Total Orders</h3>
                <div class="value">${ordersArray.length}</div>
            </div>
            <div class="stat-card">
                <h3>Pending Orders</h3>
                <div class="value">${pendingOrders}</div>
            </div>
        `;
    }).catch((error) => {
        console.error('Error loading stats:', error);
    });
}

console.log('✅ Admin script loaded!');
