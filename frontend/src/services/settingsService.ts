import axios from 'axios';
import { Setting } from 'shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const SettingsService = {
    getAllSettings: async (): Promise<Record<string, any>> => {
        const response = await axios.get(`${API_URL}/settings`, { withCredentials: true });
        return response.data;
    },

    updateSettings: async (settings: Record<string, any>): Promise<any> => {
        const response = await axios.put(`${API_URL}/settings`, settings, { withCredentials: true });
        return response.data;
    },

    initializeDefaults: async (): Promise<any> => {
        const response = await axios.post(`${API_URL}/settings/init`, {}, { withCredentials: true });
        return response.data;
    },
};
