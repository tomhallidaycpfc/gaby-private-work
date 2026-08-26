'use client';

import { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Appointment, Invoice } from '@/types';
import {
  CONSULTANTS,
  CONSULTANT_EMAILS,
  GABY_DETAILS,
  formatCurrency,
  formatDate,
  generateInvoiceNumber,
} from '@/lib/utils';

interface ConsolidatedInvoicingProps {
  appointments: Appointment[];
  invoices: Invoice[];
  onInvoiceGenerated: () => void;
}

export default function ConsolidatedInvoicing({
  appointments,
  invoices,
  onInvoiceGenerated,
}: ConsolidatedInvoicingProps) {
  const [selectedConsultant, setSelectedConsultant] = useState<string>('Victoria Rose');
  const [selectedAptIds, setSelectedAptIds] = useState<string[]>([]);
  const [invoiceTitle, setInvoiceTitle] = useState('2026 Backlog Work');
  const [generating, setGenerating] = useState(false);
  const [sendingEmailFor, setSendingEmailFor] = useState<string | null>(null);
  const [confirmSendInvoice, setConfirmSendInvoice] = useState<Invoice | null>(null);
  const [previewInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Get ALL uninvoiced appointments for the selected consultant across ANY month
  const uninvoicedApts = useMemo(() => {
    return appointments.filter(
      (a) => a.consultant === selectedConsultant && !a.invoiced
    );
  }, [appointments, selectedConsultant]);

  // Keep track of selected appointments
  const selectedApts = useMemo(() => {
    if (selectedAptIds.length === 0) return uninvoicedApts;
    return uninvoicedApts.filter((a) => a.id && selectedAptIds.includes(a.id));
  }, [uninvoicedApts, selectedAptIds]);

  const totalCost = useMemo(() => {
    return selectedApts.reduce((sum, a) => sum + a.cost, 0);
  }, [selectedApts]);

  // Existing consolidated invoices for this consultant
  const consolidatedInvoices = useMemo(() => {
    return invoices.filter(
      (i) => i.consultant === selectedConsultant && i.month.includes('Backlog')
    );
  }, [invoices, selectedConsultant]);

  function handleSelectAll() {
    setSelectedAptIds(uninvoicedApts.map((a) => a.id!).filter(Boolean));
  }

  function handleDeselectAll() {
    setSelectedAptIds([]);
  }

  function handleToggleApt(id: string) {
    setSelectedAptIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  async function handleGenerateConsolidatedInvoice() {
    if (selectedApts.length === 0) {
      alert('Please select at least one appointment to include in the consolidated invoice.');
      return;
    }

    if (
      !confirm(
        `Generate 1 consolidated invoice for ${selectedConsultant} covering ${selectedApts.length} appointment(s) totalling ${formatCurrency(totalCost)}?`
      )
    ) {
      return;
    }

    setGenerating(true);

    try {
      const year = new Date().getFullYear().toString();
      const invoiceLabel = `${year}-Backlog`;

      const newInvoice: Invoice = {
        invoiceNumber: generateInvoiceNumber(invoiceLabel),
        consultant: selectedConsultant as any,
        consultantEmail:
          CONSULTANT_EMAILS[selectedConsultant as keyof typeof CONSULTANT_EMAILS],
        month: invoiceTitle.trim() || `${year} Backlog Work`,
        appointments: selectedApts,
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
        body: JSON.stringify(newInvoice),
      });

      if (!response.ok) throw new Error('Failed to create consolidated invoice');

      alert(`✅ Single Consolidated Invoice generated successfully for ${selectedConsultant}!`);
      setSelectedAptIds([]);
      onInvoiceGenerated();
    } catch (error) {
      console.error('Error creating consolidated invoice:', error);
      alert('Error generating consolidated invoice');
    } finally {
      setGenerating(false);
    }
  }

  function downloadPDF(invoice: Invoice) {
    const doc = new jsPDF();

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text('CONSOLIDATED INVOICE', 14, 20);

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
    doc.text(`Period: ${invoice.month}`, 120, 68);
    doc.text(`Issue Date: ${formatDate(invoice.issueDate)}`, 120, 74);
    doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, 120, 80);

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
      startY: 88,
      head: [['Date', 'Patient Ref', 'Service / Appointment Type', 'Amount']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [30, 58, 138],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 45 },
        2: { cellWidth: 75 },
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

    doc.save(`Consolidated_Invoice_${invoice.invoiceNumber}.pdf`);
  }

  async function handleSendOutlookEmail(invoice: Invoice) {
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

  async function handleTogglePaid(invoice: Invoice) {
    const newStatus = invoice.status === 'paid' ? 'sent' : 'paid';
    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        onInvoiceGenerated();
      } else {
        alert('Failed to update status');
      }
    } catch (error) {
      console.error('Error toggling payment status:', error);
      alert('Error updating payment status');
    }
  }

  async function handleDeleteInvoice(invoice: Invoice) {
    if (!invoice.id || !confirm(`Delete invoice ${invoice.invoiceNumber}? This will unmark its appointments so they can be re-invoiced.`)) return;

    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('🗑️ Invoice deleted successfully!');
        onInvoiceGenerated();
      } else {
        alert('Failed to delete invoice');
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Error deleting invoice');
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Consultant Filter */}
      <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            📦 Backlog Consolidated Invoicing
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Bundle unbilled appointments spanning across multiple months into **1 single consolidated invoice** for a consultant.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Select Consultant:
            </label>
            <select
              value={selectedConsultant}
              onChange={(e) => {
                setSelectedConsultant(e.target.value);
                setSelectedAptIds([]);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500"
            >
              {CONSULTANTS.map(
                (c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Invoice Period Description:
            </label>
            <input
              type="text"
              value={invoiceTitle}
              onChange={(e) => setInvoiceTitle(e.target.value)}
              placeholder="e.g. 2026 Backlog Work"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Unbilled Appointments List */}
      <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b pb-3">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">
              Unbilled Work for {selectedConsultant}
            </h3>
            <p className="text-xs text-gray-500">
              {uninvoicedApts.length} appointment(s) available across past months
            </p>
          </div>

          {uninvoicedApts.length > 0 && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded border border-indigo-200 transition"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-xs font-semibold text-gray-600 hover:text-gray-800 bg-gray-100 px-3 py-1.5 rounded border border-gray-200 transition"
              >
                Clear Selection
              </button>
            </div>
          )}
        </div>

        {uninvoicedApts.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            🎉 No unbilled backlog appointments found for {selectedConsultant}!
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1 divide-y">
            {uninvoicedApts.map((apt) => {
              const isChecked = selectedAptIds.length === 0 || Boolean(apt.id && selectedAptIds.includes(apt.id));
              return (
                <label
                  key={apt.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition cursor-pointer ${
                    isChecked
                      ? 'bg-indigo-50/60 border-indigo-200'
                      : 'bg-white border-gray-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => apt.id && handleToggleApt(apt.id)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <div>
                      <span className="font-semibold text-sm text-gray-900">
                        {formatDate(apt.date)}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        {apt.patientReference || (apt.patientInitials && apt.patientInitials !== 'N/A')
                          ? `• Ref: ${apt.patientReference || apt.patientInitials} `
                          : ''}
                        • {apt.appointmentType}
                      </span>
                    </div>
                  </div>

                  <span className="font-bold text-sm text-indigo-700">
                    {formatCurrency(apt.cost)}
                  </span>
                </label>
              );
            })}
          </div>
        )}

        {/* Generate Single Invoice Action Bar */}
        {uninvoicedApts.length > 0 && (
          <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <span className="text-sm text-gray-700 font-semibold block sm:inline">
                Selected: {selectedApts.length} of {uninvoicedApts.length} appt(s)
              </span>
              <span className="text-2xl font-bold text-indigo-700 sm:ml-4 block sm:inline">
                Combined Total: {formatCurrency(totalCost)}
              </span>
            </div>

            <button
              onClick={handleGenerateConsolidatedInvoice}
              disabled={generating || selectedApts.length === 0}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg shadow transition text-sm flex items-center justify-center gap-2"
            >
              {generating ? 'Building Single Invoice...' : '📄 Generate 1 Consolidated Invoice'}
            </button>
          </div>
        )}
      </div>

      {/* List of Existing Consolidated Invoices */}
      {consolidatedInvoices.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-bold text-gray-900 text-lg">
            Consolidated Backlog Invoices for {selectedConsultant}
          </h3>

          {consolidatedInvoices.map((inv) => (
            <div key={inv.id} className="bg-white rounded-xl shadow-lg p-6 space-y-4 border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-gray-900 text-base">{inv.consultant}</h4>
                  <p className="text-xs text-gray-500 font-mono">{inv.invoiceNumber}</p>
                  <p className="text-xs text-indigo-600 font-semibold mt-1">Period: {inv.month}</p>
                </div>

                <div className="text-right">
                  <p className="text-2xl font-bold text-indigo-600">{formatCurrency(inv.totalCost)}</p>
                  <button
                    onClick={() => handleTogglePaid(inv)}
                    className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold transition shadow-sm ${
                      inv.status === 'paid'
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : inv.status === 'sent'
                        ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                        : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                    }`}
                  >
                    {inv.status === 'paid'
                      ? '✓ Paid (Click to unmark)'
                      : inv.status === 'sent'
                      ? '✉️ Sent (Click to mark Paid)'
                      : '📝 Draft (Click to mark Paid)'}
                  </button>
                </div>
              </div>

              <div className="border-t pt-3 space-y-1 text-xs">
                {inv.appointments.map((apt, idx) => {
                  const ref = apt.patientReference || apt.patientInitials;
                  return (
                    <div key={idx} className="flex justify-between text-gray-700">
                      <span>
                        {formatDate(apt.date)}
                        {ref && ref !== 'N/A' ? ` • Ref: ${ref}` : ''}
                        {` • ${apt.appointmentType}`}
                      </span>
                      <span className="font-semibold">{formatCurrency(apt.cost)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <button
                  onClick={() => setSelectedInvoice(inv)}
                  className="flex-1 min-w-[120px] bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 rounded-lg transition text-xs"
                >
                  👁️ View Invoice
                </button>
                <button
                  onClick={() => downloadPDF(inv)}
                  className="flex-1 min-w-[120px] bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-3 rounded-lg transition text-xs"
                >
                  📄 Download PDF
                </button>
                <button
                  onClick={() => setConfirmSendInvoice(inv)}
                  disabled={sendingEmailFor === inv.invoiceNumber}
                  className="flex-1 min-w-[160px] bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-2 px-3 rounded-lg transition text-xs"
                >
                  {sendingEmailFor === inv.invoiceNumber ? 'Sending...' : '✉️ Send via Outlook'}
                </button>
                <button
                  onClick={() => handleDeleteInvoice(inv)}
                  className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-semibold py-2 px-3 rounded-lg transition text-xs"
                  title="Delete Invoice"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invoice Preview Modal */}
      {previewInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-96 overflow-y-auto p-8">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Consolidated Invoice Preview</h3>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="text-sm space-y-4 font-mono">
              <div>
                <p className="font-bold">{GABY_DETAILS.name}</p>
                <p>{GABY_DETAILS.credentials}</p>
                <p>Pin: {GABY_DETAILS.pinNumber}</p>
              </div>

              <div className="border-t pt-4">
                <p><strong>Invoice Number:</strong> {previewInvoice.invoiceNumber}</p>
                <p><strong>To:</strong> {previewInvoice.consultant}</p>
                <p><strong>Period:</strong> {previewInvoice.month}</p>
                <p><strong>Issue Date:</strong> {formatDate(previewInvoice.issueDate)}</p>
              </div>

              <div className="border-t pt-4">
                {previewInvoice.appointments.map((apt, idx) => {
                  const ref = apt.patientReference || apt.patientInitials;
                  return (
                    <div key={idx} className="flex justify-between mb-2">
                      <span>
                        {formatDate(apt.date)}
                        {ref && ref !== 'N/A' ? ` - Ref: ${ref}` : ''}
                        {` - ${apt.appointmentType}`}
                      </span>
                      <span>{formatCurrency(apt.cost)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="border-t pt-4 flex justify-between font-bold">
                <span>TOTAL:</span>
                <span>{formatCurrency(previewInvoice.totalCost)}</span>
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

      {/* Confirmation Send Modal */}
      {confirmSendInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                ✉️ Confirm Consolidated Email Dispatch
              </h3>
              <button
                onClick={() => setConfirmSendInvoice(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 space-y-2 text-sm text-gray-800">
              <div>
                <span className="text-xs uppercase font-bold text-gray-500 block">Recipient:</span>
                <span className="font-semibold text-indigo-900">{confirmSendInvoice.consultant}</span>
                <span className="block text-xs text-gray-600">({confirmSendInvoice.consultantEmail})</span>
              </div>

              <div>
                <span className="text-xs uppercase font-bold text-gray-500 block">Attachment:</span>
                <span className="font-mono text-xs bg-white px-2 py-1 rounded border inline-block text-indigo-700 font-semibold">
                  📎 Consolidated_Invoice_{confirmSendInvoice.invoiceNumber}.pdf
                </span>
              </div>

              <div>
                <span className="text-xs uppercase font-bold text-gray-500 block">Total Combined Amount:</span>
                <span className="text-lg font-bold text-indigo-600">{formatCurrency(confirmSendInvoice.totalCost)}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmSendInvoice(null)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2.5 rounded-lg transition"
              >
                ❌ Cancel
              </button>
              <button
                onClick={() => {
                  const inv = confirmSendInvoice;
                  setConfirmSendInvoice(null);
                  handleSendOutlookEmail(inv);
                }}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-lg transition shadow flex items-center justify-center gap-1.5"
              >
                🚀 Confirm & Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
