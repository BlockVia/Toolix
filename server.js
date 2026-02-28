/**
 * ╔══════════════════════════════════════════════════╗
 * ║       🌐  TOOLIX - Subscription Server          ║
 * ║     Stripe Payment + Code Generation            ║
 * ╚══════════════════════════════════════════════════╝
 */

const express = require('express');
const stripe = require('stripe')('sk_test_51T5ZuvAK25n2MDteCEcUB0yIakTkdbhgxcqMxeA4iIlxYyYSJEiKmGV7LMsLJw0q7iRyPNxBVb0dciNI9yCNobiq00HqWGd8GQ');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Paths ──
const CODES_FILE = path.join(__dirname, '..', 'generated_codes.json');
const TOKENS_FILE = path.join(__dirname, '..', 'active_tokens.json');
const TOOL_FILE = path.join(__dirname, '..', 'game_tool.py');

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

// ── Helper: Load/Save Codes ──
function loadCodes() {
    try {
        if (fs.existsSync(CODES_FILE)) {
            return JSON.parse(fs.readFileSync(CODES_FILE, 'utf8'));
        }
    } catch (e) { }
    return [];
}

function saveCodes(codes) {
    fs.writeFileSync(CODES_FILE, JSON.stringify(codes, null, 2), 'utf8');
}

// ── Helper: Generate Activation Code ──
function generateCode(planType) {
    const prefix = planType.toUpperCase().slice(0, 3);
    const rand = crypto.randomBytes(6).toString('hex').toUpperCase();
    return `TOOLIX-${prefix}-${rand}`;
}

// ── Helper: Load/Save Tokens ──
function loadTokens() {
    try {
        if (fs.existsSync(TOKENS_FILE)) {
            return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
        }
    } catch (e) { }
    return {};
}

function saveTokens(tokens) {
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2), 'utf8');
}

// ── Helper: Clean Expired Tokens ──
function cleanTokens() {
    const tokens = loadTokens();
    let changed = false;
    const now = Date.now();
    for (const [token, data] of Object.entries(tokens)) {
        if (now > data.expiresAt) {
            delete tokens[token];
            changed = true;
        }
    }
    if (changed) saveTokens(tokens);
}
setInterval(cleanTokens, 5 * 60 * 1000); // Clean every 5 mins

// ── Route: Create Stripe Checkout Session ──
app.post('/api/create-checkout', async (req, res) => {
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
                duration_hours: planData.duration_hours.toString()
            }
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error('Stripe error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ── Route: Verify Payment & Generate Code ──
app.post('/api/verify-payment', async (req, res) => {
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

        // Generate unique activation code
        const code = generateCode(planType);
        const codeHash = crypto.createHash('sha256').update(code).digest('hex');

        // Save to generated_codes.json
        const codes = loadCodes();

        // Check if session already redeemed
        const existing = codes.find(c => c.session_id === sessionId);
        if (existing) {
            return res.json({
                success: true,
                code: existing.code,
                plan: planType,
                duration: planData.label,
                already_redeemed: true
            });
        }

        codes.push({
            code_hash: codeHash,
            code: code,
            plan: planType,
            duration_hours: planData.duration_hours,
            session_id: sessionId,
            created_at: new Date().toISOString()
        });
        saveCodes(codes);

        res.json({
            success: true,
            code: code,
            plan: planType,
            duration: planData.label
        });

    } catch (error) {
        console.error('Verification error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ── Route: Generate OTP Link for Free Promo ──
app.get('/api/get-promo-link', (req, res) => {
    try {
        const token = crypto.randomBytes(16).toString('hex');
        const tokens = loadTokens();

        // Token valid for 10 minutes
        tokens[token] = {
            expiresAt: Date.now() + 10 * 60 * 1000
        };
        saveTokens(tokens);

        res.json({ success: true, token });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate promo link' });
    }
});

// ── Route: Claim Free 2-Hour Promo Code ──
app.get('/claim-promo/:token', (req, res) => {
    try {
        const { token } = req.params;
        const tokens = loadTokens();

        // 1. Check if token exists and is active
        if (!tokens[token] || Date.now() > tokens[token].expiresAt) {
            return res.status(400).send(`
                <html><head><title>Expired Link</title><style>body{background:#0a0a0f;color:#ff2d55;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;text-align:center}</style></head>
                <body><div><h1>❌ Invalid or Expired Link</h1><p>Please go back to the app and click "Watch Ad" again.</p></div></body></html>
            `);
        }

        // 2. Token is valid -> DELETE IT IMMEDIATELY (single-use)
        delete tokens[token];
        saveTokens(tokens);

        // 3. Generate a 2-hour code
        const code = generateCode('FRE'); // TOOLIX-FRE-XXXXXX
        const codeHash = crypto.createHash('sha256').update(code).digest('hex');

        // 4. Save to generated_codes.json with a flag indicating it can only be used once
        const codes = loadCodes();
        codes.push({
            code_hash: codeHash,
            code: code,
            plan: 'free_promo',
            duration_hours: 2,
            session_id: 'linkvertise_' + Date.now(),
            created_at: new Date().toISOString(),
            single_use: true // Flag for license manager
        });
        saveCodes(codes);

        // 5. Redirect to success page to show the code
        res.redirect(`/promo-success.html?code=${code}`);

    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
});

// ── Route: Download Tool ──
app.get('/api/download', (req, res) => {
    // For now, just redirect or send the file
    if (fs.existsSync(TOOL_FILE)) {
        res.download(TOOL_FILE, 'game_tool.py');
    } else {
        res.status(404).json({ error: 'Tool file not found' });
    }
});

// ── Route: Success Page ──
app.get('/success', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'success.html'));
});

// ── Start Server ──
app.listen(PORT, () => {
    console.log(`\n🌐  Toolix Server running at http://localhost:${PORT}`);
    console.log(`💳  Stripe: TEST MODE`);
    console.log(`📁  Codes saved to: ${CODES_FILE}\n`);
});
