// Appointment logged by Gaby
export interface Appointment {
  id?: string;
  date: string; // ISO date format (YYYY-MM-DD)
  startTime: string; // HH:mm format
  endTime?: string; // HH:mm format (optional, only for David Ross)
  lunchBreakMinutes?: number; // Lunch break in minutes (for David Ross only)
  consultant: 'Victoria Rose' | 'Paul Roblin' | 'Maleeha Mughal' | 'Helen McEvoy' | 'David Ross' | 'Gaby De Luca';
  appointmentType: string; // e.g., "Initial Post Operative Review", "NPWT Dressing Change", etc.
  patientName?: string; // Internal record only (e.g. "Sarah Smith"), NOT on invoice
  patientReference?: string; // Patient reference (e.g. "Ref 102" or initials), DOES appear on invoice
  patientInitials: string; // For backwards compatibility
  cost: number; // Calculated cost in £
  invoiced?: boolean; // Has this been invoiced?
  invoiceMonth?: string; // YYYY-MM format
  createdAt?: string;
  updatedAt?: string;
}

// Invoice generated for a consultant
export interface Invoice {
  id?: string;
  invoiceNumber: string; // Auto-generated, e.g., INV-2026-08-001
  consultant: 'Victoria Rose' | 'Paul Roblin' | 'Maleeha Mughal' | 'Helen McEvoy' | 'David Ross' | 'Gaby De Luca';
  consultantEmail: string;
  month: string; // YYYY-MM format (e.g., "2026-08")
  appointments: Appointment[];
  totalCost: number;
  issueDate: string; // ISO date
  dueDate: string; // ISO date (30 days after issue)
  status: 'draft' | 'sent' | 'paid';
  createdAt?: string;
  updatedAt?: string;
}

// Email draft for review
export interface EmailDraft {
  id?: string;
  type: 'invoice' | 'chaser'; // invoice or payment chaser
  consultant: string;
  consultantEmail: string;
  month: string;
  invoiceNumber?: string;
  subject: string;
  body: string;
  createdAt?: string;
}

// Summary statistics
export interface MonthlySummary {
  month: string;
  totalAppointments: number;
  totalEarnings: number;
  appointmentsByConsultant: Record<string, { count: number; total: number }>;
}
