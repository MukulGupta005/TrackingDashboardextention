-- Create activity_sessions table
create table if not exists activity_sessions (
    id uuid default gen_random_uuid() primary key,
    install_id text not null, -- No foreign key constraint for simplicity/speed (or link to installations(install_id))
    start_time timestamptz default now(),
    last_heartbeat timestamptz default now(),
    duration_seconds bigint default 0,
    created_at timestamptz default now()
);

-- Index for fast lookups
create index if not exists idx_sessions_install_id on activity_sessions(install_id);
create index if not exists idx_sessions_last_heartbeat on activity_sessions(last_heartbeat);

-- Notify
DO $$
BEGIN
    RAISE NOTICE 'activity_sessions table created';
END $$;
