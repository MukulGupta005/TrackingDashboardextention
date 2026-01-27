# Admin Role-Based Access Control Setup

## What Changed

✅ **Added admin role system** to restrict admin endpoints to designated admin users only.

### Files Modified:
1. **schema.sql** - Added `is_admin BOOLEAN` column to users table
2. **server.js** - Added `authenticateAdmin` middleware
3. **admin routes** - Protected with admin-only access

---

## 🚨 IMPORTANT: Manual Database Update Required

The `is_admin` column needs to be added to your Supabase database, and the admin user needs to be designated.

### Run This in Supabase SQL Editor:

```sql
-- Step 1: Add is_admin column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Step 2: Make mukul@gmail.com an admin
UPDATE users 
SET is_admin = TRUE 
WHERE email = 'mukul@gmail.com';

-- Step 3: Verify the admin user
SELECT email, referral_code, is_admin, created_at 
FROM users 
WHERE email = 'mukul@gmail.com';
```

---

## How It Works

### Before:
❌ **Any logged-in user** could access `/api/admin/users` and `/api/admin/installations`

### After:
✅ **Only admin users** can access admin endpoints
- Regular users get `403 Forbidden` error
- Only users with `is_admin = TRUE` can access admin data

### Protected Endpoints:
- `GET /api/admin/users` - View all users and their stats
- `GET /api/admin/installations` - View all installations

### Middleware Chain:
1. `authenticateToken` - Verifies JWT token is valid
2. `authenticateAdmin` - Checks if user has `is_admin = TRUE` in database

---

## Testing

### Test as Admin (mukul@gmail.com):
```bash
# Login
$token = (Invoke-RestMethod -Uri "http://localhost:3000/api/login" -Method POST -ContentType "application/json" -Body '{"email":"mukul@gmail.com","password":"mukul123@123"}').token

# Access admin endpoint (should work)
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/users" -Method GET -Headers @{"Authorization"="Bearer $token"}
```

### Test as Regular User:
```bash
# Register a new regular user
Invoke-RestMethod -Uri "http://localhost:3000/api/register" -Method POST -ContentType "application/json" -Body '{"email":"test2@example.com","password":"password123"}'

# Login
$token2 = (Invoke-RestMethod -Uri "http://localhost:3000/api/login" -Method POST -ContentType "application/json" -Body '{"email":"test2@example.com","password":"password123"}').token

# Try to access admin endpoint (should fail with 403)
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/users" -Method GET -Headers @{"Authorization"="Bearer $token2"}
```

Expected error for non-admin:
```json
{
  "error": "Admin access required"
}
```

---

## Making Additional Admins

To give admin access to another user, run this SQL in Supabase:

```sql
UPDATE users 
SET is_admin = TRUE 
WHERE email = 'another-admin@example.com';
```

---

## Security Benefits

1. ✅ **Role-based access control** - Only admins see sensitive data
2. ✅ **Database-backed permissions** - Cannot be bypassed client-side
3. ✅ **Prevents data leaks** - Regular users can't see other users' data
4. ✅ **Audit trail** - Clear designation of who has admin access
