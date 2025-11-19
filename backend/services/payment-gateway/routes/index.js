const express = require('express');
const router = express.Router();
const paymentService = require('../services/payment.service');

/**
 * Payment Gateway Service Routes
 * Supports: Razorpay, Stripe, PayPal
 */

// Health check
router.get('/health', (req, res) => {
  res.json({
    service: 'Payment Gateway Integration Service',
    status: 'Active',
    version: '1.0.0',
    features: [
      'Payment order creation',
      'Payment verification',
      'Refund processing',
      'Webhook handling',
      'Multi-provider support'
    ],
    providers: {
      razorpay: process.env.RAZORPAY_KEY_ID ? 'configured' : 'not-configured',
      stripe: process.env.STRIPE_SECRET_KEY ? 'configured' : 'not-configured'
    }
  });
});

// Create payment order
router.post('/orders', async (req, res) => {
  try {
    const { amount, currency, provider, receipt } = req.body;
    let result;

    if (provider === 'razorpay') {
      result = await paymentService.createRazorpayOrder(amount, currency, receipt);
    } else if (provider === 'stripe') {
      result = await paymentService.createStripePaymentIntent(amount, currency);
    } else {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify payment
router.post('/verify', async (req, res) => {
  try {
    const { orderId, paymentId, signature } = req.body;
    const isValid = paymentService.verifyRazorpaySignature(orderId, paymentId, signature);
    res.json({ success: true, verified: isValid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Process refund
router.post('/refund', async (req, res) => {
  try {
    const { paymentId, amount, provider } = req.body;
    const result = await paymentService.processRefund(paymentId, amount, provider);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get payment status
router.get('/status/:provider/:paymentId', async (req, res) => {
  try {
    const { provider, paymentId } = req.params;
    const status = await paymentService.getPaymentStatus(paymentId, provider);
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Webhook handler
router.post('/webhook/:provider', (req, res) => {
  const { provider } = req.params;
  console.log(`Webhook from ${provider}:`, req.body);
  res.json({ received: true });
});

module.exports = router;
