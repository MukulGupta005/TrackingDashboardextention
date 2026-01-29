// verify_status_full.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { supabase } = require('./database');

// Use the global fetch if available, else require it
// (Node 18+ has global fetch)
if (!global.fetch) {
    console.log('⚠️ Using node-fetch fallback (if available)');
}

const API_KEY = 'connectez-api-key-for-extension-tracking-12345';
const API_URL = 'http://localhost:3000/api/track/activity';
const ADMIN_API_URL = 'http://localhost:3000/api/admin/data';

// Helper: Login to get token for admin API
async function loginAndGetToken() {
    try {
        const res = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@admin.com', password: 'admin' })
        });
        const data = await res.json();
        return data.token;
    } catch (e) {
        console.log('Login skipped/failed (using default/mock if needed)');
        return null;
    }
}

(async () => {
    console.log('🔍 FULL STATUS VERIFICATION\n');
    console.log(`Supabase URL: ${process.env.SUPABASE_URL ? '✅ Loaded' : '❌ Missing'}`);
    console.log(`Service Key:  ${process.env.SUPABASE_SERVICE_KEY ? '✅ Loaded' : '❌ Missing'}`);

    // 1. Get Target
    const { data: install } = await supabase
        .from('installations')
        .select('*')
        .order('last_active', { ascending: false })
        .limit(1)
        .single();

    if (!install) { console.log('❌ No installs found'); return; }

    console.log(`\n1. Target Install: ${install.install_id.substring(0, 8)}`);
    console.log(`   Initial Last Active: ${install.last_active}`);

    // 2. Send Heartbeat
    console.log('\n2. Sending Heartbeat...');
    try {
        const hbRes = await fetch(API_URL, {
            method: 'POST',
            headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ installId: install.install_id, activeMinutes: 0.1 })
        });
        console.log(`   Response: ${hbRes.status}`);
    } catch (e) {
        console.log(`   ❌ Failed to contact server: ${e.message}`);
        console.log('   (Is the server running?)');
        return;
    }

    // 3. Verify DB Update
    await new Promise(r => setTimeout(r, 1000));
    const { data: updated } = await supabase
        .from('installations')
        .select('last_active')
        .eq('install_id', install.install_id)
        .single();

    const wasUpdated = new Date(updated.last_active) > new Date(install.last_active);
    console.log(`\n3. Database Verification:`);
    console.log(`   New Last Active:     ${updated.last_active}`);
    console.log(`   Did it update?       ${wasUpdated ? '✅ YES' : '❌ NO'}`);

    // 4. Verify Admin API (Frontend View)
    console.log('\n4. Admin API Verification:');
    const token = await loginAndGetToken();
    if (token) {
        const adminRes = await fetch(ADMIN_API_URL, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const adminData = await adminRes.json();

        // Find our user
        // Note: Admin data is grouped by user, we need to find the user owning this install
        // But for simplicity, let's just check if ANY user shows as isOnline
        const anyOnline = adminData.users.find(u => u.isOnline);
        const targetUser = adminData.users.find(u => u.referralCode === install.referral_code);

        console.log(`   API Response OK?     ${adminRes.ok ? '✅ YES' : '❌ NO'}`);
        if (targetUser) {
            console.log(`   Target User Online?  ${targetUser.isOnline ? '✅ YES' : '❌ NO'}`);
        } else {
            console.log(`   (Target user not found in admin list)`);
            console.log(`   Any User Online?     ${anyOnline ? '✅ YES' : '❌ NO'}`);
        }

    } else {
        console.log('   (Skipping Admin API check due to login fail)');
    }

    process.exit(0);
})();
