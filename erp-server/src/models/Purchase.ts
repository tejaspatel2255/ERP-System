import mongoose, { Schema, Document } from 'mongoose';

export interface IPurchase extends Document {
    vendorName: string;
    items: Array<{
        product: mongoose.Types.ObjectId;
        name: string;
        quantity: number;
        cost: number;
        total: number;
    }>;
    totalAmount: number;
    date: Date;
}

const PurchaseSchema = new Schema<IPurchase>({
    vendorName: { type: String, required: true },
    items: [{
        product: { type: Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        quantity: Number,
        cost: Number,
        total: Number
    }],
    totalAmount: { type: Number, required: true },
    date: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model<IPurchase>('Purchase', PurchaseSchema);
