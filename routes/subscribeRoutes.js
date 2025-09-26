const express = require('express');
const router = express.Router();
const { subscribeToNewsletter } = require('../controllers/subscribeController');

// @route   POST api/subscribe
// @desc    Subscribe to newsletter
// @access  Public
router.post('/', subscribeToNewsletter);

module.exports = router;
