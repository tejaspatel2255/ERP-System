import axiosInstance from './axiosInstance';

// Checklists
export const getChecklists = () => axiosInstance.get('/qa/checklists').then(r => r.data);
export const createChecklist = (data) => axiosInstance.post('/qa/checklists', data).then(r => r.data);
export const getChecklistById = (id) => axiosInstance.get(`/qa/checklists/${id}`).then(r => r.data);
export const updateChecklist = (id, data) => axiosInstance.put(`/qa/checklists/${id}`, data).then(r => r.data);

// Tests
export const getTests = (filters = {}) => {
  const p = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v != null && v !== '')));
  return axiosInstance.get(`/qa/tests?${p}`).then(r => r.data);
};
export const createTest = (data) => axiosInstance.post('/qa/tests', data).then(r => r.data);
export const getTestById = (id) => axiosInstance.get(`/qa/tests/${id}`).then(r => r.data);
export const submitTestResults = (id, data) => axiosInstance.post(`/qa/tests/${id}/results`, data).then(r => r.data);
export const uploadTestReport = (id, data) => axiosInstance.post(`/qa/tests/${id}/report`, data).then(r => r.data);
export const approveTest = (id, data) => axiosInstance.post(`/qa/tests/${id}/approve`, data).then(r => r.data);
export const getPendingApprovals = () => axiosInstance.get('/qa/approvals').then(r => r.data);
