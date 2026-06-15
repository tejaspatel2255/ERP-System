# ERP Nexus — Web-Based Enterprise Resource Planning System

A full-stack, modular ERP system built with **React + Vite** (frontend) and **Node.js + Express + PostgreSQL** (backend). Covers 12 operational modules from Sales to Dispatch, with role-based access control, real-time dashboards, and print-ready document views.

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Recharts, Lucide React |
| Backend | Node.js, Express.js (ESM) |
| Database | PostgreSQL (via Supabase or self-hosted) |
| Auth | JWT (access + refresh tokens), bcryptjs |
| Storage | Supabase Storage (design files, POD uploads) |
| HTTP Client | Axios (with interceptor-based token refresh) |

---

## 🗂️ Modules

| # | Module | Features |
|---|--------|---------|
| 1 | **Auth & Users** | Login, JWT refresh, roles, permissions, activity logs |
| 2 | **Sales** | Customers, Quotations → Orders → Invoices, reports |
| 3 | **Purchase** | Vendors, Purchase Orders (approval workflow), Vendor Invoices, analytics |
| 4 | **Store / Inventory** | Item master, GRN (stock in), stock issue, ledger, low-stock alerts |
| 5 | **Production** | Bill of Materials (versioned), Work Orders, schedule, costing |
| 6 | **Maintenance** | Assets, PM schedules, issue logs |
| 7 | **Quality Assurance** | Checklists, QA tests, report upload, approval workflow |
| 8 | **Quality Control** | Raw material QC, in-process QC, final QC, NCR management |
| 9 | **Dispatch** | Packing slips (QC-gated), delivery challans, transport logging, POD upload |
| 10 | **HR** | Employee directory, attendance grid, leave management, self-service portal, training sessions |
| 11 | **Design** | File versioning (CAD/PDF), design tasks (Kanban), review & approval workflow |
| 12 | **Dashboard** | Live KPI cards, sales trend chart, inventory pie chart, recent activity feed |

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- PostgreSQL database (or a [Supabase](https://supabase.com) project)
- npm

---

### 1. Clone the repo

```bash
git clone https://github.com/your-username/ERP.git
cd ERP
```

---

### 2. Backend Setup

```bash
cd backend
npm install
```

Create your environment file:

```bash
cp .env.example .env
```

Edit `backend/.env` with your values:

```env
PORT=5000
CLIENT_URL=http://localhost:5173

# PostgreSQL / Supabase connection string
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres

# JWT secrets — use long random strings in production
JWT_SECRET=change_me_long_random_secret
JWT_REFRESH_SECRET=change_me_another_long_random_secret

# Supabase Storage (for file uploads)
SUPABASE_URL=https://[YOUR_REF].supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
```

Start the backend:

```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

The backend runs on `http://localhost:5000`. On first start, it **auto-migrates** all required schema changes to your PostgreSQL database.

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173`.

> **Note:** If your backend is on a different port, update the `VITE_API_BASE_URL` in `frontend/src/api/axiosInstance.js`.

---

### 4. First Login

After the backend starts, create an Admin user directly in the database:

```sql
-- Insert a hashed password for 'admin@erp.com' / 'Admin@1234'
INSERT INTO users (name, email, password_hash, is_active)
VALUES ('Admin', 'admin@erp.com', '$2a$12$...your_bcrypt_hash...', true);

INSERT INTO roles (name) VALUES ('Admin') ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.email = 'admin@erp.com' AND r.name = 'Admin';
```

Or use the seed script if provided in `backend/seed.js`.

---

## 📁 Project Structure

```
ERP/
├── backend/
│   ├── controllers/        # Business logic (one file per module)
│   ├── middleware/         # auth.js, rbac.js, upload.js, errorHandler.js
│   ├── models/
│   │   └── db.js           # PostgreSQL pool + startup migrations
│   ├── routes/             # Express routers (one per module)
│   ├── server.js           # Entry point
│   └── .env.example        # Environment variable template
│
└── frontend/
    ├── src/
    │   ├── api/            # Axios API layer (one file per module)
    │   ├── components/     # Shared UI: Layout, Sidebar, Navbar, StatusBadge, etc.
    │   ├── context/        # AuthContext, RoleContext
    │   ├── pages/          # One folder per module, plus print/ views
    │   └── utils/          # exportCSV.js, formatCurrency.js, formatDate.js
    └── index.html
```

---

## 🔐 Role-Based Access Control

Permissions are stored in the database per role. The middleware `rbac.js` checks `module_name` + `action` for every protected endpoint. The **Admin** role bypasses all checks.

Actions: `view` | `create` | `edit` | `delete` | `approve`

---

## 🖨️ Print Views

Open print-ready documents directly in a new browser tab — no sidebar or navbar:

| URL | Document |
|-----|---------|
| `/print/invoice/:id` | Tax Invoice |
| `/print/quotation/:id` | Quotation |
| `/print/challan/:id` | Delivery Challan |
| `/print/packing-slip/:id` | Packing Slip |
| `/print/purchase-order/:id` | Purchase Order |

---

## 📤 CSV Export

Available on: Sales Report, Purchase Analytics, Stock Ledger, Attendance, Activity Logs.  
Uses a native JS utility (`src/utils/exportCSV.js`) — no external library required.

---

## 📄 License

MIT — free to use, modify, and distribute.
