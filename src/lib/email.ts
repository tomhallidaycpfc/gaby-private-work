import nodemailer from 'nodemailer';
import { Resend } from 'resend';

interface SendEmailParams {
  toEmail: string;
  toName: string;
  subject: string;
  text: string;
  attachmentBuffer: Buffer;
  attachmentFilename: string;
}

// Sends an email with a PDF attachment via Brevo, falling back to Resend, then SMTP.
// Always BCCs Gaby's own Outlook address so she has a record of everything sent.
export async function sendEmailWithAttachment({
  toEmail,
  toName,
  subject,
  text,
  attachmentBuffer,
  attachmentFilename,
}: SendEmailParams): Promise<{ message: string }> {
  const outlookEmail = process.env.OUTLOOK_EMAIL || 'gabydeluca.nursing@outlook.com';
  const outlookPassword = process.env.OUTLOOK_APP_PASSWORD;
  const resendApiKey = process.env.RESEND_API_KEY;
  const brevoApiKey = process.env.BREVO_API_KEY || process.env.BREVO_KEY;

  // Option A: Brevo REST API (bypasses SMTP IP authorization restrictions)
  if (brevoApiKey) {
    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Gabriella De Luca', email: outlookEmail },
        to: [{ email: toEmail, name: toName }],
        replyTo: { email: outlookEmail, name: 'Gabriella De Luca' },
        bcc: [{ email: outlookEmail, name: 'Gabriella De Luca' }],
        subject,
        textContent: text,
        attachment: [{ name: attachmentFilename, content: attachmentBuffer.toString('base64') }],
      }),
    });

    const brevoData = await brevoRes.json();
    if (!brevoRes.ok) {
      throw new Error(brevoData.message || brevoData.error || 'Brevo API Error');
    }

    return { message: `sent successfully to ${toEmail}!` };
  }

  // Option B: Resend API
  if (resendApiKey) {
    const resend = new Resend(resendApiKey);

    const { error: resendError } = await resend.emails.send({
      from: 'Gabriella De Luca <onboarding@resend.dev>',
      to: [toEmail],
      bcc: [outlookEmail],
      replyTo: 'gabydeluca.nursing@outlook.com',
      subject,
      text,
      attachments: [{ filename: attachmentFilename, content: attachmentBuffer }],
    });

    if (resendError) {
      throw new Error(resendError.message);
    }

    return { message: `sent successfully to ${toEmail}!` };
  }

  // Option C: Fallback to SMTP Nodemailer
  if (!outlookPassword) {
    throw new Error('OUTLOOK_APP_PASSWORD (or RESEND_API_KEY) is not configured in Vercel.');
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
    to: toEmail,
    bcc: outlookEmail,
    subject,
    text,
    attachments: [
      {
        filename: attachmentFilename,
        content: attachmentBuffer,
        contentType: 'application/pdf',
      },
    ],
  });

  return { message: `sent successfully to ${toEmail}!` };
}
