# Simple Referral Code Input Method

This is the **EASIEST** way to track installations, Mellowtel opt-ins, and active users in **real-time** WITHOUT dealing with URL parameters!

## 🎯 How It Works

1. **User installs your extension**
2. **User opens settings page**
3. **User pastes their referral code** (e.g., `AA4F33CC`)
4. **Everything tracks automatically in real-time!**

## 📦 What to Add to Your Extension

### 1. Add Files to Extension

Copy these files into your extension folder:
- `settings.html` → Settings UI
- `settings.js` → Settings logic  
- `background-tracking.js` → Add to your existing background.js

### 2. Update manifest.json

```json
{
  "permissions": [
    "storage",
    "alarms"
  ],
  "host_permissions": [
    "http://localhost:3000/*"
  ],
  "options_page": "settings.html"
}
```

### 3. Merge background-tracking.js

Copy the content from `background-tracking.js` and paste it into your extension's **background.js** file.

### 4. Add Mellowtel Tracking

Find where users enable Mellowtel and add:

```javascript
// After Mellowtel is enabled
await trackMellowtelOptIn();
```

## 🚀 User Experience

### Step 1: Get Referral Code
User goes to: http://localhost:3000
- Creates account
- Gets referral code: `AA4F33CC`

### Step 2: Paste in Extension
User installs extension:
1. Right-click extension icon → **Options**
2. Paste referral code: `AA4F33CC`
3. Click **Save & Track**

### Step 3: Real-time Tracking Starts!
✅ Installation tracked immediately  
✅ Mellowtel opt-in tracked when enabled  
✅ Activity tracked every hour  
✅ Dashboard updates in real-time via SSE

## 📊 What Gets Tracked (Real-time)

| Event | Tracked | Real-time |
|-------|---------|-----------|
| Installation | ✅ | ✅ |
| Mellowtel Opt-in | ✅ | ✅ |
| Active Users (24h) | ✅ | ✅ |
| Recent Installations | ✅ | ✅ |

## 🧪 Test It

### 1. Load extension in Chrome
- Go to `chrome://extensions/`
- Enable Developer Mode
- Load Unpacked → Select extension folder

### 2. Open Settings
- Right-click extension icon
- Click "Options"

### 3. Enter Referral Code
- Paste: `AA4F33CC`
- Click Save

### 4. Check Dashboard
- Go to http://localhost:3000
- Should see **+1 installation** immediately!

### 5. Test Mellowtel (in console)
```javascript
trackMellowtelOptIn();
```

Dashboard should update immediately showing +1 Mellowtel opt-in!

## ✨ Benefits

✅ **No URL parameters needed**  
✅ **Works for any installation source**  
✅ **User-friendly** - just paste code  
✅ **Real-time tracking** via SSE  
✅ **Tracks everything**: installs, Mellowtel, activity  
✅ **Simple integration** - minimal code changes  

## 📁 File Structure

```
your-extension/
├── manifest.json          # Add permissions
├── background.js          # Merge background-tracking.js
├── settings.html          # Options page
└── settings.js           # Settings logic
```

## 🔄 For Production

1. Update API URL in `background-tracking.js` and `settings.js`:
```javascript
apiUrl: 'https://your-production-domain.com'
```

2. Update host permissions in `manifest.json`:
```json
"host_permissions": [
  "https://your-production-domain.com/*"
]
```

## 💡 Why This is Better

**Instead of:**
❌ Complicated URL parameters  
❌ Landing pages  
❌ Chrome Web Store limitations  

**You get:**
✅ Simple settings page  
✅ User pastes code  
✅ Everything tracked automatically  
✅ Works from any install source  

---

**This is the recommended approach!** It's simple, user-friendly, and tracks everything in real-time.
