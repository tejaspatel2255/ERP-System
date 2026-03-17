import mongoose, { Schema, Document } from 'mongoose';

export interface ITransactionEntry {
    account: mongoose.Types.ObjectId;
    debit: number;
    credit: number;
}

export interface ITransaction extends Document {
    date: Date;
    description: string;
    reference?: string;
    entries: ITransactionEntry[];
    status: 'Draft' | 'Posted';
    createdBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const TransactionEntrySchema = new Schema({
    account: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    debit: { type: Number, required: true, default: 0 },
    credit: { type: Number, required: true, default: 0 }
}, { _id: false });

const TransactionSchema: Schema = new Schema({
    date: { type: Date, required: true, default: Date.now },
    description: { type: String, required: true },
    reference: { type: String },
    entries: [TransactionEntrySchema],
    status: {
        type: String,
        enum: ['Draft', 'Posted'],
        default: 'Posted'
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true
});

// Middleware to ensure Debits equals Credits before saving
TransactionSchema.pre('save', function (this: ITransaction, next: (err?: mongoose.CallbackError) => void) {
    const totalDebit = this.entries.reduce((sum, entry) => sum + (entry.debit || 0), 0);
    const totalCredit = this.entries.reduce((sum, entry) => sum + (entry.credit || 0), 0);

    // Allow a small floating point error margin if necessary, but strictly equal is better for accounting
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return next(new Error(`Transaction is not balanced. Debits: ${totalDebit}, Credits: ${totalCredit}`));
    }
    next();
});


export default mongoose.model<ITransaction>('Transaction', TransactionSchema);
