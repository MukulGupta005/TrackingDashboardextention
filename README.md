# LinkedIn ConnectEz Dashboard

A real-time dashboard for tracking LinkedIn ConnectEz installations, user registrations, and Mellowtel opt-in status via unique referral codes.

## Features

✨ **User Registration & Authentication**
- Secure user registration with email and password
- JWT-based authentication
- Automatic unique referral code generation

📊 **Real-time Dashboard**
- Live statistics updates via Server-Sent Events (SSE)
- Track total installations via your referral code
- Monitor Mellowtel opt-in count
- View active users (last 24 hours)
- See recent installations with status badges

🔗 **Referral Tracking**
- Unique 8-character referral codes
- Shareable tracking URLs
- One-click copy to clipboard

🎨 **Premium Design**
- Modern dark theme with glassmorphism effects
- Smooth animations and transitions
- Fully responsive layout
- Real-time visual updates

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

The `.env` file is already configured with default values. For production, update these values:

```env
PORT=3000
JWT_SECRET=your-secure-secret-key
API_KEY=your-api-key-for-extension
```

### 3. Start the Server

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

The dashboard will be available at: `http://localhost:3000`

### 4. Create Your Account

1. Open `http://localhost:3000` in your browser
2. Click "Register" and create an account
3. Your unique referral code will be generated automatically
4. Copy your referral tracking URL to share

## API Endpoints

### Authentication

**POST** `/api/register`
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**POST** `/api/login`
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Dashboard (Requires JWT)

**GET** `/api/stats`
- Headers: `Authorization: Bearer <token>`
- Returns: User statistics

**GET** `/api/stream`
- Headers: `Authorization: Bearer <token>`
- Returns: SSE stream with real-time updates

### Tracking (Requires API Key)

**POST** `/api/track/install`
- Headers: `X-API-Key: <api-key>`
- Body: `{ "referralCode": "ABC12345" }`
- Tracks new extension installation

**POST** `/api/track/mellowtel`
- Headers: `X-API-Key: <api-key>`
- Body: `{ "installId": "unique-install-id" }`
- Tracks Mellowtel opt-in

**POST** `/api/track/activity`
- Headers: `X-API-Key: <api-key>`
- Body: `{ "installId": "unique-install-id" }`
- Updates last active timestamp

## Extension Integration

To integrate tracking into the LinkedIn ConnectEz extension, see the `EXTENSION_INTEGRATION.md` guide.

### Quick Overview:

1. **On Install**: Send referral code to `/api/track/install`
2. **On Mellowtel Opt-in**: Send install ID to `/api/track/mellowtel`
3. **Activity Heartbeat**: Send install ID to `/api/track/activity` every hour

## Supabase Setup

Before running the application, you need to set up Supabase. See the detailed guide: **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)**

Quick steps:
1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Copy your project URL and API keys
3. Update `.env` with your Supabase credentials
4. Run the SQL schema in Supabase SQL Editor
5. Start the server

## Database

The application uses **Supabase (PostgreSQL)** with the following schema:

**users**
- id (PRIMARY KEY)
- email (UNIQUE)
- password_hash
- referral_code (UNIQUE)
- created_at

**installations**
- id (PRIMARY KEY)
- referral_code
- user_id (FOREIGN KEY)
- installed_at
- mellowtel_opted_in (BOOLEAN)
- last_active
- install_id (UNIQUE)

## Security Notes

🔒 **For Production:**

1. Change `JWT_SECRET` to a strong, random key
2. Change `API_KEY` to a secure, random value
3. Use HTTPS for all connections
4. Consider using PostgreSQL instead of SQLite
5. Implement rate limiting
6. Add CORS whitelist for specific domains
7. Use environment variables for all secrets

## Technology Stack

- **Backend**: Node.js, Express
- **Database**: SQLite (better-sqlite3)
- **Authentication**: JWT, bcryptjs
- **Real-time**: Server-Sent Events (SSE)
- **Frontend**: Vanilla HTML, CSS, JavaScript

## File Structure

```
connectez-dashboard/
├── server.js              # Main Express server
├── database.js            # Database operations
├── middleware/
│   └── auth.js           # Authentication middleware
├── public/
│   ├── index.html        # Frontend HTML
│   ├── styles.css        # CSS styles
│   └── app.js            # Frontend JavaScript
├── package.json          # Dependencies
├── .env                  # Environment variables
└── dashboard.db          # SQLite database (auto-generated)
```

## License

MIT
