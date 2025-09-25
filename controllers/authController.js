const crypto = require('crypto');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
// const sendEmail = require('../utils/sendEmail');
const { sendWelcomeEmail, sendOTPEmail } = require('../utils/emailService');
// Function to generate a JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({ name, email, password });

        if (user) {
            // --- EMAIL LOGIC ---
            try {
                // Call the correct function from your emailService
                await sendWelcomeEmail({ email: user.email, name: user.name });
            } catch (error) {
                console.error('Welcome email failed to send:', error);
            }
            // --- END EMAIL LOGIC ---

            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' }),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};


// controllers/authController.js

// ... (keep the existing generateToken and register functions)

// @desc    Auth user & get token (Login)
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check for user by email
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check if password matches
        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // User is valid, send back token
        res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id),
        });

    } catch (error) {
        res.status(500).json({ message: `Server Error: ${error.message}` });
    }
};

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    let user;
    try {
        user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User with that email does not exist.' });
        }

        // Generate a 6-digit OTP
        const otp = crypto.randomInt(100000, 999999).toString();
        user.otp = otp;
        user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // store as Date
        await user.save({ validateBeforeSave: false });

        await sendOTPEmail({
            email: user.email,
            otp: otp,
        });

        console.log(`OTP sent to ${user.email}`);
        res.status(200).json({ success: true, message: 'OTP sent. Check your inbox.' });
    } catch (error) {
        if (user) {
            user.otp = undefined;
            user.otpExpires = undefined;
            await user.save({ validateBeforeSave: false });
        }
        console.error('Forgot password email failed to send:', error);
        res.status(500).json({ message: 'Email could not be sent' });
    }
};

// New endpoint to verify the OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    console.log("Verify OTP request:", { email, otp });

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Log for debugging
    console.log("Stored OTP:", user.otp, "Entered OTP:", otp);
    console.log("Stored expiry:", user.otpExpires, "Now:", Date.now());

    // Check if OTP exists
    if (!user.otp) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    // Expiry check (if stored as Date or number)
    const expiry = user.otpExpires instanceof Date ? user.otpExpires.getTime() : user.otpExpires;
    if (expiry < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    // Match check (always compare as strings)
    if (user.otp.toString() !== otp.toString().trim()) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    // OTP is valid → clear it
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({ success: true, message: 'OTP verified successfully.' });
  } catch (error) {
    console.error('OTP verification failed:', error);
    return res.status(500).json({ message: 'OTP verification failed.' });
  }
};


// Updated password reset endpoint
exports.resetPassword = async (req, res) => {
    const { email, newPassword } = req.body;
    console.log('Reset password route hit'); // <-- check this
  console.log('Params:', req.params);
  console.log('Body:', req.body);
    console.log("Reset Password request:", { email, newPassword });
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Update the password and save
        user.password = newPassword;
        await user.save();

        res.status(200).json({ success: true, message: 'Password reset successful' });
    } catch (error) {
        console.error('Password reset failed:', error);
        res.status(500).json({ message: 'Password reset failed.' });
    }
};

exports.getMe = async (req, res, next) => {
  const user = await User.findById(req.user.id);
  res.status(200).json({
    success: true,
    data: user,
  });
};