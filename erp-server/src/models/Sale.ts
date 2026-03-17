import mongoose, { Schema, Document } from 'mongoose';

export interface ISale extends Document {
    customer?: mongoose.Types.ObjectId;
    customerName?: string;
    items: Array<{
        product: mongoose.Types.ObjectId;
        name: string;
        quantity: number;
        price: number;
        total: number;
    }>;
    totalAmount: number;
    status: 'Pending' | 'Completed' | 'Cancelled';
    date: Date;
}

const SaleSchema = new Schema<ISale>({
    customer: { type: Schema.Types.ObjectId, ref: 'Customer' }, // Linked to Customer Model
    customerName: { type: String }, // Fallback/Snapshot
    items: [{
        product: { type: Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        quantity: Number,
        price: Number,
        total: Number
    }],
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['Pending', 'Completed', 'Cancelled'], default: 'Completed' },
    date: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model<ISale>('Sale', SaleSchema);
