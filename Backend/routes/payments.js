const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
const Student = require('../models/Student');
const Company = require('../models/Company');

const JWT_SECRET = process.env.JWT_SECRET || '';
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

// ─── Helper: get user from token ────────────────────────
function getUserFromToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    return decoded;
  } catch {
    return null;
  }
}

// ─── POST /api/payments/create-checkout-session ────────
router.post('/create-checkout-session', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const { plan, role } = req.body; // plan: 'monthly' | 'yearly', role: 'student' | 'company'
    if (!plan || !role) {
      return res.status(400).json({ error: 'Plan and role are required.' });
    }

    // Determine price and product details
    const isYearly = plan === 'yearly';
    let priceInCents;
    let productName;

    if (role === 'student' || role === 'company') {
      priceInCents = isYearly ? 7999 : 999; // $79.99 or $9.99 in cents
      productName = role === 'student' ? 'Student Pro' : 'Enterprise Pro';
    } else {
      return res.status(400).json({ error: 'Invalid role.' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${productName} — ${isYearly ? 'Yearly' : 'Monthly'}`,
            description: isYearly
              ? `$${(priceInCents / 100).toFixed(2)}/year (billed annually)`
              : `$${(priceInCents / 100).toFixed(2)}/month`,
          },
          unit_amount: priceInCents,
          recurring: {
            interval: isYearly ? 'year' : 'month',
          },
        },
        quantity: 1,
      }],
      metadata: {
        userId: tokenData.id,
        role: tokenData.role || role,
        plan: isYearly ? 'yearly' : 'monthly',
      },
      // Stripe auto-replaces {CHECKOUT_SESSION_ID} with the real session ID
      success_url: `${req.protocol}://${req.get('host')?.includes('localhost') ? 'localhost:5173' : req.get('host')}/${role}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')?.includes('localhost') ? 'localhost:5173' : req.get('host')}/${role}/pro-plan?payment=cancelled`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('POST /api/payments/create-checkout-session error:', err);
    res.status(500).json({ error: 'Failed to create checkout session.' });
  }
});

// ─── POST /api/payments/confirm ──────────────────────────
// Called from the dashboard after Stripe redirects back with session_id
// This replaces the need for webhooks in local/test environments
router.post('/confirm', async (req, res) => {
  try {
    const tokenData = getUserFromToken(req);
    if (!tokenData) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const { session_id } = req.body;
    if (!session_id) {
      return res.status(400).json({ error: 'Session ID is required.' });
    }

    // Retrieve the Stripe session to verify it was paid
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(session_id);
    } catch {
      return res.status(400).json({ error: 'Invalid session ID.' });
    }

    if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
      return res.status(400).json({ error: 'Payment not completed.' });
    }

    const { userId, role } = session.metadata || {};
    
    // Security check: only allow confirming your own session
    if (userId !== tokenData.id) {
      return res.status(403).json({ error: 'Session does not belong to you.' });
    }

    // Update the user's plan to 'pro'
    const userRole = role || tokenData.role;
    if (userRole === 'student') {
      await Student.findByIdAndUpdate(userId, {
        'stats.plan': 'pro',
        'stats.interviewsRemaining': 999,
      });
    } else if (userRole === 'company') {
      await Company.findByIdAndUpdate(userId, { plan: 'pro' });
    } else {
      return res.status(400).json({ error: 'Invalid user role.' });
    }

    console.log(`✅ ${userRole} ${userId} upgraded to pro via confirm endpoint`);
    res.json({ success: true, plan: 'pro' });
  } catch (err) {
    console.error('POST /api/payments/confirm error:', err);
    res.status(500).json({ error: 'Failed to confirm payment.' });
  }
});

// ─── Webhook handler (called from server.js with raw body) ──
async function handleWebhook(req, res) {
  let event;
  try {
    const sig = req.headers['stripe-signature'];
    if (WEBHOOK_SECRET && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET);
    } else {
      // No webhook secret — parse directly (test mode without signature)
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle subscription events
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const { userId, role, plan } = session.metadata || {};
      if (!userId || !role) break;

      try {
        if (role === 'student' || role === 'company') {
          const Model = role === 'student' ? Student : Company;
          const updateField = role === 'student'
            ? { 'stats.plan': 'pro', 'stats.interviewsRemaining': 999 }
            : { plan: 'pro' };
          await Model.findByIdAndUpdate(userId, updateField);
          console.log(`✅ ${role} ${userId} upgraded to pro (${plan})`);
        }
      } catch (err) {
        console.error('Webhook: failed to update user plan:', err);
      }
      break;
    }

    case 'customer.subscription.deleted':
    case 'customer.subscription.updated': {
      // Handle subscription cancellations / changes
      const subscription = event.data.object;
      const status = subscription.status;
      // You'd look up the customer and downgrade if status === 'canceled' or 'past_due'
      console.log(`ℹ️ Subscription ${subscription.id} status: ${status}`);
      break;
    }

    default:
      console.log(`ℹ️ Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
}

module.exports = router;
module.exports.handleWebhook = handleWebhook;
