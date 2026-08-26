import { NextRequest, NextResponse } from 'next/server';
import { Invoice } from '@/types';
import { generateInvoiceNumber, CONSULTANT_EMAILS } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { invoiceToRow, rowToInvoice } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const month = request.nextUrl.searchParams.get('month');
    const consultant = request.nextUrl.searchParams.get('consultant');

    let query = supabase.from('invoices').select('*').order('issue_date', { ascending: false });

    if (month) {
      query = query.eq('month', month);
    }

    if (consultant) {
      query = query.eq('consultant', consultant);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json((data ?? []).map(rowToInvoice));
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const now = new Date().toISOString();
    const newInvoice: Invoice = {
      id: Date.now().toString(),
      invoiceNumber: generateInvoiceNumber(body.month),
      consultantEmail: CONSULTANT_EMAILS[body.consultant as keyof typeof CONSULTANT_EMAILS],
      ...body,
      createdAt: now,
      updatedAt: now,
    };

    const { data, error } = await supabase
      .from('invoices')
      .insert(invoiceToRow(newInvoice))
      .select()
      .single();
    if (error) throw error;

    const appointmentIds = newInvoice.appointments
      .map((appointment) => appointment.id)
      .filter((id): id is string => Boolean(id));
    if (appointmentIds.length > 0) {
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ invoiced: true, invoice_month: newInvoice.month, updated_at: now })
        .in('id', appointmentIds);
      if (updateError) throw updateError;
    }

    return NextResponse.json(rowToInvoice(data), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
  }
}
