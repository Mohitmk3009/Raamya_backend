const User = require('../models/User');

/**
 * @desc    Get user profile
 * @route   GET /api/users/me
 * @access  Private
 */
exports.getUserProfile = async (req, res) => {
    const user = await User.findById(req.user.id);

    if (user) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone, // 1. ADD PHONE to the response
            addresses: user.addresses,
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

/**
 * @desc    Update user profile (name and email)
 * @route   PUT /api/users/me
 * @access  Private
 */
exports.updateUserProfile = async (req, res) => {
    const user = await User.findById(req.user.id);

    if (user) {
        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        user.phone = req.body.phone || user.phone; // 2. ADD PHONE to be updatable

        const updatedUser = await user.save();
        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            phone: updatedUser.phone, // 3. ADD PHONE to the updated response
            addresses: updatedUser.addresses
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};


/**
 * @desc    Update user password
 * @route   PUT /api/users/me/password
 * @access  Private
 */
exports.updateUserPassword = async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    // We must .select('+password') to get the password hash from the DB for comparison
    const user = await User.findById(req.user.id).select('+password');

    // Check if the user exists and if the old password is correct
    if (user && (await user.matchPassword(oldPassword))) {
        user.password = newPassword; // The 'pre-save' hook in the User model will automatically hash this
        await user.save();
        res.json({ message: 'Password updated successfully' });
    } else {
        res.status(401).json({ message: 'Invalid old password' });
    }
};

/**
 * @desc    Add a new user address
 * @route   POST /api/users/me/addresses
 * @access  Private
 */
exports.addUserAddress = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (user) {
            const { label, name, phone, street, city, state, postalCode, country } = req.body;
            
            const newAddress = { label, name, phone, street, city, state, postalCode, country };
            
            user.addresses.push(newAddress);
            
            await user.save();
            res.status(201).json(user.addresses); // Return the full updated list of addresses
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        // This will catch validation errors from the address schema
        res.status(400).json({ message: 'Error saving address', error: error.message });
    }
};

