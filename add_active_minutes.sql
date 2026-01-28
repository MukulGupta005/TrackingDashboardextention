-- Add total_active_minutes column to installations table
ALTER TABLE installations 
ADD COLUMN IF NOT EXISTS total_active_minutes BIGINT DEFAULT 0;

-- Notify success
DO $$ 
BEGIN 
  RAISE NOTICE 'Added total_active_minutes column to installations table ✅';
END $$;
