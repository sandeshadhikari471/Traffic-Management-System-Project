const API_BASE = 'http://localhost:5000/api';

// Auth helpers
const getToken = () => localStorage.getItem('hgh_token'); // For backward compat
const getUser = () => JSON.parse(localStorage.getItem('hgh_user') || 'null');
const setAuth = (token, user) => {
  // Token is now set in HTTPOnly cookie by backend. We don't need to store it.
  localStorage.setItem('hgh_user', JSON.stringify(user));
};
const clearAuth = () => {
  localStorage.removeItem('hgh_token');
  localStorage.removeItem('hgh_user');
  // Optional: clear cookie by hitting a logout endpoint, but clearing user suffices for UI
};
const isLoggedIn = () => !!getUser();

// API call helper
const apiCall = async (endpoint, method = 'GET', body = null, requireAuth = false) => {
  const headers = { 'Content-Type': 'application/json' };
  if (requireAuth) {
    const token = getToken();
    // Use user as an indicator for frontend redirect since token is in httpOnly cookie
    if (!getUser()) {
      window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const options = { method, headers, credentials: 'include' };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${API_BASE}${endpoint}`, options);
  const data = await response.json();

  if (response.status === 401) {
    clearAuth();
    window.location.href = 'login.html';
    return;
  }

  return { ok: response.ok, status: response.status, data };
};

// Format currency in Nepali Rupees
const formatNPR = (amount) => {
  return 'NPR ' + new Intl.NumberFormat('ne-NP').format(amount);
};

// Format date
const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-NP', { year: 'numeric', month: 'long', day: 'numeric' });
};

// Show notification/toast
const showToast = (message, type = 'success') => {
  const existingToast = document.querySelector('.toast-notification');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.className = `toast-notification toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</div>
    <div class="toast-message">${message}</div>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;
  document.body.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) toast.remove();
  }, 4000);
};

// Show loading state
const setLoading = (btn, loading, text = null) => {
  if (loading) {
    btn.disabled = true;
    btn.dataset.originalText = btn.textContent;
    btn.innerHTML = '<span class="spinner"></span>' + (text || 'Processing...');
  } else {
    btn.disabled = false;
    btn.textContent = btn.dataset.originalText;
  }
};

// Update nav based on auth state
const updateNav = () => {
  const user = getUser();
  const navAuthLinks = document.getElementById('nav-auth-links');
  const navUserMenu = document.getElementById('nav-user-menu');
  const navUserName = document.getElementById('nav-user-name');

  if (!navAuthLinks) return;

  if (isLoggedIn() && user) {
    if (navAuthLinks) navAuthLinks.style.display = 'none';
    if (navUserMenu) {
      navUserMenu.style.display = 'flex';
      if (navUserName) navUserName.textContent = user.name.split(' ')[0];
    }
  } else {
    if (navAuthLinks) navAuthLinks.style.display = 'flex';
    if (navUserMenu) navUserMenu.style.display = 'none';
  }
};

// Logout
const logout = () => {
  clearAuth();
  showToast('Logged out successfully. Namaste! 🙏', 'success');
  setTimeout(() => window.location.href = 'index.html', 1000);
};

// Calculate nights between dates
const calculateNights = (checkIn, checkOut) => {
  const d1 = new Date(checkIn);
  const d2 = new Date(checkOut);
  return Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
};

// Get status badge HTML
const getStatusBadge = (status) => {
  const badges = {
    pending: '<span class="badge badge-warning">⏳ Pending</span>',
    confirmed: '<span class="badge badge-success">✅ Confirmed</span>',
    checked_in: '<span class="badge badge-info">🏨 Checked In</span>',
    checked_out: '<span class="badge badge-secondary">🚪 Checked Out</span>',
    cancelled: '<span class="badge badge-danger">❌ Cancelled</span>',
    paid: '<span class="badge badge-success">💚 Paid</span>',
    unpaid: '<span class="badge badge-warning">⚠️ Unpaid</span>',
    cash_pending: '<span class="badge badge-info">💵 Pay at Hotel</span>',
    full_refund: '<span class="badge badge-info">↩️ Full Refund</span>',
    partial_refund: '<span class="badge badge-info">↩️ Partial Refund</span>',
    no_refund: '<span class="badge badge-danger">No Refund</span>'
  };
  return badges[status] || `<span class="badge badge-secondary">${status}</span>`;
};

// Room type icons
const getRoomIcon = (type) => {
  const icons = {
    'Standard': '🛏️',
    'Deluxe': '🌟',
    'Super Deluxe': '💫',
    'Suite': '👑',
    'Presidential Suite': '🏆'
  };
  return icons[type] || '🏨';
};

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  updateNav();

  // Mobile menu toggle
  const menuToggle = document.getElementById('menu-toggle');
  const navMenu = document.getElementById('nav-menu');
  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
    });
  }

  // User dropdown
  const userBtn = document.getElementById('nav-user-name');
  const userDropdown = document.getElementById('user-dropdown');
  if (userBtn && userDropdown) {
    userBtn.parentElement.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle('active');
    });
    document.addEventListener('click', () => userDropdown.classList.remove('active'));
  }
});

window.HGH = {
  API_BASE, apiCall, getToken, getUser, setAuth, clearAuth,
  isLoggedIn, formatNPR, formatDate, showToast, setLoading,
  updateNav, logout, calculateNights, getStatusBadge, getRoomIcon
};
