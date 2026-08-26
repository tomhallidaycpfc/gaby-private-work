import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { appointmentToRow, rowToAppointment } from '@/lib/database';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete appointment' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { data: existing, error: findError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', id)
      .single();
    if (findError || !existing) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    const updatedAppointment = {
      ...rowToAppointment(existing),
      ...body,
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('appointments')
      .update(appointmentToRow(updatedAppointment))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json(rowToAppointment(data));
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 });
  }
}
