import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const appointments = [
  ['2 September 2026', '09:00-18:00, less 30 min lunch', 8.5, 272],
  ['19 August 2026', '09:00-18:30, less 30 min lunch', 9, 288],
  ['22 July 2026', '09:00-17:00, less 90 min lunch', 6.5, 208],
  ['8 July 2026', '09:00-17:00, less 30 min lunch', 7.5, 240],
  ['24 June 2026', '09:00-17:00, less 30 min lunch', 7.5, 240],
  ['10 June 2026', '09:00-17:00, less 30 min lunch', 7.5, 240],
  ['13 May 2026', '09:00-13:00', 4, 128],
  ['29 April 2026', '09:00-15:30, less 30 min lunch', 6, 192],
  ['15 April 2026', '09:00-18:00, less 30 min lunch', 8.5, 272],
  ['1 April 2026', '09:00-17:00, less 30 min lunch', 7.5, 240],
  ['26 March 2026', '09:00-17:30, less 30 min lunch', 8, 256],
  ['18 March 2026', '09:00-17:00, less 30 min lunch', 7.5, 240],
  ['4 March 2026', '09:00-17:00, less 30 min lunch', 7.5, 240],
  ['18 February 2026', '09:00-17:00, less 30 min lunch', 7.5, 240],
  ['4 February 2026', '09:00-17:00, less 30 min lunch', 7.5, 240],
  ['21 January 2026', '09:00-18:00, less 30 min lunch', 8.5, 272],
  ['7 January 2026', '09:00-15:00, less 30 min lunch', 5.5, 176],
];

const totalHours = appointments.reduce((sum, [, , hours]) => sum + hours, 0);
const total = appointments.reduce((sum, [, , , amount]) => sum + amount, 0);
const doc = new jsPDF({ unit: 'mm', format: 'a4' });
const right = 196;

const addHeader = () => {
  doc.setTextColor(30, 58, 138);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('CONSOLIDATED INVOICE', 14, 20);
  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Gabriella De Luca', right, 20, { align: 'right' });
  doc.text('Plastic Surgery Nurse, BSE Hons', right, 25, { align: 'right' });
  doc.text('Pin: 92C1636E', right, 30, { align: 'right' });
  doc.text('Tel: 07780 683 833', right, 35, { align: 'right' });
  doc.text('Email: gabydeluca.nursing@outlook.com', right, 40, { align: 'right' });
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 45, right, 45);
};

addHeader();
doc.setTextColor(40, 40, 40);
doc.setFontSize(11);
doc.setFont('helvetica', 'bold');
doc.text('BILL TO:', 14, 55);
doc.setFont('helvetica', 'normal');
doc.text('David Ross', 14, 62);
doc.text('roz@plasticsurgeryw1.com', 14, 68);
doc.setFont('helvetica', 'bold');
doc.text('INVOICE DETAILS:', 120, 55);
doc.setFont('helvetica', 'normal');
doc.text('Invoice No: INV-2026-Backlog-787', 120, 62);
doc.text('Period: 2026 Backlog Work', 120, 68);
doc.text('Issue Date: 2 September 2026', 120, 74);
doc.text('Due Date: 2 October 2026', 120, 80);

autoTable(doc, {
  startY: 88,
  margin: { left: 14, right: 14 },
  head: [['Date', 'Service / Appointment Type', 'Hours', 'Amount']],
  body: appointments.map(([date, shift, hours, amount]) => [date, `Hourly Rate (£32/hour)\n(${shift})`, hours.toFixed(hours % 1 ? 1 : 0), `£${amount.toFixed(2)}`]),
  theme: 'striped',
  styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2.3, valign: 'middle' },
  headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold' },
  columnStyles: { 0: { cellWidth: 32 }, 1: { cellWidth: 104 }, 2: { cellWidth: 20, halign: 'right' }, 3: { cellWidth: 26, halign: 'right' } },
});

let finalY = doc.lastAutoTable.finalY + 8;
doc.setFontSize(11);
doc.setFont('helvetica', 'bold');
doc.text(`TOTAL HOURS: ${totalHours.toFixed(1)}`, 14, finalY);
doc.setFontSize(14);
doc.text(`TOTAL DUE: £${total.toFixed(2)}`, right, finalY, { align: 'right' });
const boxY = finalY + 9;
doc.setFillColor(243, 244, 246);
doc.rect(14, boxY, 182, 35, 'F');
doc.setFontSize(11);
doc.text('PAYMENT DETAILS', 20, boxY + 8);
doc.setFont('helvetica', 'normal');
doc.setFontSize(10);
doc.text('Bank: Metro Bank', 20, boxY + 15);
doc.text('Account Name: Ms Gabriella De Luca', 20, boxY + 21);
doc.text('Account No: 47050138    |    Sort Code: 23-05-80', 20, boxY + 27);
doc.text('Payment Reference: INV-2026-Backlog-787', 20, boxY + 33);

doc.save('C:/Users/gabyd/Downloads/Consolidated_Invoice_INV-2026-Backlog-787_with_hours.pdf');
console.log(`Created invoice: ${totalHours} hours, £${total.toFixed(2)}`);
