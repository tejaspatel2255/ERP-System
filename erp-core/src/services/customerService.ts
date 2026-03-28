import { Customer } from 'erp-shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const getHeaders = () => {
    // In a real app, we might need to get the token from localStorage if not using HttpOnly cookies
    // Since we use HttpOnly cookies, we just need credentials: 'include'
    return {
        'Content-Type': 'application/json',
    };
};

export const CustomerService = {
    getAll: async (): Promise<Customer[]> => {
        const res = await fetch(`${API_URL}/customers`, {
            method: 'GET',
            headers: getHeaders(),
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to fetch customers');
        return res.json();
    },

    create: async (data: Partial<Customer>): Promise<Customer> => {
        const res = await fetch(`${API_URL}/customers`, {
            method: 'POST',
            headers: getHeaders(),
            credentials: 'include',
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to create customer');
        }
        return res.json();
    },

    update: async (id: string, data: Partial<Customer>): Promise<Customer> => {
        const res = await fetch(`${API_URL}/customers/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            credentials: 'include',
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to update customer');
        return res.json();
    },

    delete: async (id: string): Promise<void> => {
        const res = await fetch(`${API_URL}/customers/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to delete customer');
    }
};
