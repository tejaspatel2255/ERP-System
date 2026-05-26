import express, { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { verifyToken, authorize } from '../middlewares/auth';

const router = express.Router();

router.use(verifyToken);

// Get Chart of Accounts
router.get('/accounts', async (req: Request, res: Response) => {
    try {
        const { data: accounts, error } = await supabase
            .from('accounts')
            .select('*')
            .eq('isActive', true)
            .order('code', { ascending: true });

        if (error) throw error;

        res.json(accounts.map((a: any) => ({ ...a, _id: a.id })));
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching accounts', error: error.message });
    }
});

// Create a new Account
router.post('/accounts', authorize(['admin', 'manager']), async (req: Request, res: Response) => {
    try {
        const { code, name, type, balance, description } = req.body;
        const { data: newAccount, error } = await supabase
            .from('accounts')
            .insert([{ code, name, type, balance: balance || 0, description }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ ...newAccount, _id: newAccount.id });
    } catch (error: any) {
        res.status(400).json({ message: 'Error creating account', error: error.message });
    }
});

// Update Account
router.put('/accounts/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { data: updated, error } = await supabase
            .from('accounts')
            .update(req.body)
            .eq('id', id)
            .select()
            .single();

        if (error || !updated) return res.status(404).json({ message: 'Account not found' });
        res.json({ ...updated, _id: updated.id });
    } catch (error: any) {
        res.status(500).json({ message: 'Error updating account', error: error.message });
    }
});

// Delete Account
router.delete('/accounts/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { data: deleted, error } = await supabase
            .from('accounts')
            .delete()
            .eq('id', id)
            .select()
            .single();

        if (error || !deleted) return res.status(404).json({ message: 'Account not found' });
        res.json({ message: 'Account deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: 'Error deleting account', error: error.message });
    }
});

// Create a Journal Entry (Transaction)
router.post('/journal', authorize(['admin', 'manager']), async (req: Request, res: Response) => {
    try {
        const { date, description, reference, entries, status } = req.body;

        const { data: transaction, error: txError } = await supabase
            .from('transactions')
            .insert([
                {
                    date: date || new Date().toISOString(),
                    description,
                    referenceId: reference,
                    entries,
                    status: status || 'Posted',
                },
            ])
            .select()
            .single();

        if (txError || !transaction) throw txError;

        if (transaction.status === 'Posted') {
            for (const entry of entries) {
                const { data: account, error: accError } = await supabase
                    .from('accounts')
                    .select('*')
                    .eq('id', entry.account)
                    .single();

                if (account) {
                    let change = 0;
                    if (['Asset', 'Expense'].includes(account.type)) {
                        change = (entry.debit || 0) - (entry.credit || 0);
                    } else {
                        change = (entry.credit || 0) - (entry.debit || 0);
                    }

                    const newBalance = Number(account.balance) + change;
                    await supabase
                        .from('accounts')
                        .update({ balance: newBalance })
                        .eq('id', account.id);
                }
            }
        }

        res.status(201).json({ ...transaction, _id: transaction.id });
    } catch (error: any) {
        res.status(400).json({ message: error.message || 'Error creating transaction', error });
    }
});

// Seed Default Chart of Accounts
router.post('/seed', authorize(['admin', 'manager']), async (req: Request, res: Response) => {
    try {
        const defaults = [
            { code: '1000', name: 'Cash on Hand', type: 'Asset' },
            { code: '1010', name: 'Bank Account', type: 'Asset' },
            { code: '1200', name: 'Accounts Receivable', type: 'Asset' },
            { code: '1500', name: 'Inventory Asset', type: 'Asset' },
            { code: '2000', name: 'Accounts Payable', type: 'Liability' },
            { code: '2100', name: 'GST Payable', type: 'Liability' },
            { code: '3000', name: "Owner's Equity", type: 'Equity' },
            { code: '3100', name: 'Retained Earnings', type: 'Equity' },
            { code: '4000', name: 'Sales Revenue', type: 'Income' },
            { code: '4100', name: 'Service Income', type: 'Income' },
            { code: '5000', name: 'Cost of Goods Sold', type: 'Expense' },
            { code: '5100', name: 'Rent Expense', type: 'Expense' },
            { code: '5200', name: 'Salary Expense', type: 'Expense' },
            { code: '5300', name: 'Utilities Expense', type: 'Expense' },
        ] as const;

        let addedCount = 0;
        for (const account of defaults) {
            const { data: exists } = await supabase
                .from('accounts')
                .select('*')
                .eq('code', account.code)
                .maybeSingle();

            if (!exists) {
                await supabase.from('accounts').insert([account]);
                addedCount++;
            }
        }

        if (addedCount === 0) {
            return res.json({ message: 'All default accounts already exist.' });
        }

        res.json({ message: `Successfully seeded ${addedCount} new default accounts.` });
    } catch (error: any) {
        console.error('Seed Error:', error);
        res.status(500).json({ message: 'Error seeding accounts', error: error.message });
    }
});

export default router;
