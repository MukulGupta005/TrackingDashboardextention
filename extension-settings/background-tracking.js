// Background tracking script - Add to your extension's background.js

// Configuration
const DASHBOARD_CONFIG = {
    apiUrl: 'http://localhost:3000',
    apiKey: 'connectez-api-key-for-extension-tracking-12345'
};

// ==========================================
// AUTO-TRACK ON EXTENSION STARTUP
// ==========================================

// When extension loads, check if referral code exists and track
chrome.runtime.onStartup.addListener(async () => {
    await ensureTracking();
});

chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install') {
        // Check if user set referral code, otherwise wait for them to set it
        setTimeout(async () => {
            await ensureTracking();
        }, 2000);
    }
});

async function ensureTracking() {
    const { referralCode, installId } = await chrome.storage.local.get(['referralCode', 'installId']);

    // If referral code exists but not tracked yet, track it
    if (referralCode && !installId) {
        await trackInstallation(referralCode);
    }

    // Send activity heartbeat
    if (installId) {
        await sendActivityHeartbeat();
    }
}

// ==========================================
// INSTALLATION TRACKING
// ==========================================

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

            // Store install ID
            await chrome.storage.local.set({ installId: data.installId });

            // Notify dashboard in real-time
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
            console.warn('No install ID found, user needs to set referral code first');
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

        if (response.ok) {
            console.log('✅ Mellowtel opt-in tracked - dashboard updated in real-time!');
        }
    } catch (error) {
        console.error('Error tracking Mellowtel opt-in:', error);
    }
}

// IMPORTANT: Add this to your Mellowtel activation code
// Example integration:
/*
async function enableMellowtel() {
  // Your existing Mellowtel activation code...
  
  // Track the opt-in
  await trackMellowtelOptIn();
}
*/

// ==========================================
// ACTIVITY HEARTBEAT (Real-time Active Users)
// ==========================================

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
            console.log('Activity tracked - real-time dashboard updated ✓');
        }
    } catch (error) {
        console.error('Error tracking activity:', error);
    }
}

// Set up periodic heartbeat every hour
chrome.alarms.create('activityHeartbeat', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'activityHeartbeat') {
        sendActivityHeartbeat();
    }
});

// ==========================================
// LISTEN FOR REFERRAL CODE CHANGES
// ==========================================

chrome.storage.onChanged.addListener(async (changes, areaName) => {
    if (areaName === 'local' && changes.referralCode) {
        // User just set their referral code
        const newCode = changes.referralCode.newValue;
        if (newCode) {
            console.log('Referral code set:', newCode);
            await ensureTracking();
        }
    }
});

console.log('✅ LinkedIn ConnectEz Real-time Tracking loaded');
console.log('📊 Dashboard: http://localhost:3000');
