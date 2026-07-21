import axiosInstance from './axiosInstance';

export const loginUser = async (email, password) => {
  const res = await axiosInstance.post('/auth/login', { email, password });
  return res.data;
};

export const registerUser = async (name, email, password) => {
  const res = await axiosInstance.post('/auth/register', { name, email, password });
  return res.data;
};

export const getCurrentUser = async () => {
  const res = await axiosInstance.get('/auth/me');
  return res.data;
};

export const logoutUser = async () => {
  const res = await axiosInstance.post('/auth/logout');
  return res.data;
};

export const refreshAccessToken = async () => {
  const res = await axiosInstance.post('/auth/refresh');
  return res.data;
};

export default {
  loginUser,
  registerUser,
  getCurrentUser,
  logoutUser,
  refreshAccessToken
};
