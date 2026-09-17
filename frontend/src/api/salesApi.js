import axiosInstance from './axiosInstance';

// ==========================================
// CUSTOMERS
// ==========================================

export const getCustomers = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params.append(key, filters[key]);
    }
  });
  const response = await axiosInstance.get(`/sales/customers?${params.toString()}`);
  return response.data;
};

export const createCustomer = async (data) => {
  const response = await axiosInstance.post('/sales/customers', data);
  return response.data;
};

export const getCustomerById = async (id) => {
  const response = await axiosInstance.get(`/sales/customers/${id}`);
  return response.data;
};

export const updateCustomer = async (id, data) => {
  const response = await axiosInstance.put(`/sales/customers/${id}`, data);
  return response.data;
};

export const deleteCustomer = async (id) => {
  const response = await axiosInstance.delete(`/sales/customers/${id}`);
  return response.data;
};

// ==========================================
// QUOTATIONS
// ==========================================

export const getQuotations = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params.append(key, filters[key]);
    }
  });
  const response = await axiosInstance.get(`/sales/quotations?${params.toString()}`);
  return response.data;
};

export const createQuotation = async (data) => {
  const response = await axiosInstance.post('/sales/quotations', data);
  return response.data;
};

export const getQuotationById = async (id) => {
  const response = await axiosInstance.get(`/sales/quotations/${id}`);
  return response.data;
};

export const deleteQuotation = async (id) => {
  const response = await axiosInstance.delete(`/sales/quotations/${id}`);
  return response.data;
};

export const updateQuotation = async (id, data) => {
  const response = await axiosInstance.put(`/sales/quotations/${id}`, data);
  return response.data;
};

export const updateQuotationStatus = async (id, status) => {
  const response = await axiosInstance.patch(`/sales/quotations/${id}/status`, { status });
  return response.data;
};

export const convertQuotationToOrder = async (id) => {
  const response = await axiosInstance.post(`/sales/quotations/${id}/convert`);
  return response.data;
};

// ==========================================
// SALES ORDERS
// ==========================================

export const getOrders = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params.append(key, filters[key]);
    }
  });
  const response = await axiosInstance.get(`/sales/orders?${params.toString()}`);
  return response.data;
};

export const getOrderById = async (id) => {
  const response = await axiosInstance.get(`/sales/orders/${id}`);
  return response.data;
};

export const updateOrderStatus = async (id, status) => {
  const response = await axiosInstance.patch(`/sales/orders/${id}/status`, { status });
  return response.data;
};

// ==========================================
// INVOICES
// ==========================================

export const getInvoices = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params.append(key, filters[key]);
    }
  });
  const response = await axiosInstance.get(`/sales/invoices?${params.toString()}`);
  return response.data;
};

export const createInvoiceFromOrder = async (orderId) => {
  const response = await axiosInstance.post('/sales/invoices', { order_id: orderId });
  return response.data;
};

export const getInvoiceById = async (id) => {
  const response = await axiosInstance.get(`/sales/invoices/${id}`);
  return response.data;
};

export const updateInvoiceStatus = async (id, status) => {
  const response = await axiosInstance.patch(`/sales/invoices/${id}/status`, { status });
  return response.data;
};

// ==========================================
// PAYMENTS
// ==========================================

export const recordPayment = async (data) => {
  const response = await axiosInstance.post('/sales/payments', data);
  return response.data;
};

export const getPayments = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params.append(key, filters[key]);
    }
  });
  const response = await axiosInstance.get(`/sales/payments?${params.toString()}`);
  return response.data;
};

// ==========================================
// REPORTS
// ==========================================

export const getSummaryReport = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params.append(key, filters[key]);
    }
  });
  const response = await axiosInstance.get(`/sales/reports/summary?${params.toString()}`);
  return response.data;
};

export const getByCustomerReport = async () => {
  const response = await axiosInstance.get('/sales/reports/by-customer');
  return response.data;
};

export const getByMonthReport = async () => {
  const response = await axiosInstance.get('/sales/reports/by-month');
  return response.data;
};

export default {
  getCustomers,
  createCustomer,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getQuotations,
  createQuotation,
  getQuotationById,
  updateQuotation,
  updateQuotationStatus,
  convertQuotationToOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  getInvoices,
  createInvoiceFromOrder,
  getInvoiceById,
  updateInvoiceStatus,
  recordPayment,
  getPayments,
  getSummaryReport,
  getByCustomerReport,
  getByMonthReport
};
