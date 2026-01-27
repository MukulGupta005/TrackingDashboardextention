-- Add is_admin column to existing users table
-- Run this AFTER running schema.sql if your table already exists

-- Add the column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Added is_admin column to users table ✅';
  ELSE
    RAISE NOTICE 'is_admin column already exists ✅';
  END IF;
END $$;

-- Make mukul@gmail.com an admin
UPDATE users 
SET is_admin = TRUE 
WHERE email = 'mukul@gmail.com';

-- Verify the update
DO $$ 
DECLARE
  admin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM users WHERE is_admin = TRUE;
  RAISE NOTICE 'Total admin users: %', admin_count;
END $$;

-- Show all admin users
SELECT email, referral_code, is_admin, created_at 
FROM users 
WHERE is_admin = TRUE;
