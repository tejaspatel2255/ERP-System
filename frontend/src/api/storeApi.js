import axiosInstance from './axiosInstance';

// Categories
export const getCategories = () => axiosInstance.get('/store/categories').then(r => r.data);
export const createCategory = (data) => axiosInstance.post('/store/categories', data).then(r => r.data);

// Items
export const getItems = (filters = {}) => {
  const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '' && v != null)));
  return axiosInstance.get(`/store/items?${params}`).then(r => r.data);
};
export const createItem = (data) => axiosInstance.post('/store/items', data).then(r => r.data);
export const getItemById = (id) => axiosInstance.get(`/store/items/${id}`).then(r => r.data);
export const updateItem = (id, data) => axiosInstance.put(`/store/items/${id}`, data).then(r => r.data);
export const deleteItem = (id) => axiosInstance.delete(`/store/items/${id}`).then(r => r.data);

// GRN
export const getGRNs = (filters = {}) => {
  const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '' && v != null)));
  return axiosInstance.get(`/store/grn?${params}`).then(r => r.data);
};
export const createGRN = (data) => axiosInstance.post('/store/grn', data).then(r => r.data);
export const getGRNById = (id) => axiosInstance.get(`/store/grn/${id}`).then(r => r.data);

// Stock Issue
export const issueStock = (data) => axiosInstance.post('/store/issue', data).then(r => r.data);
export const getIssues = (filters = {}) => {
  const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '' && v != null)));
  return axiosInstance.get(`/store/issues?${params}`).then(r => r.data);
};
export const getIssueById = (id) => axiosInstance.get(`/store/issues/${id}`).then(r => r.data);

// Ledger & Position
export const getStockLedger = (itemId, filters = {}) => {
  const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '' && v != null)));
  return axiosInstance.get(`/store/ledger/${itemId}?${params}`).then(r => r.data);
};
export const getStockPosition = () => axiosInstance.get('/store/stock-position').then(r => r.data);

// Alerts
export const getStockAlerts = () => axiosInstance.get('/store/alerts').then(r => r.data);
