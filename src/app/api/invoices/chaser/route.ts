import { NextRequest, NextResponse } from 'next/server';
import { Invoice } from '@/types';
import { generateInvoicePDFBuffer } from '@/lib/pdf';
import { sendEmailWithAttachment } from '@/lib/email';
import { formatCurrency, formatDate } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const invoice: Invoice = await request.json();

    // Re-attach the original invoice PDF so the consultant has it to hand
    const pdfBuffer = generateInvoicePDFBuffer(invoice);

    const bodyText = `Hi there,

I hope you're keeping well! This is just a polite reminder regarding invoice ${invoice.invoiceNumber} for ${invoice.month}, issued on ${formatDate(invoice.issueDate)} with a due date of ${formatDate(invoice.dueDate)}, which appears to still be outstanding.

INVOICE SUMMARY:
───────────────────────────────────────
Invoice Number: ${invoice.invoiceNumber}
Issued: ${formatDate(invoice.issueDate)}
Due Date: ${formatDate(invoice.dueDate)}
Amount Outstanding: ${formatCurrency(invoice.totalCost)}
───────────────────────────────────────

I've attached the original invoice PDF again for your convenience. If payment has already been arranged, please disregard this message and accept my apologies for the reminder.

PAYMENT DETAILS:
Bank: Metro Bank
Account Name: Ms Gabriella De Luca
Account Number: 47050138
Sort Code: 23-05-80
Payment Reference: ${invoice.invoiceNumber}

Thank you so much for your time, and please don't hesitate to get in touch if you have any questions.

Warm regards,

Gabriella De Luca
Plastic Surgery Nurse
BSE Hons | Tissue Viability Specialist
NMC Pin: 16I0383E
Tel: 07713 031388
Email: gabydeluca.nursing@outlook.com`;

    const subjectText = `Payment Reminder: Invoice ${invoice.invoiceNumber} - Gabriella De Luca`;

    const result = await sendEmailWithAttachment({
      toEmail: invoice.consultantEmail,
      toName: invoice.consultant,
      subject: subjectText,
      text: bodyText,
      attachmentBuffer: pdfBuffer,
      attachmentFilename: `Invoice_${invoice.invoiceNumber}.pdf`,
    });

    return NextResponse.json({
      success: true,
      message: `Payment reminder with the original invoice PDF ${result.message}`,
    });
  } catch (error: any) {
    console.error('Error sending payment reminder:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to send payment reminder' },
      { status: 500 }
    );
  }
}
