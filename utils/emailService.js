// /utils/emailService.js

require('dotenv').config();
const SibApiV3Sdk = require('sib-api-v3-sdk');

/**
 * A helper function to get a fresh, authenticated Brevo API instance.
 */
const getBrevoApiInstance = () => {
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;
    return new SibApiV3Sdk.TransactionalEmailsApi();
};

const sendWelcomeEmail = async ({ email, name }) => {
    const apiInstance = getBrevoApiInstance();
    const templateId = Number(process.env.TEMPLATE_ID_WELCOME);
    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'no-reply@yourdomain.com';
    const senderName = process.env.BREVO_SENDER_NAME || 'Your Company Name';

    const payload = {
        subject: `Welcome to ${senderName}!`,
        to: [{ email, name }],
        sender: { email: senderEmail, name: senderName },
        templateId,
        params: { FIRSTNAME: name.split(' ')[0] },
    };

    try {
        await apiInstance.sendTransacEmail(payload);
        console.log(`Welcome email sent to ${email}`);
    } catch (error) {
        console.error(`Error sending welcome email:`, error.body ? error.body.message : error.message);
        throw error;
    }
};

const sendOTPEmail = async ({ email, otp }) => {
    const apiInstance = getBrevoApiInstance();
    const templateId = Number(process.env.TEMPLATE_ID_OTP);
    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'no-reply@yourdomain.com';
    const senderName = process.env.BREVO_SENDER_NAME || 'Your Company Name';

    const payload = {
        subject: `Your One-Time Password (OTP)`,
        to: [{ email }],
        sender: { email: senderEmail, name: senderName },
        templateId,
        params: { OTP: otp },
    };

    try {
        await apiInstance.sendTransacEmail(payload);
        console.log(`OTP email sent to ${email}`);
    } catch (error) {
        console.error(`Error sending OTP email:`, error.body ? error.body.message : error.message);
        throw error;
    }
};

const sendContactUsEmail = async ({ name, email, message, subject, phone }) => {
    const apiInstance = getBrevoApiInstance();
    const userTemplateId = Number(process.env.TEMPLATE_ID_CONTACT_USER_CONFIRMATION);
    const adminTemplateId = Number(process.env.TEMPLATE_ID_CONTACT_ADMIN_NOTIFICATION);
    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'raamya.2312@gmail.com';
    const senderName = process.env.BREVO_SENDER_NAME || 'Your Company Name';
    const adminEmail = process.env.ADMIN_EMAIL;

    if (!adminEmail) {
        console.error('Error: ADMIN_EMAIL environment variable is not set.');
        return;
    }

    const userPayload = {
        subject: `We've received your message`,
        to: [{ email, name }],
        sender: { email: senderEmail, name: senderName },
        templateId: userTemplateId,
        params: { FIRSTNAME: name.split(' ')[0] },
    };

    const adminPayload = {
        subject: `New Contact Form Message from ${name}`,
        to: [{ email: adminEmail }],
        sender: { email: senderEmail, name: senderName },
        templateId: adminTemplateId,
        // ✅ FIX: The 'subject' variable was passed incorrectly. It should be 'SUBJECT'.
        params: { SENDER_NAME: name, SENDER_EMAIL: email, SUBJECT: subject, PHONE: phone, MESSAGE: message },
    };

    try {
        await apiInstance.sendTransacEmail(userPayload);
        console.log(`Contact confirmation email sent to ${email}`);
        await apiInstance.sendTransacEmail(adminPayload);
        console.log(`Contact form message sent to admin at ${adminEmail}`);
    } catch (error) {
        console.error(`Error sending contact form emails:`, error.body ? error.body.message : error.message);
        throw error;
    }
};

const sendOrderConfirmationEmail = async ({ user, order, pdfBuffer }) => {
    const apiInstance = getBrevoApiInstance();

    const userTemplateId = Number(process.env.TEMPLATE_ID_ORDER_USER);
    const adminTemplateId = Number(process.env.TEMPLATE_ID_ORDER_ADMIN);
    const adminEmail = process.env.ADMIN_EMAIL;
    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'raamya.2312@gmail.com';
    const senderName = process.env.BREVO_SENDER_NAME || 'Raamya';

    if (!userTemplateId || !adminTemplateId || !adminEmail) {
        console.error('Error: Missing email environment variables.');
        return;
    }

    const subtotal = order.totalPrice - order.shippingPrice;
    const itemsForTemplate = order.orderItems.map(item => ({
        name: item.name,
        qty: item.qty,
        image: item.image,
        size: item.size,
        sku: item.sku,
        price: item.price.toFixed(2),
        subtotal: (item.qty * item.price).toFixed(2),
    }));

    const commonParams = {
        ORDER_ID: order._id.toString(),
        ORDER_DATE: order.createdAt.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
        TOTAL_PRICE: order.totalPrice.toFixed(2),
        ITEMS: itemsForTemplate,
        SUBTOTAL: subtotal.toFixed(2),
        SHIPPING_PRICE: order.shippingPrice.toFixed(2),
    };

    const pdfAttachment = {
    content: pdfBuffer,  // ✅ base64 string
    name: `invoice-${order._id}.pdf`,
  };

    try {
        // --- VVVVVV  THIS IS THE CORRECTED PART  VVVVVV ---
        const userEmailPayload = {
            subject: `Your Order Confirmation (#${order._id.toString()})`,
            templateId: userTemplateId,
            to: [{ email: user.email, name: user.name }],
            sender: { email: senderEmail, name: senderName },
            params: { ...commonParams, FIRSTNAME: user.name.split(" ")[0] },
            attachment: [pdfAttachment],
        };
console.log("User email payload:", userEmailPayload);
        console.log("Sending email to user...");
        await apiInstance.sendTransacEmail(userEmailPayload);
        console.log(`✅ Order confirmation email sent successfully to ${user.email}`);

        const adminEmailPayload = {
            subject: `🎉 New Order Alert! (#${order._id.toString()})`,
            templateId: adminTemplateId,
            to: [{ email: adminEmail }],
            sender: { email: senderEmail, name: senderName },
            params: { ...commonParams, CUSTOMER_NAME: user.name, CUSTOMER_EMAIL: user.email },
            attachment: [pdfAttachment],
        };
        // --- ^^^^^^  THIS IS THE CORRECTED PART  ^^^^^^ ---

        console.log("Sending email to admin...");
        await apiInstance.sendTransacEmail(adminEmailPayload);
        console.log(`✅ New order notification sent successfully to admin at ${adminEmail}`);

    } catch (error) {
        console.error('❌ Error sending order confirmation emails:', error.body ? error.body.message : error.message);
        throw error;
    }
};

module.exports = {
    sendWelcomeEmail,
    sendOTPEmail,
    sendContactUsEmail,
    sendOrderConfirmationEmail,
};