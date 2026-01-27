// LinkedIn ConnectEz Extension - Dashboard Tracking Integration
// Add this code to your extension's background.js or service worker

// ==========================================
// CONFIGURATION
// ==========================================

const DASHBOARD_CONFIG = {
    apiUrl: 'http://localhost:3000',  // Change to your production URL when deployed
    apiKey: 'connectez-api-key-for-extension-tracking-12345'
};

// ==========================================
// INSTALLATION TRACKING
// ==========================================

// Track when extension is first installed
chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install') {
        console.log('LinkedIn ConnectEz installed!');

        // Try to get referral code from URL or storage
        const referralCode = await getReferralCode();

        if (referralCode) {
            await trackInstallation(referralCode);
        } else {
            console.log('No referral code found. User may have installed directly.');
        }
    }
});

// Get referral code from various sources
async function getReferralCode() {
    // Method 1: Check if stored from landing page
    const stored = await chrome.storage.local.get('referralCode');
    if (stored.referralCode) {
        return stored.referralCode;
    }

    // Method 2: Check URL parameter (if user came from tracking URL)
    // This would need to be captured before installation
    // For now, return null - you can add landing page logic later

    return null;
}

// Track installation with dashboard
async function trackInstallation(referralCode) {
    try {
        const response = await fetch(`${DASHBOARD_CONFIG.apiUrl}/api/track/install`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': DASHBOARD_CONFIG.apiKey
            },
            body: JSON.stringify({ referralCode })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ Installation tracked!', data);

            // Store install ID for future tracking
            await chrome.storage.local.set({
                installId: data.installId,
                referralCode: referralCode
            });

            return data.installId;
        } else {
            console.error('Failed to track installation:', data.error);
        }
    } catch (error) {
        console.error('Error tracking installation:', error);
    }
}

// ==========================================
// MELLOWTEL OPT-IN TRACKING
// ==========================================

// Call this function when user opts in to Mellowtel
async function trackMellowtelOptIn() {
    try {
        const { installId } = await chrome.storage.local.get('installId');

        if (!installId) {
            console.warn('No install ID found, skipping Mellowtel tracking');
            return;
        }

        const response = await fetch(`${DASHBOARD_CONFIG.apiUrl}/api/track/mellowtel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': DASHBOARD_CONFIG.apiKey
            },
            body: JSON.stringify({ installId })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ Mellowtel opt-in tracked!');
        } else {
            console.error('Failed to track Mellowtel opt-in:', data.error);
        }
    } catch (error) {
        console.error('Error tracking Mellowtel opt-in:', error);
    }
}

// Example: Call when user enables Mellowtel
// Add this to your Mellowtel activation code
async function enableMellowtel() {
    // Your existing Mellowtel activation code...
    // ... (your code here)

    // Track the opt-in
    await trackMellowtelOptIn();
}

// ==========================================
// ACTIVITY HEARTBEAT
// ==========================================

// Send activity heartbeat every hour
async function sendActivityHeartbeat() {
    try {
        const { installId } = await chrome.storage.local.get('installId');

        if (!installId) {
            return; // Not tracked yet
        }

        const response = await fetch(`${DASHBOARD_CONFIG.apiUrl}/api/track/activity`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': DASHBOARD_CONFIG.apiKey
            },
            body: JSON.stringify({ installId })
        });

        if (response.ok) {
            console.log('Activity tracked ✓');
        }
    } catch (error) {
        console.error('Error tracking activity:', error);
    }
}

// Set up periodic heartbeat (every hour)
chrome.alarms.create('activityHeartbeat', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'activityHeartbeat') {
        sendActivityHeartbeat();
    }
});

// Also send heartbeat on startup
chrome.runtime.onStartup.addListener(() => {
    sendActivityHeartbeat();
});

// ==========================================
// HELPER: CAPTURE REFERRAL CODE FROM URL
// ==========================================

// If you want to capture referral code from Chrome Web Store URL
// The tracking URL format is:
// https://chromewebstore.google.com/detail/linkedin-connectez/geehepcpfpchnndngcihpkdcjcafhmii?ref=AA4F33CC

// Option 1: Use a landing page before Chrome Web Store
// Example landing page that captures ref parameter and stores it:
/*
<!DOCTYPE html>
<html>
<head>
  <title>Install LinkedIn ConnectEz</title>
  <script>
    // Get referral code from URL
    const params = new URLSearchParams(window.location.search);
    const referralCode = params.get('ref');
    
    if (referralCode) {
      // Store for extension to access later
      localStorage.setItem('connectez_referral', referralCode);
    }
    
    // Redirect to Chrome Web Store
    function installExtension() {
      window.location.href = 'https://chromewebstore.google.com/detail/linkedin-connectez/geehepcpfpchnndngcihpkdcjcafhmii';
    }
  </script>
</head>
<body onload="installExtension()">
  <p>Redirecting to install LinkedIn ConnectEz...</p>
</body>
</html>
*/

// Option 2: Prompt user to enter referral code
// Show a welcome screen after installation:
/*
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // Open a page asking for referral code
    chrome.tabs.create({
      url: chrome.runtime.getURL('welcome.html')
    });
  }
});
*/

// ==========================================
// TESTING
// ==========================================

// To test the integration:
// 1. Install the extension
// 2. Open extension console (chrome://extensions/ -> Details -> Service Worker -> Inspect)
// 3. Run: trackInstallation('AA4F33CC')
// 4. Check dashboard at http://localhost:3000 - should show 1 installation
// 5. Run: trackMellowtelOptIn()
// 6. Check dashboard - should show 1 Mellowtel opt-in
// 7. Run: sendActivityHeartbeat()
// 8. Check dashboard - should show 1 active user

console.log('✅ LinkedIn ConnectEz Dashboard Tracking loaded');
console.log('📊 Dashboard URL:', DASHBOARD_CONFIG.apiUrl);
