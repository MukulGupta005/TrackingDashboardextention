-- Add device_fingerprint column for fraud prevention
-- This prevents users from uninstalling/reinstalling to inflate numbers

ALTER TABLE installations 
ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;

-- Create index for faster duplicate device checks
CREATE INDEX IF NOT EXISTS idx_installations_device_fingerprint 
ON installations(device_fingerprint);

-- Create index for referral_code + device_fingerprint combination
CREATE INDEX IF NOT EXISTS idx_installations_referral_device 
ON installations(referral_code, device_fingerprint);

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'installations' 
AND column_name = 'device_fingerprint';
