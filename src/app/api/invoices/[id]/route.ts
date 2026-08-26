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
