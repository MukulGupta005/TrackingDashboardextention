const API_URL = 'https://trackingdashboardextention.onrender.com/api/admin/users';
const API_KEY = 'connectez-api-key-for-extension-tracking-12345';
const LOGIN_URL = 'https://trackingdashboardextention.onrender.com/api/login';
// We need a TOKEN to access admin routes
// I'll assume I can login first to get a token, OR I can mock the middleware if testing locally.
// But to test the REAL flow, I should login.

async function testAdmin() {
    console.log('Testing Admin Endpoint (LIVE)...');

    // 1. Login as Admin
    console.log('Logging in...');
    const loginRes = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'mukul@gmail.com', password: '1234' })
    });

    if (!loginRes.ok) {
        console.error('Login Failed:', await loginRes.text());
        return;
    }

    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Login Success. Token:', token.substring(0, 10) + '...');

    // 2. Fetch Admin Data
    console.log('Fetching Admin Users...');
    const adminRes = await fetch(API_URL, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!adminRes.ok) {
        console.error('Admin Fetch Failed:', await adminRes.text());
    } else {
        const data = await adminRes.json();
        console.log('Admin Data Success:', JSON.stringify(data, null, 2));
    }
}

testAdmin();
