-- Add status column to installations table
-- This tracks whether an installation is active, inactive, or uninstalled

-- Add the status column
ALTER TABLE installations 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' 
CHECK (status IN ('active', 'inactive', 'uninstalled'));

-- Add uninstalled_at timestamp column
ALTER TABLE installations 
ADD COLUMN IF NOT EXISTS uninstalled_at TIMESTAMP WITH TIME ZONE;

-- Set all existing installations to 'active' status
UPDATE installations 
SET status = 'active' 
WHERE status IS NULL;

-- Mark installations as inactive if no heartbeat in 7 days
-- And set uninstalled_at timestamp
UPDATE installations 
SET 
    status = 'inactive',
    uninstalled_at = NOW()
WHERE last_active < NOW() - INTERVAL '7 days' 
AND status = 'active'
AND uninstalled_at IS NULL;

-- Verify the changes
SELECT 
    install_id, 
    referral_code, 
    mellowtel_opted_in,
    status,
    last_active,
    installed_at,
    uninstalled_at
FROM installations 
ORDER BY last_active DESC 
LIMIT 10;
