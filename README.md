# ERP Nexus — Production-Grade Enterprise Resource Planning System

A full-stack, modular ERP system built with **React + Vite** (frontend) and **Node.js + Express + PostgreSQL / Supabase** (backend). Features 13 integrated operational modules ranging from Sales to Dispatch, hardened with httpOnly Cookie authentication, Content Security Policy, rate limiting, and role-based access control.

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, Vanilla CSS Design System, Recharts, Lucide Icons |
| **Backend** | Node.js, Express.js (ESM), Helmet (CSP), Rate Limiter, Cookie-Parser |
| **Database** | PostgreSQL (Supabase / Self-hosted pg pool) |
| **Auth** | JWT (in-memory access token + httpOnly refresh cookie), bcryptjs |
| **Storage** | Supabase Storage (Design files, Proof-of-Delivery, QA reports) |
| **HTTP Client** | Axios (with credentials & automated background token refresh) |

---

## 🗂️ Core Modules

| # | Module | Features & Capabilities |
|---|--------|------------------------|
| 1 | **Auth & Roles** | `httpOnly` refresh token, rate-limited login, RBAC permissions, activity audit logs |
| 2 | **Sales** | Customers, Quotations (`quotation_no`), Sales Orders (`order_no`), Invoices (`invoice_no`), Payments |
| 3 | **Purchase** | Vendors, Purchase Orders (`po_no`), Approval Workflow, Vendor Invoices, Rejection Tracking |
| 4 | **Store / Inventory** | Item Master (`item_type`), GRN (`grn_no`), Stock Transactions, Stock Position, Stock Ledger |
| 5 | **Production** | Bill of Materials (versioned), Work Orders (`wo_no`), Material Consumption, Costing |
| 6 | **Maintenance** | Asset Management, Preventive Maintenance Schedules, Asset Issue Ticketing |
| 7 | **Quality Assurance** | QA Checklists, Test Reports, File Uploads, Approval Workflow (`approval_status`) |
| 8 | **Quality Control** | Incoming Raw Material QC, In-Process QC, Final Product QC, NCR Management (`ncr_no`) |
| 9 | **Dispatch** | Packing Slips (`packing_slip_no`), Delivery Challans (`challan_no`), Transport Details, POD Upload |
| 10 | **HR** | Employee Directory, Attendance Matrix, Leave Applications & Balances, Training Sessions |
| 11 | **Design** | File Versioning (CAD/PDF), Design Kanban Tasks, Review & Approval Workflows |
| 12 | **Dashboard** | Real-time KPI Cards, Sales Trend Analytics, Inventory Pie Breakdown, Activity Feed |
| 13 | **Settings** | System-wide settings & company configuration |

---

## 🔒 Security & Hardening Features

- **XSS Protection**: Tokens stored in memory and `httpOnly`, `Secure`, `SameSite=Strict` cookies. Strict `Content-Security-Policy` active via `helmet`.
- **Brute-Force Rate Limiting**: Sensitive auth endpoints (`/login`, `/register`) protected via `express-rate-limit` (10 attempts / 15 mins per IP).
- **MIME & Extension Validation**: File uploads restricted by file extension and actual MIME header verification.
- **SQL Injection Prevention**: 100% parameterized queries across all database operations.
- **Idempotent Database Migrations**: Included under `backend/db/migrations/`.

---

## 🚀 Quick Start & Installation

### Prerequisites
- **Node.js**: ≥ 18.x
- **PostgreSQL**: Local instance or [Supabase](https://supabase.com) project
- **npm**

---

### 1. Clone & Setup

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

Create `backend/.env`:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# PostgreSQL / Supabase Connection
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres

# JWT Secrets (use long random strings)
JWT_SECRET=your_jwt_secret_64_chars
JWT_REFRESH_SECRET=your_jwt_refresh_secret_64_chars

# Supabase Storage
SUPABASE_URL=https://[YOUR_REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Database Setup:
- Run `backend/db/schema.sql` to initialize all database tables.
- Run `backend/db/migrations/001_add_missing_document_columns.sql` to apply all document number columns & unique indexes.

Seed Admin Account:
```bash
node scripts/seedAdmin.js
```

Start Backend:
```bash
npm run dev
```

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will start at `http://localhost:5173`.

---

## 📁 Project Structure

```
ERP/
├── backend/
│   ├── controllers/        # Business logic for all 13 modules
│   ├── db/                 # schema.sql and migrations/
│   ├── middleware/         # auth.js, rbac.js, upload.js, errorHandler.js
│   ├── models/             # db.js (PostgreSQL pool)
│   ├── routes/             # Express routers (1:1 mapping with controllers)
│   ├── scripts/            # Admin seed and schema check scripts
│   └── server.js           # Server entry point
│
└── frontend/
    ├── src/
    │   ├── api/            # Axios instance with refresh interceptor & API endpoints
    │   ├── components/     # Reusable UI components & layouts
    │   ├── context/        # AuthContext, RoleContext
    │   ├── pages/          # 13 Module Pages + Print Views
    │   └── utils/          # Currency, date, and CSV export helpers
    └── index.html
```

---

## 📄 License

MIT — open for production use and customization.
