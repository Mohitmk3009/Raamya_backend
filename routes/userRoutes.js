const express = require('express');
const router = express.Router();
const {
    getUserProfile,
    updateUserProfile,
    updateUserPassword,
    addUserAddress
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// All routes in this file are protected and require a user to be logged in.
// The 'protect' middleware runs first on every request to these endpoints.
// It identifies the user from their token and attaches their data to the request object (req.user)
// before passing it to the controller function.

/**
 * @route   GET /api/users/me
 * @desc    Get the logged-in user's profile
 * @access  Private
 */
router.get('/me', protect, getUserProfile);

/**
 * @route   PUT /api/users/me
 * @desc    Update the logged-in user's profile (name, email)
 * @access  Private
 */
router.put('/me', protect, updateUserProfile);

/**
 * @route   PUT /api/users/me/password
 * @desc    Update the logged-in user's password
 * @access  Private
 */
router.put('/me/password', protect, updateUserPassword);

/**
 * @route   POST /api/users/me/addresses
 * @desc    Add a new address for the logged-in user
 * @access  Private
 */
router.post('/me/addresses', protect, addUserAddress);

module.exports = router;

