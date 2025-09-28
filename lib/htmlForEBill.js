// lib/htmlForEBill.js

const getHtmlForEBill = (order) => {
    // Helper to format date
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: 'Asia/Kolkata', // Also good to be explicit here
        });
    };

    const formatTime = (dateString) => {
        return new Date(dateString).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true, // AM/PM format
            timeZone: 'Asia/Kolkata' // Ensures time is in IST
        });
    };

    // Safely get user email or provide a fallback
    const userEmail = order.user?.email || 'N/A';
    const customerFullName = order.shippingAddress.fullName || 'Customer';

    // Helper to generate the list of items
    const itemsHtml = order.orderItems.map((item, index) => `
        <tr class="item">
            <td>${index + 1}</td>
            <td>${item.name}</td>
            <td>${item._id}</td>
            <td>${item.sku || 'N/A'}</td>
            <td>${item.size || 'N/A'}</td> 
            <td>₹${(item.price || 0).toLocaleString()}</td>
            <td>${item.qty}</td>
            <td>₹${((item.price || 0) * item.qty).toLocaleString()}</td>
        </tr>
    `).join('');

    const subtotal = order.orderItems.reduce(
        (acc, item) => acc + (item.price || 0) * (item.qty || 0),
        0
    );
    // Optional discount row
    const discountHtml = (order.discountPrice && order.discountPrice > 0) ? `
        <p>Discounts: <span style="float: right;">Rs ${order.discountPrice.toLocaleString()}</span></p>
    ` : '';

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Order E-Bill - ${order._id}</title>
        <style>
            body { font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333; background-color: #fff; }
            .invoice-box { max-width: 800px; margin: 25px 20px; padding: 0; border: 1px solid black; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); font-size: 12px; }
            
            .header-grid { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid #eee; }
            .header-logo { padding: 25px 20px; text-align: left; }
            .header-logo img { max-width: 150px; height: auto; } /* Adjust size as needed */
            .header-title { padding: 10px 20px; text-align: right; }
            .header-title h1 { font-size: 20px; margin: 0; padding-bottom: 5px; }
            .header-title p { margin: 0; font-size: 12px; color: #555; }

            .greeting-section { padding: 20px; border-bottom: 1px solid #eee; }
            .greeting-section p { margin-bottom: 10px; }

            .order-details-summary { display: grid; grid-template-columns: 1fr 1fr; padding: 20px; border-bottom: 1px solid #eee; }
            .order-details-summary div:last-child { text-align: right; }
            .order-details-summary strong { display: block; margin-bottom: 5px; }
            .order-details-summary span { display: block; font-size: 13px; }
            .payment-method-box { border: 1px solid #ccc; padding: 8px 15px; display: inline-block; margin-top: 10px; font-weight: bold; }

            .customer-shipping-details { padding: 20px; border-bottom: 1px solid #eee;   }
            .customer-shipping-details h2 { text-align: center; text-transform: uppercase; margin-bottom: 15px; font-size: 16px; color: #333; }
            
            .address-box { border: 1px solid #ccc; padding: 15px; border-radius: 5px; display: flex;   justify-content: space-between; }
            .address-box strong { display: block; margin-bottom: 5px; font-size: 13px; }
            .address-box p { margin: 0; line-height: 1.4; font-size: 12px; color: #666; }

            .order-summary-table-section { padding: 20px; border-bottom: 1px solid #eee; }
            .order-summary-table-section h2 { text-align: center; text-transform: uppercase; margin-bottom: 15px; font-size: 16px; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            table th, table td { padding: 8px; text-align: left; border: 1px solid #ddd; }
            table th { background-color: #f2f2f2; font-weight: bold; font-size: 12px; }
            table tr.item td { font-size: 11px; color: #444; }

            .subtotals-section { padding: 20px; }
            .subtotals-section h2 { font-size: 16px; margin-bottom: 15px; color: #333; }
            .subtotals-section p { margin: 5px 0; font-size: 13px; }
            .subtotals-section span { float: right; font-weight: bold; }
            .grand-total { font-size: 1.3em; font-weight: bold; color: #000; margin-top: 15px; padding-top: 10px; border-top: 1px solid #eee; }
            .subtotals-section .payment-method-info { margin-top: 15px; font-size: 13px; }

            .footer-section { background-color: #f2f2f2; padding: 10px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #eee; }
            .footer-section p { margin: 2px; }
            .footer-section strong { display: block; margin-bottom: 0; }
            .footer-section a { color: #007bff; text-decoration: none; }
            .footer-section a:hover { text-decoration: underline; }
        </style>
    </head>
    <body>
        <div class="invoice-box">
            <div class="header-grid">
                <div class="header-logo">
                    <img src="https://res.cloudinary.com/daby6uvkv/image/upload/v1758789500/logo_e8w8xc.png" alt="RAAMYA Logo">
                </div>
                <div class="header-title">
                    <h1>Raamya</h1>
                    <p>Document Title : Order Confirmation</p>
                    <div style="display: flex; gap:5px;  justify-content:flex-end;">
                    <strong>Receipt ID:</strong> <span>${order.receiptNumber}</span>
                    </div>
                </div>
            </div>

            <div class="greeting-section">
                <p>Hello ${customerFullName},</p>
                <p>Thank you for choosing RAAMYA!💖 We're thrilled to have you as part of our fashion family and hope you love your new items. Your support means the world to us, and we look forward to serving you again soon.</p>
            </div>

            <div class="order-details-summary">
                <div>
                <div style="display: flex; gap:5px;">
                    <strong>Order ID:</strong> <span>${order._id}</span>
                </div>
                <div style="display: flex; gap:5px;">
                    <strong>Date:</strong> <span>${formatDate(order.createdAt)}</span>
                </div>
                <div style="display: flex; gap:5px;">
                    <strong>Time:</strong> <span>${formatTime(order.createdAt)}</span>
                </div>
                    
                </div>
                <div>
                    <div class="payment-method-box">Payment Method: ${order.paymentMethod}</div>
                </div>
            </div>

            <div class="customer-shipping-details">
                <h2>Customer & Shipping Details</h2>
                <div class="address-grid">
                    <div class="address-box billing">
                    <div>
                        <strong>Billing Address</strong>
                        <p>${order.shippingAddress.address}</p>
                        <p>${order.shippingAddress.city} - ${order.shippingAddress.postalCode}</p>
                        <p>${order.shippingAddress.country}</p>
                        </div>
                        <div>
                        <strong>Contact Information</strong>
                        <p>( ${order.shippingAddress.phone}, ${userEmail} )</p>
                        </div>
                        
                    </div>
                    
                </div>
            </div>

            <div class="order-summary-table-section">
                <h2>Order Summary</h2>
                <table>
                    <thead>
                        <tr class="heading">
                            <th>S.No</th>
                            <th>Product Name</th>
                            <th>Product ID</th>
                            <th>SKU</th>
                            <th>Size</th>
                            <th>Unit Price</th>
                            <th>Qty</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
            </div>

            <div class="subtotals-section">
                <h2>SUBTOTALS SECTION</h2>
                <p>Subtotal: <span style="float: right;">Rs ${subtotal.toLocaleString()}</span></p>
                <p style="font-size:10px">Including Gst</p>

                <p>Shipping: <span style="float: right;">Rs ${(order.shippingPrice || 0).toLocaleString()}</span></p>
                ${discountHtml}
                <p class="grand-total">GRAND TOTAL: <span style="float: right;">Rs ${(order.totalPrice || 0).toLocaleString()}</span></p>
                <p class="payment-method-info">Payment Method: ${order.paymentMethod}</p>
            </div>

            <div class="footer-section">
                <strong>Contact Us:</strong>
                <p>+91 89505 66899, <a href="mailto:support@raamya.net.in">support@raamya.net.in</a>, <a href="https://www.raamya.net.in" target="_blank">www.raamya.net.in</a></p>
                <strong>Need To Exchange your order:</strong>
                <p><a href="https://www.raamya.net.in/exchangemyorder" target="_blank">https://www.raamya.net.in/exchangemyorder</a>, <a href="https://www.raamya.net.in/exchange-policy" target="_blank">https://www.raamya.net.in/exchange-policy</a></p>
                <p>Thank you for choosing Raamya</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

module.exports = { getHtmlForEBill };