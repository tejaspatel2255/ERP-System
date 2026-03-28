import { Product } from 'erp-shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const getHeaders = () => {
    return {
        'Content-Type': 'application/json',
    };
};

export const ProductService = {
    getAll: async (): Promise<Product[]> => {
        const res = await fetch(`${API_URL}/products`, {
            method: 'GET',
            headers: getHeaders(),
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to fetch products');
        return res.json();
    },

    create: async (data: Partial<Product>): Promise<Product> => {
        const res = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: getHeaders(),
            credentials: 'include',
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to create product');
        }
        return res.json();
    },

    update: async (id: string, data: Partial<Product>): Promise<Product> => {
        const res = await fetch(`${API_URL}/products/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            credentials: 'include',
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to update product');
        return res.json();
    },

    delete: async (id: string): Promise<void> => {
        const res = await fetch(`${API_URL}/products/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to delete product');
    }
};
