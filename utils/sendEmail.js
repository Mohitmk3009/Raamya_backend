const nodemailer = require('nodemailer');

const sendEmail = (options) => {
    // 1. Create a transporter using Brevo's SMTP details
    const transporter = nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',
        port: 587,
        auth: {
            user: process.env.FROM_EMAIL, // Your Brevo account email
            pass: process.env.BREVO_API_KEY,
        },
    });

    // 2. Define the email options
    const mailOptions = {
        from: `RAAMYA <${process.env.FROM_EMAIL}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
    };

    // 3. Send the email
    return transporter.sendMail(mailOptions);
};

module.exports = sendEmail;