const express = require('express');
const router = express.Router();
const { createExchangeRequest } = require('../controllers/exchangeController');
const { updateExchangeRequestStatus } = require('../controllers/exchangeController');
const { protect, admin } = require('../middleware/authMiddleware');
router.route('/').post(createExchangeRequest);
router.route('/:id').put(protect, admin, updateExchangeRequestStatus); 
module.exports = router;