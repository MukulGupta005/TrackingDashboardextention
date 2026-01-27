// LinkedIn ConnectEz - Background Tracking Script
// Add this entire file content to your existing background.js

// ==========================================
// CONFIGURATION
// ==========================================

const TRACKING_CONFIG = {
    apiUrl: 'http://localhost:3000',  // Change to your production URL
    apiKey: 'connectez-api-key-for-extension-tracking-12345'
};

// ==========================================
// EXTENSION LIFECYCLE EVENTS
// ==========================================

// When extension starts
chrome.runtime.onStartup.addListener(async () => {
    console.log('LinkedIn ConnectEz started');
    await checkAndTrack();
    await sendActivityHeartbeat();
});

// When extension is installed or updated
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('Extension installed:', details.reason);

    if (details.reason === 'install') {
        // Wait a bit for user to set referral code
        setTimeout(async () => {
            await checkAndTrack();
        }, 3000);
    } else if (details.reason === 'update') {
        await checkAndTrack();
    }
});

// Listen for referral code changes
chrome.storage.onChanged.addListener(async (changes, areaName) => {
    if (areaName === 'local' && changes.referralCode) {
        const newCode = changes.referralCode.newValue;
        if (newCode) {
            console.log('✅ Referral code set:', newCode);
            await checkAndTrack();
        }
    }
});

// ==========================================
// TRACKING FUNCTIONS
// ==========================================

async function checkAndTrack() {
    const { referralCode, installId } = await chrome.storage.local.get([
        'referralCode',
        'installId'
    ]);

    // If user set referral code but not tracked yet
    if (referralCode && !installId) {
        await trackInstallation(referralCode);
    }

    // Send activity if already tracked
    if (installId) {
        await sendActivityHeartbeat();
    }
}

async function trackInstallation(referralCode) {
    try {
        console.log('📊 Tracking installation with code:', referralCode);

        const response = await fetch(`${TRACKING_CONFIG.apiUrl}/api/track/install`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': TRACKING_CONFIG.apiKey
            },
            body: JSON.stringify({ referralCode })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ Installation tracked! Install ID:', data.installId);

            // Save install ID
            await chrome.storage.local.set({
                installId: data.installId,
                trackedAt: new Date().toISOString()
            });

            // Send immediate activity update
            await sendActivityHeartbeat();

            return data.installId;
        } else {
            console.error('❌ Failed to track installation:', data.error);
        }
    } catch (error) {
        console.error('❌ Tracking error:', error);
    }
}

// ==========================================
// MELLOWTEL TRACKING
// ==========================================

// Call this function when user opts in to Mellowtel
async function trackMellowtelOptIn() {
    try {
        const { installId } = await chrome.storage.local.get('installId');

        if (!installId) {
            console.warn('⚠️ No install ID - user needs to set referral code first');
            return false;
        }

        console.log('📊 Tracking Mellowtel opt-in...');

        const response = await fetch(`${TRACKING_CONFIG.apiUrl}/api/track/mellowtel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': TRACKING_CONFIG.apiKey
            },
            body: JSON.stringify({ installId })
        });

        if (response.ok) {
            console.log('✅ Mellowtel opt-in tracked! Dashboard updated in real-time');

            // Mark as tracked
            await chrome.storage.local.set({
                mellowtelTracked: true,
                mellowtelOptInAt: new Date().toISOString()
            });

            return true;
        } else {
            const data = await response.json();
            console.error('❌ Failed to track Mellowtel:', data.error);
            return false;
        }
    } catch (error) {
        console.error('❌ Mellowtel tracking error:', error);
        return false;
    }
}

// ==========================================
// ACTIVITY HEARTBEAT
// ==========================================

async function sendActivityHeartbeat() {
    try {
        const { installId } = await chrome.storage.local.get('installId');

        if (!installId) {
            return; // Not tracked yet
        }

        const response = await fetch(`${TRACKING_CONFIG.apiUrl}/api/track/activity`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': TRACKING_CONFIG.apiKey
            },
            body: JSON.stringify({ installId })
        });

        if (response.ok) {
            console.log('✓ Activity heartbeat sent');
            await chrome.storage.local.set({
                lastActivity: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Activity heartbeat error:', error);
    }
}

// Set up periodic heartbeat every hour
chrome.alarms.create('activityHeartbeat', {
    periodInMinutes: 60,
    delayInMinutes: 1 // First run after 1 minute
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'activityHeartbeat') {
        sendActivityHeartbeat();
    }
});

// ==========================================
// MESSAGE HANDLER (for content scripts)
// ==========================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'trackMellowtel') {
        // Allow content scripts to trigger Mellowtel tracking
        trackMellowtelOptIn().then(result => {
            sendResponse({ success: result });
        });
        return true; // Will respond asynchronously
    }

    if (request.action === 'getTrackingStatus') {
        // Get current tracking status
        chrome.storage.local.get([
            'referralCode',
            'installId',
            'mellowtelTracked',
            'lastActivity'
        ]).then(data => {
            sendResponse({
                isTracking: !!data.installId,
                hasReferralCode: !!data.referralCode,
                mellowtelOptedIn: !!data.mellowtelTracked,
                lastActivity: data.lastActivity
            });
        });
        return true;
    }
});

// ==========================================
// INITIALIZATION
// ==========================================

console.log('✅ LinkedIn ConnectEz Tracking System Loaded');
console.log('📊 Dashboard API:', TRACKING_CONFIG.apiUrl);
console.log('⏰ Activity heartbeat: Every 60 minutes');

// Check tracking status on load
checkAndTrack();
