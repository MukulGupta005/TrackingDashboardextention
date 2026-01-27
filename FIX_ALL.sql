-- FIX ALL DATABASE ISSUES
-- Run this script to ensure Mellowtel tracking and Uninstalls work correctly.

-- 1. Ensure status column exists
ALTER TABLE installations 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' 
CHECK (status IN ('active', 'inactive', 'uninstalled'));

-- 2. Ensure uninstalled_at column exists
ALTER TABLE installations 
ADD COLUMN IF NOT EXISTS uninstalled_at TIMESTAMP WITH TIME ZONE;

-- 3. Ensure device_fingerprint column exists (for fraud checking)
ALTER TABLE installations 
ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;

-- 4. Create missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_installations_status ON installations(status);
CREATE INDEX IF NOT EXISTS idx_installations_uninstalled_at ON installations(uninstalled_at);

-- 5. Fix any NULL statuses to 'active'
UPDATE installations 
SET status = 'active' 
WHERE status IS NULL;

-- 6. Verify Table Structure
SELECT 
    column_name, 
    data_type, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'installations';

-- 7. View stats to confirm
SELECT 
    status, 
    COUNT(*) as count,
    COUNT(CASE WHEN mellowtel_opted_in = TRUE THEN 1 END) as opt_ins
FROM installations 
GROUP BY status;
