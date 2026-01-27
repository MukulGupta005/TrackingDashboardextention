// API Base URL
const API_URL = window.location.origin;

// State
let currentUser = null;
let eventSource = null;

// DOM Elements
const authPage = document.getElementById('authPage');
const dashboardPage = document.getElementById('dashboardPage');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const showLoginBtn = document.getElementById('showLogin');
const showRegisterBtn = document.getElementById('showRegister');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const logoutBtn = document.getElementById('logoutBtn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Auth toggle
    showLoginBtn.addEventListener('click', () => {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        showLoginBtn.classList.remove('btn-secondary');
        showLoginBtn.classList.add('btn-primary');
        showRegisterBtn.classList.remove('btn-primary');
        showRegisterBtn.classList.add('btn-secondary');
        clearMessages();
    });

    showRegisterBtn.addEventListener('click', () => {
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
        showRegisterBtn.classList.remove('btn-secondary');
        showRegisterBtn.classList.add('btn-primary');
        showLoginBtn.classList.remove('btn-primary');
        showLoginBtn.classList.add('btn-secondary');
        clearMessages();
    });

    // Forms
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    logoutBtn.addEventListener('click', handleLogout);

    // Copy buttons
    document.getElementById('copyCodeBtn').addEventListener('click', () => {
        const code = document.getElementById('referralCode').textContent;
        copyToClipboard(code, 'Referral code copied!');
    });

    document.getElementById('copyUrlBtn').addEventListener('click', () => {
        const url = document.getElementById('trackingUrl').textContent;
        copyToClipboard(url, 'URL copied!');
    });
}

// Check authentication status
function checkAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.exp * 1000 > Date.now()) {
                currentUser = payload;
                showDashboard();
                return;
            }
        } catch (e) {
            console.error('Invalid token');
        }
    }
    showAuth();
}

// Show authentication page
function showAuth() {
    authPage.classList.remove('hidden');
    dashboardPage.classList.add('hidden');
    // Show login form by default
    showLoginBtn.click();
}

// Show dashboard page
function showDashboard() {
    authPage.classList.add('hidden');
    dashboardPage.classList.remove('hidden');
    updateDashboard();
    connectSSE();
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    clearMessages();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            showError(data.error || 'Login failed');
            return;
        }

        localStorage.setItem('token', data.token);
        currentUser = data.user;
        showDashboard();
    } catch (error) {
        console.error('Login error:', error);
        showError('Network error. Please try again.');
    }
}

// Handle register
async function handleRegister(e) {
    e.preventDefault();
    clearMessages();

    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
        showError('Passwords do not match');
        return;
    }

    if (password.length < 6) {
        showError('Password must be at least 6 characters');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            showError(data.error || 'Registration failed');
            return;
        }

        localStorage.setItem('token', data.token);
        currentUser = data.user;
        showSuccess('Account created successfully!');
        setTimeout(() => showDashboard(), 1000);
    } catch (error) {
        console.error('Registration error:', error);
        showError('Network error. Please try again.');
    }
}

// Handle logout
function handleLogout() {
    if (eventSource) {
        eventSource.close();
    }
    localStorage.removeItem('token');
    currentUser = null;
    showAuth();
}

// Update dashboard
async function updateDashboard() {
    // Update user info
    document.getElementById('userEmail').textContent = currentUser.email;
    document.getElementById('userAvatar').textContent = currentUser.email[0].toUpperCase();
    document.getElementById('referralCode').textContent = currentUser.referralCode;

    // Create tracking URL (you can modify this to your actual extension install URL)
    const trackingUrl = `https://your-extension-install-page.com?ref=${currentUser.referralCode}`;
    document.getElementById('trackingUrl').textContent = trackingUrl;

    // Fetch stats
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                handleLogout();
                return;
            }
            throw new Error('Failed to fetch stats');
        }

        const stats = await response.json();
        updateStats(stats);
    } catch (error) {
        console.error('Stats fetch error:', error);
    }
}

// Update stats display
function updateStats(stats) {
    // Animate stat cards
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => card.classList.add('updating'));
    setTimeout(() => statCards.forEach(card => card.classList.remove('updating')), 1000);

    // Update values
    animateValue('totalInstalls', stats.totalInstalls);
    animateValue('mellowtelOptIns', stats.mellowtelOptIns);
    animateValue('activeUsers', stats.activeUsers);

    // Update recent installations
    updateRecentInstalls(stats.recentInstalls);
}

// Animate number change
function animateValue(elementId, newValue) {
    const element = document.getElementById(elementId);
    const currentValue = parseInt(element.textContent) || 0;

    if (currentValue === newValue) return;

    const duration = 500;
    const steps = 20;
    const stepValue = (newValue - currentValue) / steps;
    const stepDuration = duration / steps;

    let current = currentValue;
    const timer = setInterval(() => {
        current += stepValue;
        if ((stepValue > 0 && current >= newValue) || (stepValue < 0 && current <= newValue)) {
            element.textContent = newValue;
            clearInterval(timer);
        } else {
            element.textContent = Math.round(current);
        }
    }, stepDuration);
}

// Update recent installations list
function updateRecentInstalls(installs) {
    const installList = document.getElementById('installList');

    if (!installs || installs.length === 0) {
        installList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: var(--spacing-lg);">No installations yet. Share your referral code to get started!</p>';
        return;
    }

    installList.innerHTML = installs.map(install => {
        const date = new Date(install.installed_at);
        const now = new Date();
        const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
        const isActive = diffHours < 24;

        let timeAgo;
        if (diffHours < 1) {
            const diffMins = Math.floor((now - date) / (1000 * 60));
            timeAgo = `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
            timeAgo = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        } else {
            const diffDays = Math.floor(diffHours / 24);
            timeAgo = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        }

        return `
      <div class="install-item">
        <div class="install-info">
          <div style="font-weight: 600;">Installation #${install.id}</div>
          <div class="install-date">📅 ${timeAgo}</div>
        </div>
        <div style="display: flex; gap: var(--spacing-xs); flex-wrap: wrap;">
          ${install.mellowtel_opted_in ? '<span class="badge badge-success">✓ Mellowtel</span>' : '<span class="badge badge-warning">No Mellowtel</span>'}
          ${isActive ? '<span class="badge badge-active">🔥 Active</span>' : ''}
        </div>
      </div>
    `;
    }).join('');
}

// Connect to SSE for real-time updates
function connectSSE() {
    const token = localStorage.getItem('token');

    if (eventSource) {
        eventSource.close();
    }

    eventSource = new EventSource(`${API_URL}/api/stream?token=${token}`);

    eventSource.onmessage = (event) => {
        if (event.data && event.data !== ': heartbeat') {
            try {
                const stats = JSON.parse(event.data);
                updateStats(stats);
            } catch (e) {
                console.error('SSE parse error:', e);
            }
        }
    };

    eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        eventSource.close();
        // Reconnect after 5 seconds
        setTimeout(() => {
            if (currentUser) {
                connectSSE();
            }
        }, 5000);
    };
}

// Utility functions
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.classList.remove('hidden');
}

function clearMessages() {
    errorMessage.classList.add('hidden');
    successMessage.classList.add('hidden');
}

async function copyToClipboard(text, successMsg) {
    try {
        await navigator.clipboard.writeText(text);
        showSuccess(successMsg);
        setTimeout(clearMessages, 3000);
    } catch (err) {
        console.error('Copy failed:', err);
        showError('Failed to copy. Please copy manually.');
    }
}
