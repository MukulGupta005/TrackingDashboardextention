require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkDB() {
    console.log('Checking database...');

    // Check Users
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'mukul@gmail.com');

    if (userError) {
        console.error('Error checking users:', userError);
    } else {
        console.log('User found:', users);
    }

    // Check Installations Schema (by trying to select columns)
    const { data: installs, error: installError } = await supabase
        .from('installations')
        .select('id, status, extension_id, uninstalled_at')
        .limit(1);

    if (installError) {
        console.error('Installation schema error:', installError);
    } else {
        console.log('Installation columns seem OK.');
    }
}

checkDB();
