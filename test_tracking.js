const API_URL = 'http://localhost:3000/api/track/install';
const API_KEY = 'connectez-api-key-for-extension-tracking-12345';

async function testTracking() {
    console.log('Testing tracking endpoint:', API_URL);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY
            },
            body: JSON.stringify({
                referralCode: 'ADMIN001',
                installId: 'node-test-' + Date.now() // Unique ID
            })
        });

        const text = await response.text();
        console.log('Status:', response.status);
        console.log('Response:', text);

        if (response.ok) {
            console.log('SUCCESS: Tracking works!');
        } else {
            console.error('FAILED: Server returned error.');
        }
    } catch (error) {
        console.error('Network Error:', error);
    }
}

testTracking();
