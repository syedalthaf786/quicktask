const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const analyticsController = require('../controllers/analytics.controller');

router.use(protect);

router.get('/summary', analyticsController.getStats);
router.get('/productivity', analyticsController.getProductivity);

module.exports = router;
