import { Sale } from 'shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const getHeaders = () => {
    return {
        'Content-Type': 'application/json',
    };
};

export const SalesService = {
    getAll: async (): Promise<Sale[]> => {
        const res = await fetch(`${API_URL}/sales`, {
            method: 'GET',
            headers: getHeaders(),
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to fetch sales');
        return res.json();
    },

    create: async (data: {
        customerId: string;
        items: { productId: string; quantity: number }[];
        status: string;
    }): Promise<Sale> => {
        const res = await fetch(`${API_URL}/sales`, {
            method: 'POST',
            headers: getHeaders(),
            credentials: 'include',
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to create sale');
        }
        return res.json();
    },
};
