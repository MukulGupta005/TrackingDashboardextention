// diagnose_online_status_v2.js
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { supabase } = require('./database');

(async () => {
    console.log('🔍 DIAGNOSTIC V2 - ALL RECENT INSTALLS\n');

    const { data: installs, error } = await supabase
        .from('installations')
        .select('install_id, referral_code, last_active, status')
        .order('last_active', { ascending: false })
        .limit(20);

    if (error) { console.error(error); return; }

    console.log('ID         | REF      | LAST ACTIVE (UTC)        | AGE (s) | STATUS');
    console.log('-----------|----------|--------------------------|---------|-------');

    const now = new Date();

    installs.forEach(i => {
        const lastActive = new Date(i.last_active);
        const age = Math.floor((now - lastActive) / 1000);
        const isOnline = age < 6;

        console.log(`${i.install_id.substring(0, 8)}... | ${i.referral_code || '----'} | ${i.last_active} | ${age.toString().padEnd(7)} | ${isOnline ? '🟢' : '⚪'} ${age > 0 ? '' : 'FUTURE?'}`);
    });

    console.log('\nCurrent Server Time:', now.toISOString());
    process.exit(0);
})();
