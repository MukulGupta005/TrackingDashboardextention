-- FIX: Drop the old "UUID" version to prevent conflict error
DROP FUNCTION IF EXISTS increment_active_seconds(uuid, int);

-- Ensure the correct version is defined
create or replace function increment_active_seconds(row_id bigint, seconds int)
returns void
language plpgsql
as $$
begin
  update installations 
  set 
    active_seconds = coalesce(active_seconds, 0) + seconds,
    total_active_minutes = floor((coalesce(active_seconds, 0) + seconds) / 60),
    last_active = now(),
    status = 'active'
  where id = row_id;
end;
$$;
