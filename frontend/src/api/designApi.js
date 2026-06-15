import axiosInstance from './axiosInstance';

export const getDesignFiles = async () => {
  const res = await axiosInstance.get('/design/files');
  return res.data;
};

export const uploadDesignFile = async (formData) => {
  const res = await axiosInstance.post('/design/files', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const getDesignFileById = async (id) => {
  const res = await axiosInstance.get(`/design/files/${id}`);
  return res.data;
};

export const uploadNewVersion = async (id, formData) => {
  const res = await axiosInstance.post(`/design/files/${id}/versions`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const getDesignTasks = async (assignedTo = '', status = '') => {
  let query = [];
  if (assignedTo) query.push(`assigned_to=${assignedTo}`);
  if (status) query.push(`status=${status}`);
  const qStr = query.length ? `?${query.join('&')}` : '';
  const res = await axiosInstance.get(`/design/tasks${qStr}`);
  return res.data;
};

export const createDesignTask = async (data) => {
  const res = await axiosInstance.post('/design/tasks', data);
  return res.data;
};

export const updateDesignTask = async (id, data) => {
  const res = await axiosInstance.put(`/design/tasks/${id}`, data);
  return res.data;
};

export const updateDesignTaskStatus = async (id, status) => {
  const res = await axiosInstance.patch(`/design/tasks/${id}/status`, { status });
  return res.data;
};

export const getPendingReviews = async () => {
  const res = await axiosInstance.get('/design/reviews');
  return res.data;
};

export const submitReview = async (id, data) => {
  const res = await axiosInstance.post(`/design/files/${id}/reviews`, data);
  return res.data;
};
