export interface Customer {
    _id: string;
    name: string;
    email: string;
    phone: string;
    address?: string;
    gstin?: string;
    status: 'active' | 'inactive';
    createdAt: string;
}

export interface ApiResponse<T> {
    data?: T;
    error?: string;
    message?: string;
}

export interface Product {
    _id: string;
    name: string;
    sku: string;
    category: string;
    price: number;
    stock: number;
    minLevel: number;
    unit: string;
    type: 'raw_material' | 'finished_good' | 'service';
    unitCost?: number;
    createdAt: string;
}

export interface BOM {
    _id: string;
    name: string;
    product: Product;
    materials: {
        material: Product;
        quantity: number;
    }[];
    notes?: string;
}

export interface WorkOrder {
    _id: string;
    orderNumber: string;
    product: Product;
    bom: BOM;
    quantity: number;
    status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
    startDate?: string;
    endDate?: string;
    createdAt: string;
}

export interface SaleItem {
    product: Product;
    name: string;
    quantity: number;
    price: number;
    total: number;
}

export interface Sale {
    _id: string;
    customer: Customer;
    customerName: string;
    items: SaleItem[];
    totalAmount: number;
    status: 'Pending' | 'Completed' | 'Cancelled';
    date: string;
}

export interface StoreLedger {
    _id: string;
    product: Product;
    type: 'IN' | 'OUT';
    quantity: number;
    referenceId: string;
    referenceType: 'Sale' | 'Purchase' | 'Adjustment';
    date: string;
    remarks?: string;
}

export interface Alert {
    _id: string;
    message: string;
    type: 'LOW_STOCK' | 'SYSTEM' | 'INFO';
    isRead: boolean;
    createdAt: string;
}

export interface Asset {
    _id: string;
    name: string;
    type: string;
    serialNumber: string;
    purchaseDate: string;
    status: 'Active' | 'Under Maintenance' | 'Retired';
    location: string;
    createdAt: string;
}

export interface MaintenanceLog {
    _id: string;
    asset: Asset | string;
    type: 'Scheduled' | 'Issue' | 'Upgrade';
    description: string;
    scheduledDate: string;
    completionDate?: string;
    status: 'Pending' | 'In Progress' | 'Completed';
    cost: number;
    technician: string;
    createdAt: string;
}

export interface Dispatch {
    _id: string;
    order: Sale; // Populated
    manifestNumber: string;
    carrier: string;
    driverName: string;
    vehicleNumber: string;
    dispatchDate: string;
    status: 'Pending' | 'In Transit' | 'Delivered';
    proofOfDelivery?: string;
    createdAt: string;
}

export interface Employee {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: 'Admin' | 'Manager' | 'Employee';
    department: string;
    joiningDate: string;
    salary: number;
    status: 'Active' | 'On Leave' | 'Terminated';
    createdAt: string;
}

export interface Attendance {
    _id: string;
    employee: Employee | string; // Populated or ID
    date: string;
    checkIn?: string;
    checkOut?: string;
    status: 'Present' | 'Absent' | 'Half Day';
    createdAt: string;
}

export interface Leave {
    _id: string;
    employee: Employee | string;
    startDate: string;
    endDate: string;
    type: 'Sick' | 'Casual' | 'Earned' | 'Unpaid';
    reason: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    createdAt: string;
}

export interface Setting {
    _id: string;
    key: string;
    value: any;
    category: 'General' | 'Security' | 'Notifications' | 'System';
    description?: string;
    updatedAt: string;
}

export interface Account {
    _id: string;
    code: string;
    name: string;
    type: 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';
    balance: number;
    description?: string;
    isActive: boolean;
}

export interface TransactionEntry {
    account: Account | string;
    debit: number;
    credit: number;
}

export interface Transaction {
    _id: string;
    date: string;
    description: string;
    reference?: string;
    entries: TransactionEntry[];
    status: 'Draft' | 'Posted';
    createdAt: string;
}

export interface PurchaseItem {
    product: Product;
    name: string;
    quantity: number;
    cost: number;
    total: number;
}

export interface Purchase {
    _id: string;
    vendorName: string;
    items: PurchaseItem[];
    totalAmount: number;
    date: string;
}

export interface User {
    _id: string;
    username: string;
    name: string;
    email: string;
    mobile: string;
    role: 'admin' | 'user' | 'manager';
    status: 'active' | 'pending' | 'blocked';
    emailVerified: boolean;
    createdAt: string;
    lastLogin?: string;
}

export * from './schemas';


