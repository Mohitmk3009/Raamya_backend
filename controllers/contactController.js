const { sendContactUsEmail } = require('../utils/emailService');

const sendContactMessage = async (req, res) => {
    try {
        const { name, email, message, subject, phone } = req.body;
        console.log("Contact form submission:", req.body);
        if (!name || !email || !message) {
            return res.status(400).json({ message: 'Missing required fields: name, email, or message' });
        }

        await sendContactUsEmail({ name, email, message, subject, phone });

        res.status(200).json({ message: 'Emails sent successfully!' });
    } catch (error) {
        console.error('Error sending contact form emails:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = { sendContactMessage };