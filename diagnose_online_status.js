// Run this in Node.js to diagnose the online status issue
// Usage: node diagnose_online_status.js

require('dotenv').config();
const { supabase } = require('./database');

(async function diagnose() {
    console.log('\n🔍 DIAGNOSING ONLINE STATUS SYSTEM\n');
    console.log('='.repeat(60));

    // 1. Check recent installations and their last_active timestamps
    console.log('\n1. Checking installations table...');
    const { data: installations, error } = await supabase
        .from('installations')
        .select('install_id, referral_code, last_active, mellowtel_opted_in, status')
        .order('last_active', { ascending: false })
        .limit(5);

    if (error) {
        console.error('❌ Error:', error.message);
        return;
    }

    console.log(`\n   Found ${installations.length} recent installations:\n`);
    installations.forEach(inst => {
        const lastActive = inst.last_active ? new Date(inst.last_active) : null;
        const now = new Date();
        const ageSec = lastActive ? Math.floor((now - lastActive) / 1000) : null;
        const isOnline = ageSec !== null && ageSec < 6;

        console.log(`   📍 ${inst.install_id.substring(0, 8)}`);
        console.log(`      Referral: ${inst.referral_code || 'N/A'}`);
        console.log(`      Last Active: ${lastActive ? lastActive.toLocaleString() : 'NEVER'}`);
        console.log(`      Age: ${ageSec !== null ? ageSec + 's' : 'N/A'}`);
        console.log(`      Should Show: ${isOnline ? '🟢 ONLINE' : '⚪ OFFLINE'}`);
        console.log(`      Mellowtel: ${inst.mellowtel_opted_in ? '✅' : '❌'}`);
        console.log(`      Status: ${inst.status || 'active'}`);
        console.log('');
    });

    // 2. Test the actual calculation logic
    console.log('='.repeat(60));
    console.log('\n2. Testing isOnline calculation for most recent install...\n');
    const testInst = installations[0];
    if (testInst) {
        const lastActive = testInst.last_active ? new Date(testInst.last_active) : null;
        const now = new Date();

        console.log('   Test Calculation:');
        console.log(`   - Last Active Timestamp: ${lastActive}`);
        console.log(`   - Current Time: ${now}`);
        console.log(`   - Difference: ${lastActive ? (now - lastActive) : 'N/A'} ms`);
        console.log(`   - Threshold: 6000 ms (6 seconds)`);

        const isOnline = lastActive && (Math.abs(now - lastActive) < 6000);
        console.log(`   - Result: ${isOnline ? '✅ ONLINE' : '❌ OFFLINE'}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Diagnosis complete!\n');
    console.log('Next steps:');
    console.log('1. Check if last_active is updating (run this again after heartbeat)');
    console.log('2. Verify dashboard is fetching fresh data (check Network tab)');
    console.log('3. Check browser console for frontend errors\n');

    process.exit(0);
})();
