import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { Invoice } from '@/types';
import { generateInvoicePDFBuffer } from '@/lib/pdf';
import { GABY_DETAILS, formatCurrency, formatDate } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const invoice: Invoice = await request.json();

    const outlookEmail = process.env.OUTLOOK_EMAIL || 'gabydeluca.nursing@outlook.com';
    const outlookPassword = process.env.OUTLOOK_APP_PASSWORD;
    const resendApiKey = process.env.RESEND_API_KEY;

    // 1. Generate PDF Buffer
    const pdfBuffer = generateInvoicePDFBuffer(invoice);

    // 2. Format email body
    const appointmentsList = invoice.appointments
      .map((a) => {
        const ref = a.patientReference || a.patientInitials;
        const patientStr = ref && ref !== 'N/A' ? `Ref: ${ref} | ` : '';
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

    const subjectText = `Invoice ${invoice.invoiceNumber} - ${invoice.consultant} - Gabriella De Luca`;

    // 3. Option A: Use Resend API if RESEND_API_KEY is configured (Bypasses Outlook SMTP restrictions)
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);

      const { data, error: resendError } = await resend.emails.send({
        from: 'Gabriella De Luca <onboarding@resend.dev>',
        to: [invoice.consultantEmail],
        replyTo: 'gabydeluca.nursing@outlook.com',
        subject: subjectText,
        text: bodyText,
        attachments: [
          {
            filename: `Invoice_${invoice.invoiceNumber}.pdf`,
            content: pdfBuffer,
          },
        ],
      });

      if (resendError) {
        throw new Error(resendError.message);
      }

      return NextResponse.json({
        success: true,
        message: `Invoice email with PDF attachment sent successfully to ${invoice.consultantEmail}!`,
      });
    }

    // 4. Option B: Fallback to SMTP Nodemailer
    if (!outlookPassword) {
      return NextResponse.json(
        {
          error:
            'OUTLOOK_APP_PASSWORD (or RESEND_API_KEY) is not configured in Vercel.',
        },
        { status: 400 }
      );
    }

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
        rejectUnauthorized: false,
      },
    });

    await transporter.sendMail({
      from: `Gabriella De Luca <${outlookEmail}>`,
      to: invoice.consultantEmail,
      subject: subjectText,
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
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}
