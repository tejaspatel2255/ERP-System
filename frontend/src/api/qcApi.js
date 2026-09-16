import axiosInstance from './axiosInstance';

// Raw Material QC
export const getRawMaterialQC = () => axiosInstance.get('/qc/raw-material').then(r => r.data);
export const createRawMaterialQC = (data) => axiosInstance.post('/qc/raw-material', data).then(r => r.data);
export const approveRawMaterialQC = (id, data) => axiosInstance.post(`/qc/raw-material/${id}/approve`, data).then(r => r.data);

// In-Process QC
export const getInProcessQC = () => axiosInstance.get('/qc/in-process').then(r => r.data);
export const createInProcessQC = (data) => axiosInstance.post('/qc/in-process', data).then(r => r.data);

// Final QC
export const getFinalQC = () => axiosInstance.get('/qc/final').then(r => r.data);
export const createFinalQC = (data) => axiosInstance.post('/qc/final', data).then(r => r.data);
export const approveFinalQC = (id, data) => axiosInstance.post(`/qc/final/${id}/approve`, data).then(r => r.data);

// NCR
export const getNCRs = (filters = {}) => {
  const p = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v != null && v !== '')));
  return axiosInstance.get(`/qc/ncr?${p}`).then(r => r.data);
};
export const raiseNCR = (data) => axiosInstance.post('/qc/ncr', data).then(r => r.data);
export const updateNCR = (id, data) => axiosInstance.put(`/qc/ncr/${id}`, data).then(r => r.data);
