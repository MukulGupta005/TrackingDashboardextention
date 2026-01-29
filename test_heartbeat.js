// test_heartbeat.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { supabase } = require('./database');

const API_KEY = 'connectez-api-key-for-extension-tracking-12345';
const API_URL = 'http://localhost:3000/api/track/activity';

(async () => {
    console.log('🧪 TESTING HEARTBEAT UPDATE FLOW\n');

    // 1. Get a target installation
    const { data: install, error } = await supabase
        .from('installations')
        .select('*')
        .order('last_active', { ascending: false })
        .limit(1)
        .single();

    if (error || !install) {
        console.error('❌ Could not find an installation to test:', error);
        return;
    }

    const installId = install.install_id;
    console.log(`🎯 Target: ${installId} (Current last_active: ${install.last_active})`);

    // 2. Send Heartbeat
    console.log('\n📤 Sending Heartbeat...');
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                installId: installId,
                activeMinutes: 0.1
            })
        });

        const data = await response.json();
        console.log(`📥 API Response: ${response.status}`, data);
    } catch (e) {
        console.error('❌ API Fail:', e.message);
        return;
    }

    // 3. Verify Database Update
    console.log('\n🔎 Verifying Database...');
    // Wait a moment for DB propagation
    await new Promise(r => setTimeout(r, 1000));

    const { data: updatedInstall } = await supabase
        .from('installations')
        .select('last_active')
        .eq('install_id', installId)
        .single();

    console.log(`Before: ${install.last_active}`);
    console.log(`After : ${updatedInstall.last_active}`);

    if (new Date(updatedInstall.last_active) > new Date(install.last_active)) {
        console.log('✅ SUCCESS: last_active Updated!');
    } else {
        console.log('❌ FAILURE: last_active did NOT update.');
    }

    process.exit(0);
})();
