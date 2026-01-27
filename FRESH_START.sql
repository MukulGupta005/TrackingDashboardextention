-- ==========================================
-- FRESH START SCRIPT
-- WARNING: THIS DELETES ALL DATA!
-- ==========================================

-- 1. DELETE ALL DATA
-- Use TRUNCATE to quickly remove all rows from tables
-- CASCADE ensures related data (like installations linked to users) is also removed
TRUNCATE TABLE installations, users CASCADE;

-- 2. CREATE ADMIN USER
-- Email: mukul@gmail.com
-- Password: 1234 (Hash: $2a$10$ESAKATeNcCB7uJ3wJn96f.rH9JqEjcm4jJ38XZNvyfoGtKiGpRuP2)
-- Admin: TRUE
INSERT INTO users (email, password_hash, referral_code, is_admin, created_at)
VALUES (
    'mukul@gmail.com', 
    '$2a$10$ESAKATeNcCB7uJ3wJn96f.rH9JqEjcm4jJ38XZNvyfoGtKiGpRuP2', -- This is the hash for '1234'
    'ADMIN001', 
    TRUE,
    NOW()
);

-- 3. VERIFY
SELECT * FROM users;
