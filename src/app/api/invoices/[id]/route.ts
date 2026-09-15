import { NextRequest, NextResponse } from 'next/server';
import { Appointment } from '@/types';
import { supabase } from '@/lib/supabase';
import { rowToInvoice } from '@/lib/database';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, appointments } = body as { status?: string; appointments?: Appointment[] };

    if (status && !['draft', 'sent', 'paid'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Correcting an invoice: replace its appointment list (e.g. to remove mistaken entries)
    if (appointments) {
      if (appointments.length === 0) {
        return NextResponse.json(
          { error: 'An invoice must retain at least one appointment. Delete the invoice instead if none should remain.' },
          { status: 400 }
        );
      }

      const { data: existingRow, error: fetchError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .single();
      if (fetchError) throw fetchError;

      const existingInvoice = rowToInvoice(existingRow);
      const keptIds = new Set(appointments.map((a) => a.id).filter(Boolean));
      const removedIds = (existingInvoice.appointments || [])
        .map((a) => a.id)
        .filter((aptId): aptId is string => Boolean(aptId) && !keptIds.has(aptId));

      const now = new Date().toISOString();
      const totalCost = appointments.reduce((sum, a) => sum + a.cost, 0);

      const { data, error } = await supabase
        .from('invoices')
        .update({
          appointments,
          total_cost: totalCost,
          ...(status ? { status } : {}),
          updated_at: now,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      // Un-mark removed appointments so they return to the uninvoiced pool
      if (removedIds.length > 0) {
        const { error: updateError } = await supabase
          .from('appointments')
          .update({ invoiced: false, invoice_month: null, updated_at: now })
          .in('id', removedIds);
        if (updateError) throw updateError;
      }

      return NextResponse.json(rowToInvoice(data));
    }

    if (!status) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('invoices')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(rowToInvoice(data));
  } catch (error) {
    console.error('Error updating invoice status:', error);
    return NextResponse.json({ error: 'Failed to update invoice status' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Fetch invoice to get associated appointment IDs
    const { data: invoiceData, error: fetchError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    const invoice = rowToInvoice(invoiceData);

    const appointmentIds = (invoice.appointments || [])
      .map((a) => a.id)
      .filter((aptId): aptId is string => Boolean(aptId));

    // 2. Unmark associated appointments so they return to uninvoiced state
    if (appointmentIds.length > 0) {
      await supabase
        .from('appointments')
        .update({ invoiced: false, invoice_month: null, updated_at: new Date().toISOString() })
        .in('id', appointmentIds);
    }

    // 3. Delete the invoice
    const { error: deleteError } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 });
  }
}
