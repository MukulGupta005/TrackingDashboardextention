require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function setupDatabase() {
  console.log('🚀 Setting up database tables...\n');

  try {
    // Test connection first
    console.log('📡 Testing Supabase connection...');
    const { data: testData, error: testError } = await supabase.from('users').select('count').limit(0);

    if (!testError || testError.code === 'PGRST204' || testError.code === '42P01') {
      console.log('✅ Connected to Supabase!\n');
    }

    // Since we can't execute raw SQL via the client, let's verify if tables exist
    console.log('🔍 Checking if tables exist...\n');

    const checks = [
      { name: 'users', check: supabase.from('users').select('count').limit(0) },
      { name: 'extensions', check: supabase.from('extensions').select('count').limit(0) },
      { name: 'installations', check: supabase.from('installations').select('count').limit(0) }
    ];

    let allTablesExist = true;

    for (const { name, check } of checks) {
      const { error } = await check;
      if (error && error.code === '42P01') {
        console.log(`❌ Table '${name}' does not exist`);
        allTablesExist = false;
      } else if (!error || error.code === 'PGRST204') {
        console.log(`✅ Table '${name}' exists`);
      } else {
        console.log(`⚠️  Table '${name}': ${error.message}`);
      }
    }

    if (!allTablesExist) {
      console.log('\n📋 Database setup required!');
      console.log('\n🔧 Please run the SQL schema manually:');
      console.log('   1. Open: https://supabase.com/dashboard/project/rdxhlvplcwjaeafuydfr/sql/new');
      console.log('   2. Copy contents from: schema.sql');
      console.log('   3. Paste and click RUN\n');
      console.log('✨ Or use VS Code: Open schema.sql → Copy all → Paste in Supabase SQL Editor\n');
    } else {
      console.log('\n✅ All database tables are ready!');
      console.log('\n🎉 Your dashboard is fully set up and running at:');
      console.log('   👉 http://localhost:3000\n');
      console.log('📝 Next steps:');
      console.log('   1. Open http://localhost:3000 in your browser');
      console.log('   2. Click "Register" to create your account');
      console.log('   3. Get your unique referral code');
      console.log('   4. Start tracking extensions!\n');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('\n📋 Please set up database manually using schema.sql file\n');
  }
}

setupDatabase();
