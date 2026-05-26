import { Dispatch } from 'shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const getHeaders = () => {
    return {
        'Content-Type': 'application/json',
    };
};

export const DispatchService = {
    getAll: async (): Promise<Dispatch[]> => {
        const res = await fetch(`${API_URL}/dispatch`, {
            method: 'GET',
            headers: getHeaders(),
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to fetch dispatches');
        return res.json();
    },

    getById: async (id: string): Promise<Dispatch> => {
        const res = await fetch(`${API_URL}/dispatch/${id}`, {
            method: 'GET',
            headers: getHeaders(),
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to fetch dispatch details');
        return res.json();
    },

    create: async (data: any): Promise<Dispatch> => {
        const res = await fetch(`${API_URL}/dispatch`, {
            method: 'POST',
            headers: getHeaders(),
            credentials: 'include',
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to create dispatch');
        }
        return res.json();
    },

    updateStatus: async (id: string, status: string, proofOfDelivery?: string): Promise<Dispatch> => {
        const res = await fetch(`${API_URL}/dispatch/${id}/status`, {
            method: 'PUT',
            headers: getHeaders(),
            credentials: 'include',
            body: JSON.stringify({ status, proofOfDelivery }),
        });
        if (!res.ok) throw new Error('Failed to update dispatch status');
        return res.json();
    },
};
