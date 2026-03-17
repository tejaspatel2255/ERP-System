import express, { Request, Response } from 'express';
import Account from '../models/Account';
import Transaction from '../models/Transaction';

const router = express.Router();

// Get Chart of Accounts
router.get('/accounts', async (req: Request, res: Response) => {
    try {
        const accounts = await Account.find({ isActive: true }).sort({ code: 1 });
        res.json(accounts);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching accounts', error });
    }
});

// Create a new Account
router.post('/accounts', async (req: Request, res: Response) => {
    try {
        const newAccount = new Account(req.body);
        await newAccount.save();
        res.status(201).json(newAccount);
    } catch (error) {
        res.status(400).json({ message: 'Error creating account', error });
    }
});

// Update Account
router.put('/accounts/:id', async (req: Request, res: Response) => {
    try {
        const updated = await Account.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) return res.status(404).json({ message: 'Account not found' });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: 'Error updating account', error });
    }
});

// Delete Account (Check for transactions first?)
router.delete('/accounts/:id', async (req: Request, res: Response) => {
    try {
        // In a real app, check if account has transactions!
        const deleted = await Account.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Account not found' });
        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting account', error });
    }
});

// Create a Journal Entry (Transaction)
router.post('/journal', async (req: Request, res: Response) => {
    try {
        const { date, description, reference, entries, status } = req.body;

        const transaction = new Transaction({
            date,
            description,
            reference,
            entries,
            status: status || 'Posted'
        });

        await transaction.save();

        // If posted, update account balances
        if (transaction.status === 'Posted') {
            for (const entry of entries) {
                const account = await Account.findById(entry.account);
                if (account) {
                    // Primitive balance update logic
                    // Asset/Expense: Debit increases (+), Credit decreases (-)
                    // Liability/Equity/Income: Credit increases (+), Debit decreases (-)

                    let change = 0;
                    if (['Asset', 'Expense'].includes(account.type)) {
                        change = (entry.debit || 0) - (entry.credit || 0);
                    } else {
                        change = (entry.credit || 0) - (entry.debit || 0);
                    }

                    account.balance += change;
                    await account.save();
                }
            }
        }

        res.status(201).json(transaction);
    } catch (error: any) {
        res.status(400).json({ message: error.message || 'Error creating transaction', error });
    }
});

// Seed Default Chart of Accounts (Helper)
router.post('/seed', async (req: Request, res: Response) => {
    try {
        const defaults = [
            // Assets
            { code: '1000', name: 'Cash on Hand', type: 'Asset' },
            { code: '1010', name: 'Bank Account', type: 'Asset' },
            { code: '1200', name: 'Accounts Receivable', type: 'Asset' },
            { code: '1500', name: 'Inventory Asset', type: 'Asset' },

            // Liabilities
            { code: '2000', name: 'Accounts Payable', type: 'Liability' },
            { code: '2100', name: 'GST Payable', type: 'Liability' },

            // Equity
            { code: '3000', name: 'Owner\'s Equity', type: 'Equity' },
            { code: '3100', name: 'Retained Earnings', type: 'Equity' },

            // Income
            { code: '4000', name: 'Sales Revenue', type: 'Income' },
            { code: '4100', name: 'Service Income', type: 'Income' },

            // Expenses
            { code: '5000', name: 'Cost of Goods Sold', type: 'Expense' },
            { code: '5100', name: 'Rent Expense', type: 'Expense' },
            { code: '5200', name: 'Salary Expense', type: 'Expense' },
            { code: '5300', name: 'Utilities Expense', type: 'Expense' }
        ];

        let addedCount = 0;
        for (const account of defaults) {
            const exists = await Account.findOne({ code: account.code });
            if (!exists) {
                await Account.create(account);
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
