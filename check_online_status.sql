-- Run this query directly in Supabase SQL Editor to check status

SELECT 
  install_id,
  referral_code,
  last_active,
  EXTRACT(EPOCH FROM (NOW() - last_active)) as age_seconds,
  CASE 
    WHEN last_active IS NULL THEN 'NEVER ACTIVE'
    WHEN EXTRACT(EPOCH FROM (NOW() - last_active)) < 6 THEN '🟢 ONLINE'
    ELSE '⚪ OFFLINE'
  END as status,
  mellowtel_opted_in,
  status as install_status
FROM installations
WHERE referral_code IS NOT NULL
ORDER BY last_active DESC NULLS LAST
LIMIT 10;
