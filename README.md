# 🏭 ERP Nexus — Full-Stack Enterprise Resource Planning System

> **Enterprise Discrete Manufacturing ERP**  
> Built by **Tejas Patel** | Deployed on **Vercel** (Frontend) + **Render/Railway** (Backend) + **Supabase** (Database)

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-erp--system--frontend--black.vercel.app-blue?style=for-the-badge)](https://erp-system-frontend-black.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-tejaspatel2255%2FERP--System-black?style=for-the-badge&logo=github)](https://github.com/tejaspatel2255/ERP-System)

---

## 📌 Project Overview

**ERP Nexus** is a production-grade, modular Enterprise Resource Planning (ERP) system purpose-built for discrete manufacturing enterprises. It manages the complete operational lifecycle — from customer quotations and sales orders, through BOM engineering, production work orders, and rigorous multi-stage quality control (Raw Material QC, In-Process QC, Final QC), to warehouse inventory, delivery challans, and final tax invoicing.

### Design System: "Drawing Sheet + Andon" (23/23 Phases Completed)
The entire user interface is designed on a dedicated industrial manufacturing design system:
- **Blueprint Paper Grid & Drawing Sheets (`.sheet`)**: Technical drafting paper aesthetic with crisp engineering borders, grid background paper, and structured title blocks.
- **Andon Board Status System (`<StatusBadge>`, `.lamp`, `.andon-tag`)**: Physical stack-light indicators (green / amber / red) showing equipment, inspection, and process state at a glance.
- **Hazard Tape Accent Stripes (`.hazard-strip`)**: High-visibility safety markings for critical alerts, NCR quarantine records, and error boundaries.
- **Mechanical Push-Buttons (`.btn`, `.btn-primary`, `.btn-secondary`, `.btn-success`, `.btn-danger`, `.btn-warning`)**: Tactile, industrial push-button controls with drop-press feedback and monospace tracking.
- **Dual Visual Palettes**:
  - **Vellum (Light Mode)**: Cream drafting paper canvas (`#E8E3D3`), ink-navy lines (`#14213D`), and safety orange accents (`#CF4A0C`).
  - **Cyanotype (Dark Mode)**: Night-shift blueprint navy canvas (`#07111F`), crisp technical readouts (`#E3EEFB`), and glowing orange accents (`#FF7A2F`).
- **Precision Typography Scale**: Space Grotesk for hierarchy and JetBrains Mono for all numeric metrics, currency amounts, codes, and IDs.

---

## 🎯 Key Features Implemented

- ✅ **Drawing Sheet & Andon Interface** — Specialized manufacturing UI with BOM-style numbered tables, technical title blocks, and Andon lamps across 35+ operational pages.
- ✅ **Operations Command Center** — Live MTD revenue gauge plates, MoM trend arrows, closed-loop lifecycle assembly line, and Recharts operational distributions.
- ✅ **JWT Authentication & Gate Clearance** — Access token with `httpOnly` refresh cookie, role-based access control (RBAC), and operator approval workflow.
- ✅ **13 Operational Modules** covering the entire closed-loop manufacturing cycle.
- ✅ **Strict QC Gate Enforcement** — Work Orders and Inward GRN require QC clearance before finished/raw inventory increments.
- ✅ **Automatic Stock Deduction** on Packing Slip creation (synchronized Dispatch ↔ Inventory ledger).
- ✅ **Transactional Integrity** — PostgreSQL transactions (`BEGIN / COMMIT / ROLLBACK`) on all multi-table business updates.
- ✅ **Indian Rupee (₹ INR)** formatting throughout using standardized financial formatters.
- ✅ **Comprehensive Activity Audit Logs** capturing operator telemetry across all system actions.
- ✅ **Industrial Document Printing** — Printable Invoices, Quotations, Purchase Orders, Delivery Challans, and Packing Slips formatted for high-contrast letterheads.

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS + Custom Industrial Components, Recharts, Lucide Icons, React Router 6 |
| **Backend** | Node.js, Express.js (ESM), Helmet (CSP), express-rate-limit, Cookie-Parser, CORS |
| **Database** | PostgreSQL 15 via [Supabase](https://supabase.com) |
| **Authentication** | JWT (in-memory access token + `httpOnly` refresh cookie), bcryptjs |
| **File Storage** | Supabase Storage (QA Test Reports, Dispatch PODs, CAD/Design files) |
| **Deployment** | Vercel (Frontend) + Railway/Render (Backend) |

---

## 🗂️ 13 Core Modules

| # | Zone | Module | Key Capabilities |
|---|:---:|---|---|
| 1 | `Z00` | **Auth & Roles** | Operator authentication, RBAC permission matrix, user approval gating, audit logs |
| 2 | `Z01` | **Sales** | Commercial Customers CRM, Quotations, Sales Orders, Tax Invoices, Payment Tracking |
| 3 | `Z02` | **Procurement** | Vendor Directory, Purchase Orders (PO), Multi-level Approval Workflow, Vendor Invoices |
| 4 | `Z03` | **Inventory & Store** | Item Master, Inward Goods Receipt Notes (GRN), Stock Issue, Ledger, Stock Reorder Alerts |
| 5 | `Z04` | **Manufacturing Ops** | Bill of Materials (BOM), Assembly Work Orders, Material Consumption, Batch Costing |
| 6 | `Z05` | **Equipment & Plant** | Machine Asset Register, Preventive Maintenance Schedules, Asset Issue Kanban Board |
| 7 | `Z06` | **Quality Assurance** | Standardized QA Checklists, Test Reports, Document Attachments, Approval Sign-off |
| 8 | `Z07` | **Quality Control** | Raw Material QC (GRN), In-Process QC, Final Product QC, Non-Conformance Reports (NCR) |
| 9 | `Z08` | **Logistics & Dispatch**| Packing Slips (auto stock decrement), Delivery Challans, POD Proof of Delivery Upload |
| 10 | `Z09` | **Human Resources** | Employee Directory, Attendance Matrix Register, Leave Applications, Quotas & Training |
| 11 | `Z10` | **Engineering & CAD** | Technical CAD/PDF Drawing Registers, Design Task Kanban, Review Workflows |
| 12 | `Z00` | **Command Center** | Operations Command Dashboard, MoM Analytics, Recharts Trajectories, Audit Feed |
| 13 | `Z00` | **Settings** | Organizational Configuration, GSTIN & Bank Details, Theme Palettes (Vellum / Cyanotype) |

---

## 🔄 Core Business Flow (Closed-Loop Manufacturing)

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
| **Secrets / Keys** | `.env` excluded from version control via `.gitignore`; never committed |
| **XSS Protection** | JWT tokens delivered in `httpOnly` + `Secure` + `SameSite=Strict` cookies |
| **Brute Force Protection**| Authentication endpoints rate-limited: 10 attempts / 15 minutes per IP |
| **SQL Injection** | 100% parameterized queries (`$1, $2, ...`) across all PostgreSQL operations |
| **File Upload Safety** | MIME type inspection and extension whitelist validation on all uploads |
| **HTTP Security Headers** | `helmet()` middleware with strict Content-Security-Policy headers |

---

## 🚀 Local Setup & Installation

### Prerequisites
- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- **PostgreSQL** database (local or [Supabase](https://supabase.com) project)

### 1. Clone & Install
```bash
git clone https://github.com/tejaspatel2255/ERP-System.git
cd ERP-System

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Configure Environment Variables
- Create `backend/.env` (refer to `backend/.env.example`):
```env
PORT=5000
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
CLIENT_URL=http://localhost:5173
```
- Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Run Development Servers
```bash
# Terminal 1: Backend API
cd backend && npm run dev

# Terminal 2: Frontend Client
cd frontend && npm run dev
```

Visit `http://localhost:5173` to access the application.

---

## 📄 License
MIT License. Created by Tejas Patel.
