import mongoose, { Schema, Document } from 'mongoose';

export interface IBOM extends Document {
    name: string;
    product: mongoose.Types.ObjectId; // The Finished Good
    materials: {
        material: mongoose.Types.ObjectId; // Raw Material
        quantity: number;
    }[];
    notes?: string;
}

const BOMSchema = new Schema<IBOM>({
    name: { type: String, required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    materials: [{
        material: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true }
    }],
    notes: { type: String }
}, { timestamps: true });

export default mongoose.model<IBOM>('BOM', BOMSchema);
