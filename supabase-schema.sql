create table if not exists public.appointments (
  id text primary key,
  date date not null,
  start_time text not null,
  end_time text,
  lunch_break_minutes integer default 0,
  consultant text not null,
  appointment_type text not null,
  patient_initials text not null,
  cost numeric(10, 2) not null default 0,
  invoiced boolean not null default false,
  invoice_month text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists appointments_date_idx on public.appointments (date);
create index if not exists appointments_consultant_idx on public.appointments (consultant);
create index if not exists appointments_invoiced_idx on public.appointments (invoiced);

create table if not exists public.invoices (
  id text primary key,
  invoice_number text not null unique,
  consultant text not null,
  consultant_email text not null,
  month text not null,
  appointments jsonb not null default '[]'::jsonb,
  total_cost numeric(10, 2) not null default 0,
  issue_date date not null,
  due_date date not null,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoices_month_idx on public.invoices (month);
create index if not exists invoices_consultant_idx on public.invoices (consultant);

alter table public.appointments enable row level security;
alter table public.invoices enable row level security;

create policy "Allow app appointment access"
  on public.appointments for all
  to anon
  using (true)
  with check (true);

create policy "Allow app invoice access"
  on public.invoices for all
  to anon
  using (true)
  with check (true);
