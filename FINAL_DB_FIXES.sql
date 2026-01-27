-- ==========================================
-- FINAL DATABASE FIXES FOR CONNECTEZ
-- Run this entire script in Supabase SQL Editor
-- ==========================================

-- 1. TRACKING COLUMNS (Safe to run multiple times)
-- Ensure 'status' column exists for uninstall tracking
ALTER TABLE installations 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' 
CHECK (status IN ('active', 'inactive', 'uninstalled'));

-- Ensure 'uninstalled_at' timestamp exists
ALTER TABLE installations 
ADD COLUMN IF NOT EXISTS uninstalled_at TIMESTAMP WITH TIME ZONE;

-- Ensure 'device_fingerprint' exists for uniqueness
ALTER TABLE installations 
ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;

-- Ensure 'mellowtel_opted_in' exists (if not created by server)
ALTER TABLE installations 
ADD COLUMN IF NOT EXISTS mellowtel_opted_in BOOLEAN DEFAULT FALSE;

-- 2. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_installations_status ON installations(status);
CREATE INDEX IF NOT EXISTS idx_installations_uninstalled_at ON installations(uninstalled_at);
CREATE INDEX IF NOT EXISTS idx_referral_code ON installations(referral_code);

-- 3. DATA CLEANUP
-- Fix any old rows that have NULL status
UPDATE installations 
SET status = 'active' 
WHERE status IS NULL;

-- 4. GRANT ADMIN ACCESS (Critical Fix)
-- This makes your account a REAL admin so you don't need the bypass
UPDATE users 
SET is_admin = TRUE 
WHERE email = 'mukul@gmail.com';

-- 5. VERIFICATION
-- Show the updated admin user to confirm
SELECT id, email, is_admin FROM users WHERE email = 'mukul@gmail.com';
