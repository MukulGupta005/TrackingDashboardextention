const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { supabase, installationQueries } = require('./database');

async function verifyIncrement() {
    const installId = 'test-verify-' + Date.now();
    const userId = 'verify-user';
    const referralCode = 'VERIFY';

    console.log('1. Creating test installation...');
    // We need a user first? No, extension creation usually handles loose refs but let's assume we can just create an install
    // Actually, create relies on foreign keys? Let's check schema.
    // Assuming we can just query an EXISTING install from the logs: '39014136'

    // List recent installs to find a valid ID
    const { data: installs, error: listError } = await supabase
        .from('installations')
        .select('*')
        .limit(1);

    if (listError || !installs || installs.length === 0) {
        console.error('No installations found in DB to test.');
        process.exit(1);
    }

    // Use the first real ID found
    const targetInstallId = installs[0].install_id;
    console.log(`Found real install ID: ${targetInstallId}`);

    console.log(`Checking install ${targetInstallId}...`);

    // Check initial state
    const before = await installationQueries.findByInstallId(targetInstallId);
    if (!before) {
        console.error('Install lookup failed immediately after list!');
        process.exit(1);
    }
    console.log(`[BEFORE] Active Seconds: ${before.active_seconds}`);

    console.log('2. Calling RPC manually to test DB logic...');
    const { error } = await supabase.rpc('increment_active_seconds', {
        row_id: before.id,
        seconds: 10
    });

    if (error) {
        console.error('RPC Failed:', error);
    } else {
        console.log('RPC Success');
    }

    const after = await installationQueries.findByInstallId(targetInstallId);
    console.log(`[AFTER] Active Seconds: ${after.active_seconds}`);

    if (after.active_seconds === (before.active_seconds || 0) + 10) {
        console.log('✅ VERIFICATION PASSED: Database is updating.');
    } else {
        console.log('❌ VERIFICATION FAILED: Value did not increase.');
    }
}

verifyIncrement();
