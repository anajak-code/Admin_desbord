// ============================================
// API CONFIGURATION
// ============================================
const API_URL = 'https://api.anajakcode.site/api';

// ============================================
// AUTH HELPERS
// ============================================
function getToken() { 
    return localStorage.getItem('admin_token'); 
}

function setToken(token) { 
    localStorage.setItem('admin_token', token); 
}

function clearToken() { 
    localStorage.removeItem('admin_token'); 
}

// Check auth on load
if (!getToken() && !window.location.pathname.includes('login')) {
    window.location.href = 'login/index.html';
}

// ============================================
// FETCH WITH AUTH
// ============================================
async function fetchWithAuth(url, options = {}) {
    const token = getToken();
    
    console.log(' Token:', token ? '✅ Present' : '❌ Missing');
    console.log('📡 Fetching:', url);
    
    const headers = { 
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };
    
    // Add Authorization header if token exists
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
        const response = await fetch(url, { ...options, headers });
        
        console.log('📡 Response status:', response.status);
        
        if (response.status === 401) {
            console.error('❌ Unauthorized - Token invalid or missing');
            clearToken();
            window.location.href = 'login/index.html';
            return null;
        }
        
        return response;
    } catch (error) {
        console.error('❌ Fetch error:', error);
        showToast('Connection failed', 'error');
        return null;
    }
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) {
        alert(message);
        return;
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <div class="toast-message">${message}</div>
        </div>
    `;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}
