// API Base URL
const API_URL = window.location.origin;

// State
let currentUser = null;
let eventSource = null;
let dashboardPollInterval = null;

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
    // 1. Setup listeners first so UI triggers work correctly
    setupEventListeners();
    // 2. Check auth which might trigger immediate UI changes
    checkAuth();
    console.log('ConnectEz: Initialization complete');
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

    // Detailed Stats Modal
    const statsModal = document.getElementById('statsModal');
    const viewDetailsBtn = document.getElementById('viewDetailsBtn');
    const closeStatsModal = document.getElementById('closeStatsModal');

    viewDetailsBtn.addEventListener('click', loadUserDetails);
    closeStatsModal.addEventListener('click', () => statsModal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target === statsModal) statsModal.style.display = 'none';
    });

    // Event delegation for installation list clicks
    document.getElementById('installList').addEventListener('click', (e) => {
        const btn = e.target.closest('.view-install-btn');
        if (btn) {
            const installId = btn.dataset.id;
            loadInstallationDetails(installId);
        }
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
    stopDashboardPolling();
}

function stopDashboardPolling() {
    if (dashboardPollInterval) {
        clearInterval(dashboardPollInterval);
        dashboardPollInterval = null;
    }
}

// Show dashboard page
function showDashboard() {
    authPage.classList.add('hidden');
    dashboardPage.classList.remove('hidden');
    updateDashboard();
    connectSSE();

    // Start polling for real-time status updates (Fallback/Guaranteed)
    stopDashboardPolling(); // Clear existing to be safe
    // Start polling for real-time status updates (Timer Based 60s)
    stopDashboardPolling(); // Clear existing to be safe

    // Create Timer UI if not exists
    let timerDisplay = document.getElementById('userDashboardTimer');
    if (!timerDisplay) {
        timerDisplay = document.createElement('div');
        timerDisplay.id = 'userDashboardTimer';
        timerDisplay.style.cssText = 'position:fixed; bottom:20px; right:20px; background:#333; color:white; padding:10px 20px; border-radius:30px; font-family:sans-serif; z-index:9999; box-shadow:0 4px 12px rgba(0,0,0,0.3); font-size:14px;';
        document.body.appendChild(timerDisplay);
    }

    let countdown = 30;
    timerDisplay.innerHTML = 'Next update: 30s';
    timerDisplay.style.background = '#333';

    dashboardPollInterval = setInterval(async () => {
        countdown--;
        if (countdown <= 0) {
            // 1. Show Updating
            timerDisplay.innerHTML = '⏳ Syncing...';
            timerDisplay.style.background = '#eab308'; // Yellow/Orange

            // 2. Wait for Data
            try {
                await updateDashboard(true);

                // 3. Show Success
                timerDisplay.innerHTML = '✅ Data Updated';
                timerDisplay.style.background = '#22c55e'; // Green
            } catch (e) {
                timerDisplay.innerHTML = '❌ Error';
                timerDisplay.style.background = '#ef4444'; // Red
            }

            setTimeout(() => {
                countdown = 30;
                timerDisplay.style.background = '#333';
                timerDisplay.innerHTML = `Next update: ${countdown}s`;
            }, 2000);
        } else {
            timerDisplay.innerHTML = `Next update: ${countdown}s`;
        }
    }, 1000);
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

    // Update Total Active Time
    const totalTimeEl = document.getElementById('totalActiveTime');
    if (totalTimeEl) {
        const totalSec = stats.totalActiveSeconds || 0;
        totalTimeEl.textContent = formatDurationHMS(totalSec);
        totalTimeEl.setAttribute('data-seconds', totalSec);
    }

    // Update recent installations
    updateRecentInstalls(stats.recentInstalls);
}

// Animate number change
function animateValue(elementId, newValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
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
    if (!installList) return;

    if (!installs || installs.length === 0) {
        installList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: var(--spacing-lg);">No installations yet. Share your referral code to get started!</p>';
        return;
    }

    try {
        installList.innerHTML = installs.map(install => {
            const date = new Date(install.installed_at);
            const now = new Date();
            const diffHours = Math.floor((now - date) / (1000 * 60 * 60));

            // Online Status Calculation (Trusting Server isOnline)
            let isOnline = install.isOnline;
            const isUninstalled = install.status === 'uninstalled';
            const canLiveTick = isOnline && !isUninstalled;

            let statusDotClass = isOnline ? 'online' : 'offline';
            if (isUninstalled) statusDotClass = 'offline';

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

            // Format timestamps
            const formatTimestamp = (timestamp) => {
                if (!timestamp) return 'N/A';
                const d = new Date(timestamp);
                return d.toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            };

            const activeTimeHMS = formatDurationHMS(install.active_seconds || 0);

            return `
      <div class="install-item ${isUninstalled ? 'uninstalled-fade' : ''}">
        <div class="install-info">
          <div style="font-weight: 600; display: flex; align-items: center; gap: 8px;">
             Installation <span style="font-family: monospace; opacity: 0.7;">#${install.install_id.substring(0, 8)}</span>
             <span class="status-dot ${statusDotClass}" title="${isUninstalled ? 'Uninstalled' : (isOnline ? 'Online now' : 'Offline')}"></span>
          </div>
          <div class="install-date">
            📅 Installed: ${timeAgo}
            ${isUninstalled ? `<div style="color: #ef4444; font-size: 0.9em; font-weight: 600; margin-top:2px;">❌ Uninstalled: ${formatTimestamp(install.uninstalled_at)}</div>` : ''}
          </div>
          <div style="font-size: 0.85em; color: var(--text-secondary); margin-top: 4px;">
            <div>⏱️ Active Time: <strong class="live-timer" data-seconds="${install.active_seconds || 0}" data-online="${canLiveTick}">${activeTimeHMS}</strong></div>
            <div>▶️ Start: ${formatTimestamp(install.last_active_start)}</div>
            <div>⏸️ Stop: ${formatTimestamp(install.last_active_stop)}</div>
          </div>
        </div>
        <div style="display: flex; gap: var(--spacing-xs); align-items: center; flex-wrap: wrap;">
          ${isUninstalled ? '<span class="badge" style="background: #ef4444; color: white;">🔴 Uninstalled</span>' :
                    (install.mellowtel_opted_in ? '<span class="badge badge-success">✓ Mellowtel</span>' : '<span class="badge badge-warning">No Mellowtel</span>')}
          
          ${isUninstalled ? '' : (isOnline ? '<span class="badge badge-active">🟢 Online</span>' : '<span class="badge" style="background:#eee;color:#666">⚪ Offline</span>')}
          
          <button class="btn btn-secondary view-install-btn" data-id="${install.install_id}" style="padding: 4px 8px; font-size: 0.8em; margin-left: 5px;">
             👁️ View
          </button>
        </div>
      </div>
    `;
        }).join('');

        // Start Live Ticking (if not already started)
        if (!window.liveTickerInterval) {
            window.liveTickerInterval = setInterval(() => {
                const onlineTimers = document.querySelectorAll('.live-timer[data-online="true"]');
                let addedSeconds = 0;

                onlineTimers.forEach(timer => {
                    let seconds = parseInt(timer.getAttribute('data-seconds') || '0');
                    seconds++;
                    timer.setAttribute('data-seconds', seconds);
                    timer.textContent = formatDurationHMS(seconds);
                    addedSeconds++;
                });

                // Update Total Time if any timers ticked
                // (Note: This is an approximation. Ideally we sync active_seconds sum)
                // But simply incrementing total by 1s if AT LEAST one is online isn't right.
                // Actually, "Total Active Time" is sum of all seconds.
                // If 2 users are online, we behave like a company: we pay for 2 man-hours per hour.
                // So if 2 users tick, Total increments by 2s.

                if (onlineTimers.length > 0) {
                    const totalEl = document.getElementById('totalActiveTime');
                    if (totalEl) {
                        // We need to store total seconds in data attribute too
                        let totalSec = parseInt(totalEl.getAttribute('data-seconds') || '0');
                        totalSec += onlineTimers.length; // Add 1s for EACH online user
                        totalEl.setAttribute('data-seconds', totalSec);
                        totalEl.textContent = formatDurationHMS(totalSec);
                    }
                }

            }, 1000);
        }
    } catch (err) {
        console.error('Error rendering installations:', err);
        if (installList) {
            installList.innerHTML = `<div class="error-message" style="color:#ef4444; padding:20px; text-align:center;">
                <strong>⚠️ Render Error:</strong> ${err.message}<br>
                Please refresh the page.
            </div>`;
        }
    }
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
        setTimeout(clearMessages, 2000);
    } catch (err) {
        console.error('Copy failed:', err);
        showError('Failed to copy. Please copy manually.');
    }
}

// Detailed Analytics Functions
async function loadUserDetails() {
    const modal = document.getElementById('statsModal');
    const chartCanvas = document.getElementById('userStatsChart');
    const historyBody = document.getElementById('userHistoryBody');

    modal.style.display = 'block';

    // Reset chart if exists
    if (window.userStatsChart instanceof Chart) {
        window.userStatsChart.destroy();
    }
    historyBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Loading...</td></tr>';

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/user/details?days=30`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.error) throw new Error(data.error);

        renderUserChart(chartCanvas, data.dailyStats);
        renderUserHistory(historyBody, data.history);

    } catch (error) {
        console.error('Details error:', error);
        historyBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: red;">Failed to load data</td></tr>';
    }
}



async function loadInstallationDetails(installId) {
    const modal = document.getElementById('statsModal');
    const chartCanvas = document.getElementById('userStatsChart');
    const historyBody = document.getElementById('userHistoryBody');
    const modalTitle = modal.querySelector('h2');

    modal.style.display = 'block';
    modalTitle.textContent = `📊 Installation Details (${installId.substring(0, 8)})`;

    // Hide chart for single installation view (since we don't have daily stats for it yet)
    // OR keep it processing? The backend doesn't return dailyStats for this endpoint.
    // So let's hide the canvas container.
    chartCanvas.parentElement.style.display = 'none';

    historyBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Loading...</td></tr>';

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/user/installation/${installId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.error) throw new Error(data.error);

        // Show summary row
        historyBody.innerHTML = `
            <tr style="background: rgba(59, 130, 246, 0.1); font-weight: bold;">
                <td colspan="2">Total Active Time</td>
                <td style="color: #3b82f6;">${formatDuration(data.totalActiveSeconds)}</td>
            </tr>
        `;

        // Append history rows
        if (data.history && data.history.length > 0) {
            historyBody.innerHTML += data.history.map(session => `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #1e293b;">${new Date(session.start_time).toLocaleString()}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #1e293b;">${new Date(session.last_heartbeat).toLocaleString()}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #1e293b; color: #a5b4fc; font-weight: bold;">
                        ${formatDuration(session.duration_seconds)}
                    </td>
                </tr>
            `).join('');
        } else {
            historyBody.innerHTML += '<tr><td colspan="3" style="text-align: center; padding: 20px; color: #64748b;">No detailed history found</td></tr>';
        }

    } catch (error) {
        console.error('Details error:', error);
        historyBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: red;">Failed to load data</td></tr>';
    }
}

// Reset modal state when closing (to show chart again for main view)
document.getElementById('closeStatsModal').addEventListener('click', () => {
    document.getElementById('userStatsChart').parentElement.style.display = 'block';
    document.querySelector('#statsModal h2').textContent = '📊 Your Detailed Analytics';
});

function renderUserChart(canvas, dailyStats) {
    canvas.parentElement.style.display = 'block'; // Ensure it's visible
    const ctx = canvas.getContext('2d');
    const labels = dailyStats.map(d => new Date(d.date).toLocaleDateString());
    const installs = dailyStats.map(d => d.installs);
    const active = dailyStats.map(d => d.activeUsers);
    const mellowtel = dailyStats.map(d => d.mellowtelOptIns);

    window.userStatsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'New Installs',
                    data: installs,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    yAxisID: 'y',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Mellowtel Opt-ins',
                    data: mellowtel,
                    borderColor: '#10b981',
                    yAxisID: 'y',
                    tension: 0.4
                },
                {
                    label: 'Active Users',
                    data: active,
                    borderColor: '#f59e0b',
                    yAxisID: 'y1',
                    borderDash: [5, 5],
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false } },
                x: { grid: { display: false } }
            },
            plugins: {
                legend: { position: 'top' }
            }
        }
    });
}

function renderUserHistory(tbody, sessions) {
    if (!sessions || sessions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px; color: #64748b;">No activity history found</td></tr>';
        return;
    }

    tbody.innerHTML = sessions.map(session => `
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #1e293b;">${new Date(session.start_time).toLocaleString()}</td>
            <td style="padding: 10px; border-bottom: 1px solid #1e293b;">${new Date(session.last_heartbeat).toLocaleString()}</td>
            <td style="padding: 10px; border-bottom: 1px solid #1e293b; color: #a5b4fc; font-weight: bold;">
                ${formatDuration(session.duration_seconds)}
            </td>
        </tr>
    `).join('');
}

function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
}

function formatDurationHMS(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
}
