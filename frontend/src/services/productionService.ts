import { BOM, WorkOrder } from 'shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const getHeaders = () => {
    return {
        'Content-Type': 'application/json',
    };
};

export const ProductionService = {
    // BOM
    getBOMs: async (): Promise<BOM[]> => {
        const res = await fetch(`${API_URL}/production/bom`, {
            method: 'GET',
            headers: getHeaders(),
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to fetch BOMs');
        return res.json();
    },

    createBOM: async (data: Partial<BOM>): Promise<BOM> => {
        const res = await fetch(`${API_URL}/production/bom`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to create BOM');
        return res.json();
    },

    // Work Orders
    getWorkOrders: async (): Promise<WorkOrder[]> => {
        const res = await fetch(`${API_URL}/production/work-orders`, {
            method: 'GET',
            headers: getHeaders(),
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to fetch Work Orders');
        return res.json();
    },

    createWorkOrder: async (data: Partial<WorkOrder>): Promise<WorkOrder> => {
        const res = await fetch(`${API_URL}/production/work-orders`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
            credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to create Work Order');
        return res.json();
    },

    updateWorkOrderStatus: async (id: string, status: string): Promise<WorkOrder> => {
        const res = await fetch(`${API_URL}/production/work-orders/${id}/status`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ status }),
            credentials: 'include',
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to update status');
        }
        return res.json();
    },
};
