'use client';

import { useState } from 'react';
import { Appointment } from '@/types';
import {
  CONSULTANTS,
  APPOINTMENT_TYPES,
  RETAINER_APPOINTMENT_TYPE,
  calculateAppointmentCost,
  formatCurrency,
  buildPatientReference,
} from '@/lib/utils';

interface LogAppointmentProps {
  onAppointmentSaved: () => void;
}

export default function LogAppointment({ onAppointmentSaved }: LogAppointmentProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [lunchBreakMinutes, setLunchBreakMinutes] = useState(0);
  const [selectedConsultant, setSelectedConsultant] = useState('');
  const [selectedAppointmentType, setSelectedAppointmentType] = useState('');
  const [patientName, setPatientName] = useState('');
  const [birthYearDigits, setBirthYearDigits] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const appointmentTypes =
    selectedConsultant &&
    APPOINTMENT_TYPES[selectedConsultant as keyof typeof APPOINTMENT_TYPES];

  const isRetainer = selectedAppointmentType === RETAINER_APPOINTMENT_TYPE;

  const cost = calculateAppointmentCost(
    selectedConsultant,
    selectedAppointmentType,
    startTime,
    endTime,
    lunchBreakMinutes
  );

  const generatedRef =
    selectedConsultant === 'David Ross'
      ? 'N/A'
      : buildPatientReference(patientName, birthYearDigits, date);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedConsultant || !selectedAppointmentType) {
      alert('Please fill in all required fields');
      return;
    }

    if (selectedConsultant !== 'David Ross' && (!patientName.trim() || !birthYearDigits.trim())) {
      alert('Please enter both Patient Full Name and Birth Year digits');
      return;
    }

    setSubmitting(true);

    const ref = selectedConsultant === 'David Ross' ? 'N/A' : generatedRef;

    const appointment: Appointment = {
      date,
      startTime,
      endTime: selectedConsultant === 'David Ross' && !isRetainer ? endTime : undefined,
      lunchBreakMinutes: selectedConsultant === 'David Ross' && !isRetainer ? lunchBreakMinutes : undefined,
      consultant: selectedConsultant as any,
      appointmentType: selectedAppointmentType,
      patientName: selectedConsultant === 'David Ross' ? 'N/A' : patientName.trim(),
      patientReference: ref,
      patientInitials: ref,
      cost,
      invoiced: false,
    };

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointment),
      });

      if (response.ok) {
        alert(`✅ Appointment logged successfully!\n\nInvoice Ref: ${ref}\nCost: ${formatCurrency(cost)}`);
        // Reset form
        setDate(new Date().toISOString().split('T')[0]);
        setStartTime('09:00');
        setEndTime('10:00');
        setLunchBreakMinutes(0);
        setSelectedConsultant('');
        setSelectedAppointmentType('');
        setPatientName('');
        setBirthYearDigits('');
        onAppointmentSaved();
      } else {
        alert('Failed to save appointment');
      }
    } catch (error) {
      console.error('Error saving appointment:', error);
      alert('Error saving appointment');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8 max-w-2xl mx-auto">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-900">Log Work Appointment</h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Consultant Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Consultant <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedConsultant}
            onChange={(e) => {
              setSelectedConsultant(e.target.value);
              setSelectedAppointmentType(''); // Reset appointment type
            }}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">Select a consultant...</option>
            {CONSULTANTS.map((consultant) => (
              <option key={consultant} value={consultant}>
                {consultant}
              </option>
            ))}
          </select>
        </div>

        {/* Appointment Type */}
        {selectedConsultant && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Appointment Type <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedAppointmentType}
              onChange={(e) => setSelectedAppointmentType(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent max-h-64 overflow-y-auto"
            >
              <option value="">Select appointment type...</option>
              {appointmentTypes && Array.isArray(appointmentTypes) && appointmentTypes.map((type) => (
                <option key={type.name} value={type.name}>
                  {type.name} - {formatCurrency(type.price)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Start Time */}
        {!isRetainer && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Time <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        )}

        {/* End Time (for David Ross only) */}
        {selectedConsultant === 'David Ross' && !isRetainer && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lunch Break (minutes)
              </label>
              <input
                type="number"
                value={lunchBreakMinutes}
                onChange={(e) => setLunchBreakMinutes(Math.max(0, Number(e.target.value)))}
                min="0"
                max="480"
                placeholder="e.g., 60 for 1 hour"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">This will be deducted from invoiced hours</p>
            </div>
          </>
        )}

        {/* Patient Name & Birth Year (Hidden for David Ross) */}
        {selectedConsultant && selectedConsultant !== 'David Ross' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Patient Full Name <span className="text-red-500">*</span> <span className="text-gray-400 font-normal">(Internal Only)</span>
                </label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g., Sarah Smith"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Birth Year (Last 2 Digits) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={birthYearDigits}
                  onChange={(e) => setBirthYearDigits(e.target.value.slice(0, 2))}
                  placeholder="e.g., 84"
                  maxLength={2}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {generatedRef && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 flex justify-between items-center">
                <span>Invoice Ref Preview:</span>
                <span className="font-mono font-bold text-indigo-700">{generatedRef}</span>
              </div>
            )}
          </div>
        )}

        {/* Cost Summary */}
        {selectedAppointmentType && (
          <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-900">Total Cost:</span>
              <span className="text-3xl font-bold text-indigo-600">
                {formatCurrency(cost)}
              </span>
            </div>
            {selectedConsultant === 'David Ross' && (
              <div className="text-sm text-gray-600 mt-2 space-y-1">
                {isRetainer ? (
                  <p>Retainer requires no time and is charged at £50</p>
                ) : (
                  <p>
                    Hours: {startTime} - {endTime}
                    {lunchBreakMinutes > 0 && ` (minus ${lunchBreakMinutes}min lunch)`}
                    @ £32/hour
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || !selectedAppointmentType}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition duration-200 text-lg"
        >
          {submitting ? 'Saving...' : '✅ Log Appointment'}
        </button>
      </form>
    </div>
  );
}
