const Subscriber = require('../models/Subscriber');
// The email service now handles both adding the contact and sending the confirmation
const { sendSubscriptionConfirmationEmail } = require('../utils/emailService');

// @desc    Subscribe to the newsletter
// @route   POST /api/subscribe
// @access  Public
exports.subscribeToNewsletter = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email address is required.' });
    }

    try {
        const existingSubscriber = await Subscriber.findOne({ email });

        if (existingSubscriber) {
            return res.status(400).json({ message: 'This email is already subscribed.' });
        }

        const newSubscriber = new Subscriber({ email });
        await newSubscriber.save();

        // --- MODIFIED LOGIC ---
        // This single function will now handle adding the contact to your Brevo list
        // and sending the transactional confirmation email.
        try {
            // The list ID from your .env will be used by the email service
            await sendSubscriptionConfirmationEmail({ email });
        } catch (emailError) {
            console.error(`🚨 Subscriber ${email} was saved to DB, but API calls to Brevo failed.`, emailError);
            // Even if the Brevo API fails, the user is subscribed on our end.
            // We can still send them a success message. The error is logged for admin review.
        }

        res.status(201).json({ message: 'Thank you for subscribing! Please check your inbox for a confirmation email.' });

    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message });
        }
        console.error('Error in subscribeToNewsletter:', error);
        res.status(500).json({ message: 'Server Error: Could not process your subscription.' });
    }
};

