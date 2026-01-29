-- ==========================================
-- TOTAL SYSTEM RESET (Users + Data)
-- This script wipes EVERYTHING and resets the database.
-- ==========================================

-- 1. Wipe all data tables
TRUNCATE TABLE activity_sessions RESTART IDENTITY;
TRUNCATE TABLE installations RESTART IDENTITY CASCADE;
TRUNCATE TABLE extensions RESTART IDENTITY CASCADE;

-- 2. Wipe all users
TRUNCATE TABLE users RESTART IDENTITY CASCADE;

-- 3. Re-create your Admin Account (So you can log back in)
-- Email: mukul@gmail.com
-- Password: 1234
INSERT INTO users (email, password_hash, referral_code, is_admin)
VALUES (
    'mukul@gmail.com', 
    '$2a$10$ESAKATeNcCB7uJ3wJn96f.rH9JqEjcm4jJ38XZNvyfoGtKiGpRuP2', 
    'ADMIN001', 
    TRUE
);

-- Success Message
DO $$ 
BEGIN 
  RAISE NOTICE 'Database is now 100% CLEAN! ✅';
  RAISE NOTICE 'Admin Account Re-created: mukul@gmail.com';
END $$;
