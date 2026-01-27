# Troubleshooting Guide - Uninstall Detection & Mellowtel Tracking

## Issue 1: Extension Still Shows as "Active" After Uninstall

### Why This Happens:
Chrome extensions **cannot** notify a server when they're uninstalled. There's no API for that. The only way to detect uninstalls is by **absence of heartbeats**.

### Solution:
The dashboard now marks installations as "inactive" if no heartbeat is received for 48 hours.

### How It Works:

1. **Extension sends heartbeat** every hour when installed
2. **When uninstalled** → No more heartbeats sent
3. **After 48 hours** → Dashboard marks as "inactive"

### Manual Cleanup Script:

Run this to immediately mark inactive installations:

```powershell
cd c:\Users\mukul\Downloads\Az\connectez-dashboard
node mark-inactive.js
```

This will:
- Check all installations
- Mark as "inactive" if no heartbeat in 48 hours
- Show summary of active/inactive/uninstalled

### Automated Cleanup (Recommended):

Add to `server.js` to run automatically every hour:

```javascript
// Auto-cleanup inactive installations
const { markInactiveInstallations } = require('./mark-inactive');
setInterval(async () => {
  await markInactiveInstallations();
}, 60 * 60 * 1000); // Every hour
```

### Updated Stats Calculation:

The `getStatsByReferral` function now:
- Only counts **status='active'** installations as active users
- Returns additional stats:
  - `activeInstalls` - Currently active
  - `inactiveInstalls` - No heartbeat in 48h
  - `uninstalledInstalls` - Manually marked

---

## Issue 2: Mellowtel Opt-in Status Not Tracking

### Possible Causes:

#### 1. SQL Migration Not Run
**Check:** Did you run `add-status-column.sql` in Supabase?

**Solution:**
```sql
-- Run this in Supabase SQL Editor
ALTER TABLE installations 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
```

#### 2. Mellowtel API Method Doesn't Exist
**Check:** `mellowtel.getOptInStatus()` might not be the correct method.

**Solution:** Use alternative checking methods:

**Method 1: Check Storage**
```javascript
// In background.js
async function checkMellowtelOptInFromStorage() {
  const result = await chrome.storage.local.get(['mellowtelOptedIn']);
  return result.mellowtelOptedIn === true;
}
```

**Method 2: Check Mellowtel Settings**
```javascript
// Alternative API method
async function checkMellowtelStatus() {
  try {
    // Try different API methods
    if (typeof mellowtel.isOptedIn === 'function') {
      return await mellowtel.isOptedIn();
    }
    if (typeof mellowtel.getSettings === 'function') {
      const settings = await mellowtel.getSettings();
      return settings?.optedIn || false;
    }
    // Fallback: check storage
    const storage = await chrome.storage.local.get(['mellowtel_opted_in']);
    return storage.mellowtel_opted_in === true;
  } catch (error) {
    console.error('Error checking Mellowtel status:', error);
    return false;
  }
}
```

#### 3. Timing Issue
**Check:** Extension might check before user opts in.

**Solution:** Increase wait time:
```javascript
// In background.js onInstalled
setTimeout(async () => {
  await checkAndTrackMellowtelStatus();
}, 15000); // Wait 15 seconds instead of 10
```

#### 4. Manual Tracking Button
**Best Solution:** Add a manual button for users to confirm opt-in.

**In options.html:**
```html
<button id="trackMellowtelBtn">✅ I've Opted Into Mellowtel</button>
```

**In options.js:**
```javascript
document.getElementById('trackMellowtelBtn').addEventListener('click', async () => {
  const result = await chrome.storage.local.get(['referralCode', 'installId']);
  
  if (!result.referralCode) {
    alert('Please save your referral code first');
    return;
  }
  
  // Send to background to track
  chrome.runtime.sendMessage({ action: 'trackMellowtel' });
  alert('Mellowtel opt-in tracked!');
});
```

**In background.js:**
```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'trackMellowtel') {
    trackMellowtelOptIn();
  }
  // ... existing code
});
```

---

## Quick Fixes

### Fix 1: Run SQL Migration

```sql
-- In Supabase SQL Editor
ALTER TABLE installations 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' 
CHECK (status IN ('active', 'inactive', 'uninstalled'));

UPDATE installations SET status = 'active' WHERE status IS NULL;
```

### Fix 2: Manual Inactive Cleanup

```powershell
cd c:\Users\mukul\Downloads\Az\connectez-dashboard
node mark-inactive.js
```

### Fix 3: Check Extension Console

1. Open Chrome: `chrome://extensions/`
2. Find "LinkedIn ConnectEz"
3. Click "serviceWorker" to open console
4. Look for messages:
   - "Mellowtel background initialized" ✅
   - "Mellowtel opt-in status: true/false" ✅
   - "Mellowtel opt-in tracked successfully" ✅
   
If you see errors here, that's the problem!

### Fix 4: Test Mellowtel API

Open extension console and run:
```javascript
// Test if API exists
console.log(typeof mellowtel.getOptInStatus);

// Try to call it
mellowtel.getOptInStatus().then(status => {
  console.log('Opt-in status:', status);
}).catch(error => {
  console.error('API error:', error);
});
```

### Fix 5: Manual Database Update (Temporary)

If nothing else works, manually update the database:

```sql
-- Find your installation
SELECT * FROM installations WHERE referral_code = 'YOUR_CODE';

-- Manually mark as opted in
UPDATE installations 
SET mellowtel_opted_in = TRUE 
WHERE install_id = 'your-install-id';
```

---

## Recommended Solution

**For Uninstall Detection:**
✅ Run `mark-inactive.js` daily (via cron or manual)
✅ Dashboard shows status (active/inactive/uninstalled)
✅ Only count `status='active'` in stats

**For Mellowtel Tracking:**
✅ Add manual "I've Opted In" button in settings
✅ Check extension console for errors
✅ Verify SQL migration was run
✅ Test `mellowtel.getOptInStatus()` in console

---

## Testing Steps

1. **Test Inactive Detection:**
   ```powershell
   node mark-inactive.js
   ```
   Should show installations older than 48h as inactive
   
2. **Test Mellowtel Tracking:**
   - Load extension
   - Open extension console (serviceWorker)
   - Install extension → Opt into Mellowtel
   - Wait 10 seconds
   - Check console for tracking message
   - Check dashboard for updated count

3. **Verify Dashboard:**
   - Open admin dashboard
   - Click user row
   - Check "Recent Installations" table
   - Should show status: Active/Inactive
   - Should show Mellowtel: ✅/❌

---

## Need More Help?

If still not working:

1. Check extension console for errors
2. Check dashboard server logs
3. Verify database columns exist:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'installations';
   ```
4. Test API manually:
   ```powershell
   curl -X POST http://localhost:3000/api/track/mellowtel \
     -H "x-api-key" -H "Content-Type: application/json" \
     -d '{"referralCode":"YOUR_CODE","installId":"test-123"}'
   ```
