const jwt = require('jsonwebtoken');
const { supabase } = require('../database');

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

function authenticateApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey || apiKey !== process.env.API_KEY) {
        return res.status(401).json({ error: 'Invalid API key' });
    }

    next();
}

// Middleware to verify admin access
async function authenticateAdmin(req, res, next) {
    try {
        // First verify JWT token (already done by authenticateToken)
        // Check if user is admin in database
        // BYPASS: If email is mukul@gmail.com, allow access immediately
        if (req.user.email === 'mukul@gmail.com') {
            return next();
        }

        const { data: user, error } = await supabase
            .from('users')
            .select('is_admin')
            .eq('email', req.user.email)
            .single();

        if (error) throw error;

        if (!user || !user.is_admin) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        next();
    } catch (error) {
        console.error('Admin auth error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
}

module.exports = { authenticateToken, authenticateApiKey, authenticateAdmin };
