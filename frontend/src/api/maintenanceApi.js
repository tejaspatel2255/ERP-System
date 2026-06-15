import axiosInstance from './axiosInstance';

// Assets
export const getAssets = () => axiosInstance.get('/maintenance/assets').then(r => r.data);
export const createAsset = (data) => axiosInstance.post('/maintenance/assets', data).then(r => r.data);
export const getAssetById = (id) => axiosInstance.get(`/maintenance/assets/${id}`).then(r => r.data);
export const updateAsset = (id, data) => axiosInstance.put(`/maintenance/assets/${id}`, data).then(r => r.data);

// Schedules
export const getSchedules = (filters = {}) => {
  const p = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v != null && v !== '')));
  return axiosInstance.get(`/maintenance/schedules?${p}`).then(r => r.data);
};
export const createSchedule = (data) => axiosInstance.post('/maintenance/schedules', data).then(r => r.data);
export const updateSchedule = (id, data) => axiosInstance.put(`/maintenance/schedules/${id}`, data).then(r => r.data);
export const logScheduleCompletion = (id, data) => axiosInstance.post(`/maintenance/schedules/${id}/log`, data).then(r => r.data);

// Issues
export const getIssues = (filters = {}) => {
  const p = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v != null && v !== '')));
  return axiosInstance.get(`/maintenance/issues?${p}`).then(r => r.data);
};
export const createIssue = (data) => axiosInstance.post('/maintenance/issues', data).then(r => r.data);
export const getIssueById = (id) => axiosInstance.get(`/maintenance/issues/${id}`).then(r => r.data);
export const updateIssue = (id, data) => axiosInstance.put(`/maintenance/issues/${id}`, data).then(r => r.data);
