-- ==========================================
-- CLEAR ALL TRACKING DATA
-- This script removes all installations and sessions
-- but KEEPS your user accounts and extensions.
-- ==========================================

-- 1. Clear Activity Sessions
TRUNCATE TABLE activity_sessions RESTART IDENTITY;

-- 2. Clear Installations
-- We use DELETE if there are foreign keys, or TRUNCATE CASCADE
TRUNCATE TABLE installations RESTART IDENTITY CASCADE;

-- Optional: If you want to clear extensions too:
-- TRUNCATE TABLE extensions RESTART IDENTITY CASCADE;

-- Optional: If you want to reset active_seconds on installations (already done via truncate)

-- Success Message
DO $$ 
BEGIN 
  RAISE NOTICE 'All tracking data has been cleared! ✅';
  RAISE NOTICE 'Tables cleared: activity_sessions, installations';
END $$;
