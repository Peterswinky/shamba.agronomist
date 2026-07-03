const express = require('express');
const prisma = require('../config/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { listingSchema, inquirySchema } = require('../utils/validators');
const { logAction } = require('../services/history.service');

const router = express.Router();

// Public browse — buyers (and anyone) can view active listings, with filters
router.get('/listings', async (req, res, next) => {
  try {
    const { crop, county, minQty, maxPrice, page = 1, pageSize = 20 } = req.query;

    const where = {
      status: 'ACTIVE',
      ...(crop && { cropName: { contains: String(crop), mode: 'insensitive' } }),
      ...(county && { county: { equals: String(county), mode: 'insensitive' } }),
      ...(minQty && { quantityKg: { gte: parseFloat(minQty) } }),
      ...(maxPrice && { pricePerKg: { lte: parseFloat(maxPrice) } }),
    };

    // Rank currently-active boosts (paid, not yet expired) above everything else,
    // then fall back to newest first. Two ordered slices avoids expired boosts
    // (a past date) outranking fresh unboosted listings.
    const now = new Date();
    const [boosted, regular, total] = await Promise.all([
      prisma.listing.findMany({
        where: { ...where, boostedUntil: { gt: now } },
        orderBy: { boostedUntil: 'desc' },
        include: { farmer: { select: { name: true, phone: true, county: true } } },
      }),
      prisma.listing.findMany({
        where: { ...where, OR: [{ boostedUntil: null }, { boostedUntil: { lte: now } }] },
        orderBy: { createdAt: 'desc' },
        include: { farmer: { select: { name: true, phone: true, county: true } } },
      }),
      prisma.listing.count({ where }),
    ]);

    const combined = [...boosted, ...regular];
    const start = (Number(page) - 1) * Number(pageSize);
    const listings = combined.slice(start, start + Number(pageSize));

    res.json({ listings, total, page: Number(page), pageSize: Number(pageSize) });
  } catch (err) {
    next(err);
  }
});

// Farmer creates a listing
router.post('/listings', authenticate, authorize('FARMER'), async (req, res, next) => {
  try {
    const data = listingSchema.parse(req.body);
    const listing = await prisma.listing.create({
      data: { ...data, farmerId: req.user.id },
    });
    await logAction(req.user.id, 'LISTING_CREATED', { listingId: listing.id });
    res.status(201).json(listing);
  } catch (err) {
    next(err);
  }
});

// Farmer's own listings
router.get('/listings/mine', authenticate, authorize('FARMER'), async (req, res, next) => {
  try {
    const listings = await prisma.listing.findMany({
      where: { farmerId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: { inquiries: { include: { buyer: { select: { name: true, phone: true } } } } },
    });
    res.json({ listings });
  } catch (err) {
    next(err);
  }
});

// Farmer updates listing status (e.g. mark SOLD)
router.patch('/listings/:id/status', authenticate, authorize('FARMER'), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'SOLD', 'EXPIRED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });
    if (!listing || listing.farmerId !== req.user.id) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    const updated = await prisma.listing.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Buyer sends an inquiry on a listing (reveals contact interest; farmer sees buyer's phone)
router.post('/listings/:id/inquire', authenticate, authorize('BUYER'), async (req, res, next) => {
  try {
    const { message } = inquirySchema.parse(req.body);
    const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    const inquiry = await prisma.inquiry.create({
      data: { listingId: listing.id, buyerId: req.user.id, message },
    });

    await logAction(req.user.id, 'INQUIRY_SENT', { listingId: listing.id, inquiryId: inquiry.id });
    res.status(201).json(inquiry);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
