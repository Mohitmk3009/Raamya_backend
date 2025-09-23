// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const passport = require('passport'); // 1. Import Passport
const jwt = require('jsonwebtoken'); // 2. Import JWT
const { register, login,forgotPassword,resetPassword } = require('../controllers/authController');

// ... (Your existing register and login routes)
router.post('/register', register);
router.post('/login', login);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);
// --- Google OAuth Routes (Add these) ---

// This route starts the Google login process
// Method: GET
// Endpoint: /api/auth/google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

// This is the callback route that Google redirects to after login
// Method: GET
// Endpoint: /api/auth/google/callback
router.get(
    '/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: 'https://raamya.vercel.app//login' }),
    (req, res) => {
        // User is authenticated by passport middleware, and user object is attached to req.user
        // Now, we generate our own JWT token for the user
        const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, {
            expiresIn: '30d',
        });

        // Redirect the user back to the frontend with the token
        // The frontend will grab the token from the URL and save it.
        res.redirect(`https://raamya.vercel.app/login-success?token=${token}`);
    }
);

module.exports = router;