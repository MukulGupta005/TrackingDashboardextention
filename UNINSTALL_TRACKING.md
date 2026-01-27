# Uninstall Tracking Column

## New Column: `uninstalled_at`

A `TIMESTAMP WITH TIME ZONE` column has been added to track **when** an extension was uninstalled or marked as inactive.

### Schema Update:

```sql
ALTER TABLE installations 
ADD COLUMN IF NOT EXISTS uninstalled_at TIMESTAMP WITH TIME ZONE;
```

### When It's Set:

1. **When marked as inactive** (via `mark-inactive.js`):
   - After 48 hours of no heartbeat
   - `status` = 'inactive'
   - `uninstalled_at` = current timestamp

2. **When manually marked as uninstalled**:
   - Admin can manually update
   - `status` = 'uninstalled'
   - `uninstalled_at` = timestamp of action

### Usage in Dashboard:

**Show Uninstall Date:**
```javascript
if (installation.status === 'inactive' || installation.status === 'uninstalled') {
  const uninstalledDate = new Date(installation.uninstalled_at).toLocaleDateString();
  console.log(`Uninstalled on: ${uninstalledDate}`);
}
```

**Filter by Uninstall Date:**
```sql
-- Get installations uninstalled in last 7 days
SELECT * FROM installations 
WHERE uninstalled_at > NOW() - INTERVAL '7 days';
```

### Updated Files:

1. ✅ **add-status-column.sql** - Migration with uninstalled_at column
2. ✅ **schema.sql** - Added to schema
3. ✅ **mark-inactive.js** - Sets timestamp when marking inactive

### Run Migration:

```sql
-- In Supabase SQL Editor
ALTER TABLE installations 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' 
CHECK (status IN ('active', 'inactive', 'uninstalled'));

ALTER TABLE installations 
ADD COLUMN IF NOT EXISTS uninstalled_at TIMESTAMP WITH TIME ZONE;
```

### Benefits:

- ✅ Know exactly when user uninstalled
- ✅ Track retention metrics
- ✅ Calculate average usage duration
- ✅ Identify churn patterns
- ✅ Show in admin dashboard tables

Done! 🎉
