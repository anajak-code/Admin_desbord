let revenueChart = null;
let realtimeInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initTheme();
    setupKeyboardShortcuts();
    setupModalCloseHandlers();
});

function initNavigation() {
    document.querySelectorAll('.menu-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            switchSection(section);
            document.querySelectorAll('.menu-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            document.getElementById('sidebar').classList.remove('mobile-open');
        });
    });
    const toggleBtn = document.getElementById('toggleSidebar');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            if (window.innerWidth <= 768) document.getElementById('sidebar').classList.toggle('mobile-open');
            else document.getElementById('sidebar').classList.toggle('collapsed');
        });
    }
    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('sidebar');
        const menuBtn = document.querySelector('.toggle-sidebar');
        if (window.innerWidth <= 768 && !sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
            sidebar.classList.remove('mobile-open');
        }
    });
}

function switchSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(`section-${sectionId}`);
    if (target) target.classList.add('active');
    if (sectionId === 'dashboard') { loadDashboard(); startRealtimeMonitoring(); }
    else if (sectionId === 'products') loadProducts();
    else if (sectionId === 'orders') loadOrders();
    else if (sectionId === 'users') loadUsers();
    else if (sectionId === 'discounts') loadDiscounts();
    else if (sectionId === 'stock') loadStock();
    else if (sectionId === 'settings') loadSettings();
    clearInterval(realtimeInterval);
}

function initTheme() {
    const saved = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
        });
    }
}

function showToast(message, type = 'success', title = '') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const icons = { success: 'fa-check', error: 'fa-times', warning: 'fa-exclamation' };
    const defaultTitles = { success: 'Success', error: 'Error', warning: 'Warning' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<div class="toast-icon"><i class="fas ${icons[type] || icons.success}"></i></div><div class="toast-content"><div class="toast-title">${title || defaultTitles[type]}</div><div class="toast-message">${message}</div></div><button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('removing'); setTimeout(() => toast.remove(), 300); }, 3000);
}

function openProductModal() { document.getElementById('productModalTitle').innerText = 'បន្ថែមផលិតផលថ្មី'; document.getElementById('productForm').reset(); document.getElementById('prodId').value = ''; document.getElementById('productModal').classList.add('active'); }
function closeProductModal() { document.getElementById('productModal').classList.remove('active'); }
function openDiscountModal() { document.getElementById('discountForm').reset(); document.getElementById('discLimitGroup').style.display = 'none'; document.getElementById('discExpiryGroup').style.display = 'none'; document.getElementById('discountModal').classList.add('active'); }
function closeDiscountModal() { document.getElementById('discountModal').classList.remove('active'); }
function toggleDiscLimit() { document.getElementById('discLimitGroup').style.display = document.getElementById('discLimitType').value === 'fixed' ? 'block' : 'none'; }
function toggleDiscExpiry() { document.getElementById('discExpiryGroup').style.display = document.getElementById('discExpiryType').value === 'unlimited' ? 'none' : 'block'; }

function openStockModal(productId, productName, currentStock) {
    document.getElementById('stockProductId').value = productId;
    document.getElementById('stockProductName').value = productName;
    document.getElementById('stockCurrent').value = currentStock;
    document.getElementById('stockForm').reset();
    document.getElementById('stockProductId').value = productId;
    document.getElementById('stockProductName').value = productName;
    document.getElementById('stockCurrent').value = currentStock;
    document.getElementById('stockModal').classList.add('active');
}
function closeStockModal() { document.getElementById('stockModal').classList.remove('active'); }

function openBanModal(userId, userName, isBan) {
    document.getElementById('banUserId').value = userId;
    document.getElementById('banAction').value = isBan ? 'ban' : 'unban';
    document.getElementById('banModalTitle').innerText = isBan ? `Ban ${userName}` : `Unban ${userName}`;
    document.getElementById('banReasonGroup').style.display = isBan ? 'block' : 'none';
    document.getElementById('banSubmitBtn').innerHTML = isBan ? '<i class="fas fa-ban"></i> Ban' : '<i class="fas fa-unlock"></i> Unban';
    document.getElementById('banSubmitBtn').className = isBan ? 'btn btn-danger' : 'btn btn-success';
    document.getElementById('banModal').classList.add('active');
}
function closeBanModal() { document.getElementById('banModal').classList.remove('active'); }
function closeInventoryModal() { document.getElementById('inventoryModal').classList.remove('active'); }

function handleLogout() {
    if (!confirm('តើអ្កប្រាកដជាចង់ចាកចេញ?')) return;
    clearToken();
    window.location.href = 'login/index.html';
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); showToast('Search feature coming soon!', 'warning', 'Shortcut'); }
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); const productsSection = document.getElementById('section-products'); if (productsSection && productsSection.classList.contains('active')) { openProductModal(); } else { switchSection('products'); setTimeout(openProductModal, 100); } }
        if (e.key === 'Escape') { closeProductModal(); closeDiscountModal(); closeInventoryModal(); closeStockModal(); closeBanModal(); }
        if (e.altKey && e.key === 'd') { e.preventDefault(); switchSection('dashboard'); }
    });
}

function setupModalCloseHandlers() {
    document.querySelectorAll('.modal').forEach(m => { m.addEventListener('click', (e) => { if (e.target === m) m.classList.remove('active'); }); });
}
