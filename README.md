<div align="center">

# ⚡ ERP Nexus — Enterprise Resource Planning System

**A modern, production-ready, full-stack ERP platform engineered for manufacturing, supply chain, and enterprise operations.**

![Build Status](https://img.shields.io/badge/build-passing-brightgreen?style=for-the-badge&logo=vite)
![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite-61DAFB?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-339933?style=for-the-badge&logo=node.js)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20%7C%20Supabase-4169E1?style=for-the-badge&logo=postgresql)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

[Features](#-key-features) • [Architecture](#-system-architecture) • [Modules](#-module-overview) • [Quick Start](#-quick-start) • [Deployment](#-production-deployment) • [License](#-license)

</div>

---

## 📋 Executive Overview

**ERP Nexus** is a complete, modular Enterprise Resource Planning (ERP) platform built to manage end-to-end industrial workflows. From sales quotations and purchase orders to bill of materials (BOM), quality control (QC/QA), dispatch tracking, HR self-service, and CAD design reviews, ERP Nexus consolidates core enterprise functions into a unified, high-performance web interface.

Built with a **dual-theme industrial design system** (Light & Dark modes), real-time financial KPI analytics formatted in Indian Rupee (`₹ INR`), strict Role-Based Access Control (RBAC), and security hardening, ERP Nexus is optimized for both desktop and mobile operations.

---

## 🏛️ System Architecture

```
                               ┌─────────────────────────────────────────┐
                               │             React 18 + Vite             │
                               │        Dual-Theme CSS System            │
                               │    (Context API + Recharts + Lucide)    │
                               └────────────────────┬────────────────────┘
                                                    │
                                         REST API / Axios (JSON)
                                         httpOnly Refresh Cookie
                                                    │
                               ┌────────────────────▼────────────────────┐
                               │           Node.js + Express API         │
                               │   Helmet (CSP) | Rate Limiter | RBAC    │
                               └────────────────────┬────────────────────┘
                                                    │
                                       Parameterized SQL (pg pool)
                                                    │
                               ┌────────────────────▼────────────────────┐
                               │      PostgreSQL (Supabase / Self-host)   │
                               │  59 Tables | Triggers | Sequences | FKs │
                               └─────────────────────────────────────────┘
```

---

## ✨ Key Features

- 🌓 **Dual-Theme Industrial Engine**: Instant seamless toggle between dark mode and light mode, system preference auto-detection, and `localStorage` state persistence.
- 📊 **Real-Time Financial & MoM Analytics**: Dashboard KPI cards featuring Month-over-Month (MoM) trend calculations formatted in Indian Rupee (`₹ INR`).
- 🛡️ **Role-Based Access Control (RBAC)**: Fine-grained permission system protecting API endpoints and UI components across 45 module actions (`view`, `create`, `edit`, `delete`, `review`).
- 🔒 **Enterprise-Grade Security**:
  - `httpOnly`, `Secure`, `SameSite` cookie handling for token refresh authentication.
  - Helmet Content-Security-Policy (CSP) headers & `express-rate-limit` brute-force protection.
  - 100% Parameterized SQL queries preventing SQL injection risks.
- 🗄️ **Consolidated Database Architecture**: Single source of truth master `schema.sql` defining 59 relational tables, auto-updating `updated_at` triggers, foreign key constraints, and document sequence generators.
- 🖨️ **Print & Document Generation**: Dedicated printable views for Invoices, Purchase Orders, Quotations, Delivery Challans, and Packing Slips.

---

## 🗂️ Module Overview

ERP Nexus includes 13 fully integrated operational modules:

| # | Module | Core Functionality & Deliverables |
|---|--------|----------------------------------|
| **01** | **Auth & User Security** | `httpOnly` JWT refresh tokens, rate-limited login, user approval queue, activity audit log tracking, department assignment. |
| **02** | **Sales Management** | Customer directory, Quotations (`quotation_no`), Sales Orders (`order_no`), Invoices (`invoice_no`), Collections in ₹. |
| **03** | **Procurement & Purchase** | Vendor database, Purchase Orders (`po_no`), Multi-level PO approval workflow, Vendor Invoices, Rejection tracking. |
| **04** | **Store & Inventory** | Master Item Catalog (`item_type`), Goods Receipt Notes (`grn_no`), Stock Transactions, Warehouse Ledger, Min/Max stock alerts. |
| **05** | **Production & Manufacturing** | Versioned Bill of Materials (BOM), Work Orders (`wo_no`), Material Consumption tracking, Direct & Indirect Costing calculations. |
| **06** | **Equipment Maintenance** | Asset Registry, Preventive Maintenance Schedules, Technician assignments, Asset Breakdown & Repair Issue Ticketing. |
| **07** | **Quality Assurance (QA)** | QA Checklists, Work Order Testing, QA Test Reports, Attachments, Multi-stage Approval Workflow (`approval_status`). |
| **08** | **Quality Control (QC)** | Incoming Raw Material QC, In-Process QC, Final Product QC, Non-Conformance Reports (NCR - `ncr_no`). |
| **09** | **Logistics & Dispatch** | Packing Slips (`packing_slip_no`), Delivery Challans (`challan_no`), Transport & Carrier details, Proof of Delivery (POD) attachments. |
| **10** | **HR & Employee Self-Service**| Employee Profiles, User-Employee Linkage, Daily Attendance Matrix, Leave Quota Balances & Self-Service Applications. |
| **11** | **Design & Engineering** | CAD & PDF File Version Control, Kanban Task Board, Design Review Workflows & Approval Sign-offs. |
| **12** | **Executive Dashboard** | Real-time MoM KPI Cards in ₹, Live Sales Trend Charts, Inventory Breakdown, Recent Activity Feed, Quick Actions. |
| **13** | **System Settings** | Global Company Profiles (GSTIN, Address, Bank Details), PO Threshold configurations, Dual-theme UI customization. |

---

## 🛠️ Tech Stack & Dependencies

### Frontend
- **Framework**: React 18 + Vite
- **Styling**: Custom Dual-Theme CSS Token Engine + TailwindCSS Utilities
- **State & Routing**: React Context API, React Router v6
- **UI & Analytics**: Recharts (Data Visualization), Lucide React (Icons), React Hot Toast (Notifications), React Portals (Modals)

### Backend
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Security**: Helmet, Express Rate Limit, Cookie Parser, bcryptjs, JsonWebToken
- **Database Driver**: `pg` (Node-Postgres connection pool)
- **Database**: PostgreSQL / Supabase

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: `v18.x` or higher
- **PostgreSQL**: Local PostgreSQL or a free [Supabase](https://supabase.com) instance
- **Package Manager**: `npm`

---

### 1. Clone Repository

```bash
git clone https://github.com/tejaspatel2255/ERP-System.git
cd ERP-System
```

---

### 2. Configure Environment Variables

Create local environment files for each app. Never commit real secrets to GitHub. Use placeholders and keep your actual values only in local files:

```bash
# backend/.env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
JWT_SECRET=your_jwt_access_secret_min_64_chars
JWT_REFRESH_SECRET=your_jwt_refresh_secret_min_64_chars
SUPABASE_URL=https://[REF].supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

> The repository is configured to ignore `.env` files, local database files, uploads, logs, and generated build assets. Only commit safe example values or `.env.example` templates.

---

### 3. Initialize Database Schema

Execute the consolidated master schema to create all 59 tables, triggers, indexes, sequences, and seed data:

```bash
cd backend
npm install
node scripts/run_migration.js
```

---

### 4. Start Development Servers

**Backend**:
```bash
cd backend
npm run dev
```
*(Backend runs on `http://localhost:5000`)*

**Frontend**:
```bash
cd frontend
npm install
npm run dev
```
*(Frontend runs on `http://localhost:3000`)*

---

### 5. Initial Login Credentials

Once the database is initialized, log in with the pre-seeded System Administrator account:
- **Email**: `admin@erp.com`
- **Password**: `admin123`

---

## � GitHub Safety Checklist

Before pushing this project to GitHub, make sure the following are true:

- `.env`, `.env.local`, `backend/.env`, and similar secret files are not tracked.
- Uploaded files, generated logs, local database dumps, and temporary files are excluded by `.gitignore`.
- No real SSL keys, service account files, or production credentials are added to the repository.
- You use a local-only environment for development data and credentials.

To verify before pushing:

```bash
git status --short
git ls-files | grep -E "(\.env|uploads|\.pem|\.key|\.crt|\.db|\.sqlite|logs)"
```

If a secret was already committed in git history, remove it from tracking and rotate the exposed secret immediately:

```bash
git rm -r --cached .env backend/.env frontend/.env backend/uploads
```

Then create a fresh commit and push normally.

---

## �📦 Production Deployment

### Frontend (e.g. Vercel / Netlify)
1. Set Root Directory: `frontend`
2. Build Command: `npm run build`
3. Output Directory: `dist`
4. Environment Variable: `VITE_API_BASE_URL=https://your-api-domain.com/api`

### Backend (e.g. Render / Railway / Fly.io)
1. Set Root Directory: `backend`
2. Build Command: `npm install`
3. Start Command: `npm start`
4. Set Environment Variables: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CLIENT_URL`, `NODE_ENV=production`

---

## 📁 Repository Structure

```
ERP-System/
├── backend/
│   ├── controllers/        # Express request handlers for all 13 modules
│   ├── db/                 # Master idempotent schema.sql (59 tables)
│   ├── middleware/         # Auth, RBAC, Upload, Rate-Limiting, Error Handler
│   ├── models/             # Database connection pool (pg)
│   ├── routes/             # API route definitions
│   ├── scripts/            # Database initialization and diagnostic scripts
│   └── server.js           # Server entry point
│
├── frontend/
│   ├── src/
│   │   ├── api/            # Axios instance with token refresh interceptors
│   │   ├── components/     # Table, Portal Modal, PageHeader, Navbar, Badges
│   │   ├── context/        # AuthContext, RoleContext, ThemeContext
│   │   ├── pages/          # 13 Operational Module Views & Printable Templates
│   │   └── utils/          # Indian Rupee formatter (formatINR), Date utilities
│   ├── index.html
│   └── vite.config.js      # Optimized build & manual chunking config
│
├── .gitignore              # Protected secrets & build outputs
├── LICENSE                 # MIT License
└── README.md               # Enterprise Documentation
```

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<div align="center">
  <sub>Built with ❤️ by Tejas Patel for Enterprise Excellence</sub>
</div>
