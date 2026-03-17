import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomer extends Document {
    name: string;
    email: string;
    phone: string;
    address?: string;
    gstin?: string; // Tax ID
    status: 'active' | 'inactive';
    createdAt: Date;
}

const CustomerSchema = new Schema<ICustomer>({
    name: { type: String, required: true, trim: true },
    email: {
        type: String,
        required: true,
        unique: true,
        match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
    },
    phone: {
        type: String,
        required: true,
        unique: true,
        match: [/^[0-9]{10}$/, 'Phone number must be 10 digits']
    },
    address: { type: String },
    gstin: { type: String, uppercase: true, trim: true },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
}, { timestamps: true });

export default mongoose.model<ICustomer>('Customer', CustomerSchema);
