import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
    name: string;
    sku: string;
    category: string;
    price: number;
    stock: number;
    minLevel: number;
    unit: string;
    type: 'raw_material' | 'finished_good' | 'service';
    unitCost?: number;
}

const ProductSchema = new Schema<IProduct>({
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    category: { type: String, required: true },
    type: { type: String, enum: ['raw_material', 'finished_good', 'service'], default: 'finished_good' },
    price: { type: Number, required: true }, // Selling Price
    unitCost: { type: Number, default: 0 }, // Cost Price (for Raw Materials)
    stock: { type: Number, required: true, default: 0 },
    minLevel: { type: Number, default: 10 },
    unit: { type: String, default: 'pcs' },
}, { timestamps: true });

export default mongoose.model<IProduct>('Product', ProductSchema);
