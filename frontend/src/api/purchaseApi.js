import axiosInstance from './axiosInstance';

// ==========================================
// VENDORS
// ==========================================

export const getVendors = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params.append(key, filters[key]);
    }
  });
  const response = await axiosInstance.get(`/purchase/vendors?${params.toString()}`);
  return response.data;
};

export const createVendor = async (data) => {
  const response = await axiosInstance.post('/purchase/vendors', data);
  return response.data;
};

export const getVendorById = async (id) => {
  const response = await axiosInstance.get(`/purchase/vendors/${id}`);
  return response.data;
};

export const updateVendor = async (id, data) => {
  const response = await axiosInstance.put(`/purchase/vendors/${id}`, data);
  return response.data;
};

export const deleteVendor = async (id) => {
  const response = await axiosInstance.delete(`/purchase/vendors/${id}`);
  return response.data;
};

// ==========================================
// PURCHASE ORDERS
// ==========================================

export const getPurchaseOrders = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params.append(key, filters[key]);
    }
  });
  const response = await axiosInstance.get(`/purchase/orders?${params.toString()}`);
  return response.data;
};

export const createPurchaseOrder = async (data) => {
  const response = await axiosInstance.post('/purchase/orders', data);
  return response.data;
};

export const getPurchaseOrderById = async (id) => {
  const response = await axiosInstance.get(`/purchase/orders/${id}`);
  return response.data;
};

export const updatePurchaseOrder = async (id, data) => {
  const response = await axiosInstance.put(`/purchase/orders/${id}`, data);
  return response.data;
};

export const submitPurchaseOrder = async (id) => {
  const response = await axiosInstance.patch(`/purchase/orders/${id}/submit`);
  return response.data;
};

export const approvePurchaseOrder = async (id) => {
  const response = await axiosInstance.patch(`/purchase/orders/${id}/approve`);
  return response.data;
};

export const rejectPurchaseOrder = async (id, reason) => {
  const response = await axiosInstance.patch(`/purchase/orders/${id}/reject`, { reason });
  return response.data;
};

export const updatePurchaseOrderStatus = async (id, status) => {
  const response = await axiosInstance.patch(`/purchase/orders/${id}/status`, { status });
  return response.data;
};

// ==========================================
// VENDOR INVOICES
// ==========================================

export const getVendorInvoices = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params.append(key, filters[key]);
    }
  });
  const response = await axiosInstance.get(`/purchase/invoices?${params.toString()}`);
  return response.data;
};

export const createVendorInvoice = async (data) => {
  const response = await axiosInstance.post('/purchase/invoices', data);
  return response.data;
};

export const getVendorInvoiceById = async (id) => {
  const response = await axiosInstance.get(`/purchase/invoices/${id}`);
  return response.data;
};

export const updateVendorInvoiceStatus = async (id, status) => {
  const response = await axiosInstance.patch(`/purchase/invoices/${id}/status`, { status });
  return response.data;
};

// ==========================================
// ANALYTICS / REPORTS
// ==========================================

export const getSpendByVendor = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params.append(key, filters[key]);
    }
  });
  const response = await axiosInstance.get(`/purchase/analytics/by-vendor?${params.toString()}`);
  return response.data;
};

export const getSpendByItem = async () => {
  const response = await axiosInstance.get('/purchase/analytics/by-item');
  return response.data;
};

export const getSpendByMonth = async () => {
  const response = await axiosInstance.get('/purchase/analytics/by-month');
  return response.data;
};

export const getPendingPurchaseOrders = async () => {
  const response = await axiosInstance.get('/purchase/analytics/pending-pos');
  return response.data;
};

export default {
  getVendors,
  createVendor,
  getVendorById,
  updateVendor,
  deleteVendor,
  getPurchaseOrders,
  createPurchaseOrder,
  getPurchaseOrderById,
  updatePurchaseOrder,
  submitPurchaseOrder,
  approvePurchaseOrder,
  rejectPurchaseOrder,
  updatePurchaseOrderStatus,
  getVendorInvoices,
  createVendorInvoice,
  getVendorInvoiceById,
  updateVendorInvoiceStatus,
  getSpendByVendor,
  getSpendByItem,
  getSpendByMonth,
  getPendingPurchaseOrders
};
