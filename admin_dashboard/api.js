const API_BASE = 'https://api.anajakcode.site';

const API = {
    // Stats
    getStats: () => fetch(`${API_BASE}/api/admin/stats`).then(r => r.json()),
    
    // Products
    getProducts: () => fetch(`${API_BASE}/api/products`).then(r => r.json()),
    getProduct: (id) => fetch(`${API_BASE}/api/products/${id}`).then(r => r.json()),
    addProduct: (data) => fetch(`${API_BASE}/api/admin/products`, {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
    }).then(r => r.json()),
    updateProduct: (id, data) => fetch(`${API_BASE}/api/admin/products/${id}`, {
        method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)
    }).then(r => r.json()),
    deleteProduct: (id) => fetch(`${API_BASE}/api/admin/products/${id}`, {method: 'DELETE'}).then(r => r.json()),
    uploadFile: (file) => {
        const fd = new FormData(); fd.append('file', file);
        return fetch(`${API_BASE}/api/admin/upload`, {method: 'POST', body: fd}).then(r => r.json());
    },

    // Orders
    getOrders: () => fetch(`${API_BASE}/api/admin/orders`).then(r => r.json()),
    
    // Users
    getUsers: () => fetch(`${API_BASE}/api/admin/users`).then(r => r.json()),
    deleteUser: (id) => fetch(`${API_BASE}/api/admin/users/${id}`, {method: 'DELETE'}).then(r => r.json()),
    banUser: (id) => fetch(`${API_BASE}/api/admin/users/${id}/ban`, {method: 'PUT'}).then(r => r.json()),
    unbanUser: (id) => fetch(`${API_BASE}/api/admin/users/${id}/unban`, {method: 'PUT'}).then(r => r.json())
};

function logout() {
    if(confirm('Log out from Admin Panel?')) window.location.href = '/';
}
