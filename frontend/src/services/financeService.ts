import axios from 'axios';
import { Account, Transaction } from 'shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const FinanceService = {
    getAccounts: async (): Promise<Account[]> => {
        const response = await axios.get(`${API_URL}/finance/accounts`, { withCredentials: true });
        return response.data;
    },

    createAccount: async (account: Partial<Account>): Promise<Account> => {
        const response = await axios.post(`${API_URL}/finance/accounts`, account, { withCredentials: true });
        return response.data;
    },

    updateAccount: async (id: string, account: Partial<Account>): Promise<Account> => {
        const response = await axios.put(`${API_URL}/finance/accounts/${id}`, account, { withCredentials: true });
        return response.data;
    },

    deleteAccount: async (id: string): Promise<void> => {
        await axios.delete(`${API_URL}/finance/accounts/${id}`, { withCredentials: true });
    },

    createJournalEntry: async (transaction: Partial<Transaction>): Promise<Transaction> => {
        const response = await axios.post(`${API_URL}/finance/journal`, transaction, { withCredentials: true });
        return response.data;
    },

    seedDefaults: async (): Promise<any> => {
        const response = await axios.post(`${API_URL}/finance/seed`, {}, { withCredentials: true });
        return response.data;
    },
};
