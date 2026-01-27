# User Detail View - Implementation Plan

## Overview
Add a detailed user view to the admin dashboard that shows comprehensive analytics for each user when clicked.

## Features

### 1. Clickable User Rows
- Make each user row in the admin table clickable
- On click, navigate to a detailed view page (or show a modal)

### 2. User Detail Page
Display:
- **User Information**
  - Email
  - Referral Code (with copy button)
  - Registration date
  - Admin status
  
- **Current Stats**
  - Total Installations
  - Mellowtel Opt-ins
  - Active Users (24h)

- **Analytics Graphs** (7/30 days view)
  - Daily Installations (bar chart)
  - Daily Active Users (line chart)
  - Cumulative Mellowtel Opt-ins (line chart)

### 3. Recent Installations List
- Show last 20 installations for this user
- Display: Install ID, Date, Mellowtel status, Last active

---

## Implementation

### Backend

#### New API Endpoint
`GET /api/admin/users/:userId/details`

Returns:
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "referralCode": "ABC123",
    "isAdmin": false,
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "stats": {
    "totalInstalls": 50,
    "mellowtelOptIns": 30,
    "activeUsers": 15
  },
  "dailyStats": [
    {
      "date": "2024-01-27",
      "installs": 5,
      "activeUsers": 12,
      "mellowtelOptIns": 3
    }
  ],
  "recentInstallations": [
    {
      "id": 1,
      "installId": "abc123...",
      "installedAt": "2024-01-27T10:00:00Z",
      "mellowtelOptedIn": true,
      "lastActive": "2024-01-27T18:00:00Z"
    }
  ]
}
```

**Implementation in `server.js`:**

```javascript
// Get detailed stats for a specific user (admin only)
app.get('/api/admin/users/:userId/details', authenticateToken, authenticateAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const days = parseInt(req.query.days) || 30;

        // Get user info
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email, referral_code, is_admin, created_at')
            .eq('id', userId)
            .single();

        if (userError) throw userError;

        // Get current stats
        const stats = await getStatsByReferral(user.referral_code);

        // Get daily stats (aggregated by date)
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const { data: installations, error: installError } = await supabase
            .from('installations')
            .select('*')
            .eq('referral_code', user.referral_code)
            .gte('installed_at', cutoffDate.toISOString())
            .order('installed_at', { ascending: true });

        if (installError) throw installError;

        // Aggregate by day
        const dailyStats = {};
        installations.forEach(install => {
            const date = install.installed_at.split('T')[0];
            if (!dailyStats[date]) {
                dailyStats[date] = {
                    date,
                    installs: 0,
                    activeUsers: 0,
                    mellowtelOptIns: 0
                };
            }
            dailyStats[date].installs++;
            if (install.mellowtel_opted_in) {
                dailyStats[date].mellowtelOptIns++;
            }
            // Check if active in last 24h
            const lastActive = new Date(install.last_active);
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            if (lastActive > oneDayAgo) {
                dailyStats[date].activeUsers++;
            }
        });

        // Get recent installations (last 20)
        const { data: recentInstalls, error: recentError } = await supabase
            .from('installations')
            .select('*')
            .eq('referral_code', user.referral_code)
            .order('installed_at', { ascending: false })
            .limit(20);

        if (recentError) throw recentError;

        res.json({
            user: {
                id: user.id,
                email: user.email,
                referralCode: user.referral_code,
                isAdmin: user.is_admin,
                createdAt: user.created_at
            },
            stats,
            dailyStats: Object.values(dailyStats),
            recentInstallations: recentInstalls
        });
    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({ error: 'Failed to fetch user details' });
    }
});
```

---

### Frontend

#### Option 1: Modal (Recommended)
- Keep user on admin.html
- Show modal overlay with user details
- Better UX, no page reload

#### Option 2: Separate Page
- Navigate to `admin-user-detail.html?userId=123`
- Full-page view
- Easier to bookmark/share

**We'll implement Option 1 (Modal).**

---

### admin.html Updates

#### 1. Make rows clickable

```javascript
function renderUsersTable(users) {
    // ... existing code ...
    
    users.forEach(user => {
        const row = document.createElement('tr');
        row.style.cursor = 'pointer';
        row.onclick = () => showUserDetail(user.id);
        
        row.innerHTML = `
            <td>${user.email}</td>
            <!-- ... rest of the cells ... -->
        `;
        tbody.appendChild(row);
    });
}
```

#### 2. Add modal HTML

```html
<!-- User Detail Modal -->
<div id="userDetailModal" class="modal hidden">
  <div class="modal-content">
    <div class="modal-header">
      <h2>User Details</h2>
      <button class="close-btn" onclick="closeUserDetail()">×</button>
    </div>
    
    <div class="modal-body">
      <!-- User Info -->
      <div class="user-info-section">
        <h3>User Information</h3>
        <div class="info-grid">
          <div><strong>Email:</strong> <span id="detailEmail"></span></div>
          <div>
            <strong>Referral Code:</strong> 
            <span id="detailRefCode"></span>
            <button onclick="copyRefCode()">📋</button>
          </div>
          <div><strong>Registered:</strong> <span id="detailCreated"></span></div>
          <div><strong>Admin:</strong> <span id="detailAdmin"></span></div>
        </div>
      </div>
      
      <!-- Current Stats -->
      <div class="stats-section">
        <h3>Current Statistics</h3>
        <div class="stats-cards">
          <div class="stat-card">
            <div class="stat-value" id="detailInstalls">0</div>
            <div class="stat-label">Total Installations</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" id="detailMellowtel">0</div>
            <div class="stat-label">Mellowtel Opt-ins</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" id="detailActive">0</div>
            <div class="stat-label">Active Users (24h)</div>
          </div>
        </div>
      </div>
      
      <!-- Graphs -->
      <div class="graphs-section">
        <h3>Analytics</h3>
        <div class="date-range-selector">
          <button onclick="loadUserDetail(currentUserId, 7)">7 Days</button>
          <button onclick="loadUserDetail(currentUserId, 30)" class="active">30 Days</button>
        </div>
        
        <div class="charts-grid">
          <div class="chart-container">
            <h4>Daily Installations</h4>
            <canvas id="installsChart"></canvas>
          </div>
          <div class="chart-container">
            <h4>Active Users</h4>
            <canvas id="activeChart"></canvas>
          </div>
          <div class="chart-container">
            <h4>Mellowtel Opt-ins</h4>
            <canvas id="mellowtelChart"></canvas>
          </div>
        </div>
      </div>
      
      <!-- Recent Installations -->
      <div class="recent-section">
        <h3>Recent Installations (Last 20)</h3>
        <table id="recentInstallsTable">
          <thead>
            <tr>
              <th>Install ID</th>
              <th>Installed At</th>
              <th>Mellowtel</th>
              <th>Last Active</th>
            </tr>
          </thead>
          <tbody id="recentInstallsBody"></tbody>
        </table>
      </div>
    </div>
  </div>
</div>
```

#### 3. JavaScript for modal

```javascript
let currentUserId = null;
let charts = {};

async function showUserDetail(userId) {
    currentUserId = userId;
    await loadUserDetail(userId, 30);
    document.getElementById('userDetailModal').classList.remove('hidden');
}

function closeUserDetail() {
    document.getElementById('userDetailModal').classList.add('hidden');
    // Destroy charts to prevent memory leaks
    Object.values(charts).forEach(chart => chart.destroy());
    charts = {};
}

async function loadUserDetail(userId, days = 30) {
    try {
        const response = await fetch(`/api/admin/users/${userId}/details?days=${days}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        const data = await response.json();
        
        // Update user info
        document.getElementById('detailEmail').textContent = data.user.email;
        document.getElementById('detailRefCode').textContent = data.user.referralCode;
        document.getElementById('detailCreated').textContent = new Date(data.user.createdAt).toLocaleDateString();
        document.getElementById('detailAdmin').textContent = data.user.isAdmin ? 'Yes' : 'No';
        
        // Update stats
        document.getElementById('detailInstalls').textContent = data.stats.totalInstalls;
        document.getElementById('detailMellowtel').textContent = data.stats.mellowtelOptIns;
        document.getElementById('detailActive').textContent = data.stats.activeUsers;
        
        // Render charts
        renderUserCharts(data.dailyStats);
        
        // Render recent installations
        renderRecentInstalls(data.recentInstallations);
        
    } catch (error) {
        console.error('Error loading user details:', error);
        alert('Failed to load user details');
    }
}

function renderUserCharts(dailyStats) {
    const labels = dailyStats.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    const installs = dailyStats.map(d => d.installs);
    const active = dailyStats.map(d => d.activeUsers);
    const mellowtel = dailyStats.map(d => d.mellowtelOptIns);
    
    // Destroy existing charts
    Object.values(charts).forEach(chart => chart.destroy());
    
    // Installs chart (bar)
    charts.installs = new Chart(document.getElementById('installsChart'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Daily Installations',
                data: installs,
                backgroundColor: '#4f46e5'
            }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true } }
        }
    });
    
    // Active users chart (line)
    charts.active = new Chart(document.getElementById('activeChart'), {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Active Users',
                data: active,
                borderColor: '#10b981',
                backgroundColor: '#10b98120',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true } }
        }
    });
    
    // Mellowtel chart (line)
    charts.mellowtel = new Chart(document.getElementById('mellowtelChart'), {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Mellowtel Opt-ins',
                data: mellowtel,
                borderColor: '#f59e0b',
                backgroundColor: '#f59e0b20',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true } }
        }
    });
}

function renderRecentInstalls(installations) {
    const tbody = document.getElementById('recentInstallsBody');
    tbody.innerHTML = '';
    
    installations.forEach(install => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${install.install_id.substring(0, 12)}...</td>
            <td>${new Date(install.installed_at).toLocaleString()}</td>
            <td>${install.mellowtel_opted_in ? '✅' : '❌'}</td>
            <td>${new Date(install.last_active).toLocaleString()}</td>
        `;
        tbody.appendChild(row);
    });
}

function copyRefCode() {
    const code = document.getElementById('detailRefCode').textContent;
    navigator.clipboard.writeText(code);
    alert('Referral code copied!');
}
```

#### 4. CSS for modal

```css
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal.hidden {
  display: none;
}

.modal-content {
  background: var(--card-bg);
  border-radius: 16px;
  width: 90%;
  max-width: 1200px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: var(--text-secondary);
  transition: color 0.3s;
}

.close-btn:hover {
  color: var(--text-primary);
}

.modal-body {
  padding: 2rem;
}

.user-info-section,
.stats-section,
.graphs-section,
.recent-section {
  margin-bottom: 2rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
}

.chart-container {
  background: rgba(255, 255, 255, 0.05);
  padding: 1.5rem;
  border-radius: 12px;
}

.date-range-selector {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.date-range-selector button {
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 8px;
  cursor: pointer;
}

.date-range-selector button.active {
  background: var(--primary);
}

#recentInstallsTable {
  width: 100%;
  margin-top: 1rem;
  border-collapse: collapse;
}

#recentInstallsTable th,
#recentInstallsTable td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

#recentInstallsTable th {
  background: rgba(255, 255, 255, 0.05);
  font-weight: 600;
}
```

---

## Implementation Steps

1. ✅ Add new API endpoint to `server.js`
2. ✅ Add Chart.js CDN to `admin.html`
3. ✅ Add modal HTML structure to `admin.html`
4. ✅ Add modal JavaScript functions
5. ✅ Update user table to make rows clickable
6. ✅ Add modal CSS styles
7. ✅ Test functionality

---

## Notes

- Chart.js CDN: `https://cdn.jsdelivr.net/npm/chart.js`
- The daily stats are calculated on-the-fly from installations
- For better performance with large datasets, consider pre-aggregating daily stats in a separate table
- Modal scrolls independently if content is too tall
