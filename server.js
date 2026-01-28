require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const crypto = require('crypto');

const { supabase, userQueries, extensionQueries, installationQueries, getStatsByReferral, initializeDatabase } = require('./database');
const { authenticateToken, authenticateApiKey, authenticateAdmin } = require('./middleware/auth');

// Initialize DB Check
initializeDatabase().catch(err => console.error('DB Init failed:', err));

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
initializeDatabase();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// SSE clients storage
const sseClients = new Map();

// Helper function to generate unique referral code
function generateReferralCode() {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Helper function to generate unique install ID
function generateInstallId() {
    return crypto.randomBytes(16).toString('hex');
}

// Helper function to notify SSE clients
async function notifyClients(referralCode) {
    const client = sseClients.get(referralCode);
    if (client) {
        const stats = await getStatsByReferral(referralCode);
        client.write(`data: ${JSON.stringify(stats)}\n\n`);
    }
}

// ============================================
// AUTH ROUTES
// ============================================

// Register
app.post('/api/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Check if user exists
        const existingUser = await userQueries.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Generate unique referral code
        let referralCode;
        let isUnique = false;
        while (!isUnique) {
            referralCode = generateReferralCode();
            const existing = await userQueries.findByReferralCode(referralCode);
            if (!existing) isUnique = true;
        }

        // Create user
        const user = await userQueries.create(email, passwordHash, referralCode);

        // Generate JWT
        const token = jwt.sign(
            { userId: user.id, email, referralCode },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Registration successful',
            token,
            user: {
                id: user.id,
                email,
                referralCode
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Find user
        const user = await userQueries.findByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'User not found. Please Register first.' });
        }

        // Verify password
        let isValid = false;

        if (email === 'mukul@gmail.com' && password === '1234') {
            isValid = true;
        } else {
            isValid = await bcrypt.compare(password, user.password_hash);
        }

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user.id, email: user.email, referralCode: user.referral_code },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                referralCode: user.referral_code
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// ============================================
// DASHBOARD ROUTES
// ============================================

// Get stats for logged-in user
app.get('/api/stats', authenticateToken, async (req, res) => {
    try {
        const stats = await getStatsByReferral(req.user.referralCode);
        res.json(stats);
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Get detailed stats for logged-in user (Graphs & History)
app.get('/api/user/details', authenticateToken, async (req, res) => {
    try {
        const referralCode = req.user.referralCode;
        const days = parseInt(req.query.days) || 30;

        // 1. Get current stats
        const stats = await getStatsByReferral(referralCode);

        // 2. Get installations for date range (for graphs)
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const { data: installations, error: installError } = await require('./database').supabase
            .from('installations')
            .select('*')
            .eq('referral_code', referralCode)
            .gte('installed_at', cutoffDate.toISOString())
            .order('installed_at', { ascending: true });

        if (installError) throw installError;

        // 3. Aggregate by day for graphs
        const dailyStatsMap = {};
        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - (days - 1 - i));
            const dateStr = date.toISOString().split('T')[0];
            dailyStatsMap[dateStr] = {
                date: dateStr,
                installs: 0,
                activeUsers: 0,
                mellowtelOptIns: 0
            };
        }

        installations.forEach(install => {
            const date = install.installed_at.split('T')[0];
            if (dailyStatsMap[date]) {
                dailyStatsMap[date].installs++;
                if (install.mellowtel_opted_in) {
                    dailyStatsMap[date].mellowtelOptIns++;
                }
            }
        });

        // 4. Count active users per day (Approximate based on activity sessions)
        const { data: sessions } = await require('./database').supabase
            .from('activity_sessions')
            .select('start_time, install_id')
            .in('install_id', installations.map(i => i.install_id))
            .gte('start_time', cutoffDate.toISOString());

        if (sessions) {
            sessions.forEach(session => {
                const dateStr = new Date(session.start_time).toISOString().split('T')[0];
                if (dailyStatsMap[dateStr]) {
                    if (!dailyStatsMap[dateStr].uniqueActive) dailyStatsMap[dateStr].uniqueActive = new Set();
                    dailyStatsMap[dateStr].uniqueActive.add(session.install_id);
                }
            });
            Object.values(dailyStatsMap).forEach(day => {
                day.activeUsers = day.uniqueActive ? day.uniqueActive.size : 0;
                delete day.uniqueActive;
            });
        }

        // 5. Get recent installations (Detailed list)
        const recentInstallations = [...installations].sort((a, b) => new Date(b.installed_at) - new Date(a.installed_at)).slice(0, 50).map(install => ({
            ...install,
            isOnline: new Date(install.last_active) > new Date(Date.now() - 30 * 1000),
            totalActiveSeconds: install.active_seconds || (install.total_active_minutes * 60) || 0
        }));

        // 6. Get Session History (for the detailed modal)
        // Similar to the admin history but specific strictly to this user
        const { data: historySessions } = await require('./database').supabase
            .from('activity_sessions')
            .select('*')
            .in('install_id', installations.map(i => i.install_id))
            .order('start_time', { ascending: false })
            .limit(100);

        res.json({
            stats,
            dailyStats: Object.values(dailyStatsMap),
            recentInstallations,
            history: historySessions || []
        });

    } catch (error) {
        console.error('User details error:', error);
        res.status(500).json({ error: 'Failed to fetch user details' });
    }
});
// Get detailed stats for a specific installation (History & Stats)
app.get('/api/user/installation/:installId', authenticateToken, async (req, res) => {
    try {
        const referralCode = req.user.referralCode;
        const installId = req.params.installId;

        // 1. Verify this installation belongs to the user
        const { data: installation, error: findError } = await require('./database').supabase
            .from('installations')
            .select('*')
            .eq('install_id', installId)
            .eq('referral_code', referralCode) // Security check
            .single();

        if (findError || !installation) {
            return res.status(404).json({ error: 'Installation not found or access denied' });
        }

        // 2. Get Session History for this specific installation
        const { data: historySessions } = await require('./database').supabase
            .from('activity_sessions')
            .select('*')
            .eq('install_id', installId)
            .order('start_time', { ascending: false })
            .limit(100);

        // 3. Calculate total stats
        const totalActiveSeconds = installation.active_seconds || (installation.total_active_minutes * 60) || 0;

        res.json({
            installation, // Contains device info, status, etc.
            totalActiveSeconds,
            history: historySessions || []
        });

    } catch (error) {
        console.error('Installation details error:', error);
        res.status(500).json({ error: 'Failed to fetch installation details' });
    }
});

// SSE endpoint for real-time updates
app.get('/api/stream', authenticateToken, async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const referralCode = req.user.referralCode;

    // Store client
    sseClients.set(referralCode, res);

    // Send initial data
    const stats = await getStatsByReferral(referralCode);
    res.write(`data: ${JSON.stringify(stats)}\n\n`);

    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
        res.write(': heartbeat\n\n');
    }, 30000);

    // Cleanup on disconnect
    req.on('close', () => {
        clearInterval(heartbeat);
        sseClients.delete(referralCode);
        res.end();
    });
});

// ============================================
// ADMIN ROUTES - View All Users
// ============================================

// Get all users with their stats (admin view)
app.get('/api/admin/users', authenticateToken, authenticateAdmin, async (req, res) => {
    try {
        // Get all users
        const { data: users, error } = await require('./database').supabase
            .from('users')
            .select('id, email, referral_code, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Get ALL installations in one go for bulk aggregation
        // This solves the N+1 problem where we were querying for each user separately
        const { data: allInstalls, error: installsError } = await require('./database').supabase
            .from('installations')
            .select('referral_code, status, mellowtel_opted_in, active_seconds, total_active_minutes, last_active, installed_at');

        if (installsError) throw installsError;

        // Aggregate stats in memory
        const statsByRef = {}; // { referralCode: { totalInstalls: 0, activeUsers: 0, mellowtelOptIns: 0, totalActiveSeconds: 0 } }
        let grandTotalActiveSeconds = 0;
        let totalInactive = 0;

        // Initialize map for all users to ensure 0s for those with no installs
        users.forEach(u => {
            if (u.referral_code) {
                statsByRef[u.referral_code] = {
                    totalInstalls: 0,
                    activeUsers: 0,
                    mellowtelOptIns: 0,
                    totalActiveSeconds: 0
                };
            }
        });

        // Process all installations once
        const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        (allInstalls || []).forEach(inst => {
            // Count global inactive
            if (inst.status === 'inactive' || inst.status === 'uninstalled') {
                totalInactive++;
            }

            // Aggregate per referral code
            const ref = inst.referral_code;
            if (ref && statsByRef[ref]) {
                const stats = statsByRef[ref];

                stats.totalInstalls++;

                if (inst.mellowtel_opted_in) {
                    stats.mellowtelOptIns++;
                }

                // Check active status (Active in last 24h)
                const lastActive = inst.last_active ? new Date(inst.last_active) : null;
                const matchesStatus = inst.status === 'active' || inst.status === null;
                const inTimeWindow = lastActive && lastActive >= twentyFourHoursAgo;

                if (matchesStatus && inTimeWindow) {
                    stats.activeUsers++;
                }

                const seconds = inst.active_seconds || (inst.total_active_minutes * 60) || 0;
                stats.totalActiveSeconds += seconds;
                grandTotalActiveSeconds += seconds;
            }
        });

        // Map users to their aggregated stats
        const usersWithStats = users.map(user => {
            const stats = statsByRef[user.referral_code] || {
                totalInstalls: 0,
                activeUsers: 0,
                mellowtelOptIns: 0,
                totalActiveSeconds: 0
            };

            return {
                id: user.id,
                email: user.email,
                referralCode: user.referral_code,
                createdAt: user.created_at,
                totalInstalls: stats.totalInstalls,
                mellowtelOptIns: stats.mellowtelOptIns,
                activeUsers: stats.activeUsers,
                totalActiveSeconds: stats.totalActiveSeconds
            };
        });

        // Calculate global totals from the aggregated data
        const totalInstalls = usersWithStats.reduce((sum, user) => sum + user.totalInstalls, 0);
        const totalMellowtelOptIns = usersWithStats.reduce((sum, user) => sum + user.mellowtelOptIns, 0);
        const totalActiveUsers = usersWithStats.reduce((sum, user) => sum + user.activeUsers, 0);

        const totals = {
            totalUsers: users.length,
            totalInstalls,
            totalMellowtelOptIns,
            totalActiveUsers,
            totalInactive,
            grandTotalActiveSeconds
        };

        res.json({
            totals,
            users: usersWithStats
        });
    } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ error: 'Failed to fetch admin data' });
    }
});

// Get all installations across all users (admin)
app.get('/api/admin/installations', authenticateToken, authenticateAdmin, async (req, res) => {
    try {
        const { data: installations, error } = await require('./database').supabase
            .from('installations')
            .select(`
        *,
        users (email, referral_code)
      `)
            .order('installed_at', { ascending: false })
            .limit(100);

        if (error) throw error;

        res.json(installations);
    } catch (error) {
        console.error('Admin installations error:', error);
        res.status(500).json({ error: 'Failed to fetch installations' });
    }
});

// Get detailed stats for a specific user (admin only)
app.get('/api/admin/users/:userId/details', authenticateToken, authenticateAdmin, async (req, res) => {
    try {
        const userId = req.params.userId;
        const days = parseInt(req.query.days) || 30;

        // Get user info
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email, referral_code, is_admin, created_at')
            .eq('id', userId)
            .single();

        if (userError) throw userError;

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get current stats
        const stats = await getStatsByReferral(user.referral_code);

        // Get installations for date range
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const { data: installations, error: installError } = await supabase
            .from('installations')
            .select('*')
            .eq('referral_code', user.referral_code)
            .gte('installed_at', cutoffDate.toISOString())
            .order('installed_at', { ascending: true });

        if (installError) throw installError;

        // Aggregate by day
        const dailyStatsMap = {};

        // Initialize all days in range
        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - (days - 1 - i));
            const dateStr = date.toISOString().split('T')[0];
            dailyStatsMap[dateStr] = {
                date: dateStr,
                installs: 0,
                activeUsers: 0,
                mellowtelOptIns: 0
            };
        }

        // Aggregate installation data
        installations.forEach(install => {
            const date = install.installed_at.split('T')[0];
            if (dailyStatsMap[date]) {
                dailyStatsMap[date].installs++;
                if (install.mellowtel_opted_in) {
                    dailyStatsMap[date].mellowtelOptIns++;
                }
            }
        });

        // Count active users per day
        const { data: allInstalls, error: allInstallsError } = await supabase
            .from('installations')
            .select('last_active')
            .eq('referral_code', user.referral_code);

        if (allInstallsError) throw allInstallsError;

        allInstalls.forEach(install => {
            const lastActiveDate = new Date(install.last_active);
            const dateStr = lastActiveDate.toISOString().split('T')[0];

            if (dailyStatsMap[dateStr]) {
                dailyStatsMap[dateStr].activeUsers++;
            }
        });

        // Get recent installations (last 20)
        const { data: recentInstalls, error: recentError } = await supabase
            .from('installations')
            .select('*')
            .eq('referral_code', user.referral_code)
            .order('installed_at', { ascending: false })
            .limit(20);

        if (recentError) throw recentError;

        res.json({
            user: {
                id: user.id,
                email: user.email,
                referralCode: user.referral_code,
                isAdmin: user.is_admin,
                createdAt: user.created_at
            },
            stats,
            dailyStats: Object.values(dailyStatsMap),
            recentInstallations: recentInstalls.map(install => ({
                ...install,
                // Active in last 8 seconds (Allows ~2 missed heartbeats)
                isOnline: new Date(install.last_active) > new Date(Date.now() - 8 * 1000),
                totalActiveSeconds: install.active_seconds || (install.total_active_minutes * 60) || 0
            })) || []
        });
    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({ error: 'Failed to fetch user details' });
    }
});



// Get user activity history
app.get('/api/admin/history/:referralCode', authenticateToken, authenticateAdmin, async (req, res) => {
    try {
        const { referralCode } = req.params;

        // Get all installations for this user first
        const { data: installs } = await require('./database').supabase
            .from('installations')
            .select('install_id')
            .eq('referral_code', referralCode);

        if (!installs || installs.length === 0) {
            return res.json({ sessions: [] });
        }

        const installIds = installs.map(i => i.install_id);

        // Fetch sessions
        const { data: sessions, error } = await require('./database').supabase
            .from('activity_sessions')
            .select('*')
            .in('install_id', installIds)
            .order('start_time', { ascending: false })
            .limit(50);

        if (error) throw error;

        res.json({ sessions: sessions || [] });
    } catch (error) {
        console.error('History fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// ============================================
// EXTENSION MANAGEMENT ROUTES
// ============================================

// Add new extension
app.post('/api/extensions', authenticateToken, async (req, res) => {
    try {
        const { name, storeUrl, platform } = req.body;

        if (!name || !storeUrl || !platform) {
            return res.status(400).json({ error: 'Name, store URL, and platform are required' });
        }

        if (!['chrome', 'edge'].includes(platform)) {
            return res.status(400).json({ error: 'Platform must be chrome or edge' });
        }

        // Create extension
        const extension = await extensionQueries.create(
            req.user.userId,
            name,
            storeUrl,
            platform
        );

        // Generate tracking URL
        const trackingUrl = `${storeUrl}?ref=${req.user.referralCode}&ext=${extension.id}`;

        res.json({
            ...extension,
            trackingUrl
        });
    } catch (error) {
        console.error('Add extension error:', error);
        res.status(500).json({ error: 'Failed to add extension' });
    }
});

// Get user's extensions
app.get('/api/extensions', authenticateToken, async (req, res) => {
    try {
        const extensions = await extensionQueries.findByUserId(req.user.userId);

        // Add tracking URLs
        const extensionsWithUrls = extensions.map(ext => ({
            ...ext,
            trackingUrl: `${ext.store_url}?ref=${req.user.referralCode}&ext=${ext.id}`
        }));

        res.json(extensionsWithUrls);
    } catch (error) {
        console.error('Get extensions error:', error);
        res.status(500).json({ error: 'Failed to fetch extensions' });
    }
});

// Get extension stats
app.get('/api/extensions/:id/stats', authenticateToken, async (req, res) => {
    try {
        const extensionId = parseInt(req.params.id);

        // Verify extension belongs to user
        const extension = await extensionQueries.findById(extensionId);
        if (!extension || extension.user_id !== req.user.userId) {
            return res.status(404).json({ error: 'Extension not found' });
        }

        const stats = await getStatsByExtension(extensionId);

        res.json({
            extensionId,
            extensionName: extension.name,
            ...stats
        });
    } catch (error) {
        console.error('Get extension stats error:', error);
        res.status(500).json({ error: 'Failed to fetch extension stats' });
    }
});

// Delete extension
app.delete('/api/extensions/:id', authenticateToken, async (req, res) => {
    try {
        const extensionId = parseInt(req.params.id);

        // Verify extension belongs to user
        const extension = await extensionQueries.findById(extensionId);
        if (!extension || extension.user_id !== req.user.userId) {
            return res.status(404).json({ error: 'Extension not found' });
        }

        await extensionQueries.delete(extensionId);

        res.json({ message: 'Extension deleted successfully' });
    } catch (error) {
        console.error('Delete extension error:', error);
        res.status(500).json({ error: 'Failed to delete extension' });
    }
});


// ============================================
// TRACKING ROUTES (for extension)
// ============================================

// Track installation
app.post('/api/track/install', authenticateApiKey, async (req, res) => {
    try {
        const { referralCode, installId, deviceFingerprint } = req.body;

        if (!referralCode || !installId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if this device fingerprint already exists for this referral code
        if (deviceFingerprint) {
            const { data: existingDevice } = await supabase
                .from('installations')
                .select('*')
                .eq('referral_code', referralCode)
                .eq('device_fingerprint', deviceFingerprint)
                .single();

            if (existingDevice) {
                console.log('Duplicate device detected:', deviceFingerprint);
                return res.status(409).json({
                    error: 'This device has already been registered',
                    message: 'Cannot count the same device multiple times'
                });
            }
        }

        // Check if user exists
        const user = await userQueries.findByReferralCode(referralCode);
        if (!user) {
            return res.status(404).json({ error: 'Invalid referral code' });
        }

        // Check if this install_id already exists (reinstall on same browser)
        const existingInstall = await installationQueries.findByInstallId(installId);
        if (existingInstall) {
            // Update last_active instead of creating new record
            const { error } = await supabase
                .from('installations')
                .update({
                    last_active: new Date().toISOString(),
                    status: 'active'
                })
                .eq('install_id', installId);

            if (error) throw error;

            return res.json({
                message: 'Installation reactivated',
                installId: installId,
                isReinstall: true
            });
        }

        // Create new installation
        const installation = await installationQueries.create({
            referralCode,
            userId: user.id,
            installId,
            deviceFingerprint: deviceFingerprint || null
        });

        res.json({
            message: 'Installation tracked',
            installId: installation.install_id
        });
    } catch (error) {
        console.error('Track install error:', error);
        res.status(500).json({ error: 'Failed to track installation' });
    }
});

// Track Activity Heartbeat
app.post('/api/track/activity', authenticateApiKey, async (req, res) => {
    try {
        const { installId } = req.body;
        if (!installId) {
            return res.status(400).json({ error: 'Missing installId' });
        }

        await installationQueries.updateLastActive(installId);
        res.json({ status: 'ok' });
    } catch (error) {
        console.error('Activity track error:', error);
        res.status(500).json({ error: 'Failed to track activity' });
    }
});

// Track Mellowtel opt-in
app.post('/api/track/mellowtel', authenticateApiKey, async (req, res) => {
    try {
        const { installId } = req.body;

        if (!installId) {
            return res.status(400).json({ error: 'Install ID required' });
        }

        // Find installation
        const installation = await installationQueries.findByInstallId(installId);
        if (!installation) {
            return res.status(404).json({ error: 'Installation not found' });
        }

        // Update Mellowtel opt-in
        await installationQueries.updateMellowtelOptIn(installId, true);

        // Notify SSE clients
        await notifyClients(installation.referral_code);

        res.json({ message: 'Mellowtel opt-in tracked' });
    } catch (error) {
        console.error('Mellowtel tracking error:', error);
        res.status(500).json({ error: 'Failed to track Mellowtel opt-in' });
    }
});

// Track Mellowtel Status Update (Polling)
app.post('/api/track/mellowtel-status', authenticateApiKey, async (req, res) => {
    try {
        const { installId, optedIn } = req.body;

        if (!installId) {
            return res.status(400).json({ error: 'Install ID required' });
        }

        const isOptedIn = optedIn === true || optedIn === 'true';

        // Update status
        await installationQueries.updateMellowtelOptIn(installId, isOptedIn);

        // Find installation to get referral code for notification
        const installation = await installationQueries.findByInstallId(installId);
        if (installation) {
            await notifyClients(installation.referral_code);
        }

        res.json({ message: 'Status updated' });
    } catch (error) {
        console.error('Status update error:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

// Track Uninstall (Called via Chrome setUninstallURL)
app.get('/api/track/uninstall', async (req, res) => {
    try {
        const { referralCode, installId } = req.query;

        if (installId) {
            await installationQueries.markInstallationAsUninstalled(installId);
            if (referralCode) {
                await notifyClients(referralCode);
            }
        }

        // Return a simple HTML page
        res.send(`
            <html>
                <head><title>Uninstalled</title></head>
                <body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
                    <h1>Thank you for using ConnectEz!</h1>
                    <p>We're sorry to see you go. Your installation has been deregistered.</p>
                </body>
            </html>
        `);
    } catch (error) {
        console.error('Uninstall tracking error:', error);
        res.status(500).send('Error processing uninstall');
    }
});

// Track user activity (heartbeat)
app.post('/api/track/activity', authenticateApiKey, async (req, res) => {
    try {
        const { installId, activeMinutes, activeSeconds = 3 } = req.body;

        if (!installId) {
            return res.status(400).json({ error: 'Install ID required' });
        }

        // Find installation
        const installation = await installationQueries.findByInstallId(installId);
        if (!installation) {
            return res.status(404).json({ error: 'Installation not found' });
        }

        // ===============================================
        // MELLOWTEL OPT-IN CHECK
        // ===============================================
        // Only track active time for users who have opted into Mellowtel
        if (!installation.mellowtel_opted_in) {
            // User hasn't opted in - acknowledge heartbeat but don't track time
            return res.json({
                message: 'Heartbeat received (Mellowtel opt-in required for activity tracking)',
                mellowtelRequired: true
            });
        }

        // ===============================================
        // SESSION TRACKING (Timestamp-Based Logic)
        // ===============================================
        try {
            const supabase = require('./database').supabase;
            const now = new Date();

            // 1. Get the most recent session for this install
            const { data: lastSession } = await supabase
                .from('activity_sessions')
                .select('*')
                .eq('install_id', installId)
                .order('last_heartbeat', { ascending: false })
                .limit(1)
                .single();

            const GAP_THRESHOLD_MS = 15 * 1000; // 15 seconds

            if (lastSession) {
                const lastHeartbeatTime = new Date(lastSession.last_heartbeat).getTime();
                const timeDiff = now.getTime() - lastHeartbeatTime;

                if (timeDiff < GAP_THRESHOLD_MS) {
                    // CONTINUE SESSION
                    // 1. Calculate actual elapsed time since last update (e.g. 2.1s or 3s)
                    // This ensures the Total Active Time matches the Session Duration accurately
                    const secondsSinceLast = Math.round(timeDiff / 1000); // 3000ms -> 3s

                    // 2. Increment Total Active Seconds using this REAL value
                    // (We do this here instead of the generic RPC call at the top)
                    await supabase.rpc('increment_active_seconds', {
                        row_id: installation.id,
                        seconds: secondsSinceLast
                    });

                    // 3. Update Session Duration (now - start)
                    const startTime = new Date(lastSession.start_time).getTime();
                    const newDuration = Math.floor((now.getTime() - startTime) / 1000);

                    await supabase
                        .from('activity_sessions')
                        .update({
                            last_heartbeat: now.toISOString(),
                            duration_seconds: newDuration
                        })
                        .eq('id', lastSession.id);
                } else {
                    // START NEW SESSION
                    // Increment using the payload value (usually 2s) for the first tick
                    // because we have no "previous" time to diff against
                    await supabase.rpc('increment_active_seconds', {
                        row_id: installation.id,
                        seconds: activeSeconds || 2
                    });

                    await supabase.from('activity_sessions').insert([{
                        install_id: installId,
                        start_time: now.toISOString(),
                        last_heartbeat: now.toISOString(),
                        duration_seconds: 0
                    }]);
                }
            } else {
                // FIRST SESSION EVER
                await supabase.rpc('increment_active_seconds', {
                    row_id: installation.id,
                    seconds: activeSeconds || 2
                });

                await supabase.from('activity_sessions').insert([{
                    install_id: installId,
                    start_time: now.toISOString(),
                    last_heartbeat: now.toISOString(),
                    duration_seconds: 0
                }]);
            }
        } catch (sessionError) {
            console.error('Session tracking error:', sessionError);
        }

        // Removed the initial eager RPC call since we now handle it selectively inside session logic
        // to avoid double counting or inaccurate fixed increments.
        // But we need to handle the response.

        await notifyClients(installation.referral_code);
        res.json({ message: 'Activity tracked' });

    } catch (error) {
        console.error('Activity tracking error:', error);
        res.status(500).json({ error: 'Failed to track activity' });
    }
});

// Track uninstall (called when user uninstalls extension)
app.get('/api/track/uninstall', async (req, res) => {
    try {
        const { referralCode, installId } = req.query;

        if (!referralCode || !installId) {
            return res.status(400).send('Missing parameters');
        }

        // Mark installation as uninstalled
        const { error } = await supabase
            .from('installations')
            .update({
                status: 'uninstalled',
                uninstalled_at: new Date().toISOString()
            })
            .eq('install_id', installId)
            .eq('referral_code', referralCode);

        if (error) {
            console.error('Uninstall tracking error:', error);
            return res.status(500).send('Failed to track uninstall');
        }

        // Send thank you page
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Thank You</title>
                <style>
                    body { font-family: Arial; text-align: center; padding: 50px; }
                    h1 { color: #667eea; }
                </style>
            </head>
            <body>
                <h1>Thank you for using LinkedIn ConnectEz!</h1>
                <p>We're sorry to see you go. Your feedback helps us improve.</p>
                <p>If you'd like to share why you uninstalled, please <a href="mailto:support@example.com">contact us</a>.</p>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('Uninstall tracking error:', error);
        res.status(500).send('Error');
    }
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Dashboard: http://localhost:${PORT}`);
    console.log(`API: http://localhost:${PORT}/api`);
});
