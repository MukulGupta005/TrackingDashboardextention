# 🚀 Complete Extension Integration Guide

This folder contains **ready-to-use files** for your LinkedIn ConnectEz extension to enable real-time tracking.

## 📁 Files Included

1. **`manifest.json`** - Example manifest with required permissions
2. **`options.html`** - Settings page UI where users paste referral codes
3. **`options.js`** - Settings page logic
4. **`background.js`** - Complete tracking system

## 🔧 Installation Steps

### Step 1: Add Files to Your Extension

Copy these files into your extension folder:

```
your-extension/
├── manifest.json       (update with the permissions below)
├── background.js       (add the tracking code)
├── options.html        (new file - settings page)
└── options.js          (new file - settings logic)
```

### Step 2: Update manifest.json

Add these sections to your existing `manifest.json`:

```json
{
  "permissions": [
    "storage",
    "alarms"
  ],
  "host_permissions": [
    "http://localhost:3000/*"
  ],
  "options_page": "options.html"
}
```

### Step 3: Merge background.js

**Option A:** If you have an existing `background.js`:
- Open `background.js` from this folder
- Copy the entire content
- Paste it at the END of your existing background.js file

**Option B:** If you don't have a background.js:
- Just copy the `background.js` file to your extension folder

### Step 4: Add Mellowtel Tracking Call

Find where users enable Mellowtel in your code and add this ONE line:

```javascript
// When user enables Mellowtel
await trackMellowtelOptIn();
```

That's it! The function is already defined in `background.js`.

## 🎯 How Users Will Use It

### 1. Get Referral Code from Dashboard

User goes to: **http://localhost:3000**
- Registers account
- Gets referral code (e.g., `AA4F33CC`)

### 2. Paste Code in Extension

- User installs your extension
- Right-clicks extension icon → **Options**
- Pastes referral code: `AA4F33CC`
- Clicks **Save & Enable Tracking**

### 3. Automatic Real-time Tracking Starts!

✅ Installation tracked immediately  
✅ Dashboard updates in real-time  
✅ Activity heartbeat every hour  
✅ Mellowtel opt-in tracked when enabled  

## 📊 What Gets Tracked

| Event | When | Real-time |
|-------|------|-----------|
| **Installation** | User saves referral code | ✅ Yes |
| **Mellowtel Opt-in** | User enables Mellowtel | ✅ Yes |
| **Activity** | Every hour automatically | ✅ Yes |
| **Active Users** | Dashboard calculates (24h) | ✅ Yes |

## 🧪 Testing

### 1. Load Extension in Chrome

```
chrome://extensions/
→ Enable "Developer Mode"
→ Load Unpacked
→ Select your extension folder
```

### 2. Open Settings

- Right-click extension icon
- Click "Options"
- You'll see the settings page

### 3. Test Tracking

**Paste referral code: `AA4F33CC`**

Then check Chrome extension console:
```
chrome://extensions/
→ Your Extension
→ Service Worker → Inspect
```

You should see:
```
✅ LinkedIn ConnectEz Tracking System Loaded
📊 Tracking installation with code: AA4F33CC
✅ Installation tracked! Install ID: abc123...
```

### 4. Check Dashboard

Go to: **http://localhost:3000**

You should see:
- **Total Installations: 1** ✅
- Real-time update happened!

### 5. Test Mellowtel (in console)

```javascript
trackMellowtelOptIn();
```

Dashboard should show:
- **Mellowtel Opt-ins: 1** ✅

## 🔄 For Production

### 1. Update API URL

In `background.js` and `options.js`, change:

```javascript
// From:
apiUrl: 'http://localhost:3000'

// To:
apiUrl: 'https://your-production-domain.com'
```

### 2. Update Manifest Permissions

```json
"host_permissions": [
  "https://your-production-domain.com/*"
]
```

### 3. Update Dashboard Link

In `options.html`, change:

```html
<a href="https://your-production-domain.com" target="_blank">
```

## 🎨 Features

### Settings Page Includes:

✅ Beautiful gradient design  
✅ Current referral code display  
✅ Tracking status indicators  
✅ Real-time validation  
✅ Success/error messages  
✅ Dashboard link  

### Background Script Includes:

✅ Auto-track on startup  
✅ Installation tracking  
✅ Mellowtel opt-in tracking  
✅ Hourly activity heartbeat  
✅ Real-time dashboard updates  
✅ Storage change listeners  
✅ Message handlers for content scripts  

## 📝 Integration Checklist

- [ ] Copy `options.html` to extension folder
- [ ] Copy `options.js` to extension folder
- [ ] Merge `background.js` code
- [ ] Update `manifest.json` permissions
- [ ] Add `trackMellowtelOptIn()` call to Mellowtel code
- [ ] Test with referral code `AA4F33CC`
- [ ] Verify dashboard shows installation
- [ ] Test Mellowtel tracking
- [ ] Check activity heartbeat works

## 🆘 Troubleshooting

**"Installation not tracked"**
- Check console for errors
- Verify dashboard is running (http://localhost:3000)
- Check API key matches
- Ensure referral code is correct

**"Settings page doesn't open"**
- Check `manifest.json` has `"options_page": "options.html"`
- Reload extension after changes

**"Mellowtel not tracking"**
- Verify `trackMellowtelOptIn()` is called
- Check extension console logs
- Ensure installId exists in storage

**"Activity not updating"**
- Check alarms permission in manifest
- Verify alarm is created (check console)
- Activity updates every 60 minutes

## ✨ Summary

This integration gives you:

✅ **Zero URL parameters** - Users just paste code  
✅ **Real-time tracking** - Dashboard updates via SSE  
✅ **Complete data** - Installations, Mellowtel, activity  
✅ **User-friendly** - Simple settings page  
✅ **Production-ready** - Just change API URL  

Users love it because it's simple. You love it because it tracks everything!
