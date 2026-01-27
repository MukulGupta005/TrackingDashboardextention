-- LinkedIn ConnectEz Dashboard - Complete Database Schema
-- Copy and paste this entire file into Supabase SQL Editor and click RUN

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  referral_code TEXT UNIQUE NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create extensions table
CREATE TABLE IF NOT EXISTS extensions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) NOT NULL,
  name TEXT NOT NULL,
  store_url TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('chrome', 'edge')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create installations table
CREATE TABLE IF NOT EXISTS installations (
  id BIGSERIAL PRIMARY KEY,
  referral_code TEXT NOT NULL,
  user_id BIGINT REFERENCES users(id),
  installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  mellowtel_opted_in BOOLEAN DEFAULT FALSE,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  install_id TEXT UNIQUE NOT NULL,
  extension_id BIGINT REFERENCES extensions(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'uninstalled')),
  uninstalled_at TIMESTAMP WITH TIME ZONE,
  device_fingerprint TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_installations_referral_code ON installations(referral_code);
CREATE INDEX IF NOT EXISTS idx_installations_user_id ON installations(user_id);
CREATE INDEX IF NOT EXISTS idx_installations_install_id ON installations(install_id);
CREATE INDEX IF NOT EXISTS idx_installations_last_active ON installations(last_active);
CREATE INDEX IF NOT EXISTS idx_installations_extension_id ON installations(extension_id);
CREATE INDEX IF NOT EXISTS idx_extensions_user_id ON extensions(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE extensions ENABLE ROW LEVEL SECURITY;

-- Create policies (these allow service role to access everything)
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Service role can do anything on users" ON users;
  DROP POLICY IF EXISTS "Service role can do anything on installations" ON installations;
  DROP POLICY IF EXISTS "Service role can do anything on extensions" ON extensions;
END $$;

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

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE 'Database schema created successfully! ✅';
  RAISE NOTICE 'Tables: users, extensions, installations';
  RAISE NOTICE 'You can now use the dashboard at http://localhost:3000';
END $$;
