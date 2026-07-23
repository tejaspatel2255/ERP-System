# ERP Nexus — Production-Grade Enterprise Resource Planning System

A full-stack, modular ERP system built for **Hina Industries** with **React + Vite + Dual-Theme CSS System** (frontend) and **Node.js + Express + PostgreSQL / Supabase** (backend). Features 13 integrated operational modules ranging from Sales to HR Self-Service, hardened with `httpOnly` Cookie authentication, Content Security Policy, rate limiting, and role-based access control.

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, Dual-Theme System (Dark/Light), React Portals, Recharts, Lucide Icons |
| **Backend** | Node.js, Express.js (ESM), Helmet (CSP), Rate Limiter, Cookie-Parser |
| **Database** | PostgreSQL (Supabase / Self-hosted pg pool) |
| **Auth** | JWT (in-memory access token + `httpOnly` refresh cookie), bcryptjs |
| **Storage** | Supabase Storage (Design files, Proof-of-Delivery, QA reports) |
| **Formatting** | `Intl.NumberFormat` Indian Rupee (₹ INR) currency standardisation |

---

## 🗂️ Core Modules

| # | Module | Features & Capabilities |
|---|--------|------------------------|
| 1 | **Auth & Roles** | `httpOnly` refresh token, rate-limited login, RBAC permissions, user approval workflow, activity audit logs, inline department management |
| 2 | **Sales** | Customers, Quotations (`quotation_no`), Sales Orders (`order_no`), Invoices (`invoice_no`), Collections in ₹ |
| 3 | **Purchase** | Vendors, Purchase Orders (`po_no`), Approval Workflow, Vendor Invoices, Rejection Tracking |
| 4 | **Store / Inventory** | Item Master (`item_type`), GRN (`grn_no`), Stock Transactions, Stock Position, Stock Ledger |
| 5 | **Production** | Bill of Materials (versioned), Work Orders (`wo_no`), Material Consumption, Costing |
| 6 | **Maintenance** | Asset Management, Preventive Maintenance Schedules, Asset Issue Ticketing |
| 7 | **Quality Assurance** | QA Checklists, Test Reports, File Uploads, Approval Workflow (`approval_status`) |
| 8 | **Quality Control** | Incoming Raw Material QC, In-Process QC, Final Product QC, NCR Management (`ncr_no`) |
| 9 | **Dispatch** | Packing Slips (`packing_slip_no`), Delivery Challans (`challan_no`), Transport Details, POD Upload |
| 10 | **HR & Self-Service** | Employee Directory, User-Employee Linkage, Attendance Matrix, Leave Applications & Quotas, Self-Service |
| 11 | **Design** | File Versioning (CAD/PDF), Design Kanban Tasks, Review & Approval Workflows |
| 12 | **Dashboard** | Dynamic real-time KPI Cards in ₹, Month-over-Month (MoM) live trend calculations, Sales Trend Analytics, Inventory Breakdown, Activity Feed |
| 13 | **Settings** | System-wide settings & company configuration in dual-theme layout |

---

## 🎨 Design System & Theme Engine

- **Dual-Theme Support**: Instant switching between dark mode and light mode with an interactive Sun/Moon toggle button, OS color preference detection, and `localStorage` persistence.
- **Dynamic Dashboard KPIs**: Real-time MoM comparison percentage calculation across all 6 operational metrics.
- **Precision Status Badges**: High contrast status indicators for document and workflow states.
- **React Portal Modals**: Modals render directly into `document.body` via `createPortal`, guaranteeing full-viewport backdrop coverage with zero clipping seams, capped height (`max-h-[90vh]`), and internal content scrolling.
- **Indian Rupee (₹ INR)**: Built-in `formatINR` formatter utilizing `en-IN` locale digit grouping (e.g. `₹1,50,000.00`).

---

## 🔒 Security & Safe Pushing Guidelines

- **Environment File Protection**: `.env`, `.env.local`, and sensitive environment files are excluded via `.gitignore`. Never commit API keys or passwords.
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
git clone https://github.com/tejaspatel2255/ERP-System.git
cd ERP-System
```

---

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env` (Copy from `backend/.env.example` if available):

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

Run Database Migrations:
```bash
node scripts/run_migration.js
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

## 📤 Pushing Safely to GitHub

To push your updates safely to GitHub without exposing secrets:

```bash
# 1. Check status to confirm no sensitive files are tracked
git status

# 2. Add all tracked changes
git add .

# 3. Commit with a descriptive message
git commit -m "feat: complete ERP Nexus deployment with dynamic dashboard KPIs and department management"

# 4. Push safely to GitHub
git push origin main
```

---

## 📁 Project Structure

```
ERP-System/
├── backend/
│   ├── controllers/        # Business logic for all 13 modules (including dynamic dashboard MoM metrics)
│   ├── db/                 # schema.sql and migrations/ (001 to 006)
│   ├── middleware/         # auth.js, rbac.js, upload.js, errorHandler.js
│   ├── models/             # db.js (PostgreSQL pool)
│   ├── routes/             # Express routers
│   ├── scripts/            # Admin seed, migration runner, and schema check scripts
│   └── server.js           # Server entry point
│
└── frontend/
    ├── src/
    │   ├── api/            # Axios instance with refresh interceptor & API endpoints
    │   ├── components/     # Modal (Portal), PageHeader, Table, StatusBadge, Navbar
    │   ├── context/        # AuthContext, RoleContext, ThemeContext
    │   ├── pages/          # 13 Module Pages + Print Views
    │   └── utils/          # Currency (formatINR), date, and CSV export helpers
    └── index.html
```

---

## 📄 License

MIT — open for production use and customization.
