# Multi-Extension Support Implementation Plan

Enhance the dashboard to support tracking multiple Chrome/Edge extensions, allowing developers to manage and track stats for each extension separately.

## Overview

Currently, the dashboard is designed for a single extension. This enhancement will:
- Allow users to add multiple extensions (Chrome/Edge)
- Track installations and Mellowtel opt-ins per extension
- Show separate stats for each extension
- Generate extension-specific referral URLs

## Proposed Changes

### Database Schema

#### [NEW] extensions table

```sql
CREATE TABLE extensions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) NOT NULL,
  name TEXT NOT NULL,
  store_url TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'chrome' or 'edge'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_extensions_user_id ON extensions(user_id);
```

#### [MODIFY] installations table

Add `extension_id` foreign key:

```sql
ALTER TABLE installations
ADD COLUMN extension_id BIGINT REFERENCES extensions(id);

CREATE INDEX idx_installations_extension_id ON installations(extension_id);
```

---

### Backend Changes

#### [MODIFY] [database.js](file:///c:/Users/mukul/Downloads/Az/connectez-dashboard/database.js)

Add extension management queries:
- `extensionQueries.create()` - Add new extension
- `extensionQueries.findByUserId()` - Get user's extensions
- `extensionQueries.delete()` - Remove extension
- Update `getStatsByReferral()` to accept `extensionId` parameter
- Add `getStatsByExtension()` for extension-specific stats

#### [MODIFY] [server.js](file:///c:/Users/mukul/Downloads/Az/connectez-dashboard/server.js)

New endpoints:
- `POST /api/extensions` - Add new extension
- `GET /api/extensions` - List user's extensions
- `DELETE /api/extensions/:id` - Delete extension
- `GET /api/extensions/:id/stats` - Get extension-specific stats
- Update tracking endpoints to accept `extensionId`

---

### Frontend Changes

#### [MODIFY] [public/index.html](file:///c:/Users/mukul/Downloads/Az/connectez-dashboard/public/index.html)

Add:
- Extension management section
- "Add Extension" form with fields:
  - Extension name (e.g., "LinkedIn ConnectEz")
  - Store URL (Chrome/Edge Web Store)
  - Platform selector (Chrome/Edge)
- Extensions list with stats cards
- Delete extension button

#### [MODIFY] [public/styles.css](file:///c:/Users/mukul/Downloads/Az/connectez-dashboard/public/styles.css)

Add styles for:
- Extension cards
- Add extension form
- Platform badges (Chrome/Edge)
- Per-extension stats display

#### [MODIFY] [public/app.js](file:///c:/Users/mukul/Downloads/Az/connectez-dashboard/public/app.js)

Add functions:
- `addExtension()` - Create new extension
- `loadExtensions()` - Fetch and display extensions
- `deleteExtension()` - Remove extension
- `loadExtensionStats()` - Fetch stats for each extension
- Update SSE to handle multi-extension updates

---

### Updated User Flow

1. **User logs in** → Dashboard loads
2. **View Extensions** → List of all tracked extensions
3. **Add Extension**:
   - Click "Add Extension" button
   - Enter extension name
   - Paste Chrome/Edge Web Store URL
   - Select platform
   - System generates unique referral code for this extension
4. **View Stats** → Each extension shows:
   - Referral code
   - Tracking URL
   - Total installations
   - Mellowtel opt-ins
   - Active users
5. **Track Installations** → Extension sends `extensionId` with tracking calls

### Tracking URL Format

```
https://chromewebstore.google.com/detail/linkedin-connectez/geehepcpfpchnndngcihpkdcjcafhmii?ref=ABC12345&ext=1

Where:
- ref = user's referral code
- ext = extension ID (identifies which extension)
```

---

### API Changes

#### Add Extension
```http
POST /api/extensions
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "LinkedIn ConnectEz",
  "storeUrl": "https://chromewebstore.google.com/detail/linkedin-connectez/geehepcpfpchnndngcihpkdcjcafhmii",
  "platform": "chrome"
}

Response:
{
  "id": 1,
  "name": "LinkedIn ConnectEz",
  "storeUrl": "...",
  "platform": "chrome",
  "trackingUrl": "https://chromewebstore.google.com/detail/...?ref=ABC12345&ext=1"
}
```

#### Get Extensions
```http
GET /api/extensions
Authorization: Bearer {token}

Response:
[
  {
    "id": 1,
    "name": "LinkedIn ConnectEz",
    "storeUrl": "...",
    "platform": "chrome"
  }
]
```

#### Get Extension Stats
```http
GET /api/extensions/:id/stats
Authorization: Bearer {token}

Response:
{
  "extensionId": 1,
  "extensionName": "LinkedIn ConnectEz",
  "totalInstalls": 42,
  "mellowtelOptIns": 30,
  "activeUsers": 25,
  "recentInstalls": [...]
}
```

#### Updated Tracking Endpoint
```http
POST /api/track/install
X-API-Key: {api-key}
Content-Type: application/json

{
  "referralCode": "ABC12345",
  "extensionId": 1  // NEW: identifies which extension
}
```

---

### Migration SQL

For existing users with data:

```sql
-- Add extension_id column to installations (nullable for now)
ALTER TABLE installations
ADD COLUMN extension_id BIGINT REFERENCES extensions(id);

-- Create default extension for existing users
-- (You'll need to run this manually for each user)
INSERT INTO extensions (user_id, name, store_url, platform)
SELECT id, 'LinkedIn ConnectEz', 
  'https://chromewebstore.google.com/detail/linkedin-connectez/geehepcpfpchnndngc ihpkdcjcafhmii',
  'chrome'
FROM users;

-- Update existing installations to link to default extension
UPDATE installations i
SET extension_id = (
  SELECT e.id FROM extensions e 
  WHERE e.user_id = i.user_id 
  LIMIT 1
);
```

## Verification Plan

### Manual Testing

1. **Add Extension**
   - Add Chrome extension
   - Add Edge extension
   - Verify tracking URLs generated correctly

2. **Track Installations**
   - Simulate install for extension 1
   - Simulate install for extension 2
   - Verify stats update separately

3. **Multi-Extension View**
   - Check all extensions display
   - Verify each has independent stats
   - Test real-time updates for each

4. **Delete Extension**
   - Delete an extension
   - Verify it's removed from list
   - Check associated installations (keep or cascade delete?)

### Edge Cases

- What happens to installations if extension is deleted?
  - **Recommendation**: Keep installations (historical data) but mark extension as deleted
- Can users have duplicate extension URLs?
  - **Recommendation**: Allow (different referral codes for A/B testing)
- Maximum number of extensions per user?
  - **Recommendation**: No limit initially, add if needed

## UI Mockup (Text)

```
┌──────────────────────────────────────────────────────┐
│  📊 Dashboard                          [Add Extension]│
├──────────────────────────────────────────────────────┤
│                                                       │
│  Your Referral Code: ABC12345                        │
│                                                       │
│  ┌─────────────── Extensions ──────────────────┐    │
│  │                                               │    │
│  │  🟢 LinkedIn ConnectEz (Chrome)        [×]   │    │
│  │  📥 42 installs | ✅ 30 Mellowtel | 🔥 25 active│
│  │  URL: https://chromewebstore.google...       │    │
│  │  ─────────────────────────────────────       │    │
│  │  🟦 Email Sender Pro (Edge)            [×]   │    │
│  │  📥 15 installs | ✅ 10 Mellowtel | 🔥 8 active │
│  │  URL: https://microsoftedge.microsoft...     │    │
│  │                                               │    │
│  └───────────────────────────────────────────────┘    │
│                                                       │
└──────────────────────────────────────────────────────┘
```

## Benefits

✅ Track multiple products from one dashboard
✅ Compare performance across extensions
✅ A/B test different versions
✅ Support Chrome and Edge platforms
✅ Independent referral tracking per extension
