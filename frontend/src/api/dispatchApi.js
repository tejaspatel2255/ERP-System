import axiosInstance from './axiosInstance';

export const getPackingSlips = async () => {
  const res = await axiosInstance.get('/dispatch/packing-slips');
  return res.data;
};

export const createPackingSlip = async (data) => {
  const res = await axiosInstance.post('/dispatch/packing-slips', data);
  return res.data;
};

export const getPackingSlipById = async (id) => {
  const res = await axiosInstance.get(`/dispatch/packing-slips/${id}`);
  return res.data;
};

export const getChallans = async () => {
  const res = await axiosInstance.get('/dispatch/challans');
  return res.data;
};

export const createChallan = async (data) => {
  const res = await axiosInstance.post('/dispatch/challans', data);
  return res.data;
};

export const getChallanById = async (id) => {
  const res = await axiosInstance.get(`/dispatch/challans/${id}`);
  return res.data;
};

export const addTransportDetails = async (id, data) => {
  const res = await axiosInstance.post(`/dispatch/challans/${id}/transport`, data);
  return res.data;
};

export const uploadPOD = async (id, formData) => {
  const res = await axiosInstance.post(`/dispatch/challans/${id}/pod`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const getDispatchSchedule = async () => {
  const res = await axiosInstance.get('/dispatch/schedule');
  return res.data;
};
