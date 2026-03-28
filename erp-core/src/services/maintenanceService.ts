import { Asset, MaintenanceLog } from 'erp-shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const getHeaders = () => {
    return {
        'Content-Type': 'application/json',
    };
};

export const MaintenanceService = {
    // Assets
    getAssets: async (): Promise<Asset[]> => {
        const res = await fetch(`${API_URL}/maintenance/assets`, {
            method: 'GET',
            headers: getHeaders(),
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to fetch assets');
        return res.json();
    },

    createAsset: async (data: Partial<Asset>): Promise<Asset> => {
        const res = await fetch(`${API_URL}/maintenance/assets`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to create asset');
        return res.json();
    },

    // Logs
    getLogs: async (): Promise<MaintenanceLog[]> => {
        const res = await fetch(`${API_URL}/maintenance/logs`, {
            method: 'GET',
            headers: getHeaders(),
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to fetch logs');
        return res.json();
    },

    createLog: async (data: Partial<MaintenanceLog>): Promise<MaintenanceLog> => {
        const res = await fetch(`${API_URL}/maintenance/logs`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to create log');
        return res.json();
    },

    updateLogStatus: async (id: string, data: { status: string, cost?: number, completionDate?: string }): Promise<MaintenanceLog> => {
        const res = await fetch(`${API_URL}/maintenance/logs/${id}/status`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data),
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to update log status');
        return res.json();
    }
};
