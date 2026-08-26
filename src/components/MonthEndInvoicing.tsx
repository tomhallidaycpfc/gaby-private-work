'use client';

import { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Appointment, Invoice, EmailDraft } from '@/types';
import {
  CONSULTANT_EMAILS,
  GABY_DETAILS,
  formatCurrency,
  formatDate,
  generateInvoiceNumber,
  getPreviousMonth,
  getMonthRange,
} from '@/lib/utils';

interface MonthEndInvoicingProps {
  appointments: Appointment[];
  invoices: Invoice[];
  onInvoiceGenerated: () => void;
}

export default function MonthEndInvoicing({
  appointments,
  invoices,
  onInvoiceGenerated,
}: MonthEndInvoicingProps) {
  const [selectedMonth, setSelectedMonth] = useState(getPreviousMonth());
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [emailDraft, setEmailDraft] = useState<EmailDraft | null>(null);
  const [generatingInvoices, setGeneratingInvoices] = useState(false);
  const [sendingEmailFor, setSendingEmailFor] = useState<string | null>(null);

  function downloadPDF(invoice: Invoice) {
    const doc = new jsPDF();

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text('INVOICE', 14, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.text(GABY_DETAILS.name, 196, 20, { align: 'right' });
    doc.text(GABY_DETAILS.credentials, 196, 25, { align: 'right' });
    doc.text(`Pin: ${GABY_DETAILS.pinNumber}`, 196, 30, { align: 'right' });
    doc.text(`Tel: ${GABY_DETAILS.phone}`, 196, 35, { align: 'right' });
    doc.text(`Email: ${GABY_DETAILS.workEmail}`, 196, 40, { align: 'right' });

    doc.setDrawColor(200, 200, 200);
    doc.line(14, 45, 196, 45);

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

    const tableData = invoice.appointments.map((a) => [
      formatDate(a.date),
      a.consultant === 'David Ross' || a.patientInitials === 'N/A' ? '-' : a.patientInitials,
      a.appointmentType,
      formatCurrency(a.cost),
    ]);

    autoTable(doc, {
      startY: 82,
      head: [['Date', 'Patient Name', 'Service / Appointment Type', 'Amount']],
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

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL DUE: ${formatCurrency(invoice.totalCost)}`, 196, finalY, { align: 'right' });

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

    doc.save(`Invoice_${invoice.invoiceNumber}.pdf`);
  }

  async function handleTogglePaid(invoice: Invoice) {
    const newStatus = invoice.status === 'paid' ? 'sent' : 'paid';
    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        onInvoiceGenerated(); // Refresh invoices list
      } else {
        alert('Failed to update status');
      }
    } catch (error) {
      console.error('Error toggling payment status:', error);
      alert('Error updating payment status');
    }
  }
    setSendingEmailFor(invoice.invoiceNumber);
    try {
      const response = await fetch('/api/invoices/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoice),
      });

      const data = await response.json();
      if (response.ok) {
        alert(`✅ ${data.message}`);
      } else {
        alert(`⚠️ ${data.error}`);
      }
    } catch (error) {
      console.error('Error sending Outlook email:', error);
      alert('Failed to send email via Outlook.');
    } finally {
      setSendingEmailFor(null);
    }
  }

  // Get appointments for the selected month
  const monthAppointments = useMemo(() => {
    return appointments.filter((a) => a.date.startsWith(selectedMonth) && !a.invoiced);
  }, [appointments, selectedMonth]);

  // Group appointments by consultant
  const appointmentsByConsultant = useMemo(() => {
    const groups: Record<string, Appointment[]> = {};
    monthAppointments.forEach((a) => {
      if (!groups[a.consultant]) {
        groups[a.consultant] = [];
      }
      groups[a.consultant].push(a);
    });
    return groups;
  }, [monthAppointments]);

  // Generate invoices for the selected month
  async function handleGenerateInvoices() {
    if (!confirm(`Generate invoices for ${selectedMonth}?`)) return;

    setGeneratingInvoices(true);

    try {
      for (const [consultant, records] of Object.entries(appointmentsByConsultant)) {
        if (records.length === 0) continue;

        const totalCost = records.reduce((sum, a) => sum + a.cost, 0);

        const invoice: Invoice = {
          invoiceNumber: generateInvoiceNumber(selectedMonth),
          consultant: consultant as any,
          consultantEmail:
            CONSULTANT_EMAILS[consultant as keyof typeof CONSULTANT_EMAILS],
          month: selectedMonth,
          appointments: records,
          totalCost,
          issueDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
          status: 'draft',
        };

        const response = await fetch('/api/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invoice),
        });

        if (!response.ok) {
          throw new Error(`Failed to create invoice for ${consultant}`);
        }
      }

      alert('✅ Invoices generated successfully!');
      onInvoiceGenerated();
    } catch (error) {
      console.error('Error generating invoices:', error);
      alert('Error generating invoices');
    } finally {
      setGeneratingInvoices(false);
    }
  }

  // Create email draft
  function handleCreateEmailDraft(invoice: Invoice) {
    const appointmentsList = invoice.appointments
      .map((a) => {
        const patientStr = a.patientInitials && a.patientInitials !== 'N/A' ? `${a.patientInitials} | ` : '';
        return `  ${formatDate(a.date)} | ${patientStr}${a.appointmentType} | ${formatCurrency(a.cost)}`;
      })
      .join('\n');

    const subject = `Invoice ${invoice.invoiceNumber} - ${invoice.consultant} - Gaby De Luca`;

    const body = `Hi there,

I hope you're well! Please find detailed below the invoice for my services rendered in ${selectedMonth}.

═══════════════════════════════════════
INVOICE DETAILS
═══════════════════════════════════════

Invoice Number: ${invoice.invoiceNumber}
Issued: ${formatDate(invoice.issueDate)}
Due Date: ${formatDate(invoice.dueDate)}

───────────────────────────────────────
SERVICES PROVIDED
───────────────────────────────────────

Date        | Patient | Appointment Type | Cost
${appointmentsList}

───────────────────────────────────────
TOTAL: ${formatCurrency(invoice.totalCost)}
───────────────────────────────────────

Please arrange payment to:
Ms Gabriella De Luca
Metro Bank
Account: 47050138
Sort Code: 23-05-80

Please use the invoice number as your payment reference.

If you have any questions, please don't hesitate to get in touch.

Many thanks!

Best regards,
Gabriella De Luca
Plastic Surgery Nurse
BSE Hons | Tissue Viability Specialist
Pin: ${GABY_DETAILS.pinNumber}
Tel: ${GABY_DETAILS.phone}
Email: ${GABY_DETAILS.workEmail}`;

    setEmailDraft({
      type: 'invoice',
      consultant: invoice.consultant,
      consultantEmail: invoice.consultantEmail,
      month: selectedMonth,
      invoiceNumber: invoice.invoiceNumber,
      subject,
      body,
    });
  }

  // Create friendly payment chaser draft
  function handleCreateChaserDraft(invoice: Invoice) {
    const subject = `Payment Reminder: Invoice ${invoice.invoiceNumber} - ${invoice.consultant} - Gabriella De Luca`;

    const body = `Hi there,

I hope you're well!

This is a gentle reminder regarding invoice ${invoice.invoiceNumber} for services rendered in ${invoice.month}, which was issued on ${formatDate(invoice.issueDate)} and was due on ${formatDate(invoice.dueDate)}.

INVOICE DETAILS:
───────────────────────────────────────
Invoice Number: ${invoice.invoiceNumber}
Amount Outstanding: ${formatCurrency(invoice.totalCost)}
Due Date: ${formatDate(invoice.dueDate)}

If payment has already been sent, please disregard this note. Otherwise, I would appreciate it if you could arrange payment at your earliest convenience to:

Bank: Metro Bank
Account Name: Ms Gabriella De Luca
Account Number: 47050138
Sort Code: 23-05-80
Payment Reference: ${invoice.invoiceNumber}

Please let me know if you need another copy of the original PDF invoice re-sent or if you have any questions.

Many thanks for your support!

Warm regards,

Gabriella De Luca
Plastic Surgery Nurse
BSE Hons | Tissue Viability Specialist
NMC Pin: 16I0383E
Tel: 07713 031388
Email: gabydeluca.nursing@outlook.com`;

    setEmailDraft({
      type: 'chaser',
      consultant: invoice.consultant,
      consultantEmail: invoice.consultantEmail,
      month: invoice.month,
      invoiceNumber: invoice.invoiceNumber,
      subject,
      body,
    });
  }

  // Get invoices for selected month
  const monthInvoices = useMemo(() => {
    return invoices.filter((i) => i.month === selectedMonth);
  }, [invoices, selectedMonth]);

  const totalEarnings = useMemo(() => {
    return monthInvoices.reduce((sum, i) => sum + i.totalCost, 0);
  }, [monthInvoices]);

  return (
    <div className="space-y-6">
      {/* Month Selector */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Month-End Invoicing</h2>
        <p className="text-gray-600 mb-4">
          Generate and manage invoices for your work appointments
        </p>

        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Month to Invoice
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setSelectedInvoice(null);
                setEmailDraft(null);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={handleGenerateInvoices}
            disabled={generatingInvoices || monthAppointments.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-bold py-2 px-6 rounded-lg transition"
          >
            {generatingInvoices ? 'Generating...' : '🗂️ Generate Invoices'}
          </button>
        </div>

        {monthAppointments.length === 0 && monthInvoices.length === 0 && (
          <p className="text-gray-500 mt-4">
            No uninvoiced appointments for {selectedMonth}
          </p>
        )}
      </div>

      {/* Summary */}
      {monthInvoices.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded p-4">
              <p className="text-sm text-gray-600">Invoices Generated</p>
              <p className="text-3xl font-bold text-blue-600">{monthInvoices.length}</p>
            </div>
            <div className="bg-green-50 rounded p-4">
              <p className="text-sm text-gray-600">Total to Invoice</p>
              <p className="text-3xl font-bold text-green-600">{formatCurrency(totalEarnings)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Invoices List */}
      {monthInvoices.length > 0 && (
        <div className="space-y-4">
          {monthInvoices.map((invoice) => (
            <div key={invoice.id} className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{invoice.consultant}</h3>
                  <p className="text-sm text-gray-500">{invoice.invoiceNumber}</p>
                  <p className="text-sm text-gray-500">{invoice.consultantEmail}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-indigo-600">
                    {formatCurrency(invoice.totalCost)}
                  </p>
                  <button
                    onClick={() => handleTogglePaid(invoice)}
                    className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold transition shadow-sm ${
                      invoice.status === 'paid'
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : invoice.status === 'sent'
                        ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                        : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                    }`}
                  >
                    {invoice.status === 'paid'
                      ? '✓ Paid (Click to unmark)'
                      : invoice.status === 'sent'
                      ? '✉️ Sent (Click to mark Paid)'
                      : '📝 Draft (Click to mark Paid)'}
                  </button>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2 mb-4">
                {invoice.appointments.map((apt, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-gray-700">
                      {formatDate(apt.date)}
                      {apt.patientInitials && apt.patientInitials !== 'N/A' ? ` • ${apt.patientInitials}` : ''}
                      {` • ${apt.appointmentType}`}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(apt.cost)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedInvoice(invoice)}
                  className="flex-1 min-w-[120px] bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 rounded-lg transition text-sm"
                >
                  👁️ View Invoice
                </button>
                <button
                  onClick={() => downloadPDF(invoice)}
                  className="flex-1 min-w-[120px] bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-3 rounded-lg transition text-sm"
                >
                  📄 Download PDF
                </button>
                <button
                  onClick={() => handleSendOutlookEmail(invoice)}
                  disabled={sendingEmailFor === invoice.invoiceNumber}
                  className="flex-1 min-w-[160px] bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-2 px-3 rounded-lg transition text-sm"
                >
                  {sendingEmailFor === invoice.invoiceNumber
                    ? 'Sending PDF...'
                    : '✉️ Send via Outlook (w/ PDF)'}
                </button>
                <button
                  onClick={() => handleCreateChaserDraft(invoice)}
                  className="flex-1 min-w-[140px] bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-3 rounded-lg transition text-sm"
                >
                  🔔 Payment Reminder
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invoice Preview Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto p-8">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Invoice Preview</h3>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Invoice Content */}
            <div className="text-sm space-y-4 font-mono">
              <div>
                <p className="font-bold">{GABY_DETAILS.name}</p>
                <p>{GABY_DETAILS.credentials}</p>
                <p>Pin: {GABY_DETAILS.pinNumber}</p>
              </div>

              <div className="border-t pt-4">
                <p>
                  <strong>Invoice Number:</strong> {selectedInvoice.invoiceNumber}
                </p>
                <p>
                  <strong>To:</strong> {selectedInvoice.consultant}
                </p>
                <p>
                  <strong>Issue Date:</strong> {formatDate(selectedInvoice.issueDate)}
                </p>
              </div>

              <div className="border-t pt-4">
                {selectedInvoice.appointments.map((apt, idx) => (
                  <div key={idx} className="flex justify-between mb-2">
                    <span>
                      {formatDate(apt.date)}
                      {apt.patientInitials && apt.patientInitials !== 'N/A' ? ` - ${apt.patientInitials}` : ''}
                      {` - ${apt.appointmentType}`}
                    </span>
                    <span>{formatCurrency(apt.cost)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 flex justify-between font-bold">
                <span>TOTAL:</span>
                <span>{formatCurrency(selectedInvoice.totalCost)}</span>
              </div>

              <div className="border-t pt-4 text-xs">
                <p>
                  <strong>Bank Details:</strong>
                </p>
                <p>{GABY_DETAILS.bank.name}</p>
                <p>A/C: {GABY_DETAILS.bank.accountNumber}</p>
                <p>Sort: {GABY_DETAILS.bank.sortCode}</p>
                <p>
                  <strong>Reference:</strong> {selectedInvoice.invoiceNumber}
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedInvoice(null)}
              className="w-full mt-6 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-2 rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Email Draft Modal */}
      {emailDraft && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto p-8">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-2xl font-bold text-gray-900">Email Draft</h3>
              <button
                onClick={() => setEmailDraft(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-sm mb-4">
              <div>
                <p className="text-gray-600">To:</p>
                <p className="font-semibold">{emailDraft.consultantEmail}</p>
              </div>

              <div>
                <p className="text-gray-600">Subject:</p>
                <p className="font-semibold">{emailDraft.subject}</p>
              </div>

              <div className="border-t pt-4">
                <p className="text-gray-600 mb-2">Message:</p>
                <div className="bg-gray-50 p-4 rounded border border-gray-200 whitespace-pre-wrap text-xs max-h-40 overflow-y-auto">
                  {emailDraft.body}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  // Copy to clipboard
                  navigator.clipboard.writeText(emailDraft.body);
                  alert('Email draft copied to clipboard!');
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
              >
                📋 Copy Email
              </button>
              <button
                onClick={() => setEmailDraft(null)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-2 rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
