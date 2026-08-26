'use client';

import { useState, useEffect } from 'react';
import { Appointment, Invoice } from '@/types';
import { getCurrentMonth, formatCurrency, GABY_DETAILS } from '@/lib/utils';
import LogAppointment from '@/components/LogAppointment';
import HistoricalRecords from '@/components/HistoricalRecords';
import MonthEndInvoicing from '@/components/MonthEndInvoicing';

type Tab = 'log' | 'history' | 'invoicing';

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('log');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [appointmentsRes, invoicesRes] = await Promise.all([
        fetch('/api/sessions'),
        fetch('/api/invoices'),
      ]);

      if (appointmentsRes.ok) {
        setAppointments(await appointmentsRes.json());
      }

      if (invoicesRes.ok) {
        setInvoices(await invoicesRes.json());
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Gaby's Work Tracker</h1>
          <p className="text-gray-600">
            {GABY_DETAILS.name} • {GABY_DETAILS.credentials}
          </p>
          <p className="text-sm text-gray-500">Pin: {GABY_DETAILS.pinNumber}</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-8 bg-white rounded-lg shadow p-2">
          <button
            onClick={() => setActiveTab('log')}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'log'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            📝 Log Appointment
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            📋 Historical Records
          </button>
          <button
            onClick={() => setActiveTab('invoicing')}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'invoicing'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            💰 Month-End Invoicing
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        ) : (
          <>
            {activeTab === 'log' && (
              <LogAppointment
                onAppointmentSaved={() => loadData()}
              />
            )}
            {activeTab === 'history' && (
              <HistoricalRecords
                appointments={appointments}
                onAppointmentDeleted={() => loadData()}
              />
            )}
            {activeTab === 'invoicing' && (
              <MonthEndInvoicing
                appointments={appointments}
                invoices={invoices}
                onInvoiceGenerated={() => loadData()}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}
