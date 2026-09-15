import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { Invoice } from '@/types';
import { generateInvoicePDFBuffer } from '@/lib/pdf';
import { supabase } from '@/lib/supabase';
import {
  GABY_DETAILS,
  formatCurrency,
  formatDate,
  getInvoiceableHoursTotal,
} from '@/lib/utils';

async function clearCorrectionFlag(invoiceId?: string) {
  if (!invoiceId) return;
  await supabase.from('invoices').update({ corrected_at: null }).eq('id', invoiceId);
}

export async function POST(request: NextRequest) {
  try {
    const { isCorrection, ...invoice } = (await request.json()) as Invoice & {
      isCorrection?: boolean;
    };

    const outlookEmail = process.env.OUTLOOK_EMAIL || 'gabydeluca.nursing@outlook.com';
    const outlookPassword = process.env.OUTLOOK_APP_PASSWORD;
    const resendApiKey = process.env.RESEND_API_KEY;
    const brevoApiKey = process.env.BREVO_API_KEY || process.env.BREVO_KEY;

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
    const totalHours = invoice.consultant === 'David Ross'
      ? getInvoiceableHoursTotal(invoice.appointments)
      : undefined;

    const introText = isCorrection
      ? `Hi there,

I'm so sorry for the inconvenience - I found an error in my records affecting invoice ${invoice.invoiceNumber} for ${invoice.month}. I have corrected this, and this replaces the previous version I sent you. Please disregard the earlier invoice and only rely on the corrected details below.

Please find attached my corrected PDF invoice ${invoice.invoiceNumber} for nursing services provided during ${invoice.month}.`
      : `Hi there,

I hope you're well!

Please find attached my PDF invoice ${invoice.invoiceNumber} for nursing services provided during ${invoice.month}.`;

    const bodyText = `${introText}

INVOICE SUMMARY:
───────────────────────────────────────
Invoice Number: ${invoice.invoiceNumber}
Issued: ${formatDate(invoice.issueDate)}
Due Date: ${formatDate(invoice.dueDate)}

SERVICES PROVIDED:
${appointmentsList}

───────────────────────────────────────
 ${totalHours !== undefined ? `TOTAL HOURS: ${totalHours}\n` : ''}TOTAL DUE: ${formatCurrency(invoice.totalCost)}
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

    const subjectText = isCorrection
      ? `Corrected Invoice ${invoice.invoiceNumber} - ${invoice.consultant} - Gabriella De Luca`
      : `Invoice ${invoice.invoiceNumber} - ${invoice.consultant} - Gabriella De Luca`;

    // Option A: Brevo REST API (Bypasses SMTP IP authorization restrictions)
    if (brevoApiKey) {
      const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: 'Gabriella De Luca',
            email: outlookEmail,
          },
          to: [
            {
              email: invoice.consultantEmail,
              name: invoice.consultant,
            },
          ],
          replyTo: {
            email: outlookEmail,
            name: 'Gabriella De Luca',
          },
          bcc: [
            {
              email: outlookEmail,
              name: 'Gabriella De Luca',
            },
          ],
          subject: subjectText,
          textContent: bodyText,
          attachment: [
            {
              name: `Invoice_${invoice.invoiceNumber}.pdf`,
              content: pdfBuffer.toString('base64'),
            },
          ],
        }),
      });

      const brevoData = await brevoRes.json();

      if (!brevoRes.ok) {
        throw new Error(brevoData.message || brevoData.error || 'Brevo API Error');
      }

      await clearCorrectionFlag(invoice.id);

      return NextResponse.json({
        success: true,
        message: `${isCorrection ? 'Corrected invoice' : 'Invoice'} email with PDF attachment sent successfully to ${invoice.consultantEmail}!`,
      });
    }

    // Option B: Use Resend API
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);

      const { data, error: resendError } = await resend.emails.send({
        from: 'Gabriella De Luca <onboarding@resend.dev>',
        to: [invoice.consultantEmail],
        bcc: [outlookEmail],
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

      await clearCorrectionFlag(invoice.id);

      return NextResponse.json({
        success: true,
        message: `${isCorrection ? 'Corrected invoice' : 'Invoice'} email with PDF attachment sent successfully to ${invoice.consultantEmail}!`,
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
      bcc: outlookEmail,
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

    await clearCorrectionFlag(invoice.id);

    return NextResponse.json({
      success: true,
      message: `${isCorrection ? 'Corrected invoice' : 'Invoice'} email with PDF attachment sent successfully to ${invoice.consultantEmail}!`,
    });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}
