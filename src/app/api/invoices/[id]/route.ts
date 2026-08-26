import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { rowToInvoice } from '@/lib/database';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { status } = body;
    if (!status || !['draft', 'sent', 'paid'].includes(status)) {
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
