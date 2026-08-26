'use client';

import { useState, useEffect } from 'react';
import { Appointment, Invoice } from '@/types';
import { getCurrentMonth, formatCurrency, GABY_DETAILS } from '@/lib/utils';
import LogAppointment from '@/components/LogAppointment';
import BatchLogAppointments from '@/components/BatchLogAppointments';
import HistoricalRecords from '@/components/HistoricalRecords';
import MonthEndInvoicing from '@/components/MonthEndInvoicing';
import ConsolidatedInvoicing from '@/components/ConsolidatedInvoicing';
import PinLock from '@/components/PinLock';

type Tab = 'log' | 'batch' | 'consolidated' | 'history' | 'invoicing';

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
    <PinLock>
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 text-center sm:text-left">
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-1">Gaby's Work Tracker</h1>
          <p className="text-sm sm:text-base text-gray-600">
            {GABY_DETAILS.name} • {GABY_DETAILS.credentials}
          </p>
          <p className="text-xs sm:text-sm text-gray-500">Pin: {GABY_DETAILS.pinNumber}</p>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-6 bg-white rounded-lg shadow p-2">
          <button
            onClick={() => setActiveTab('log')}
            className={`w-full py-3 px-2 rounded-lg font-semibold text-center text-xs sm:text-sm transition ${
              activeTab === 'log'
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            📝 Single Log
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`w-full py-3 px-2 rounded-lg font-semibold text-center text-xs sm:text-sm transition ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            📋 Records
          </button>
          <button
            onClick={() => setActiveTab('invoicing')}
            className={`w-full py-3 px-2 rounded-lg font-semibold text-center text-xs sm:text-sm transition ${
              activeTab === 'invoicing'
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            💰 Monthly Invoice
          </button>
          <button
            onClick={() => setActiveTab('batch')}
            className={`w-full py-3 px-2 rounded-lg font-semibold text-center text-xs sm:text-sm transition ${
              activeTab === 'batch'
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            📚 Backlog Entry
          </button>
          <button
            onClick={() => setActiveTab('consolidated')}
            className={`w-full py-3 px-2 rounded-lg font-semibold text-center text-xs sm:text-sm transition ${
              activeTab === 'consolidated'
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            📦 Backlog Invoice
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
            {activeTab === 'batch' && (
              <BatchLogAppointments
                onAppointmentsSaved={() => loadData()}
              />
            )}
            {activeTab === 'consolidated' && (
              <ConsolidatedInvoicing
                appointments={appointments}
                invoices={invoices}
                onInvoiceGenerated={() => loadData()}
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
    </PinLock>
  );
}
