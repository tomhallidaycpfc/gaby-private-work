'use client';

import { useState, useMemo } from 'react';
import { Appointment } from '@/types';
import {
  CONSULTANTS,
  APPOINTMENT_TYPES,
  RETAINER_APPOINTMENT_TYPE,
  calculateAppointmentCost,
  formatCurrency,
  buildPatientReference,
} from '@/lib/utils';

interface BatchItem {
  id: string;
  date: string;
  consultant: string;
  appointmentType: string;
  patientName: string;
  birthYearDigits: string;
  startTime: string;
  endTime: string;
  cost: number;
}

interface BatchLogAppointmentsProps {
  onAppointmentsSaved: () => void;
}

export default function BatchLogAppointments({ onAppointmentsSaved }: BatchLogAppointmentsProps) {
  const [items, setItems] = useState<BatchItem[]>([
    {
      id: '1',
      date: new Date().toISOString().split('T')[0],
      consultant: '',
      appointmentType: '',
      patientName: '',
      birthYearDigits: '',
      startTime: '09:00',
      endTime: '10:00',
      cost: 0,
    },
  ]);
  const [submitting, setSubmitting] = useState(false);

  function createNewRow(copyFrom?: BatchItem): BatchItem {
    if (copyFrom) {
      return {
        id: Date.now().toString() + Math.random(),
        date: copyFrom.date,
        consultant: copyFrom.consultant,
        appointmentType: copyFrom.appointmentType,
        patientName: copyFrom.patientName,
        birthYearDigits: copyFrom.birthYearDigits,
        startTime: copyFrom.startTime,
        endTime: copyFrom.endTime,
        cost: copyFrom.cost,
      };
    }

    const lastItem = items[items.length - 1];
    return {
      id: Date.now().toString() + Math.random(),
      date: lastItem ? lastItem.date : new Date().toISOString().split('T')[0],
      consultant: lastItem ? lastItem.consultant : '',
      appointmentType: lastItem ? lastItem.appointmentType : '',
      patientName: '',
      birthYearDigits: '',
      startTime: '09:00',
      endTime: '10:00',
      cost: lastItem ? lastItem.cost : 0,
    };
  }

  function handleAddItem() {
    setItems((prev) => [...prev, createNewRow()]);
  }

  function handleAddMultipleItems(count: number) {
    setItems((prev) => {
      const newRows: BatchItem[] = [];
      for (let i = 0; i < count; i++) {
        newRows.push(createNewRow());
      }
      return [...prev, ...newRows];
    });
  }

  function handleDuplicateItem(id: string) {
    const itemToCopy = items.find((i) => i.id === id);
    if (!itemToCopy) return;
    setItems((prev) => {
      const index = prev.findIndex((i) => i.id === id);
      const updated = [...prev];
      updated.splice(index + 1, 0, createNewRow(itemToCopy));
      return updated;
    });
  }

  function handleRemoveItem(id: string) {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function handleUpdateItem(id: string, field: keyof BatchItem, value: string) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const updated = { ...item, [field]: value };

        // Reset appointment type if consultant changes
        if (field === 'consultant') {
          updated.appointmentType = '';
          if (value === 'David Ross') {
            updated.patientName = 'N/A';
            updated.birthYearDigits = 'N/A';
          }
        }

        // Recalculate cost
        updated.cost = calculateAppointmentCost(
          updated.consultant,
          updated.appointmentType,
          updated.startTime,
          updated.endTime
        );

        return updated;
      })
    );
  }

  const grandTotal = items.reduce((sum, item) => sum + item.cost, 0);

  // Group summary by month for clear visibility
  const monthSummary = useMemo(() => {
    const summary: Record<string, { count: number; total: number }> = {};
    items.forEach((item) => {
      if (!item.date) return;
      const monthKey = item.date.slice(0, 7); // YYYY-MM
      if (!summary[monthKey]) {
        summary[monthKey] = { count: 0, total: 0 };
      }
      summary[monthKey].count += 1;
      summary[monthKey].total += item.cost;
    });
    return summary;
  }, [items]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validation
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.consultant || !item.appointmentType) {
        alert(`Row #${i + 1}: Please select both a Consultant and Appointment Type.`);
        return;
      }
      if (item.consultant !== 'David Ross' && (!item.patientName.trim() || !item.birthYearDigits.trim())) {
        alert(`Row #${i + 1}: Please enter Patient Name and Birth Year digits.`);
        return;
      }
    }

    setSubmitting(true);

    try {
      const appointmentsToSave: Appointment[] = items.map((item) => {
        const ref =
          item.consultant === 'David Ross'
            ? 'N/A'
            : buildPatientReference(item.patientName, item.birthYearDigits, item.date);

        return {
          date: item.date,
          startTime: item.startTime,
          endTime: item.consultant === 'David Ross' && item.appointmentType !== RETAINER_APPOINTMENT_TYPE ? item.endTime : undefined,
          consultant: item.consultant as any,
          appointmentType: item.appointmentType,
          patientName: item.consultant === 'David Ross' ? 'N/A' : item.patientName.trim(),
          patientReference: ref,
          patientInitials: ref,
          cost: item.cost,
          invoiced: false,
        };
      });

      // Save sequentially or in parallel
      for (const apt of appointmentsToSave) {
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apt),
        });
        if (!res.ok) throw new Error('Failed to save an appointment');
      }

      alert(`✅ Successfully logged ${items.length} backlog appointment(s)!\nTotal: ${formatCurrency(grandTotal)}`);

      // Reset form to 1 clean row
      setItems([
        {
          id: Date.now().toString(),
          date: new Date().toISOString().split('T')[0],
          consultant: '',
          appointmentType: '',
          patientName: '',
          birthYearDigits: '',
          startTime: '09:00',
          endTime: '10:00',
          cost: 0,
        },
      ]);

      onAppointmentsSaved();
    } catch (error) {
      console.error('Error saving batch appointments:', error);
      alert('Error saving batch appointments. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header & Description */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            📚 Multi-Month Backlog Entry
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Easily catch up on un-billed work across several months. Fill in appointments below, duplicate rows to save time, and save them all at once.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleAddItem}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded-lg transition text-xs sm:text-sm flex items-center gap-1 shadow"
          >
            ➕ Add Row
          </button>
          <button
            type="button"
            onClick={() => handleAddMultipleItems(5)}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2 px-3 rounded-lg transition text-xs sm:text-sm flex items-center gap-1 shadow"
          >
            ⚡ Add 5 Rows
          </button>
        </div>
      </div>

      {/* Live Monthly Breakdown summary */}
      {Object.keys(monthSummary).length > 0 && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
          <span className="text-xs uppercase font-bold text-indigo-900 block mb-2">
            📅 Backlog Breakdown by Month:
          </span>
          <div className="flex flex-wrap gap-3">
            {Object.entries(monthSummary).map(([mKey, summary]: [string, { count: number; total: number }]) => {
              const [y, m] = mKey.split('-');
              const dateObj = new Date(Number(y), Number(m) - 1, 1);
              const monthLabel = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' }).format(dateObj);
              return (
                <div key={mKey} className="bg-white px-3 py-1.5 rounded-lg border border-indigo-200 text-xs shadow-sm">
                  <span className="font-semibold text-gray-800">{monthLabel}: </span>
                  <span className="font-bold text-indigo-600">{formatCurrency(summary.total)}</span>
                  <span className="text-gray-500 ml-1">({summary.count} appt{summary.count > 1 ? 's' : ''})</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          {items.map((item, index) => {
            const types =
              item.consultant &&
              APPOINTMENT_TYPES[item.consultant as keyof typeof APPOINTMENT_TYPES];

            return (
              <div
                key={item.id}
                className="bg-gray-50 border border-gray-200 rounded-xl p-4 sm:p-5 relative space-y-4"
              >
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <span className="font-bold text-indigo-700 text-sm">
                    Item #{index + 1}
                  </span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 bg-red-50 rounded border border-red-200 transition"
                    >
                      🗑️ Remove Row
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Date */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={item.date}
                      onChange={(e) => handleUpdateItem(item.id, 'date', e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Consultant */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Consultant <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={item.consultant}
                      onChange={(e) => handleUpdateItem(item.id, 'consultant', e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select consultant...</option>
                      {CONSULTANTS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Appointment Type */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={item.appointmentType}
                      onChange={(e) =>
                        handleUpdateItem(item.id, 'appointmentType', e.target.value)
                      }
                      disabled={!item.consultant}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-200"
                    >
                      <option value="">Select type...</option>
                      {types &&
                        Array.isArray(types) &&
                        types.map((t) => (
                          <option key={t.name} value={t.name}>
                            {t.name} ({formatCurrency(t.price)})
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Patient Name / Times */}
                  {item.consultant === 'David Ross' ? (
                    item.appointmentType === RETAINER_APPOINTMENT_TYPE ? (
                      <div className="flex items-center text-xs text-gray-600">
                        Retainer requires no time and is charged at £50
                      </div>
                    ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={item.startTime}
                          onChange={(e) =>
                            handleUpdateItem(item.id, 'startTime', e.target.value)
                          }
                          className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          End Time
                        </label>
                        <input
                          type="time"
                          value={item.endTime}
                          onChange={(e) =>
                            handleUpdateItem(item.id, 'endTime', e.target.value)
                          }
                          className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                    )
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:col-span-1">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Patient Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Sarah Smith"
                          value={item.patientName}
                          onChange={(e) =>
                            handleUpdateItem(item.id, 'patientName', e.target.value)
                          }
                          required={item.consultant !== 'David Ross'}
                          className="w-full px-2.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Birth Year (2 Digits) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 84"
                          maxLength={2}
                          value={item.birthYearDigits}
                          onChange={(e) =>
                            handleUpdateItem(item.id, 'birthYearDigits', e.target.value.slice(0, 2))
                          }
                          required={item.consultant !== 'David Ross'}
                          className="w-full px-2.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Subtotal & Ref Preview */}
                <div className="flex justify-between items-center text-xs pt-1">
                  <div>
                    {item.consultant && item.consultant !== 'David Ross' && item.patientName && (
                      <span className="font-mono text-gray-600">
                        Invoice Ref: <strong className="text-indigo-700">{buildPatientReference(item.patientName, item.birthYearDigits, item.date)}</strong>
                      </span>
                    )}
                  </div>
                  {item.cost > 0 && (
                    <div className="font-bold text-indigo-700">
                      Row Cost: {formatCurrency(item.cost)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-indigo-50 border-2 border-indigo-200 rounded-xl p-4">
          <div>
            <span className="text-gray-700 text-sm font-semibold block sm:inline">
              Total Backlog Items: {items.length}
            </span>
            <span className="text-2xl font-bold text-indigo-700 sm:ml-4 block sm:inline">
              Grand Total: {formatCurrency(grandTotal)}
            </span>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleAddItem}
              className="flex-1 sm:flex-none bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2.5 px-4 rounded-lg border border-gray-300 transition text-sm"
            >
              ➕ Add Row
            </button>
            <button
              type="submit"
              disabled={submitting || grandTotal === 0}
              className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-bold py-2.5 px-6 rounded-lg transition text-sm shadow"
            >
              {submitting ? 'Saving Batch...' : '✅ Save All Backlog Work'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
