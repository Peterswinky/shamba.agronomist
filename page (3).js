const express = require('express');
const prisma = require('../config/prisma');
const { authenticate } = require('../middleware/auth');
const { soilCheckSchema } = require('../utils/validators');
const { VALID_SOIL_TYPES, getRecommendations } = require('../data/soilCropData');
const { logAction } = require('../services/history.service');

const router = express.Router();

// Public: list available soil types for the picker UI
router.get('/types', (req, res) => {
  res.json({ soilTypes: VALID_SOIL_TYPES });
});

// Authenticated: compute + persist a recommendation
router.post('/advise', authenticate, async (req, res, next) => {
  try {
    const { soilType, acreage } = soilCheckSchema.parse(req.body);

    if (!VALID_SOIL_TYPES.includes(soilType)) {
      return res.status(400).json({
        error: `Unknown soil type. Valid options: ${VALID_SOIL_TYPES.join(', ')}`,
      });
    }

    const result = getRecommendations(soilType, acreage);

    const saved = await prisma.soilCheck.create({
      data: { userId: req.user.id, soilType, acreage, result },
    });

    await logAction(req.user.id, 'SOIL_CHECK', { soilType, acreage, soilCheckId: saved.id });

    res.json({ soilCheckId: saved.id, ...result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
