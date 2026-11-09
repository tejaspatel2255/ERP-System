<div align="center">

<img src="frontend/public/logo.svg" alt="ERP Nexus Logo" width="72" height="72"/>

# ERP Nexus — Enterprise Suite

**A full-stack, production-grade manufacturing ERP built with React 18 + Node.js + PostgreSQL**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?logo=vercel&style=flat-square)](https://erp-system-frontend-black.vercel.app)
[![Backend](https://img.shields.io/badge/API-Render-46E3B7?logo=render&style=flat-square)](https://erp-system-frontend-black.vercel.app)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&style=flat-square)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=nodedotjs&style=flat-square)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20%28Supabase%29-4169E1?logo=postgresql&style=flat-square)](https://supabase.com)

</div>

---

## Executive Overview

ERP Nexus is a **complete, production-deployed enterprise resource planning system** designed for manufacturing businesses. It covers every operational domain — from lead-to-cash sales, procure-to-pay purchasing, and shop-floor production, through to quality control, maintenance, dispatch, and HR — all in a single cohesive application.

The UI follows a **SAP Fiori / Microsoft Dynamics inspired** design language: light-first, white cards on a grey canvas, one corporate blue accent, dark navy sidebar, and dense data grids. A full dark-mode toggle is included for extended working sessions.

> **13 functional modules · 60+ pages · 60 database tables · 14 REST API route groups · 5 print-ready document types**

---

## 🌐 Live Demo

| Environment | URL |
|---|---|
| **Frontend (Vercel)** | https://erp-system-frontend-black.vercel.app |
| **Demo credentials** | Register → await admin approval, or ask admin to create a test user |

---

## ⭐ What Makes This ERP Different

Most open-source or demo ERPs implement CRUD operations and call it done. ERP Nexus includes several features that are **uncommon even in paid ERP products**:

### 🔒 1. Mandatory QC Gate Enforcement
Stock is **never incremented on GRN and Work Orders never move to Complete** without an explicit QC Pass. The gate is enforced at the API level in `qcController.js` — bypassing it via the UI is impossible. This mirrors how real manufacturing ERPs (SAP QM, Oracle WMS) block stock movements on quality hold.

### 📄 2. CAD / Design File Module with Version Control
A dedicated **Design & Engineering** module tracks:
- CAD/drawing file uploads per project
- **Full version history** — upload new revision → old version archived, new one becomes current
- **Review workflow** — reviewers can Approve or Reject each version with comments
- **Kanban task board** for design tasks with priority colour rails

This is not a typical ERP feature; most ERPs treat design files as attachments, not first-class entities with their own state machine.

### 🏭 3. QC Traceability Across Three Inspection Stages
Quality Control is split into three independent, traceable stages:
1. **Raw Material QC** — inspects incoming GRN items before stock update
2. **In-Process QC** — mid-production inspection linked to Work Orders
3. **Final QC** — finished goods inspection before dispatch clearance

Each stage produces a record with inspector, timestamp, result, and remarks. Non-conformances flow into a **NCR (Non-Conformance Report)** register.

### 📦 4. Atomic Packing Slip → Stock Deduction
When a Packing Slip is created, the backend **atomically deducts finished-goods stock** in the same database transaction. There is no manual stock-out step — the dispatch action IS the inventory action, preventing double-accounting.

### ✅ 5. User Self-Registration + Admin Approval Workflow
New users register themselves via a public registration page. Their account enters **Pending Approval** state — they cannot log in until an Administrator:
1. Reviews the pending user in the Users page
2. Approves the account
3. Assigns one or more roles

The login API returns a specific `ACCOUNT_PENDING_APPROVAL` error code so the frontend can show a friendly "awaiting approval" message instead of a generic error.

### 🛒 6. Threshold-Based PO Auto-Approval
Purchase Orders below a configurable threshold (`PO_APPROVAL_THRESHOLD` env var, default ₹10,000) are **auto-approved** on creation. Orders above the threshold enter a Pending Approval queue. This mirrors real procurement policy enforcement and eliminates manual overhead for small purchases.

### 📋 7. Inline Per-Row Material Issue in Work Orders
Work Order material planning shows BOM components as individual rows. Each row has an **inline issue form** — quantity input, item selector, and Issue button — directly on the row. No separate modal needed. As materials are issued, the consumption is logged to `material_consumption` and stock is decremented in the same transaction.

### 🖨️ 8. Five Print-Ready Enterprise Documents (In-App)
Print views are dedicated routes (`/print/invoice/:id`, `/print/po/:id`, etc.) that render clean A4 layouts using **IBM Plex Sans** typography, with the company logo, formatted addresses, line-item tables, totals, and terms. Triggered by a Printer icon within the app — no external PDF tool required. Documents:
- **Tax Invoice** (Sales)
- **Quotation** (Sales)
- **Purchase Order** (Purchase)
- **Packing Slip** (Dispatch)
- **Delivery Challan** (Dispatch)

### 🔔 9. Live Notification System with Stock + QA Alerts
The top-bar bell icon loads a live panel showing:
- Items whose current stock has fallen below the **reorder level** (colour-coded: Critical / Low / Monitor)
- **Pending QC approvals** count

Stock alert severity is calculated as a ratio (`current_stock / reorder_level × 100`) and displayed as a visual progress bar within the alert card.

### 📊 10. BOM State Machine (Draft → Active, no edit when Active)
Bills of Material have a two-state lifecycle:
- **Draft** — editable, components can be added/removed
- **Active** — locked; no edits permitted

A Work Order can only be created against an Active BOM. This prevents mid-run BOM changes from corrupting production records — a common source of data integrity bugs in simpler systems.

### 📑 11. Delivery Challan with E-Way Bill & LR Docket Tracking
Delivery Challans capture logistics metadata beyond just shipped items:
- **E-Way Bill number** and expiry
- **LR (Lorry Receipt) docket number**
- **Transport details** (transporter name, vehicle number, mode)
- **Proof of Delivery (POD)** upload and status

This is a legal requirement for Indian GST-registered businesses and is rarely implemented in demo ERPs.

### 🔐 12. Granular RBAC with a Visual Permission Matrix
Roles & Permissions are managed through a **visual matrix page** — rows = permissions, columns = roles, toggleable checkboxes. Changes take effect immediately (no restart). The access control is enforced on every API route via middleware that checks `req.user.permissions`.

### 📅 13. Full HR Self-Service Portal
Employees can:
- View their own profile, attendance, and leave balance
- Apply for leave (auto-routed to manager approval)
- View training sessions they're enrolled in

HR managers see the full picture; employees see only their own data — enforced by the same RBAC system.

---

## 🗂️ Full Module Breakdown

### 🛒 Sales
| Page | Key Features |
|---|---|
| **Customers** | Customer master, contact details, credit limit, GST/PAN fields, payment history |
| **Quotations** | Multi-line quotations, validity date, discount per line, convert to Order |
| **Orders** | Sales Order lifecycle (Draft → Confirmed → Dispatched → Closed), link to Invoice |
| **Invoices** | Tax invoice generation, payment recording, outstanding balance tracking |
| **Reports** | Revenue by period, top customers, order fulfilment rate |

### 🛒 Purchase
| Page | Key Features |
|---|---|
| **Vendors** | Vendor master, bank details, PO history, performance metrics |
| **Purchase Orders** | Multi-line POs, threshold-based auto-approval, rejection with reason |
| **Vendor Invoices** | Match against GRN, 3-way matching workflow |
| **Analytics** | Spend by vendor, category-wise purchase trends, Recharts visualisations |

### 🏪 Store / Inventory
| Page | Key Features |
|---|---|
| **Items** | Item master with categories, UOM, reorder level, **opening stock initialisation** |
| **GRN** | Goods Receipt Note linked to PO, quantity verification, QC hold status |
| **Stock Issue** | Manual stock issue to departments or WOs |
| **Stock Ledger** | Full transaction history with IN/OUT, source document, running balance |
| **Stock Alerts** | Visual alert cards with severity ratio and progress bars |

### 🏭 Production
| Page | Key Features |
|---|---|
| **BOM** | Multi-level BOM, Draft/Active state machine, version awareness |
| **Production Schedule** | Calendar-style schedule with status tracking |
| **Work Orders** | Inline material issue, QC gate, costing, produced-qty tracking |

### 🔧 Maintenance
| Page | Key Features |
|---|---|
| **Assets** | Asset register with purchase date, depreciation, assigned location |
| **Schedules** | Preventive maintenance schedules, due-date tracking |
| **Issues (Kanban)** | Drag-free Kanban board with priority colour rails (Critical/High/Medium/Low) |

### ✅ Quality Assurance (QA)
| Page | Key Features |
|---|---|
| **Checklists** | Configurable inspection checklists with weighted pass criteria |
| **QA Tests** | Test records linked to checklists, inspector assignment |

### 🔬 Quality Control (QC)
| Page | Key Features |
|---|---|
| **Raw Material QC** | GRN-linked inspections; Pass → unlocks stock increment |
| **In-Process QC** | WO-linked inspections; tracks mid-production quality |
| **Final QC** | Finished-goods inspection before dispatch |
| **NCR** | Non-Conformance Reports with root cause, disposition, corrective action |

### 🚚 Dispatch
| Page | Key Features |
|---|---|
| **Packing Slips** | Multi-item packing, atomic stock deduction, printable layout |
| **Delivery Challans** | E-way bill, LR docket, transporter, POD status, printable layout |
| **Dispatch Schedule** | Daily dispatch planning view |

### 👥 HR
| Page | Key Features |
|---|---|
| **Employees** | Employee master with department, designation, joining date |
| **Attendance** | Daily attendance marking, present/absent/leave/half-day statuses |
| **Leave** | Leave types, balance management, application and approval workflow |
| **Self Service** | Employee-facing portal for profile, leave balance, training |
| **Training** | Training session management, attendance tracking |

### 📐 Design / CAD
| Page | Key Features |
|---|---|
| **Design Files** | File uploads, version history, current version tracking |
| **Design Tasks (Kanban)** | Kanban board for design tasks, priority rails |
| **Reviews** | Version-level review workflow — Approve / Reject with comments |

### 🔑 Admin
| Page | Key Features |
|---|---|
| **Users** | User list, approve pending accounts, deactivate, role assignment |
| **Roles** | Create roles, visual permission matrix (checkboxes) |
| **Activity Logs** | Per-user, per-module, per-date filter + CSV export |
| **Settings** | Company details, logo, notification preferences |
| **Dashboard** | KPI cards, revenue chart, inventory donut, recent activity feed |

---

## 🏗️ Technical Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│  React 18  •  Vite 5  •  Tailwind CSS 3.4  •  react-router-dom │
│  recharts  •  lucide-react  •  axios  •  react-hot-toast        │
└───────────────────────────┬─────────────────────────────────────┘
                            │  HTTPS / REST JSON
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API SERVER (Node.js)                        │
│  Express 4  •  helmet  •  cors  •  morgan  •  cookie-parser     │
│  express-rate-limit  •  express-validator  •  multer            │
│  14 route groups  •  JWT + httpOnly refresh cookie auth         │
└───────────────────────────┬─────────────────────────────────────┘
                            │  pg (node-postgres) + Supabase SDK
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│               PostgreSQL Database (Supabase)                    │
│  60 tables  •  FK constraints  •  transactions for atomicity    │
│  Supabase Storage (design file / document uploads)             │
└─────────────────────────────────────────────────────────────────┘
```

### Deployment
| Layer | Platform | Notes |
|---|---|---|
| Frontend | **Vercel** | Auto-deploy from `main`, preview on PRs |
| Backend API | **Render / Railway** | Node.js web service |
| Database | **Supabase** | Managed PostgreSQL + object storage |

---

## 🎨 Design System — "Enterprise Clean"

Inspired by **SAP Fiori** and **Microsoft Dynamics 365**. All design tokens are CSS variables in `frontend/src/index.css` and surfaced as Tailwind utility classes via `tailwind.config.js`.

| Token | Light | Dark |
|---|---|---|
| `--bg-primary` | `#f4f6f8` | `#0f172a` |
| `--bg-card` | `#ffffff` | `#1e293b` |
| `--accent-primary` | `#2563eb` | `#3b82f6` |
| `--text-primary` | `#111827` | `#f1f5f9` |
| `--text-secondary` | `#6b7280` | `#94a3b8` |

**Component class vocabulary (defined in `index.css`):**

| Class | Purpose |
|---|---|
| `sheet` | White card — 1 px border, 8 px radius, soft shadow |
| `btn btn-primary` | Corporate blue CTA button (34 px) |
| `btn btn-danger` | Destructive action button |
| `btn btn-ghost` | Borderless secondary button |
| `bom` + `bom-row` | Dense data grid table with sticky header |
| `andon-tag` + `lamp` | Status pill with coloured dot |
| `stamp` | Record number — blue monospace, link-style |
| `field` / `field-label` | Standardised input / label |
| `progress > span` | Progress bar (width set inline) |
| `step-dot` | Numbered stepper circle |

**Typography:** IBM Plex Sans (body) · IBM Plex Mono (record numbers/codes)

---

## 🗄️ Database Schema

**60 tables** across all domains:

| Domain | Tables |
|---|---|
| Auth & Admin | `users`, `roles`, `user_roles`, `permissions`, `role_permissions`, `departments`, `refresh_tokens`, `activity_logs`, `settings` |
| Sequences | `doc_number_sequences` (auto-numbering for all document types) |
| Items | `items`, `item_categories`, `stock_transactions` |
| Sales | `customers`, `quotations`, `quotation_items`, `sales_orders`, `sales_order_items`, `invoices`, `payments` |
| Purchase | `vendors`, `purchase_orders`, `purchase_order_items`, `vendor_invoices` |
| Store / GRN | `grn`, `grn_items` |
| Production | `bom`, `bom_items`, `work_orders`, `material_consumption`, `production_costs` |
| Maintenance | `assets`, `maintenance_schedules`, `maintenance_logs`, `issue_logs` |
| QA | `qa_checklists`, `qa_checklist_items`, `qa_tests`, `qa_test_results`, `qa_reports`, `qa_approvals` |
| QC | `qc_raw_material`, `qc_in_process`, `qc_final`, `ncr` |
| Dispatch | `packing_slips`, `packing_slip_items`, `delivery_challans`, `transport_details`, `proof_of_delivery` |
| HR | `employees`, `attendance`, `leave_types`, `leave_applications`, `leave_balances`, `training_sessions`, `training_attendance` |
| Design | `design_files`, `design_versions`, `design_tasks`, `design_reviews` |

---

## 🔐 Security & Authentication

| Feature | Implementation |
|---|---|
| **JWT access tokens** | Short-lived, sent in `Authorization: Bearer` header |
| **Refresh tokens** | Long-lived, stored in `httpOnly` cookie (XSS-resistant) |
| **RBAC** | Every API route checks `req.user.permissions` via middleware |
| **Password hashing** | bcryptjs (salt rounds = 10) |
| **Rate limiting** | express-rate-limit on auth endpoints |
| **Security headers** | helmet (CSP, HSTS, X-Frame-Options, etc.) |
| **Input validation** | express-validator on all mutation endpoints |
| **Account approval** | New registrations blocked until admin approves |
| **Deactivation** | Admin can deactivate accounts; refresh tokens revoked |

---

## 🌐 API Architecture

14 route groups, all prefixed `/api/`:

```
/api/auth          → login, register, refresh, logout
/api/users         → user management, approval, role assignment
/api/dashboard     → KPI aggregation, recent activity
/api/sales         → customers, quotations, orders, invoices, payments
/api/purchase      → vendors, POs, vendor invoices, analytics
/api/store         → items, GRN, stock issues, ledger, alerts
/api/production    → BOM, work orders, schedules, costing
/api/maintenance   → assets, schedules, issues
/api/qa            → checklists, tests, results
/api/qc            → raw material QC, in-process QC, final QC, NCR
/api/dispatch      → packing slips, delivery challans, schedule
/api/hr            → employees, attendance, leave, training
/api/design        → files, versions, tasks, reviews
/api/settings      → company settings
```

All endpoints return `{ success: boolean, ...data }`. Errors include a `message` and optional `code` field for frontend-driven UX (e.g., `ACCOUNT_PENDING_APPROVAL`).

---

## ⚡ Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- PostgreSQL 15+ (or a [Supabase](https://supabase.com) project)

### 1. Clone
```bash
git clone https://github.com/tejaspatel2255/ERP-System.git
cd ERP-System
```

### 2. Backend Setup
```bash
cd backend
cp .env.example .env     # fill in DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET,
                          # SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLIENT_URL
npm install
# Run schema migration
psql $DATABASE_URL -f db/schema.sql
npm run dev              # starts on port 5000 (nodemon)
```

### 3. Frontend Setup
```bash
cd frontend
cp .env.example .env     # set VITE_API_BASE_URL=http://localhost:5000
npm install
npm run dev              # starts on port 5173 (Vite HMR)
```

### 4. Open
Navigate to `http://localhost:5173`. Register an account, then approve it in the Users page (you'll need to seed an admin user first — see `backend/db/schema.sql` for the users table structure).

---

## 🚀 Deployment Guide

### Frontend → Vercel
1. Push to GitHub `main`
2. Import repo in [vercel.com](https://vercel.com)
3. Set `VITE_API_BASE_URL` to your backend URL
4. Framework preset: **Vite**
5. Output directory: `frontend/dist`

### Backend → Render
1. Create a new **Web Service** in [render.com](https://render.com)
2. Root directory: `backend`
3. Build command: `npm install`
4. Start command: `node server.js`
5. Add all environment variables from `.env.example`

---

## 📁 Project Structure

```
ERP-System/
├── frontend/
│   ├── src/
│   │   ├── api/              # axios instance + per-module API helpers
│   │   ├── components/       # shared UI: Table, StatusBadge, Modal, Sidebar, Topbar
│   │   ├── context/          # AuthContext, ThemeContext
│   │   ├── hooks/            # custom React hooks
│   │   ├── pages/            # 55+ page components, grouped by module
│   │   │   ├── print/        # 5 printable document pages
│   │   │   ├── design/       # Design files, tasks, reviews
│   │   │   ├── dispatch/     # Packing slips, challans
│   │   │   ├── hr/           # Employees, attendance, leave, self-service
│   │   │   ├── maintenance/  # Assets, schedules, issues kanban
│   │   │   ├── production/   # BOM, work orders, schedule
│   │   │   ├── qa/ qc/       # QA checklists, tests; QC 3-stage + NCR
│   │   │   ├── purchase/     # Vendors, POs, analytics
│   │   │   ├── sales/        # Customers, quotations, orders, invoices
│   │   │   └── store/        # Items, GRN, ledger, alerts
│   │   ├── utils/            # formatCurrency (INR), date helpers
│   │   └── index.css         # Design token CSS variables + component classes
│   ├── tailwind.config.js    # CSS var → Tailwind colour mapping
│   └── vite.config.js
├── backend/
│   ├── controllers/          # 14 controller files (business logic)
│   ├── routes/               # 14 Express router files
│   ├── middleware/           # auth (JWT + RBAC), errorHandler, upload
│   ├── models/               # db.js (pg Pool)
│   ├── db/
│   │   └── schema.sql        # Full PostgreSQL schema (60 tables)
│   └── server.js             # Express app entry point
├── Flow of project.txt       # Architecture decision log
├── USER_GUIDE.md             # End-user operation manual
└── README.md                 # This file
```

---

## 🌙 Light & Dark Mode

ERP Nexus ships with a **fully themed dark mode**. Toggle it via the sun/moon icon in the top bar. The preference is persisted in `localStorage`. All 60+ pages, every card, table, badge, button, and input adapt via CSS variable switching — no hardcoded colours anywhere in the component tree.

---

## 📄 License

MIT © 2024–2026 [Tejas Patel](https://github.com/tejaspatel2255)

---

<div align="center">

Built with ❤️ using React, Node.js, and PostgreSQL

[Live Demo](https://erp-system-frontend-black.vercel.app) · [Report a Bug](https://github.com/tejaspatel2255/ERP-System/issues) · [GitHub](https://github.com/tejaspatel2255/ERP-System)

</div>
