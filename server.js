/**
 * ╔══════════════════════════════════════════════════╗
 * ║       🌐  TOOLIX - Account System Server        ║
 * ║  MongoDB + JWT Auth + Stripe Payment            ║
 * ╚══════════════════════════════════════════════════╝
 */

const express = require('express');
const stripe = require('stripe')('sk_test_51T5ZuvAK25n2MDteCEcUB0yIakTkdbhgxcqMxeA4iIlxYyYSJEiKmGV7LMsLJw0q7iRyPNxBVb0dciNI9yCNobiq00HqWGd8GQ');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'toolix-secret-key-change-in-production-2026';
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://asfourmohmed45_db_user:lcTphcrgObU2a8ZG@cluster0.jnefqc2.mongodb.net/toolix?retryWrites=true&w=majority&appName=Cluster0';

// ── Plan Configuration ──
const PLANS = {
    weekly: {
        name: 'Weekly Plan',
        price: 200,       // $2.00 in cents
        duration_hours: 168,
        label: '1 Week'
    },
    monthly: {
        name: 'Monthly Plan',
        price: 400,       // $4.00 in cents
        duration_hours: 720,
        label: '1 Month'
    },
    yearly: {
        name: 'Yearly Plan',
        price: 2000,      // $20.00 in cents
        duration_hours: 8760,
        label: '1 Year'
    }
};

// ── Middleware ──
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ── MongoDB Connection ──
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB error:', err.message));

// ── JWT Helper ──
function generateToken(user) {
    return jwt.sign(
        { id: user._id, username: user.username, email: user.email },
        JWT_SECRET,
        { expiresIn: '30d' }
    );
}

// ── Strict Auth ──
async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// ── Optional Auth (doesn't fail if no token) ──
async function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = await User.findById(decoded.id);
        } catch { }
    }
    next();
}

// ═══════════════════════════════════════════════
//  AUTH ROUTES
// ═══════════════════════════════════════════════

// ── Register ──
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({ error: 'Username must be 3-20 characters' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Check existing
        const existingUser = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
        if (existingUser) {
            if (existingUser.email === email.toLowerCase()) {
                return res.status(400).json({ error: 'Email already registered' });
            }
            return res.status(400).json({ error: 'Username already taken' });
        }

        const user = new User({
            username,
            email: email.toLowerCase(),
            password_hash: password  // Will be hashed by pre-save hook
        });
        await user.save();

        const token = generateToken(user);

        res.json({
            success: true,
            token,
            user: user.toPublic()
        });
    } catch (error) {
        console.error('Register error:', error.message);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// ── Login ──
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = generateToken(user);

        res.json({
            success: true,
            token,
            user: user.toPublic()
        });
    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).json({ error: 'Login failed' });
    }
});

// ── Get Current User ──
app.get('/api/me', authMiddleware, async (req, res) => {
    try {
        res.json({
            success: true,
            user: req.user.toPublic()
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get user data' });
    }
});

// ── Check Subscription (for desktop app) ──
app.post('/api/check-subscription', authMiddleware, async (req, res) => {
    try {
        const user = req.user;
        const isPremium = user.isPremium();

        // Auto-deactivate expired subscriptions
        if (user.subscription.active && !isPremium) {
            user.subscription.active = false;
            user.subscription.plan = 'free';
            await user.save();
        }

        res.json({
            success: true,
            is_premium: isPremium,
            plan: isPremium ? user.subscription.plan : 'free',
            expires_at: user.subscription.expires_at,
            username: user.username
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to check subscription' });
    }
});

// ═══════════════════════════════════════════════
//  STRIPE PAYMENT ROUTES
// ═══════════════════════════════════════════════

// ── Create Checkout Session (requires login) ──
app.post('/api/create-checkout', authMiddleware, async (req, res) => {
    try {
        const { plan } = req.body;
        const planData = PLANS[plan];

        if (!planData) {
            return res.status(400).json({ error: 'Invalid plan' });
        }

        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.get('host');
        const baseUrl = `${protocol}://${host}`;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `Toolix Pro - ${planData.name}`,
                        description: `Premium access for ${planData.label}`,
                    },
                    unit_amount: planData.price,
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
            cancel_url: `${baseUrl}/#pricing`,
            metadata: {
                plan: plan,
                user_id: req.user._id.toString(),
                duration_hours: planData.duration_hours.toString()
            }
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error('Stripe error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ── Verify Payment & Activate Subscription ──
app.post('/api/verify-payment', authMiddleware, async (req, res) => {
    try {
        const { sessionId, plan } = req.body;

        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== 'paid') {
            return res.status(400).json({ error: 'Payment not completed' });
        }

        const planType = plan || session.metadata.plan || 'weekly';
        const planData = PLANS[planType];
        if (!planData) {
            return res.status(400).json({ error: 'Invalid plan type' });
        }

        // Verify the payment belongs to this user
        if (session.metadata.user_id !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Payment does not belong to this account' });
        }

        const user = req.user;

        // Extend subscription if already active, or start new
        let expiresAt;
        if (user.isPremium() && user.subscription.expires_at) {
            expiresAt = new Date(user.subscription.expires_at.getTime() + planData.duration_hours * 3600000);
        } else {
            expiresAt = new Date(Date.now() + planData.duration_hours * 3600000);
        }

        user.subscription.active = true;
        user.subscription.plan = planType;
        user.subscription.expires_at = expiresAt;
        await user.save();

        res.json({
            success: true,
            plan: planType,
            duration: planData.label,
            expires_at: expiresAt.toISOString(),
            message: 'Subscription activated successfully!'
        });

    } catch (error) {
        console.error('Verification error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ═══════════════════════════════════════════════
//  FREE PROMO ROUTES
// ═══════════════════════════════════════════════

// Store promo tokens in memory (they expire in 5 min anyway)
const promoTokens = new Map();

// Clean expired tokens periodically
setInterval(() => {
    const now = Date.now();
    for (const [token, data] of promoTokens) {
        if (now > data.expiresAt) promoTokens.delete(token);
    }
}, 5 * 60 * 1000);

// ── Free Promo Page (30s countdown + ads) ──
app.get('/free-promo', (req, res) => {
    try {
        const token = crypto.randomBytes(16).toString('hex');

        promoTokens.set(token, {
            expiresAt: Date.now() + 5 * 60 * 1000
        });

        let html = fs.readFileSync(path.join(__dirname, 'public', 'free-promo-template.html'), 'utf8');
        html = html.replace('{{TOKEN}}', token);

        res.send(html);
    } catch (error) {
        res.status(500).send('Failed to load promo page');
    }
});

// ── Claim Free 2-Hour Promo (requires login) ──
app.post('/api/claim-promo', authMiddleware, async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ error: 'Missing token' });
        }

        // Validate promo token
        const tokenData = promoTokens.get(token);
        if (!tokenData || Date.now() > tokenData.expiresAt) {
            return res.status(400).json({ error: 'Invalid or expired session. Please reload the page.' });
        }

        // Delete token (single-use)
        promoTokens.delete(token);

        const user = req.user;

        // Add 2 hours to subscription
        let expiresAt;
        if (user.isPremium() && user.subscription.expires_at) {
            expiresAt = new Date(user.subscription.expires_at.getTime() + 2 * 3600000);
        } else {
            expiresAt = new Date(Date.now() + 2 * 3600000);
        }

        user.subscription.active = true;
        user.subscription.plan = user.isPremium() ? user.subscription.plan : 'promo';
        user.subscription.expires_at = expiresAt;
        await user.save();

        res.json({
            success: true,
            message: '2 hours of PRO added to your account!',
            expires_at: expiresAt.toISOString()
        });

    } catch (error) {
        console.error('Claim promo error:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ═══════════════════════════════════════════════
//  STATIC ROUTES
// ═══════════════════════════════════════════════

app.get('/success', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'success.html'));
});

// ── Start Server ──
app.listen(PORT, () => {
    console.log(`\n🌐  Toolix Server running at http://localhost:${PORT}`);
    console.log(`💳  Stripe: TEST MODE`);
    console.log(`🗄️   MongoDB: ${MONGO_URI}\n`);
});
