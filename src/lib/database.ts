import { Appointment, Invoice } from '@/types';

export function appointmentToRow(appointment: Appointment) {
  const ref = appointment.patientReference || appointment.patientInitials || 'N/A';
  return {
    id: appointment.id ?? Date.now().toString(),
    date: appointment.date,
    start_time: appointment.startTime,
    end_time: appointment.endTime ?? null,
    lunch_break_minutes: appointment.lunchBreakMinutes ?? 0,
    consultant: appointment.consultant,
    appointment_type: appointment.appointmentType,
    patient_initials: ref,
    cost: appointment.cost,
    invoiced: appointment.invoiced ?? false,
    invoice_month: appointment.invoiceMonth ?? null,
    created_at: appointment.createdAt,
    updated_at: appointment.updatedAt,
  };
}

export function rowToAppointment(row: Record<string, unknown>): Appointment {
  const ref = (row.patient_reference as string) || (row.patient_initials as string) || 'N/A';
  const name = (row.patient_name as string) || '';
  return {
    id: row.id as string,
    date: row.date as string,
    startTime: row.start_time as string,
    endTime: (row.end_time as string | null) ?? undefined,
    lunchBreakMinutes: (row.lunch_break_minutes as number | null) ?? undefined,
    consultant: row.consultant as Appointment['consultant'],
    appointmentType: row.appointment_type as string,
    patientInitials: ref,
    patientReference: ref,
    patientName: name,
    cost: Number(row.cost),
    invoiced: Boolean(row.invoiced),
    invoiceMonth: (row.invoice_month as string | null) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function invoiceToRow(invoice: Invoice) {
  return {
    id: invoice.id ?? `${invoice.invoiceNumber}-${Date.now()}`,
    invoice_number: invoice.invoiceNumber,
    consultant: invoice.consultant,
    consultant_email: invoice.consultantEmail,
    month: invoice.month,
    appointments: invoice.appointments,
    total_cost: invoice.totalCost,
    issue_date: invoice.issueDate,
    due_date: invoice.dueDate,
    status: invoice.status,
    created_at: invoice.createdAt,
    updated_at: invoice.updatedAt,
  };
}

export function rowToInvoice(row: Record<string, unknown>): Invoice {
  return {
    id: row.id as string,
    invoiceNumber: row.invoice_number as string,
    consultant: row.consultant as Invoice['consultant'],
    consultantEmail: row.consultant_email as string,
    month: row.month as string,
    appointments: row.appointments as Appointment[],
    totalCost: Number(row.total_cost),
    issueDate: row.issue_date as string,
    dueDate: row.due_date as string,
    status: row.status as Invoice['status'],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
