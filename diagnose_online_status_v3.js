// diagnose_online_status_v3.js
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { supabase } = require('./database');

(async () => {
    console.log('🔍 DIAGNOSTIC V3 - TOP 5\n');
    const { data: installs } = await supabase
        .from('installations')
        .select('install_id, referral_code, last_active')
        .order('last_active', { ascending: false })
        .limit(5);

    installs.forEach(i => {
        const age = Math.floor((new Date() - new Date(i.last_active)) / 1000);
        console.log(`ID: ${i.install_id.substring(0, 8)} | Age: ${age}s | ${age < 6 ? '🟢' : '⚪'}`);
    });
    process.exit(0);
})();
