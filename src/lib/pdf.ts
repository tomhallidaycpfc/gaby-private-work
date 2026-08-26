import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice } from '@/types';
import { GABY_DETAILS, formatCurrency, formatDate } from '@/lib/utils';

export function generateInvoicePDFBuffer(invoice: Invoice): Buffer {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138); // Dark Indigo
  doc.text('INVOICE', 14, 20);

  // Gaby's Info (Right aligned)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text(GABY_DETAILS.name, 196, 20, { align: 'right' });
  doc.text(GABY_DETAILS.credentials, 196, 25, { align: 'right' });
  doc.text(`Pin: ${GABY_DETAILS.pinNumber}`, 196, 30, { align: 'right' });
  doc.text(`Tel: ${GABY_DETAILS.phone}`, 196, 35, { align: 'right' });
  doc.text(`Email: ${GABY_DETAILS.workEmail}`, 196, 40, { align: 'right' });

  // Divider line
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 45, 196, 45);

  // Invoice & Bill To Info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO:', 14, 55);

  doc.setFont('helvetica', 'normal');
  doc.text(invoice.consultant, 14, 62);
  doc.text(invoice.consultantEmail, 14, 68);

  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE DETAILS:', 120, 55);

  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice No: ${invoice.invoiceNumber}`, 120, 62);
  doc.text(`Issue Date: ${formatDate(invoice.issueDate)}`, 120, 68);
  doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, 120, 74);

  // Table of Services
  const tableData = invoice.appointments.map((a) => {
    const ref = a.patientReference || a.patientInitials;
    return [
      formatDate(a.date),
      a.consultant === 'David Ross' || !ref || ref === 'N/A' ? '-' : ref,
      a.appointmentType,
      formatCurrency(a.cost),
    ];
  });

  autoTable(doc, {
    startY: 82,
    head: [['Date', 'Patient Ref', 'Service / Appointment Type', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 45 },
      2: { cellWidth: 80 },
      3: { cellWidth: 35, halign: 'right' },
    },
  });

  // Total
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL DUE: ${formatCurrency(invoice.totalCost)}`, 196, finalY, { align: 'right' });

  // Payment Info Box
  const boxY = finalY + 15;
  doc.setFillColor(243, 244, 246);
  doc.rect(14, boxY, 182, 35, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT DETAILS', 20, boxY + 8);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Bank: ${GABY_DETAILS.bank.name}`, 20, boxY + 15);
  doc.text(`Account Name: Ms Gabriella De Luca`, 20, boxY + 21);
  doc.text(`Account No: ${GABY_DETAILS.bank.accountNumber}    |    Sort Code: ${GABY_DETAILS.bank.sortCode}`, 20, boxY + 27);
  doc.text(`Payment Reference: ${invoice.invoiceNumber}`, 20, boxY + 33);

  // Output Buffer
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
