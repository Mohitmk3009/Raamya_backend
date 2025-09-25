const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
// Add this Address Schema at the top of the file
const addressSchema = new mongoose.Schema({
    label: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true }, // Corrected field name
    country: { type: String, required: true, default: 'India' }
});

const userSchema = new mongoose.Schema({
    // ... name, email, password, role, googleId fields remain the same

    name: { type: String, required: true },
    phone: {
        type: String,
        required: false, // Or true if you want to make it mandatory
    },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: function () { return !this.googleId; }, minlength: 6, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    googleId: { type: String },
    otp: { type: String },
  otpExpires: { type: Date },
    passwordResetToken: String,
    passwordResetExpires: Date,
    // Add the addresses array to the schema
    addresses: [addressSchema]

}, { timestamps: true });

// ... (your pre-save hooks and methods remain the same)

userSchema.methods.getResetPasswordToken = function() {
    const resetToken = crypto.randomBytes(20).toString('hex');
    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    this.passwordResetExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
    return resetToken;
};

// Middleware: Hash password before saving the user
userSchema.pre('save', async function (next) {
    // Only run this function if password was actually modified
    if (!this.isModified('password')) {
        next();
    }

    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    // Hash the password with the salt
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method: Compare entered password with the hashed password in the database
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};


module.exports = mongoose.model('User', userSchema);