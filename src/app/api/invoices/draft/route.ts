import { NextRequest, NextResponse } from 'next/server';
import { Invoice } from '@/types';
import { generateInvoicePDFBuffer } from '@/lib/pdf';
import { supabase } from '@/lib/supabase';
import { sendEmailWithAttachment } from '@/lib/email';
import {
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

    const result = await sendEmailWithAttachment({
      toEmail: invoice.consultantEmail,
      toName: invoice.consultant,
      subject: subjectText,
      text: bodyText,
      attachmentBuffer: pdfBuffer,
      attachmentFilename: `Invoice_${invoice.invoiceNumber}.pdf`,
    });

    await clearCorrectionFlag(invoice.id);

    return NextResponse.json({
      success: true,
      message: `${isCorrection ? 'Corrected invoice' : 'Invoice'} email with PDF attachment ${result.message}`,
    });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}
