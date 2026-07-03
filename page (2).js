const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getUserHistory } = require('../services/history.service');

const router = express.Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { limit, cursor } = req.query;
    const history = await getUserHistory(req.user.id, {
      limit: limit ? Number(limit) : undefined,
      cursor,
    });
    res.json({ history });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
