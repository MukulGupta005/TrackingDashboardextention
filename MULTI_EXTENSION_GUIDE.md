# Multi-Extension Support - Quick Start Guide

The dashboard now supports tracking multiple Chrome/Edge extensions from a single account! 🎉

## What's New

✅ Track unlimited extensions per user account  
✅ Support for both Chrome and Edge platforms  
✅ Separate statistics for each extension  
✅ Easy extension management via API  
✅ Automatic tracking URL generation  

## How It Works

### 1. Set Up Database

Make sure you've run the updated SQL schema in Supabase (see `SUPABASE_SETUP.md`):

```sql
-- Extensions table and relationships are now created
CREATE TABLE extensions (...);
ALTER TABLE installations ADD COLUMN extension_id BIGINT;
```

### 2. Add an Extension

**Using API (example with curl):**

```bash
curl -X POST http://localhost:3000/api/extensions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "LinkedIn ConnectEz",
    "storeUrl": "https://chromewebstore.google.com/detail/linkedin-connectez/geehepcpfpchnndngcihpkdcjcafhmii",
    "platform": "chrome"
  }'
```

**Response:**
```json
{
  "id": 1,
  "user_id": 123,
  "name": "LinkedIn ConnectEz",
  "store_url": "https://chromewebstore.google.com/detail/...",
  "platform": "chrome",
  "trackingUrl": "https://chromewebstore.google.com/detail/...?ref=ABC12345&ext=1",
  "created_at": "2026-01-25T09:00:00Z"
}
```

### 3. Get All Your Extensions

```bash
curl -X GET http://localhost:3000/api/extensions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "LinkedIn ConnectEz",
    "platform": "chrome",
    "trackingUrl": "https://chromewebstore.google.com/detail/...?ref=ABC12345&ext=1"
  },
{
    "id": 2,
    "name": "Email Automation Pro",
    "platform": "edge",
    "trackingUrl": "https://microsoftedge.microsoft.com/...?ref=ABC12345&ext=2"
  }
]
```

### 4. Get Extension Stats

```bash
curl -X GET http://localhost:3000/api/extensions/1/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "extensionId": 1,
  "extensionName": "LinkedIn ConnectEz",
  "totalInstalls": 42,
  "mellowtelOptIns": 30,
  "activeUsers": 25,
  "recentInstalls": [...]
}
```

### 5. Delete an Extension

```bash
curl -X DELETE http://localhost:3000/api/extensions/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Extension Integration

When someone installs your extension via the tracking URL, the extension should send:

```javascript
// In your extension's background.js
const urlParams = new URLSearchParams(window.location.search);
const referralCode = urlParams.get('ref');  // e.g., "ABC12345"
const extensionId = urlParams.get('ext');    // e.g., "1"

// Track installation
await fetch('http://localhost:3000/api/track/install', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'connectez-api-key-for-extension-tracking-12345'
  },
  body: JSON.stringify({ 
    referralCode,
    extensionId  // NEW: Include extension ID
  })
});
```

## API Endpoints Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/extensions` | Create new extension |
| `GET` | `/api/extensions` | List user's extensions |
| `GET` | `/api/extensions/:id/stats` | Get extension statistics |
| `DELETE` | `/api/extensions/:id` | Delete extension |
| `POST` | `/api/track/install` | Track installation (now accepts `extensionId`) |

## Example: Managing Multiple Extensions

```javascript
// Example JavaScript for frontend
class ExtensionManager {
  constructor(apiUrl, token) {
    this.apiUrl = apiUrl;
    this.token = token;
  }

  async addExtension(name, storeUrl, platform) {
    const response = await fetch(`${this.apiUrl}/api/extensions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, storeUrl, platform })
    });
    return await response.json();
  }

  async getExtensions() {
    const response = await fetch(`${this.apiUrl}/api/extensions`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    return await response.json();
  }

  async getExtensionStats(extensionId) {
    const response = await fetch(`${this.apiUrl}/api/extensions/${extensionId}/stats`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    return await response.json();
  }

  async deleteExtension(extensionId) {
    const response = await fetch(`${this.apiUrl}/api/extensions/${extensionId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    return await response.json();
  }
}

// Usage
const  manager = new ExtensionManager('http://localhost:3000', 'your-jwt-token');

// Add Chrome extension
const ext1 = await manager.addExtension(
  'LinkedIn ConnectEz',
  'https://chromewebstore.google.com/detail/linkedin-connectez/geehepcpfpchnndngcihpkdcjcafhmii',
  'chrome'
);

// Add Edge extension
const ext2 = await manager.addExtension(
  'Email Automation',
  'https://microsoftedge.microsoft.com/addons/detail/...',
  'edge'
);

// Get all extensions
const extensions = await manager.getExtensions();
console.log(extensions);

// Get stats for a specific extension
const stats = await manager.getExtensionStats(ext1.id);
console.log(`Total installs for ${ext1.name}:`, stats.totalInstalls);
```

## Testing the Feature

1. **Register/Login** to get your JWT token and referral code
2. **Add an extension** using the API
3. **Copy the tracking URL** from the response
4. **Share the URL** or test tracking manually
5. **View stats** per extension

## Benefits

✅ **Track multiple products** from one dashboard  
✅ **Compare performance** across extensions  
✅ **A/B test** different versions  
✅ **Multi-platform** support (Chrome + Edge)  
✅ **Independent tracking** per extension  
✅ **Historical data** preserved when extensions are deleted

## Notes

- Extensions are tied to your user account
- Installations can be tracked with or without extension ID (backwards compatible)
- Deleting an extension doesn't delete installation history
- Each extension gets a unique tracking URL with your referral code

## Need Help?

- See `MULTI_EXTENSION_PLAN.md` for full technical details
- Check `EXTENSION_INTEGRATION.md` for extension-side integration
- Review `SUPABASE_SETUP.md` for database schema

Happy tracking! 🚀
