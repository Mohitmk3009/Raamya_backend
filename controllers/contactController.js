const sendEmail = require('../utils/sendEmail');

exports.sendContactMessage = async (req, res) => {
    const { name, email, message } = req.body;
    
    // Email to Admin
    const adminMailOptions = {
        to: process.env.ADMIN_EMAIL,
        subject: `New Contact Message from ${name}`,
        html: `<p>Name: ${name}</p><p>Email: ${email}</p><p>Message: ${message}</p>`,
    };

    // Confirmation Email to User
    const userMailOptions = {
        to: email,
        subject: 'We have received your message',
        html: `<p>Hi ${name},</p><p>Thank you for contacting us. We'll get back to you shortly.</p>`,
    };

    try {
        // Send both emails
        await Promise.all([sendEmail(adminMailOptions), sendEmail(userMailOptions)]);
        res.status(200).json({ message: 'Message sent successfully!' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to send message.' });
    }
};