# Analytics Dashboard Implementation Plan

## Overview
Enhance both the admin dashboard and individual user dashboards with time-series graphs showing historical trends for:
- **Active Users** (users active in last 24 hours)
- **Mellowtel Opt-ins** (cumulative and daily new opt-ins)
- **Total Installations** (cumulative and daily new installs)

## Goals

### Admin Dashboard
- Show **combined** statistics across all users with graphs
- Display total active users trend over time
- Display total Mellowtel opt-ins trend over time
- Display total installations trend over time
- Allow filtering by date range (7 days, 30 days, all time)

### Individual User Dashboard
- Show **per-user** statistics with graphs
- Display active users trend for that user's referral code
- Display Mellowtel opt-ins trend for that user
- Display installations trend for that user
- Same date range filtering options

---

## Database Design

### New Table: `stats_snapshots`

This table stores periodic snapshots of statistics for historical tracking.

```sql
CREATE TABLE stats_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  extension_id UUID REFERENCES extensions(id) ON DELETE CASCADE,
  
  -- Snapshot timestamp
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Metrics (point-in-time)
  total_installs INTEGER DEFAULT 0,
  mellowtel_optins INTEGER DEFAULT 0,
  active_users_24h INTEGER DEFAULT 0,
  
  -- Daily deltas (new events since last snapshot)
  new_installs_today INTEGER DEFAULT 0,
  new_optins_today INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_stats_user_recorded ON stats_snapshots(user_id, recorded_at DESC);
CREATE INDEX idx_stats_extension_recorded ON stats_snapshots(extension_id, recorded_at DESC);
CREATE INDEX idx_stats_recorded ON stats_snapshots(recorded_at DESC);

-- RLS policies
ALTER TABLE stats_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own stats snapshots"
  ON stats_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert stats snapshots"
  ON stats_snapshots FOR INSERT
  WITH CHECK (true);
```

### Data Collection Strategy

**Option 1: Hourly Snapshots (Recommended)**
- Collect stats every hour using a cron job
- Provides 24 data points per day
- Balance between granularity and storage

**Option 2: Daily Snapshots**
- Collect stats once per day at midnight
- Less storage, but less detailed graphs
- Good for long-term trends

**Implementation**: We'll use **hourly snapshots** with a Node.js scheduled task (node-cron).

---

## Backend Changes

### New Files

#### `utils/statsCollector.js`
Background task that runs hourly to collect and store stats snapshots.

```javascript
const cron = require('node-cron');
const { userQueries, installationQueries, supabase } = require('../database');

async function collectStatsSnapshot() {
  console.log('[Stats Collector] Running hourly snapshot...');
  
  try {
    // Get all users
    const users = await userQueries.findAll();
    
    for (const user of users) {
      const stats = await installationQueries.getStats(user.id);
      
      // Insert snapshot
      const { error } = await supabase
        .from('stats_snapshots')
        .insert({
          user_id: user.id,
          extension_id: null, // Global stats (can be extended per extension)
          total_installs: stats.totalInstalls,
          mellowtel_optins: stats.mellowtelOptIns,
          active_users_24h: stats.activeUsers,
          // Daily deltas require comparison with previous snapshot
        });
      
      if (error) {
        console.error(`[Stats Collector] Error for user ${user.id}:`, error);
      }
    }
    
    console.log('[Stats Collector] Snapshot complete');
  } catch (error) {
    console.error('[Stats Collector] Fatal error:', error);
  }
}

// Schedule to run every hour
function startStatsCollector() {
  // Run immediately on startup
  collectStatsSnapshot();
  
  // Then run every hour
  cron.schedule('0 * * * *', collectStatsSnapshot);
  console.log('[Stats Collector] Scheduled to run every hour');
}

module.exports = { startStatsCollector, collectStatsSnapshot };
```

### Database.js Updates

Add new queries for fetching historical data:

```javascript
const statsQueries = {
  // Get historical stats for a user
  async getHistoricalStats(userId, days = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const { data, error } = await supabase
      .from('stats_snapshots')
      .select('*')
      .eq('user_id', userId)
      .gte('recorded_at', cutoffDate.toISOString())
      .order('recorded_at', { ascending: true });
    
    if (error) throw error;
    return data;
  },
  
  // Get combined historical stats (admin view)
  async getCombinedHistoricalStats(days = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const { data, error } = await supabase
      .from('stats_snapshots')
      .select('*')
      .gte('recorded_at', cutoffDate.toISOString())
      .order('recorded_at', { ascending: true });
    
    if (error) throw error;
    
    // Aggregate by timestamp
    const aggregated = {};
    data.forEach(snapshot => {
      const timestamp = snapshot.recorded_at;
      if (!aggregated[timestamp]) {
        aggregated[timestamp] = {
          recorded_at: timestamp,
          total_installs: 0,
          mellowtel_optins: 0,
          active_users_24h: 0,
        };
      }
      aggregated[timestamp].total_installs += snapshot.total_installs;
      aggregated[timestamp].mellowtel_optins += snapshot.mellowtel_optins;
      aggregated[timestamp].active_users_24h += snapshot.active_users_24h;
    });
    
    return Object.values(aggregated);
  }
};
```

### Server.js Updates

Add new API endpoints:

```javascript
// Get historical stats for current user
app.get('/api/stats/history', authenticate, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const stats = await statsQueries.getHistoricalStats(req.userId, days);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching historical stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get combined historical stats (admin)
app.get('/api/admin/stats/history', authenticate, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const stats = await statsQueries.getCombinedHistoricalStats(days);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});
```

Start the stats collector in `server.js`:

```javascript
const { startStatsCollector } = require('./utils/statsCollector');

// After all routes
startStatsCollector();
```

---

## Frontend Changes

### Charting Library

Use **Chart.js** - lightweight, popular, and perfect for our needs.

```bash
# Add Chart.js via CDN in HTML
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
```

### User Dashboard (`public/index.html` & `public/app.js`)

#### HTML Updates
Add graph containers after the stats grid:

```html
<!-- Analytics Graphs -->
<div class="analytics-section glass-card">
  <div class="analytics-header">
    <h2>📈 Analytics</h2>
    <div class="date-range-selector">
      <button class="btn btn-sm" data-range="7">7 Days</button>
      <button class="btn btn-sm active" data-range="30">30 Days</button>
      <button class="btn btn-sm" data-range="all">All Time</button>
    </div>
  </div>
  
  <div class="charts-grid">
    <div class="chart-container">
      <h3>Active Users (24h)</h3>
      <canvas id="activeUsersChart"></canvas>
    </div>
    
    <div class="chart-container">
      <h3>Mellowtel Opt-ins</h3>
      <canvas id="mellowtelChart"></canvas>
    </div>
    
    <div class="chart-container">
      <h3>Total Installations</h3>
      <canvas id="installsChart"></canvas>
    </div>
  </div>
</div>
```

#### JavaScript Updates (`app.js`)

```javascript
let activeUsersChart, mellowtelChart, installsChart;

async function loadAnalytics(days = 30) {
  try {
    const response = await fetch(`/api/stats/history?days=${days}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    const data = await response.json();
    
    // Prepare chart data
    const labels = data.map(d => new Date(d.recorded_at).toLocaleDateString());
    const activeUsers = data.map(d => d.active_users_24h);
    const mellowtelOptins = data.map(d => d.mellowtel_optins);
    const installs = data.map(d => d.total_installs);
    
    // Render charts
    renderChart('activeUsersChart', labels, activeUsers, 'Active Users', '#4f46e5');
    renderChart('mellowtelChart', labels, mellowtelOptins, 'Mellowtel Opt-ins', '#10b981');
    renderChart('installsChart', labels, installs, 'Total Installations', '#f59e0b');
  } catch (error) {
    console.error('Error loading analytics:', error);
  }
}

function renderChart(canvasId, labels, data, label, color) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  
  // Destroy existing chart if it exists
  if (window[canvasId + 'Instance']) {
    window[canvasId + 'Instance'].destroy();
  }
  
  window[canvasId + 'Instance'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: label,
        data: data,
        borderColor: color,
        backgroundColor: color + '20',
        tension: 0.4,
        fill: true,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}
```

### Admin Dashboard (`public/admin.html`)

Similar implementation with combined data:

```javascript
async function loadAdminAnalytics(days = 30) {
  try {
    const response = await fetch(`/api/admin/stats/history?days=${days}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    const data = await response.json();
    
    // Same chart rendering logic as user dashboard
    // but using combined stats endpoint
  } catch (error) {
    console.error('Error loading admin analytics:', error);
  }
}
```

---

## CSS Updates (`public/styles.css`)

```css
.analytics-section {
  margin-top: 2rem;
}

.analytics-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.date-range-selector {
  display: flex;
  gap: 0.5rem;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.btn-sm.active {
  background: var(--primary);
  color: white;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.chart-container {
  background: rgba(255, 255, 255, 0.05);
  padding: 1.5rem;
  border-radius: 12px;
}

.chart-container h3 {
  margin-bottom: 1rem;
  font-size: 1rem;
  color: var(--text-secondary);
}

.chart-container canvas {
  max-height: 250px;
}
```

---

## Installation Steps

### 1. Install Dependencies

```bash
npm install node-cron
```

### 2. Run Database Migration

Execute the new SQL schema in Supabase SQL editor.

### 3. Update Code Files

- Create `utils/statsCollector.js`
- Update `database.js` with `statsQueries`
- Update `server.js` with new endpoints and stats collector
- Update `public/index.html` with Chart.js CDN and graph containers
- Update `public/app.js` with chart rendering logic
- Update `public/admin.html` similarly
- Update `public/styles.css` with new styles

### 4. Seed Initial Data (Optional)

For demo purposes, we can create a script to backfill some historical data.

---

## Verification Plan

### Manual Testing

1. **Start the server** and verify stats collector runs on startup
2. **Wait for hourly snapshots** or manually trigger collection
3. **Check Supabase** to confirm `stats_snapshots` table has data
4. **Load user dashboard** and verify graphs render
5. **Load admin dashboard** and verify combined graphs render
6. **Test date range selectors** (7 days, 30 days, all time)
7. **Verify real-time updates** when new installs/opt-ins occur

### API Testing

```bash
# Test user history endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/stats/history?days=7

# Test admin history endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/admin/stats/history?days=30
```

---

## Future Enhancements

- **Export data as CSV/PDF**
- **More granular time ranges** (hourly, weekly)
- **Comparison views** (this week vs last week)
- **Per-extension analytics** (if multiple extensions)
- **Retention metrics** (how long users stay active)
- **Conversion funnel** (installs → opt-ins → active users)

---

## Summary

This plan adds comprehensive analytics capabilities to both admin and user dashboards with:
- ✅ Historical data collection via hourly snapshots
- ✅ Time-series graphs using Chart.js
- ✅ Date range filtering
- ✅ Both individual and combined (admin) views
- ✅ Minimal performance impact (periodic collection)
- ✅ Clean, modern UI integration
