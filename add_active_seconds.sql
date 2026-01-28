-- Add active_seconds column to installations table
ALTER TABLE installations 
ADD COLUMN IF NOT EXISTS active_seconds BIGINT DEFAULT 0;

-- Notify success
DO $$ 
BEGIN 
  RAISE NOTICE 'Added active_seconds column to installations table ✅';
END $$;
