const crypto = require('crypto');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');

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
                await sendEmail({
                    to: user.email,
                    subject: 'Welcome to RAAMYA!',
                    html: `
                        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                            <h2>Hi ${user.name},</h2>
                            <p>Thank you for registering. We're excited to have you as part of our community!</p>
                            <a href="${process.env.FRONTEND_URL}" style="background-color: #FF9900; color: black; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Start Shopping</a>
                            <p>Best Regards,<br>The RAAMYA Team</p>
                        </div>
                    `
                });
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
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).json({ message: 'User with that email does not exist.' });
    
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // In a real app, you would create a frontend page for this URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n <a href="${resetUrl}">${resetUrl}</a>`;
    
    try {
        await sendEmail({
            to: user.email,
            subject: 'Password Reset Token for RAAMYA',
            html: message
        });
        res.status(200).json({ success: true, data: 'Email sent' });
    } catch (error) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });
        res.status(500).json({ message: 'Email could not be sent' });
    }
};

exports.resetPassword = async (req, res) => {
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.resettoken).digest('hex');
    const user = await User.findOne({ 
        passwordResetToken, 
        passwordResetExpires: { $gt: Date.now() } 
    });

    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });
    
    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    
    res.status(200).json({ success: true, message: 'Password reset successful' });
};

