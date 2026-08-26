'use client';

import { useState, useMemo } from 'react';
import { Appointment } from '@/types';
import { CONSULTANTS, formatCurrency, formatDate, getCurrentMonth } from '@/lib/utils';

interface HistoricalRecordsProps {
  appointments: Appointment[];
  onAppointmentDeleted: () => void;
}

export default function HistoricalRecords({
  appointments,
  onAppointmentDeleted,
}: HistoricalRecordsProps) {
  const [filterConsultant, setFilterConsultant] = useState('');
  const [filterMonth, setFilterMonth] = useState(getCurrentMonth());
  const [expandedConsultant, setExpandedConsultant] = useState<string | null>(null);

  // Filter appointments
  const filtered = useMemo(() => {
    return appointments.filter((a) => {
      const matchConsultant = !filterConsultant || a.consultant === filterConsultant;
      const matchMonth = a.date.startsWith(filterMonth);
      return matchConsultant && matchMonth;
    });
  }, [appointments, filterConsultant, filterMonth]);

  // Group by consultant
  const groupedByConsultant = useMemo(() => {
    const groups: Record<string, Appointment[]> = {};
    filtered.forEach((a) => {
      if (!groups[a.consultant]) {
        groups[a.consultant] = [];
      }
      groups[a.consultant].push(a);
    });
    return groups;
  }, [filtered]);

  // Calculate totals
  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, a) => ({
        count: acc.count + 1,
        total: acc.total + a.cost,
      }),
      { count: 0, total: 0 }
    );
  }, [filtered]);

  async function handleDelete(id: string | undefined) {
    if (!id || !confirm('Delete this appointment?')) return;

    try {
      const response = await fetch(`/api/sessions/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onAppointmentDeleted();
      }
    } catch (error) {
      console.error('Error deleting:', error);
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Historical Records</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Consultant
            </label>
            <select
              value={filterConsultant}
              onChange={(e) => setFilterConsultant(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">All Consultants</option>
              {CONSULTANTS.map((consultant) => (
                <option key={consultant} value={consultant}>
                  {consultant}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Summary */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded p-4">
            <p className="text-sm text-gray-600">Total Appointments</p>
            <p className="text-2xl font-bold text-blue-600">{totals.count}</p>
          </div>
          <div className="bg-green-50 rounded p-4">
            <p className="text-sm text-gray-600">Total Earnings</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.total)}</p>
          </div>
        </div>
      </div>

      {/* Records by Consultant */}
      {Object.entries(groupedByConsultant).length === 0 ? (
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <p className="text-gray-500 text-lg">No appointments found for this period.</p>
        </div>
      ) : (
        Object.entries(groupedByConsultant).map(([consultant, records]) => {
          const consultantTotal = records.reduce((sum, a) => sum + a.cost, 0);
          const isExpanded = expandedConsultant === consultant;

          return (
            <div key={consultant} className="bg-white rounded-lg shadow-lg overflow-hidden">
              {/* Consultant Header */}
              <button
                onClick={() =>
                  setExpandedConsultant(isExpanded ? null : consultant)
                }
                className="w-full bg-indigo-600 text-white p-4 hover:bg-indigo-700 transition flex justify-between items-center"
              >
                <div className="text-left">
                  <div className="font-bold text-lg">{consultant}</div>
                  <div className="text-sm opacity-90">
                    {records.length} appointment{records.length !== 1 ? 's' : ''} •{' '}
                    {formatCurrency(consultantTotal)}
                  </div>
                </div>
                <span className="text-xl">{isExpanded ? '▼' : '▶'}</span>
              </button>

              {/* Records List */}
              {isExpanded && (
                <div className="divide-y">
                  {records.map((appointment, idx) => (
                    <div key={idx} className="p-4 hover:bg-gray-50 transition">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-semibold">
                            Date
                          </p>
                          <p className="font-semibold text-gray-900">
                            {formatDate(appointment.date)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-semibold">
                            Time
                          </p>
                          <p className="font-semibold text-gray-900">
                            {appointment.startTime}
                            {appointment.endTime && ` - ${appointment.endTime}`}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-semibold">
                            Patient
                          </p>
                          <p className="font-semibold text-gray-900">
                            {appointment.patientInitials}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-semibold">
                            Type
                          </p>
                          <p className="font-semibold text-gray-700 text-sm">
                            {appointment.appointmentType}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-semibold">
                            Cost
                          </p>
                          <p className="font-bold text-lg text-indigo-600">
                            {formatCurrency(appointment.cost)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                            appointment.invoiced
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {appointment.invoiced ? '✓ Invoiced' : 'Pending'}
                        </span>

                        {!appointment.invoiced && (
                          <button
                            onClick={() => handleDelete(appointment.id)}
                            className="text-red-600 hover:text-red-800 font-medium text-sm"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
