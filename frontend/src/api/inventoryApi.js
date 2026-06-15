import axiosInstance from './axiosInstance';

export const getItems = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.keys(filters).forEach((key) => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params.append(key, filters[key]);
    }
  });

  const response = await axiosInstance.get(`/inventory/items?${params.toString()}`);
  return response.data;
};

export default {
  getItems
};
