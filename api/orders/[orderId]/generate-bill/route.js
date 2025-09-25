import { NextResponse } from 'next/server';
import Order from '../../../../models/Order'; // Adjust path to your Order model
import User from '../../../../models/User';   // Adjust path to your User model
import dbConnect from '../../../../../lib/dbConnect'; // Adjust path to your DB connection
import { getHtmlForEBill } from '../../../../../lib/htmlForEBill'; // Adjust path
import puppeteer from 'puppeteer';

export async function GET(request, { params }) {
    const { orderId } = params;
    await dbConnect();

    try {
        // 1. Fetch the order and populate necessary details
        const order = await Order.findById(orderId).populate('user', 'email');
        if (!order) {
            return NextResponse.json({ message: 'Order not found.' }, { status: 404 });
        }

        // 2. Generate HTML for the e-bill using your template function
        const htmlContent = getHtmlForEBill(order);

        // 3. Generate PDF using Puppeteer
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();

        // 4. Return the PDF as a response
        // The headers are crucial for telling the browser to treat this as a file download.
        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Raamya-E-Bill-${order._id}.pdf"`,
            },
        });

    } catch (error) {
        console.error('Error generating e-bill PDF:', error);
        return NextResponse.json({ message: 'Server error while generating PDF.' }, { status: 500 });
    }
}