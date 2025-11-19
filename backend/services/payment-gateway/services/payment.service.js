const Razorpay = require('razorpay');
const Stripe = require('stripe');
const crypto = require('crypto');

/**
 * Payment Gateway Service
 * Unified payment processing with Razorpay and Stripe
 */
class PaymentService {
  constructor() {
    this.razorpay = null;
    this.stripe = null;
    this.initialize();
  }

  initialize() {
    // Initialize Razorpay
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      this.razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
      });
      console.log('✓ Razorpay initialized');
    }

    // Initialize Stripe
    if (process.env.STRIPE_SECRET_KEY) {
      this.stripe = Stripe(process.env.STRIPE_SECRET_KEY);
      console.log('✓ Stripe initialized');
    }
  }

  // =============================================
  // RAZORPAY METHODS
  // =============================================

  async createRazorpayOrder(amount, currency = 'INR', receipt) {
    if (!this.razorpay) throw new Error('Razorpay not configured');

    const options = {
      amount: amount * 100, // Amount in paise
      currency,
      receipt,
      payment_capture: 1
    };

    const order = await this.razorpay.orders.create(options);
    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      provider: 'razorpay'
    };
  }

  verifyRazorpaySignature(orderId, paymentId, signature) {
    if (!this.razorpay) throw new Error('Razorpay not configured');

    const text = `${orderId}|${paymentId}`;
    const generated = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    return generated === signature;
  }

  // =============================================
  // STRIPE METHODS
  // =============================================

  async createStripePaymentIntent(amount, currency = 'usd') {
    if (!this.stripe) throw new Error('Stripe not configured');

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: amount * 100, // Amount in cents
      currency,
      automatic_payment_methods: { enabled: true }
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      provider: 'stripe'
    };
  }

  async processRefund(paymentId, amount, provider) {
    if (provider === 'razorpay' && this.razorpay) {
      const refund = await this.razorpay.payments.refund(paymentId, {
        amount: amount * 100
      });
      return { refundId: refund.id, status: refund.status };
    }

    if (provider === 'stripe' && this.stripe) {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentId,
        amount: amount * 100
      });
      return { refundId: refund.id, status: refund.status };
    }

    throw new Error('Provider not configured');
  }

  async getPaymentStatus(paymentId, provider) {
    if (provider === 'razorpay' && this.razorpay) {
      const payment = await this.razorpay.payments.fetch(paymentId);
      return {
        paymentId: payment.id,
        status: payment.status,
        amount: payment.amount / 100,
        currency: payment.currency
      };
    }

    if (provider === 'stripe' && this.stripe) {
      const payment = await this.stripe.paymentIntents.retrieve(paymentId);
      return {
        paymentId: payment.id,
        status: payment.status,
        amount: payment.amount / 100,
        currency: payment.currency
      };
    }

    throw new Error('Provider not configured');
  }
}

module.exports = new PaymentService();
