-- Enable UUID generation extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table (Self-contained users table)
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  name text not null,
  email text unique not null,
  mobile text not null,
  password text not null,
  role text not null default 'user' check (role in ('admin', 'user', 'manager')),
  status text not null default 'pending' check (status in ('active', 'pending', 'blocked')),
  "emailVerified" boolean not null default false,
  "lastLogin" timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS on Profiles
alter table public.profiles enable row level security;
create policy "Allow public read access to profiles" on public.profiles for select using (true);
create policy "Allow users to update their own profile" on public.profiles for update using (true);

-- 2. Customers Table
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  phone text unique not null,
  address text,
  gstin text,
  status text not null default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.customers enable row level security;
create policy "Allow authenticated users full access to customers" on public.customers for all using (auth.role() = 'authenticated');

-- 3. Products Table
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text unique not null,
  category text not null,
  type text not null default 'finished_good',
  price numeric not null default 0,
  "unitCost" numeric default 0,
  stock numeric not null default 0,
  "minLevel" numeric default 10,
  unit text default 'pcs',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.products enable row level security;
create policy "Allow authenticated users full access to products" on public.products for all using (auth.role() = 'authenticated');

-- 4. Store Ledger Table
create table public.store_ledger (
  id uuid primary key default gen_random_uuid(),
  product uuid references public.products(id) on delete cascade not null,
  type text not null check (type in ('IN', 'OUT')),
  quantity numeric not null,
  "referenceId" text,
  "referenceType" text,
  remarks text,
  date timestamp with time zone default timezone('utc'::text, now())
);

alter table public.store_ledger enable row level security;
create policy "Allow authenticated users full access to store_ledger" on public.store_ledger for all using (auth.role() = 'authenticated');

-- 5. Sales Table
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  customer uuid references public.customers(id) on delete set null,
  "customerName" text,
  items jsonb not null, -- Array of objects: {productId, name, quantity, price, total}
  "totalAmount" numeric not null default 0,
  status text not null default 'Completed',
  date timestamp with time zone default timezone('utc'::text, now())
);

alter table public.sales enable row level security;
create policy "Allow authenticated users full access to sales" on public.sales for all using (auth.role() = 'authenticated');

-- 6. Purchases Table
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  "vendorName" text not null,
  items jsonb not null, -- Array of objects: {productId, name, quantity, cost, total}
  "totalAmount" numeric not null default 0,
  date timestamp with time zone default timezone('utc'::text, now())
);

alter table public.purchases enable row level security;
create policy "Allow authenticated users full access to purchases" on public.purchases for all using (auth.role() = 'authenticated');

-- 7. BOMs (Bill of Materials) Table
create table public.boms (
  id uuid primary key default gen_random_uuid(),
  product uuid references public.products(id) on delete cascade not null,
  name text not null,
  description text,
  materials jsonb not null, -- Array of objects: {material, quantity}
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.boms enable row level security;
create policy "Allow authenticated users full access to boms" on public.boms for all using (auth.role() = 'authenticated');

-- 8. Work Orders Table
create table public.work_orders (
  id uuid primary key default gen_random_uuid(),
  product uuid references public.products(id) on delete cascade not null,
  bom uuid references public.boms(id) on delete cascade not null,
  quantity numeric not null,
  status text not null default 'Pending',
  "orderNumber" text unique not null,
  "startDate" timestamp with time zone,
  "endDate" timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.work_orders enable row level security;
create policy "Allow authenticated users full access to work_orders" on public.work_orders for all using (auth.role() = 'authenticated');

-- 9. Assets Table
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,
  "serialNumber" text unique not null,
  "purchaseDate" timestamp with time zone not null,
  status text not null default 'Active' check (status in ('Active', 'Under Maintenance', 'Retired')),
  location text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.assets enable row level security;
create policy "Allow authenticated users full access to assets" on public.assets for all using (auth.role() = 'authenticated');

-- 10. Maintenance Logs Table
create table public.maintenance_logs (
  id uuid primary key default gen_random_uuid(),
  asset uuid references public.assets(id) on delete cascade not null,
  type text not null check (type in ('Scheduled', 'Issue', 'Upgrade')),
  description text not null,
  "scheduledDate" timestamp with time zone not null,
  "completionDate" timestamp with time zone,
  status text not null default 'Pending' check (status in ('Pending', 'In Progress', 'Completed')),
  cost numeric not null default 0,
  technician text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.maintenance_logs enable row level security;
create policy "Allow authenticated users full access to maintenance_logs" on public.maintenance_logs for all using (auth.role() = 'authenticated');

-- 11. Employees Table
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  "firstName" text not null,
  "lastName" text not null,
  email text unique not null,
  phone text not null,
  role text not null default 'Employee' check (role in ('Admin', 'Manager', 'Employee')),
  department text not null,
  "joiningDate" timestamp with time zone not null,
  salary numeric not null default 0,
  status text not null default 'Active' check (status in ('Active', 'On Leave', 'Terminated')),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.employees enable row level security;
create policy "Allow authenticated users full access to employees" on public.employees for all using (auth.role() = 'authenticated');

-- 11b. Attendance Table
create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  employee uuid references public.employees(id) on delete cascade not null,
  date timestamp with time zone not null,
  "checkIn" timestamp with time zone,
  "checkOut" timestamp with time zone,
  status text not null default 'Absent' check (status in ('Present', 'Absent', 'Half Day')),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.attendance enable row level security;
create policy "Allow authenticated users full access to attendance" on public.attendance for all using (auth.role() = 'authenticated');

-- 12. Leaves Table
create table public.leaves (
  id uuid primary key default gen_random_uuid(),
  employee uuid references public.employees(id) on delete cascade not null,
  type text not null,
  "startDate" timestamp with time zone not null,
  "endDate" timestamp with time zone not null,
  status text not null default 'Pending',
  reason text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.leaves enable row level security;
create policy "Allow authenticated users full access to leaves" on public.leaves for all using (auth.role() = 'authenticated');

-- 13. Accounts Table
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('Asset', 'Liability', 'Equity', 'Income', 'Expense')),
  balance numeric default 0,
  code text unique not null,
  "isActive" boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.accounts enable row level security;
create policy "Allow authenticated users full access to accounts" on public.accounts for all using (auth.role() = 'authenticated');

-- 14. Transactions Table
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  date timestamp with time zone default timezone('utc'::text, now()),
  description text not null,
  "referenceId" text,
  "referenceType" text,
  entries jsonb not null -- Array of objects: {account, type: 'DEBIT'|'CREDIT', amount}
);

alter table public.transactions enable row level security;
create policy "Allow authenticated users full access to transactions" on public.transactions for all using (auth.role() = 'authenticated');

-- 15. Alerts Table
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  type text not null,
  "isRead" boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.alerts enable row level security;
create policy "Allow authenticated users full access to alerts" on public.alerts for all using (auth.role() = 'authenticated');

-- 16. Audit Logs Table
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  "user" uuid,
  username text not null,
  action text not null,
  resource text not null,
  "resourceId" text,
  details jsonb,
  "ipAddress" text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.audit_logs enable row level security;
create policy "Allow authenticated users full access to audit_logs" on public.audit_logs for all using (auth.role() = 'authenticated');


-- 17. Settings Table
create table public.settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value jsonb not null,
  category text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.settings enable row level security;
create policy "Allow authenticated users full access to settings" on public.settings for all using (auth.role() = 'authenticated');


-- 18. Dispatches Table
create table public.dispatches (
  id uuid primary key default gen_random_uuid(),
  "order" uuid references public.sales(id) on delete cascade not null,
  "manifestNumber" text unique not null,
  carrier text not null,
  "driverName" text not null,
  "vehicleNumber" text not null,
  "dispatchDate" timestamp with time zone not null,
  status text not null default 'Pending' check (status in ('Pending', 'In Transit', 'Delivered')),
  "proofOfDelivery" text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.dispatches enable row level security;
create policy "Allow authenticated users full access to dispatches" on public.dispatches for all using (auth.role() = 'authenticated');


-- 19. OTPs Table
create table public.otps (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  otp text not null,
  "expiresAt" timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.otps enable row level security;
create policy "Allow authenticated users full access to otps" on public.otps for all using (auth.role() = 'authenticated');

