-- Function to safely increment active_seconds
create or replace function increment_active_seconds(row_id uuid, seconds int)
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
