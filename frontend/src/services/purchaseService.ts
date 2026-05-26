import axios from 'axios';
import { Purchase } from 'shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const PurchaseService = {
    getAll: async (): Promise<Purchase[]> => {
        const response = await axios.get(`${API_URL}/purchase`, { withCredentials: true });
        return response.data;
    },

    create: async (purchaseData: any): Promise<Purchase> => {
        const response = await axios.post(`${API_URL}/purchase`, purchaseData, { withCredentials: true });
        return response.data;
    },
};
