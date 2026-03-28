# ERP-System

## Overview

ERP-System is a comprehensive Enterprise Resource Planning (ERP) solution built with Next.js 14 (App Router) and TypeScript. It features a modular architecture with separate packages for the core backend, frontend, and shared utilities.

## Features

- **Next.js 14 App Router**: Modern, server-component based architecture
- **TypeScript**: Type safety across the entire application
- **Modular Architecture**: Separate packages for backend, frontend, and shared code
- **Real-time Features**: WebSocket support for real-time updates
- **AI Integration**: Built-in AI chatbot for business assistance
- **Comprehensive Modules**:
  - **Sales**: Sales orders, quotations, invoices
  - **Purchase**: Purchase orders, vendor management
  - **Inventory**: Stock management, ledger tracking
  - **Production**: Bill of Materials (BOM), work orders
  - **Dispatch**: Delivery challans, shipment tracking
  - **Finance**: Accounting, journal entries, reports
  - **HR**: Employee management, attendance, leave
  - **Maintenance**: Asset management, maintenance scheduling
  - **Customers**: Customer management and analytics
  - **Settings**: System configuration and user management

## Project Structure

```
ERP-System/
├── erp-server/        # Backend Node.js/Express API services
├── erp-core/          # Frontend Next.js 14 application
├── erp-shared/        # Shared types, constants, and Zod schemas
├── .gitignore         # Git ignore file
├── README.md          # Project documentation
└── package.json       # Root package.json
```

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/ERP-System.git
   cd ERP-System
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the root directory (or copy `.env.example` if available):
   ```bash
   cp .env.example .env
   ```
   Update the environment variables in `.env` with your configuration.

4. **Run the development server**
   ```bash
   npm run dev
   ```

## Development

### Running the Backend

The backend is located in the `erp-server` directory.

```bash
cd erp-server
npm install
npm run dev
```

The backend API will be available at `http://localhost:3001` (or as configured in `.env`).

### Running the Frontend

The frontend is located in the `erp-core` directory.

```bash
cd erp-core
npm install
npm run dev
```

The frontend application will be available at `http://localhost:3000`.

### Running Both

You can run both the backend and frontend simultaneously using a tool like `concurrently` or by running them in separate terminal windows.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
