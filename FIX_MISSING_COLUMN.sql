-- ==========================================
-- FIX MISSING COLUMN
-- The 'extension_id' column was missing from the reset script.
-- ==========================================

ALTER TABLE installations 
ADD COLUMN IF NOT EXISTS extension_id TEXT;

-- Verify it exists now
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'installations' AND column_name = 'extension_id';
