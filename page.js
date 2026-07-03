const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs/promises');
const prisma = require('../config/prisma');
const { authenticate } = require('../middleware/auth');
const { analyzeImage } = require('../services/disease.service');
const { logAction } = require('../services/history.service');
const { UPLOAD_DIR } = require('../config/env');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error('Only JPG, PNG, or WEBP images are allowed'));
    }
    cb(null, true);
  },
});

router.post('/check', authenticate, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'An image file is required' });

    const targetType = req.body.targetType === 'soil' ? 'soil' : 'leaf';
    const imageUrl = `/uploads/${req.file.filename}`;
    const imageBuffer = await fs.readFile(req.file.path);

    const { diagnosis, confidence, advice } = await analyzeImage({
      imageBuffer,
      targetType,
    });

    const saved = await prisma.diseaseCheck.create({
      data: {
        userId: req.user.id,
        imageUrl,
        targetType,
        diagnosis,
        confidence,
        advice,
      },
    });

    await logAction(req.user.id, 'DISEASE_CHECK', { diseaseCheckId: saved.id, diagnosis });

    res.json(saved);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
