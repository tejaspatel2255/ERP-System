import axiosInstance from './axiosInstance';

const api = axiosInstance;
const p = (filters) => new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([,v]) => v !== '' && v != null))).toString();

// BOM
export const getBOMs = () => api.get('/production/bom').then(r => r.data);
export const createBOM = (data) => api.post('/production/bom', data).then(r => r.data);
export const getBOMById = (id) => api.get(`/production/bom/${id}`).then(r => r.data);
export const updateBOM = (id, data) => api.put(`/production/bom/${id}`, data).then(r => r.data);
export const activateBOM = (id) => api.patch(`/production/bom/${id}/activate`).then(r => r.data);

// Work Orders
export const getWorkOrders = (filters = {}) => api.get(`/production/work-orders?${p(filters)}`).then(r => r.data);
export const createWorkOrder = (data) => api.post('/production/work-orders', data).then(r => r.data);
export const getWorkOrderById = (id) => api.get(`/production/work-orders/${id}`).then(r => r.data);
export const startWorkOrder = (id) => api.patch(`/production/work-orders/${id}/start`).then(r => r.data);
export const completeWorkOrder = (id, produced_qty) => api.patch(`/production/work-orders/${id}/complete`, { produced_qty }).then(r => r.data);
export const cancelWorkOrder = (id) => api.patch(`/production/work-orders/${id}/cancel`).then(r => r.data);

// Consumption
export const issueToWorkOrder = (data) => api.post('/production/consumption', data).then(r => r.data);
export const getConsumptionByWO = (woId) => api.get(`/production/consumption/${woId}`).then(r => r.data);

// Costing
export const getCosting = (woId) => api.get(`/production/costing/${woId}`).then(r => r.data);
export const updateCosting = (woId, data) => api.post(`/production/costing/${woId}`, data).then(r => r.data);
