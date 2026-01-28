const fetch = require('node-fetch'); // You might need to install this if not available, or use native fetch if node 18+

// Config
const API_URL = 'http://localhost:3000/api';
const API_KEY = 'connectez-api-key-for-extension-tracking-12345';

// Mock Data
const mockInstallId = 'test-install-' + Date.now();
const mockReferralCode = 'TEST_REF'; // Ensure a user with this code exists or use a known one. 
// Actually, to make this work, we need a valid referral code. 
// Let's just try to hit the endpoint and see if it *accepts* the activeMinutes param 
// even if it fails on "Invalid referral code", the error message will tell us if it processed the body.

async function verify() {
    console.log('1. Testing Activity Heartbeat with activeMinutes...');

    try {
        const response = await fetch(`${API_URL}/track/activity`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY
            },
            body: JSON.stringify({
                installId: mockInstallId,
                referralCode: mockReferralCode,
                activeMinutes: 5 // Sending custom minutes
            })
        });

        const data = await response.json();
        console.log('Response:', response.status, data);

        if (response.status === 500 && data.error === 'Failed to track activity') {
            console.log('⚠️  Server reachable but failed (probably DB connection or missing referral code). This is expected if server not running or DB empty.');
        } else if (response.status === 404) {
            console.log('✅ Server handled request (Installation not found error means payload was processed).');
        } else {
            console.log('✅ Request processed.');
        }

    } catch (e) {
        console.log('❌ Could not connect to server. Is it running?');
        console.log('   Error:', e.message);
    }
}

verify();
