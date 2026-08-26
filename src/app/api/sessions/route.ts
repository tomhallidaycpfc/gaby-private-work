import { NextRequest, NextResponse } from 'next/server';
import { Appointment } from '@/types';
import { supabase } from '@/lib/supabase';
import { appointmentToRow, rowToAppointment } from '@/lib/database';

function getNextMonthStart(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const nextMonth = new Date(Date.UTC(year, monthNumber, 1));
  return nextMonth.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  try {
    const month = request.nextUrl.searchParams.get('month');
    const consultant = request.nextUrl.searchParams.get('consultant');

    let query = supabase.from('appointments').select('*').order('date', { ascending: false });

    if (month) {
      query = query.gte('date', `${month}-01`).lt('date', getNextMonthStart(month));
    }

    if (consultant) {
      query = query.eq('consultant', consultant);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json((data ?? []).map(rowToAppointment));
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const now = new Date().toISOString();
    const newAppointment: Appointment = {
      id: Date.now().toString(),
      ...body,
      createdAt: now,
      updatedAt: now,
    };

    const { data, error } = await supabase
      .from('appointments')
      .insert(appointmentToRow(newAppointment))
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json(rowToAppointment(data), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 });
  }
}
