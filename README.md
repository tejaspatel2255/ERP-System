# ERP-System

## Overview

ERP-System is a comprehensive Enterprise Resource Planning (ERP) solution built with Next.js (App Router), Node.js (Express), and Supabase (PostgreSQL). It features a modular monorepo architecture with separate packages for the backend, frontend, and shared utilities.

Authentication is handled locally using Express-signed JWTs, password hashing (`bcryptjs`), and 6-digit verification codes sent via SMTP (Nodemailer).

## Features

- **Next.js App Router**: Modern, component-based frontend architecture.
- **Supabase (PostgreSQL)**: Fully relational database storage with 19 structured tables.
- **Custom Local SMTP Authentication**: Email verification and password resets handled locally via custom SMTP OTP delivery (no cloud-managed authentication requirements).
- **Real-time Notifications**: Socket.io integration for instant stock level updates and alerts.
- **Comprehensive ERP Modules**:
    - **Sales & Dispatch**: Sales orders, quotations, invoices, delivery challans, and shipment tracking.
    - **Purchase & Inventory**: Purchase orders, vendor management, real-time stock levels, and store ledger tracking.
    - **Production**: Bill of Materials (BOM) configurations and work orders.
    - **Finance**: General ledger accounts, journal entries, balance reports, and tax tracking.
    - **HR & Maintenance**: Employee registries, check-in/out attendance logs, leave requests, asset registries, and maintenance tasks.
    - **Analytics**: Forecasting and smart restock recommendations.

## Project Structure

```
ERP-System/
├── backend/            # Express.js REST API server
├── frontend/           # Next.js web application
├── shared/             # Shared types, validation schemas, and configurations
├── supabase_schema.sql # Database SQL migrations
├── .gitignore          # Global git ignore configurations
├── LICENSE             # MIT License file
└── README.md           # Project documentation
```

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Database Setup

1. Create a project in [Supabase](https://supabase.com/).
2. Navigate to your project's **SQL Editor** in the Supabase Dashboard.
3. Copy the contents of the [supabase_schema.sql](supabase_schema.sql) file.
4. Paste and execute the SQL query to create the necessary tables and RLS security policies.

### Local Installation

1. **Clone the repository**
    ```bash
    git clone https://github.com/your-username/ERP-System.git
    cd ERP-System
    ```

2. **Install workspace dependencies**
    ```bash
    npm install
    ```

3. **Configure Environment Variables**

    - **Backend setup**:
      Create a `.env` file inside the `backend` folder:
      ```env
      PORT=5000
      CLIENT_URL=http://localhost:3000
      JWT_SECRET=your_custom_jwt_secret

      SUPABASE_URL=your_supabase_project_url
      SUPABASE_ANON_KEY=your_supabase_anon_key
      SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

      SMTP_HOST=smtp.gmail.com
      SMTP_PORT=587
      SMTP_USER=your_email@gmail.com
      SMTP_PASS=your_gmail_app_password
      ```

    - **Frontend setup**:
      Create a `.env.local` file inside the `frontend` folder:
      ```env
      NEXT_PUBLIC_API_URL=http://localhost:5000/api
      NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
      NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
      ```

4. **Run the Development Workspace**
    From the workspace root directory, start all components concurrently:
    ```bash
    npm run dev
    ```

## Hosting & Deployment

To host this application in production:

### 1. Frontend (Next.js)
The frontend Next.js application can be hosted on **Vercel**.
- Set the environment variables (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in the Vercel project settings dashboard.

### 2. Backend (Express.js)
The backend is a stateful Express.js app that requires a persistent server connection to support WebSockets (Socket.io). 
- **DO NOT** deploy the backend to serverless platforms like Vercel. Instead, deploy to a stateful hosting provider like **Render**, **Railway**, or a **VPS**.
- Set all the backend environment variables in your hosting provider's dashboard.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
