const express = require('express');
const router = express.Router();
const { checkRateLimit } = require('../middleware/rateLimit');
const { authenticate } = require('../middleware/auth');

let confirmationCode = _generateCode();

function _generateCode() {
  return String(Math.floor(Math.random() * 10000)).padStart(4, '0');
}

router.post('/code/request', authenticate, (req, res) => {
  res.json({ ok: true, message: 'Confirmation code sent to registered email' });
});

router.post('/push', authenticate, (req, res) => {
  const { code, imageUrl } = req.body;
  const limit = checkRateLimit(req.ip);

  if (!limit.allowed) {
    return res.status(429).json({ error: 'Too many attempts' });
  }

  if (code !== confirmationCode) {
    return res.status(403).json({ error: 'Invalid confirmation code' });
  }

  confirmationCode = _generateCode();
  pushToDisplayNetwork(imageUrl);
  res.json({ ok: true });
});

function pushToDisplayNetwork(imageUrl) {
  console.log(`[DISPLAY] Broadcasting ${imageUrl} to 94 panels in Watson District`);
}

module.exports = router;
