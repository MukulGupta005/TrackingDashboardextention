require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function makeUserAdmin() {
    try {
        console.log('🔧 Updating database schema...\n');

        // 1. Add is_admin column if it doesn't exist
        const { error: schemaError } = await supabase.rpc('exec_sql', {
            sql: `
                DO $$ 
                BEGIN
                  IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'users' AND column_name = 'is_admin'
                  ) THEN
                    ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
                  END IF;
                END $$;
            `
        });

        // If RPC fails, try direct query (might work with service key)
        console.log('⚠️  RPC method not available, using direct update...\n');

        // 2. Make mukul@gmail.com an admin
        const { data, error } = await supabase
            .from('users')
            .update({ is_admin: true })
            .eq('email', 'mukul@gmail.com')
            .select();

        if (error) {
            console.error('❌ Error updating user:', error);
            console.log('\n📝 Please run this SQL manually in Supabase SQL Editor:');
            console.log('\n-- Step 1: Add column (if not exists)');
            console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;\n');
            console.log('-- Step 2: Make mukul@gmail.com an admin');
            console.log("UPDATE users SET is_admin = TRUE WHERE email = 'mukul@gmail.com';\n");
            console.log('-- Step 3: Verify');
            console.log("SELECT email, referral_code, is_admin FROM users WHERE email = 'mukul@gmail.com';\n");
            process.exit(1);
        }

        if (data && data.length > 0) {
            console.log('✅ Successfully made mukul@gmail.com an admin!');
            console.log('\nAdmin User Details:');
            console.log('  Email:', data[0].email);
            console.log('  Referral Code:', data[0].referral_code);
            console.log('  Is Admin:', data[0].is_admin);
            console.log('\n🎉 Admin setup complete!');
        } else {
            console.log('⚠️  User not found. Please ensure mukul@gmail.com is registered first.');
        }

    } catch (error) {
        console.error('❌ Fatal error:', error);
        console.log('\n📝 Please run add-admin-column.sql manually in Supabase SQL Editor');
        process.exit(1);
    }
}

makeUserAdmin();
