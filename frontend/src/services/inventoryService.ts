import axios from 'axios';
import { StoreLedger, Alert, Product } from 'shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const InventoryService = {
    getLedger: async (): Promise<StoreLedger[]> => {
        const res = await axios.get(`${API_URL}/inventory/ledger`, { withCredentials: true });
        return res.data;
    },

    getAlerts: async (): Promise<Alert[]> => {
        const res = await axios.get(`${API_URL}/inventory/alerts`, { withCredentials: true });
        return res.data;
    },

    getProduct: async (id: string): Promise<Product> => {
        const res = await axios.get(`${API_URL}/products/${id}`, { withCredentials: true });
        return res.data;
    },

    getProducts: async (): Promise<Product[]> => {
        const res = await axios.get(`${API_URL}/products`, { withCredentials: true });
        return res.data;
    },

    markAlertRead: async (id: string): Promise<void> => {
        await axios.post(`${API_URL}/inventory/alerts/${id}/read`, {}, { withCredentials: true });
    },
};
