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


const sendExchangeRequestEmail = async ({ userEmail, userName, orderNumber, reason, imageUrls }) => {
    const apiInstance = getBrevoApiInstance();

    // --- Get email config from .env ---
    const adminEmail = process.env.ADMIN_EMAIL;
    const userTemplateId = Number(process.env.TEMPLATE_ID_EXCHANGE_USER);
    const adminTemplateId = Number(process.env.TEMPLATE_ID_EXCHANGE_ADMIN);
    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'raamya.2312@gmail.com';
    const senderName = process.env.BREVO_SENDER_NAME || 'Raamya';

    if (!adminEmail || !userTemplateId || !adminTemplateId) {
        console.error('Error: Missing exchange email environment variables (ADMIN_EMAIL, TEMPLATE_ID_EXCHANGE_USER, TEMPLATE_ID_EXCHANGE_ADMIN).');
        return; // Exit silently
    }

    const commonParams = {
        ORDER_NUMBER: orderNumber,
        REASON: reason,
        IMAGE_URLS: imageUrls, // Pass the array of image URLs to the template
    };

    // --- 1. Payload for the User Confirmation Email ---
    const userPayload = {
        subject: `Exchange Request Received for Order #${orderNumber}`,
        to: [{ email: userEmail, name: userName }],
        sender: { email: senderEmail, name: senderName },
        templateId: userTemplateId,
        params: {
            ...commonParams,
            FIRSTNAME: userName.split(' ')[0],
        },
    };

    // --- 2. Payload for the Admin Notification Email ---
    const adminPayload = {
        subject: `New Exchange Request for Order #${orderNumber}`,
        to: [{ email: adminEmail }],
        sender: { email: senderEmail, name: senderName },
        templateId: adminTemplateId,
        params: {
            ...commonParams,
            CUSTOMER_NAME: userName,
            CUSTOMER_EMAIL: userEmail,
        },
    };

    try {
        await apiInstance.sendTransacEmail(userPayload);
        console.log(`✅ Exchange confirmation email sent to ${userEmail}`);
        await apiInstance.sendTransacEmail(adminPayload);
        console.log(`✅ Exchange notification sent to admin at ${adminEmail}`);
    } catch (error) {
        console.error(`❌ Error sending exchange request emails:`, error.body ? error.body.message : error.message);
        // We don't throw here, as the main request succeeded. We just log the error.
    }
};


const sendExchangeStatusUpdateEmail = async ({ userEmail, userName, orderNumber, status }) => {
    const apiInstance = getBrevoApiInstance();

    // --- Get email config from .env ---
    const templateId = Number(process.env.TEMPLATE_ID_EXCHANGE_STATUS_UPDATE);
    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'raamya.2312@gmail.com';
    const senderName = process.env.BREVO_SENDER_NAME || 'Raamya';

    if (!templateId) {
        console.error('Error: Missing TEMPLATE_ID_EXCHANGE_STATUS_UPDATE environment variable.');
        return; // Exit silently
    }
    
    const payload = {
        subject: `Update on your Exchange Request for Order #${orderNumber}`,
        to: [{ email: userEmail, name: userName }],
        sender: { email: senderEmail, name: senderName },
        templateId: templateId,
        params: {
            FIRSTNAME: userName.split(' ')[0],
            ORDER_NUMBER: orderNumber,
            STATUS: status, // Pass the status to the template
        },
    };

    try {
        await apiInstance.sendTransacEmail(payload);
        console.log(`✅ Exchange status update ('${status}') email sent to ${userEmail}`);
    } catch (error) {
        console.error(`❌ Error sending exchange status update email:`, error.body ? error.body.message : error.message);
        // We don't throw, just log the error.
    }
};


const sendOrderCancellationEmail = async ({ user, order }) => {
    const apiInstance = getBrevoApiInstance();

    const userTemplateId = Number(process.env.TEMPLATE_ID_CANCEL_USER);
    const adminTemplateId = Number(process.env.TEMPLATE_ID_CANCEL_ADMIN);
    const adminEmail = process.env.ADMIN_EMAIL;
    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'raamya.2312@gmail.com';
    const senderName = process.env.BREVO_SENDER_NAME || 'Raamya';

    if (!userTemplateId || !adminTemplateId || !adminEmail) {
        console.error('Error: Missing order cancellation email environment variables.');
        return; // Exit silently
    }

    const commonParams = {
        ORDER_ID: order._id.toString(),
        ORDER_DATE: order.createdAt.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
        CANCEL_DATE: order.cancelledAt.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
        REASON: order.cancellationReason.reason,
        TOTAL_PRICE: order.totalPrice.toFixed(2),
    };

    const userPayload = {
        subject: `Your Order #${order._id.toString()} has been cancelled`,
        templateId: userTemplateId,
        to: [{ email: user.email, name: user.name }],
        sender: { email: senderEmail, name: senderName },
        params: { ...commonParams, FIRSTNAME: user.name.split(" ")[0] },
    };

    const adminPayload = {
        subject: `Order Cancellation Alert: #${order._id.toString()}`,
        templateId: adminTemplateId,
        to: [{ email: adminEmail }],
        sender: { email: senderEmail, name: senderName },
        params: { ...commonParams, CUSTOMER_NAME: user.name, CUSTOMER_EMAIL: user.email },
    };

    try {
        await apiInstance.sendTransacEmail(userPayload);
        console.log(`✅ Order cancellation email sent successfully to ${user.email}`);

        await apiInstance.sendTransacEmail(adminPayload);
        console.log(`✅ Order cancellation notification sent successfully to admin at ${adminEmail}`);
    } catch (error) {
        console.error('❌ Error sending order cancellation emails:', error.body ? error.body.message : error.message);
        throw error; // Re-throw to be caught by the controller
    }
};

function getBrevoContactsApiInstance() {
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;
    return new SibApiV3Sdk.ContactsApi();
}
async function addContactToBrevoList({ email }) {
    const apiInstance = getBrevoContactsApiInstance();
    const listId = Number(process.env.BREVO_LIST_ID_SUBSCRIBERS);

    if (!listId) {
        console.error('CRITICAL: BREVO_LIST_ID_SUBSCRIBERS is not set in .env. Cannot add contact to list.');
        throw new Error('Server configuration error: Missing Brevo list ID.');
    }

    const createContact = new SibApiV3Sdk.CreateContact();
    createContact.email = email;
    createContact.listIds = [listId];
    createContact.updateEnabled = true;

    try {
        await apiInstance.createContact(createContact);
        console.log(`Successfully added/updated contact ${email} in Brevo list ID ${listId}.`);
    } catch (error) {
        console.error(`Failed to add contact ${email} to Brevo.`, error.body ? error.body.message : error.message);
        throw error;
    }
};

/**
 * Sends a subscription confirmation email and adds the contact to the list.
 */
async function sendSubscriptionConfirmationEmail({ email }) {
    await addContactToBrevoList({ email });

    const apiInstance = getBrevoApiInstance();
    const templateId = Number(process.env.TEMPLATE_ID_SUBSCRIBE_CONFIRMATION);
    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'no-reply@yourdomain.com';
    const senderName = process.env.BREVO_SENDER_NAME || 'Raamya';

    if (!templateId) {
        console.error('Error: TEMPLATE_ID_SUBSCRIBE_CONFIRMATION is not set in .env.');
        return;
    }

    const payload = {
        subject: 'Subscription Confirmed!',
        to: [{ email }],
        sender: { email: senderEmail, name: senderName },
        templateId,
    };

    try {
        await apiInstance.sendTransacEmail(payload);
        console.log(`Subscription confirmation email sent to ${email}`);
    } catch (error) {
        console.error(`Error sending subscription confirmation email:`, error.body ? error.body.message : error.message);
    }
};

module.exports = {
    sendWelcomeEmail,
    sendOTPEmail,
    sendContactUsEmail,
    sendOrderConfirmationEmail,
    sendExchangeRequestEmail,
    sendExchangeStatusUpdateEmail,
    sendOrderCancellationEmail,
    sendSubscriptionConfirmationEmail,
};