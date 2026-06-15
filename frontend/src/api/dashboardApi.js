import axiosInstance from './axiosInstance';

export const getDashboardSummary = async () => {
  const res = await axiosInstance.get('/dashboard/summary');
  return res.data;
};

export const getDashboardActivity = async () => {
  const res = await axiosInstance.get('/dashboard/activity');
  return res.data;
};

export const getDashboardCharts = async () => {
  const res = await axiosInstance.get('/dashboard/charts');
  return res.data;
};

export default {
  getDashboardSummary,
  getDashboardActivity,
  getDashboardCharts
};
