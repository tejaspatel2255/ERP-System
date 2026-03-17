import mongoose, { Schema, Document } from 'mongoose';

export interface IStoreLedger extends Document {
    product: mongoose.Types.ObjectId;
    type: 'IN' | 'OUT';
    quantity: number;
    referenceId?: mongoose.Types.ObjectId; // Sale ID or Purchase ID
    referenceType: 'Sale' | 'Purchase' | 'Adjustment';
    date: Date;
    remarks?: string;
}

const StoreLedgerSchema: Schema = new Schema({
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    type: { type: String, enum: ['IN', 'OUT'], required: true },
    quantity: { type: Number, required: true },
    referenceId: { type: Schema.Types.ObjectId },
    referenceType: { type: String, enum: ['Sale', 'Purchase', 'Adjustment'], required: true },
    date: { type: Date, default: Date.now },
    remarks: { type: String }
});

export default mongoose.model<IStoreLedger>('StoreLedger', StoreLedgerSchema);
