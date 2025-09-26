const express = require('express');
const router = express.Router();
const { 
  createExchangeRequest,
  updateExchangeRequestStatus 
} = require('../controllers/exchangeController');
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

// --- CORRECTED ---
// Remove the duplicate route. This is the only line you need for this endpoint.
router.post('/', upload.array('images', 5), createExchangeRequest);

// This route remains the same
router.route('/:id').put(protect, admin, updateExchangeRequestStatus); 
 
module.exports = router;