# 🏭 ERP Nexus — Full-Stack Enterprise Resource Planning System

> **Minor Project | Computer Engineering | Academic Year 2025–26**  
> Built by **Tejas Patel** | Deployed on **Vercel** (Frontend) + **Render/Railway** (Backend) + **Supabase** (Database)

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-erp--system--frontend--black.vercel.app-blue?style=for-the-badge)](https://erp-system-frontend-black.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-tejaspatel2255%2FERP--System-black?style=for-the-badge&logo=github)](https://github.com/tejaspatel2255/ERP-System)

---

## 📌 Project Overview

**ERP Nexus** is a production-grade, modular Enterprise Resource Planning (ERP) system that manages the complete operational lifecycle of a manufacturing enterprise — from customer quotations and sales orders, through production work orders and quality control, to inventory management and final dispatch.

The system is modeled after a real industrial use case: **Apex Industrial Solutions Ltd.**, a motor manufacturing unit that assembles and dispatches 3-phase industrial AC motors to clients across India.

---

## 🎯 Key Features Implemented

- ✅ **JWT Authentication** with `httpOnly` refresh cookies and role-based access control (RBAC)
- ✅ **13 Operational Modules** covering the full manufacturing business cycle
- ✅ **Dual-Theme UI** (Dark Mode / Light Mode) with instant OS preference detection
- ✅ **QC Gate Enforcement** — Work Orders and GRN require QC Pass before stock increments
- ✅ **Automatic Stock Deduction** on Packing Slip creation (STEP-27 Dispatch ↔ Inventory sync)
- ✅ **Sales ↔ Production ↔ Inventory** fully connected via FK-constrained transactions
- ✅ **Indian Rupee (₹ INR)** formatting throughout using `Intl.NumberFormat`
- ✅ **PostgreSQL Transactional Integrity** (`BEGIN/COMMIT/ROLLBACK`) on all critical operations
- ✅ **Activity Audit Logs** for every create/update/delete action across all modules

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Dual-Theme CSS System (Dark/Light), Recharts, Lucide Icons |
| **Backend** | Node.js, Express.js (ESM), Helmet (CSP), express-rate-limit, Cookie-Parser |
| **Database** | PostgreSQL 15 via [Supabase](https://supabase.com) (hosted) |
| **Authentication** | JWT (access token in-memory + `httpOnly` refresh cookie), bcryptjs |
| **File Storage** | Supabase Storage (QA Reports, POD attachments, Design files) |
| **Deployment** | Vercel (Frontend) + Railway/Render (Backend) |

---

## 🗂️ 13 Core Modules

| # | Module | Key Capabilities |
|---|---|---|
| 1 | **Auth & Roles** | JWT login, RBAC permissions, user approval workflow, audit logs |
| 2 | **Sales** | Customers CRM, Quotations, Sales Orders, Tax Invoices, Payment Collection |
| 3 | **Purchase** | Vendor Master, Purchase Orders, Approval Workflow, Vendor Invoices |
| 4 | **Store / Inventory** | Item Master, GRN (Stock In), Stock Transactions Ledger, Stock Position |
| 5 | **Production** | Bill of Materials (BOM), Work Orders, Material Consumption, Costing |
| 6 | **Maintenance** | Asset Register, Preventive Maintenance Schedules, Asset Issue Tickets |
| 7 | **Quality Assurance (QA)** | QA Checklists, Test Reports, File Uploads, Approval Workflow |
| 8 | **Quality Control (QC)** | Raw Material QC (GRN), In-Process QC, Final Product QC, NCR Management |
| 9 | **Dispatch** | Packing Slips (auto stock deduct), Delivery Challans, POD Upload |
| 10 | **HR & Self-Service** | Employee Directory, Attendance Matrix, Leave Applications & Quotas |
| 11 | **Design** | CAD/PDF file versioning, Design Kanban, Review & Approval Workflows |
| 12 | **Dashboard** | Real-time KPI Cards, Month-over-Month trend analytics, Activity Feed |
| 13 | **Settings** | System-wide configuration, company details, dual-theme preferences |

---

## 🔄 Core Business Flow (Demo Walkthrough)

```
Customer Order  →  Sales Quotation  →  Sales Order
       ↓
Work Order (Production)  →  BOM Explosion  →  Raw Material Allocation
       ↓
QC Gate (Pass/Fail)  →  Finished Goods Stock +
       ↓
Packing Slip (Stock Auto Deduct -)  →  Delivery Challan
       ↓
Tax Invoice  →  Payment Collection
```

---

## 🔒 Security Implementation

| Feature | Implementation |
|---|---|
| **Secrets / Keys** | `.env` excluded from git via `.gitignore`; never committed |
| **XSS Protection** | Tokens in `httpOnly` + `Secure` + `SameSite=Strict` cookies |
| **Brute Force** | Auth endpoints rate-limited: 10 attempts / 15 min per IP |
| **SQL Injection** | 100% parameterized queries (`$1, $2, ...`) across all DB ops |
| **File Upload Safety** | MIME type + extension dual validation on all uploads |
| **HTTP Security Headers** | `helmet()` middleware with strict Content-Security-Policy |

---

## 🚀 Local Setup & Installation

### Prerequisites
- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- **PostgreSQL** database (local or [Supabase](https://supabase.com) project)

---

### 1. Clone the Repository

```bash
git clone https://github.com/tejaspatel2255/ERP-System.git
cd ERP-System
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env` (use `backend/.env.example` as reference):

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# PostgreSQL / Supabase Connection
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres

# JWT Secrets (use long random 64-char strings)
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here

# Supabase Storage (optional — for file upload features)
SUPABASE_URL=https://[YOUR_REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Run migrations (first time only):
```bash
node scripts/run_migration.js
```

Start backend dev server:
```bash
npm run dev
```

Backend runs at: `http://localhost:5000`

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## 📁 Project Structure

```
ERP-System/
├── backend/
│   ├── controllers/        # Business logic — 13 modules + dashboard analytics
│   ├── db/
│   │   ├── schema.sql      # Full PostgreSQL schema with all tables & FK constraints
│   │   └── migrations/     # Incremental DB migrations (001 → 010)
│   ├── middleware/         # auth.js, rbac.js, upload.js, errorHandler.js
│   ├── models/             # db.js (PostgreSQL connection pool)
│   ├── routes/             # Express routers for all modules
│   ├── scripts/            # Seed admin, migration runner, schema checks
│   ├── utils/              # generateDocNumber.js, helpers
│   └── server.js           # Entry point with CORS, helmet, rate-limit, cookie-parser
│
└── frontend/
    ├── public/
    └── src/
        ├── api/            # Axios instance with auto-refresh interceptor + all API files
        ├── components/     # Modal (Portal), Table, Pagination, SearchBar, StatusBadge
        ├── context/        # AuthContext, RoleContext, ThemeContext
        ├── pages/          # All 13 module pages + Print Views
        ├── utils/          # formatINR (₹ INR), formatDate, csvExport
        └── main.jsx        # App entry point with router & providers
```

---

## 🗄️ Database Migrations

All migrations are stored in `backend/db/migrations/` and are idempotent (safe to re-run):

| Migration | Description |
|---|---|
| `001_init.sql` | Core schema — all primary tables |
| `002_rbac.sql` | Role & permissions tables |
| `003_stock.sql` | Stock transactions ledger |
| `004_hr.sql` | Employees, attendance, leave |
| `005_dispatch.sql` | Packing slips & delivery challans |
| `006_design.sql` | Design files & Kanban |
| `007_audit.sql` | Activity logs & department FK |
| `008_qc_gate.sql` | QC status columns on GRN & Work Orders |
| `009_wo_so_fk.sql` | Work Orders → Sales Orders FK constraint |
| `010_wo_asset_fk.sql` | Work Orders → Assets FK with ON DELETE SET NULL |

---

## 📄 License

MIT License — open for production use, academic reference, and customization.

---

## 👨‍💻 Author

**Tejas Patel**  
Computer Engineering Student  
Gujarat, India  
GitHub: [@tejaspatel2255](https://github.com/tejaspatel2255)
