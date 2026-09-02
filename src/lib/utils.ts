// Appointment configuration and utilities

// Retainer requires no time and is charged at a flat £50
export const RETAINER_APPOINTMENT_TYPE = 'Retainer (No Time Required - £50)';

export const CONSULTANTS = [
  'Victoria Rose',
  'Paul Roblin',
  'Maleeha Mughal',
  'Helen McEvoy',
  'David Ross',
  'Gaby De Luca',
] as const;

export const APPOINTMENT_TYPES = {
  'Victoria Rose': [
    { name: 'Initial Post Operative Review', price: 55 },
    { name: 'Subsequent Follow Up OPAs', price: 55 },
    { name: 'NPWT Dressing Change (VAC)', price: 80 },
    { name: 'Ward Review', price: 35 },
    { name: 'Post operative Call / Consultation / Virtual Wound Review', price: 30 },
    { name: 'New OPA for Wound Consultation & Specialist Compression Bandaging (Domiciliary)', price: 100 },
    { name: 'NPWT Domiciliary', price: 100 },
    { name: 'Routine Post operative Review & Follow Up Dressing Change (Domiciliary)', price: 80 },
  ],
  'Paul Roblin': [
    { name: 'Initial Post Operative Review', price: 55 },
    { name: 'Subsequent Follow Up OPAs', price: 55 },
    { name: 'NPWT Dressing Change (VAC)', price: 80 },
    { name: 'Ward Review', price: 35 },
    { name: 'Post operative Call / Consultation / Virtual Wound Review', price: 30 },
    { name: 'New OPA for Wound Consultation & Specialist Compression Bandaging (Domiciliary)', price: 100 },
    { name: 'NPWT Domiciliary', price: 100 },
    { name: 'Routine Post operative Review & Follow Up Dressing Change (Domiciliary)', price: 80 },
  ],
  'Maleeha Mughal': [
    { name: 'Initial Post Operative Review', price: 55 },
    { name: 'Subsequent Follow Up OPAs', price: 55 },
    { name: 'NPWT Dressing Change (VAC)', price: 80 },
    { name: 'Ward Review', price: 35 },
    { name: 'Post operative Call / Consultation / Virtual Wound Review', price: 30 },
    { name: 'New OPA for Wound Consultation & Specialist Compression Bandaging (Domiciliary)', price: 100 },
    { name: 'NPWT Domiciliary', price: 100 },
    { name: 'Routine Post operative Review & Follow Up Dressing Change (Domiciliary)', price: 80 },
  ],
  'Helen McEvoy': [
    { name: 'Initial Post Operative Review', price: 55 },
    { name: 'Subsequent Follow Up OPAs', price: 55 },
    { name: 'NPWT Dressing Change (VAC)', price: 80 },
    { name: 'Ward Review', price: 35 },
    { name: 'Post operative Call / Consultation / Virtual Wound Review', price: 30 },
    { name: 'New OPA for Wound Consultation & Specialist Compression Bandaging (Domiciliary)', price: 100 },
    { name: 'NPWT Domiciliary', price: 100 },
    { name: 'Routine Post operative Review & Follow Up Dressing Change (Domiciliary)', price: 80 },
  ],
  'David Ross': [
    { name: 'Hourly Rate (£32/hour)', price: 32 }, // Special: calculated from hours
    { name: RETAINER_APPOINTMENT_TYPE, price: 50 }, // Special: flat fee, no time required
  ],
  'Gaby De Luca': [
    { name: 'Initial Post Operative Review', price: 55 },
    { name: 'Subsequent Follow Up OPAs', price: 55 },
    { name: 'NPWT Dressing Change (VAC)', price: 80 },
    { name: 'Ward Review', price: 35 },
    { name: 'Post operative Call / Consultation / Virtual Wound Review', price: 30 },
    { name: 'New OPA for Wound Consultation & Specialist Compression Bandaging (Domiciliary)', price: 100 },
    { name: 'NPWT Domiciliary', price: 100 },
    { name: 'Routine Post operative Review & Follow Up Dressing Change (Domiciliary)', price: 80 },
  ],
} as const;

export const CONSULTANT_EMAILS = {
  'Victoria Rose': 'info@drg-plasticsurgery.co.uk',
  'Paul Roblin': 'info@paulroblin.co.uk',
  'Maleeha Mughal': 'info@maleehamughal.com',
  'Helen McEvoy': 'enquiries@cosdocs.co.uk',
  'David Ross': 'roz@plasticsurgeryw1.com',
  'Gaby De Luca': 'gaby.deluca@btinternet.com',
} as const;

// Gaby's details
export const GABY_DETAILS = {
  name: 'Gabriella De Luca',
  credentials: 'Plastic Surgery Nurse, BSE Hons',
  pinNumber: '92C1636E',
  personalEmail: 'gaby.deluca@btinternet.com',
  workEmail: 'gabydeluca.nursing@outlook.com',
  phone: '07780 683 833',
  bank: {
    name: 'Metro Bank',
    accountNumber: '47050138',
    sortCode: '23-05-80',
  },
};

export function getInvoiceableHours(
  startTime?: string,
  endTime?: string,
  lunchBreakMinutes: number = 0
): number | undefined {
  if (!startTime || !endTime) return undefined;

  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  let duration = (endMinutes - startMinutes) / 60;
  if (duration < 0) duration += 24;

  return Math.max(0, duration - lunchBreakMinutes / 60);
}

/**
 * Calculate appointment cost
 */
export function calculateAppointmentCost(
  consultant: string,
  appointmentType: string,
  startTime?: string,
  endTime?: string,
  lunchBreakMinutes: number = 0
): number {
  if (consultant === 'David Ross' && appointmentType === RETAINER_APPOINTMENT_TYPE) {
    return 50; // Flat retainer fee, no time required
  }

  if (consultant === 'David Ross' && startTime && endTime) {
    const invoiceableHours = getInvoiceableHours(startTime, endTime, lunchBreakMinutes) ?? 0;
    return Math.round(invoiceableHours * 32 * 100) / 100; // £32/hour
  }

  // For other consultants, find the fixed price
  const types = APPOINTMENT_TYPES[consultant as keyof typeof APPOINTMENT_TYPES];
  const type = types?.find((t) => t.name === appointmentType);
  return type?.price || 0;
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * Build patient reference string: <Initials><BirthYearDigits> <DateSeen>
 * e.g., "TH77 26082026"
 */
export function buildPatientReference(
  patientName: string,
  birthYearDigits: string,
  dateString: string
): string {
  if (!patientName.trim()) return '';

  const initials = patientName
    .trim()
    .split(/\s+/)
    .map((word) => word[0]?.toUpperCase() || '')
    .join('');

  const yearDigits = birthYearDigits.trim();

  let dateFormatted = dateString;
  if (dateString && dateString.includes('-')) {
    const [y, m, d] = dateString.split('-');
    if (y && m && d) {
      dateFormatted = `${d}${m}${y}`;
    }
  }

  return `${initials}${yearDigits} ${dateFormatted}`.trim();
}

/**
 * Get current month in YYYY-MM format
 */
export function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Get previous month in YYYY-MM format
 */
export function getPreviousMonth(): string {
  const now = new Date();
  now.setMonth(now.getMonth() - 1);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Generate invoice number
 */
export function generateInvoiceNumber(month: string): string {
  const parts = month.split('-');
  const year = parts[0] || '2026';
  const monthNum = parts[1] || 'ALL';
  const timestamp = Date.now().toString().slice(-3);
  return `INV-${year}-${monthNum}-${timestamp}`;
}

/**
 * Check if today is the 1st of the month
 */
export function isFirstOfMonth(): boolean {
  return new Date().getDate() === 1;
}

/**
 * Get first and last day of month
 */
export function getMonthRange(month: string): { start: string; end: string } {
  const [year, monthNum] = month.split('-');
  const start = `${year}-${monthNum}-01`;
  const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
  const end = `${year}-${monthNum}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}
