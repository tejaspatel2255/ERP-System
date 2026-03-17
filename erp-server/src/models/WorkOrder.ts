import mongoose, { Schema, Document } from 'mongoose';

export interface IWorkOrder extends Document {
    orderNumber: string;
    product: mongoose.Types.ObjectId;
    bom: mongoose.Types.ObjectId;
    quantity: number;
    status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
    startDate?: Date;
    endDate?: Date;
    actualMaterialsUsed?: {
        material: mongoose.Types.ObjectId;
        quantity: number;
    }[];
}

const WorkOrderSchema = new Schema<IWorkOrder>({
    orderNumber: { type: String, required: true, unique: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    bom: { type: Schema.Types.ObjectId, ref: 'BOM', required: true },
    quantity: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ['Pending', 'In Progress', 'Completed', 'Cancelled'], default: 'Pending' },
    startDate: { type: Date },
    endDate: { type: Date },
    actualMaterialsUsed: [{
        material: { type: Schema.Types.ObjectId, ref: 'Product' },
        quantity: { type: Number }
    }]
}, { timestamps: true });

export default mongoose.model<IWorkOrder>('WorkOrder', WorkOrderSchema);
