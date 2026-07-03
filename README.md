const express = require('express');
const prisma = require('../config/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { initiateStkPush } = require('../services/mpesa.service');
const { logAction } = require('../services/history.service');
const { boostPaymentSchema } = require('../utils/validators');

const router = express.Router();

const LISTING_BOOST_FEE_KES = 20; // flat fee to pin a listing to the top of search for 7 days
const BOOST_DURATION_DAYS = 7;

// Farmer starts a boost payment for one of their own listings.
// Sends an STK push prompt to their phone; the listing is boosted once
// the /mpesa/callback route confirms payment.
router.post('/boost/:listingId', authenticate, authorize('FARMER'), async (req, res, next) => {
  try {
    const listing = await prisma.listing.findUnique({ where: { id: req.params.listingId } });
    if (!listing || listing.farmerId !== req.user.id) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const { phone: phoneOverride } = boostPaymentSchema.parse(req.body || {});
    const phone = phoneOverride || req.user.phone;

    const payment = await prisma.payment.create({
      data: {
        userId: req.user.id,
        listingId: listing.id,
        purpose: 'LISTING_BOOST',
        amountKes: LISTING_BOOST_FEE_KES,
        phone,
        status: 'PENDING',
      },
    });

    try {
      const { checkoutRequestId, merchantRequestId } = await initiateStkPush({
        phone,
        amountKes: LISTING_BOOST_FEE_KES,
        accountReference: `BOOST-${listing.id.slice(0, 8)}`,
        description: 'Listing boost',
      });

      const updated = await prisma.payment.update({
        where: { id: payment.id },
        data: { mpesaCheckoutRequestId: checkoutRequestId, mpesaMerchantRequestId: merchantRequestId },
      });

      res.status(202).json({
        message: 'Payment prompt sent to your phone. Enter your M-Pesa PIN to complete.',
        paymentId: updated.id,
        checkoutRequestId,
      });
    } catch (mpesaErr) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', resultDescription: mpesaErr.message } });
      throw mpesaErr;
    }
  } catch (err) {
    next(err);
  }
});

// Farmer can poll status while waiting for the STK push to be completed on their phone.
router.get('/:paymentId', authenticate, async (req, res, next) => {
  try {
    const payment = await prisma.payment.findUnique({ where: { id: req.params.paymentId } });
    if (!payment || payment.userId !== req.user.id) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json(payment);
  } catch (err) {
    next(err);
  }
});

// Public webhook — Safaricom calls this once the customer completes (or cancels)
// the STK push prompt. Never trust client input here; only Safaricom calls this URL.
// Safaricom's callback shape: { Body: { stkCallback: { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } } }
router.post('/mpesa/callback', async (req, res) => {
  try {
    const callback = req.body?.Body?.stkCallback;
    if (!callback) {
      return res.status(400).json({ ResultCode: 1, ResultDesc: 'Malformed callback' });
    }

    const payment = await prisma.payment.findUnique({
      where: { mpesaCheckoutRequestId: callback.CheckoutRequestID },
    });

    // Always acknowledge with 200 so Safaricom doesn't retry, even if we can't
    // match the payment (e.g. stale/duplicate callback) — logged for investigation.
    if (!payment) {
      console.warn('[mpesa callback] no matching payment for', callback.CheckoutRequestID);
      return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    if (callback.ResultCode === 0) {
      const items = callback.CallbackMetadata?.Item || [];
      const receipt = items.find((i) => i.Name === 'MpesaReceiptNumber')?.Value;

      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'COMPLETED', mpesaReceiptNumber: receipt, resultDescription: callback.ResultDesc },
        }),
        ...(payment.purpose === 'LISTING_BOOST' && payment.listingId
          ? [
              prisma.listing.update({
                where: { id: payment.listingId },
                data: { boostedUntil: new Date(Date.now() + BOOST_DURATION_DAYS * 24 * 60 * 60 * 1000) },
              }),
            ]
          : []),
      ]);

      await logAction(payment.userId, 'PAYMENT_COMPLETED', { paymentId: payment.id, purpose: payment.purpose });
    } else {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: callback.ResultCode === 1032 ? 'CANCELLED' : 'FAILED', resultDescription: callback.ResultDesc },
      });
    }

    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err) {
    console.error('[mpesa callback] error handling callback:', err);
    // Still 200 — Safaricom will retry on non-2xx, which we don't want for a server-side bug.
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
});

module.exports = router;
