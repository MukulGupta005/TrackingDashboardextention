# Supabase Setup Guide

This guide will help you set up Supabase for the LinkedIn ConnectEz Dashboard.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in the details:
   - **Name**: ConnectEz Dashboard
   - **Database Password**: Choose a strong password
   - **Region**: Choose the closest region to your users
5. Wait for the project to be created (takes ~2 minutes)

## Step 2: Get Your API Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **Anon/Public Key** (starts with `eyJhbG...`)
   - **Service Role Key** (starts with `eyJhbG...`) ⚠️ Keep this secret!

3. Update your `.env` file:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-role-key-here
```

## Step 3: Create Database Tables

1. In your Supabase project, go to **SQL Editor**
2. Click **New Query**
3. Paste the following SQL and click **Run**:

```sql
-- Create users table
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  referral_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create installations table
CREATE TABLE installations (
  id BIGSERIAL PRIMARY KEY,
  referral_code TEXT NOT NULL,
  user_id BIGINT REFERENCES users(id),
  installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  mellowtel_opted_in BOOLEAN DEFAULT FALSE,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  install_id TEXT UNIQUE NOT NULL
);

-- Create extensions table
CREATE TABLE extensions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) NOT NULL,
  name TEXT NOT NULL,
  store_url TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('chrome', 'edge')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_installations_referral_code ON installations(referral_code);
CREATE INDEX idx_installations_user_id ON installations(user_id);
CREATE INDEX idx_installations_install_id ON installations(install_id);
CREATE INDEX idx_installations_last_active ON installations(last_active);
CREATE INDEX idx_extensions_user_id ON extensions(user_id);

-- Add extension_id to installations table
ALTER TABLE installations
ADD COLUMN extension_id BIGINT REFERENCES extensions(id);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE extensions ENABLE ROW LEVEL SECURITY;

-- Create policies (these allow service role to access everything)
CREATE POLICY "Service role can do anything on users"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do anything on installations"
  ON installations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do anything on extensions"
  ON extensions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

## Step 4: Verify Tables

1. Go to **Table Editor** in your Supabase dashboard
2. You should see two tables:
   - `users`
   - `installations`
3. Click on each table to verify the columns are correct

## Step 5: Test the Connection

1. Make sure your `.env` file is updated with the correct credentials
2. Run the application:
```bash
npm install
npm start
```

3. You should see:
```
Database initialization complete (using Supabase)
Server running on http://localhost:3000
```

## Step 6: Create Your First User

1. Open `http://localhost:3000` in your browser
2. Click "Register" and create an account
3. Go back to Supabase → **Table Editor** → **users**
4. You should see your user with a generated referral code!

## Optional: Enable Realtime (For Future Enhancement)

If you want to add real-time database subscriptions later:

1. Go to **Database** → **Replication**
2. Find the `installations` table
3. Enable replication for real-time updates

Then you can subscribe to changes in your code:
```javascript
const subscription = supabase
  .channel('installations')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'installations' },
    (payload) => {
      console.log('Change received!', payload)
    }
  )
  .subscribe()
```

## Security Best Practices

### Row Level Security (RLS)

The SQL script above enables RLS on both tables and creates policies that only allow the service role to access data. This is secure because:

1. The service role key is only used on the backend (never exposed to clients)
2. Frontend users authenticate via JWT tokens managed by your Express server
3. All database operations go through your backend API

### API Key Security

⚠️ **Important**: Never expose your `SUPABASE_SERVICE_KEY` in frontend code!

- ✅ Use `SUPABASE_SERVICE_KEY` only in backend code
- ✅ Keep `.env` file in `.gitignore`
- ✅ Use environment variables in production
- ❌ Never commit `.env` to version control
- ❌ Never use service key in frontend JavaScript

## Production Deployment

When deploying to production (Vercel, Railway, etc.):

1. Add environment variables in your hosting platform:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`
   - `JWT_SECRET`
   - `API_KEY`
   - `PORT`

2. Ensure your region matches your users' location for better performance

3. Consider upgrading to Supabase Pro for:
   - Better performance
   - More storage
   - Automated backups
   - Better support

## Troubleshooting

### "Failed to fetch stats" error

- Check your `.env` file has correct Supabase credentials
- Verify tables are created correctly
- Check Supabase project is not paused (free tier pauses after inactivity)

### "Invalid referral code" error

- Make sure you registered a user first
- Check the `users` table in Supabase has entries
- Verify referral code matches exactly (case-sensitive)

### Connection errors

- Verify your internet connection
- Check Supabase project status at [https://status.supabase.com](https://status.supabase.com)
- Ensure project URL is correct in `.env`

## Support

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- [Dashboard README](./README.md)
