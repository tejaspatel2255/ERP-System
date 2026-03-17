import mongoose, { Schema, Document } from 'mongoose';

export interface IAccount extends Document {
    code: string;
    name: string;
    type: 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';
    balance: number;
    description?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const AccountSchema: Schema = new Schema({
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: {
        type: String,
        required: true,
        enum: ['Asset', 'Liability', 'Equity', 'Income', 'Expense']
    },
    balance: { type: Number, default: 0 },
    description: { type: String },
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true
});

export default mongoose.model<IAccount>('Account', AccountSchema);
