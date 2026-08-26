import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { Invoice } from '@/types';
import { generateInvoicePDFBuffer } from '@/lib/pdf';
import { GABY_DETAILS, formatCurrency, formatDate } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const invoice: Invoice = await request.json();

    const outlookEmail = process.env.OUTLOOK_EMAIL || 'gabydeluca.nursing@outlook.com';
    const outlookPassword = process.env.OUTLOOK_APP_PASSWORD;

    if (!outlookPassword) {
      return NextResponse.json(
        {
          error:
            'OUTLOOK_APP_PASSWORD is not set in environment variables. Please add it to your .env.local on Vercel.',
        },
        { status: 400 }
      );
    }

    // 1. Generate PDF Buffer
    const pdfBuffer = generateInvoicePDFBuffer(invoice);

    // 2. Format email body
    const appointmentsList = invoice.appointments
      .map((a) => {
        const ref = a.patientReference || a.patientInitials;
        const patientStr =
          ref && ref !== 'N/A'
            ? `Ref: ${ref} | `
            : '';
        return `  ${formatDate(a.date)} | ${patientStr}${a.appointmentType} | ${formatCurrency(a.cost)}`;
      })
      .join('\n');

    const bodyText = `Hi there,

I hope you're well!

Please find attached my PDF invoice ${invoice.invoiceNumber} for nursing services provided during ${invoice.month}.

INVOICE SUMMARY:
───────────────────────────────────────
Invoice Number: ${invoice.invoiceNumber}
Issued: ${formatDate(invoice.issueDate)}
Due Date: ${formatDate(invoice.dueDate)}

SERVICES PROVIDED:
${appointmentsList}

───────────────────────────────────────
TOTAL DUE: ${formatCurrency(invoice.totalCost)}
───────────────────────────────────────

PAYMENT DETAILS:
Bank: Metro Bank
Account Name: Ms Gabriella De Luca
Account Number: 47050138
Sort Code: 23-05-80
Payment Reference: ${invoice.invoiceNumber}

If you have any queries regarding this invoice, please don't hesitate to reach out.

Warm regards,

Gabriella De Luca
Plastic Surgery Nurse
BSE Hons | Tissue Viability Specialist
NMC Pin: 16I0383E
Tel: 07713 031388
Email: gabydeluca.nursing@outlook.com`;

    // 3. Create SMTP Transporter for Outlook
    const transporter = nodemailer.createTransport({
      host: 'smtp-mail.outlook.com',
      port: 587,
      secure: false, // TLS
      auth: {
        user: outlookEmail,
        pass: outlookPassword,
      },
      tls: {
        ciphers: 'SSLv3',
      },
    });

    // 4. Send email directly / draft
    await transporter.sendMail({
      from: `Gabriella De Luca <${outlookEmail}>`,
      to: invoice.consultantEmail,
      subject: `Invoice ${invoice.invoiceNumber} - ${invoice.consultant} - Gabriella De Luca`,
      text: bodyText,
      attachments: [
        {
          filename: `Invoice_${invoice.invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    return NextResponse.json({
      success: true,
      message: `Invoice email with PDF attachment sent successfully to ${invoice.consultantEmail}!`,
    });
  } catch (error: any) {
    console.error('Error sending Outlook email draft:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to send email draft' },
      { status: 500 }
    );
  }
}
