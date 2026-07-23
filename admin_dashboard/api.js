const API_BASE = 'https://api.anajakcode.site';

const API = {
    // Stats
    getStats: () => fetch(`${API_BASE}/api/admin/stats`, {
        credentials: 'include'
    }).then(r => r.json()),
    
    // Products
    getProducts: () => fetch(`${API_BASE}/api/products`).then(r => r.json()),
    getProduct: (id) => fetch(`${API_BASE}/api/products/${id}`).then(r => r.json()),
    addProduct: (data) => fetch(`${API_BASE}/api/admin/products`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data),
        credentials: 'include'
    }).then(r => r.json()),
    updateProduct: (id, data) => fetch(`${API_BASE}/api/admin/products/${id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data),
        credentials: 'include'
    }).then(r => r.json()),
    deleteProduct: (id) => fetch(`${API_BASE}/api/admin/products/${id}`, {
        method: 'DELETE',
        credentials: 'include'
    }).then(r => r.json()),
    
    // Upload
    uploadFile: (file) => {
        const fd = new FormData();
        fd.append('file', file);
        return fetch(`${API_BASE}/api/admin/upload`, {
            method: 'POST',
            body: fd,
            credentials: 'include'
        }).then(r => r.json());
    },
    
    // Orders
    getOrders: () => fetch(`${API_BASE}/api/admin/orders`, {
        credentials: 'include'
    }).then(r => r.json()),
    
    // Users
    getUsers: () => fetch(`${API_BASE}/api/admin/users`, {
        credentials: 'include'
    }).then(r => r.json()),
    deleteUser: (id) => fetch(`${API_BASE}/api/admin/users/${id}`, {
        method: 'DELETE',
        credentials: 'include'
    }).then(r => r.json()),
    banUser: (id) => fetch(`${API_BASE}/api/admin/users/${id}/ban`, {
        method: 'PUT',
        credentials: 'include'
    }).then(r => r.json()),
    unbanUser: (id) => fetch(`${API_BASE}/api/admin/users/${id}/unban`, {
        method: 'PUT',
        credentials: 'include'
    }).then(r => r.json()),
    
    // Tickets
    getTickets: () => fetch(`${API_BASE}/api/admin/tickets`, {
        credentials: 'include'
    }).then(r => r.json()),
    closeTicket: (id) => fetch(`${API_BASE}/api/admin/tickets/${id}/close`, {
        method: 'PUT',
        credentials: 'include'
    }).then(r => r.json()),
    
    // Discounts
    getDiscounts: () => fetch(`${API_BASE}/api/admin/discounts`, {
        credentials: 'include'
    }).then(r => r.json()),
    addDiscount: (data) => fetch(`${API_BASE}/api/admin/discounts`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data),
        credentials: 'include'
    }).then(r => r.json()),
    
    // Auth
    adminLogin: (email, password) => fetch(`${API_BASE}/api/admin/login`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email, password}),
        credentials: 'include'
    }).then(r => r.json()),
    
    adminLogout: () => fetch(`${API_BASE}/api/admin/logout`, {
        method: 'POST',
        credentials: 'include'
    }).then(r => r.json())
};
