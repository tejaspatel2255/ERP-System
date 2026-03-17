import mongoose, { Schema, Document } from 'mongoose';

export interface IDispatch extends Document {
    order: mongoose.Types.ObjectId;
    manifestNumber: string;
    carrier: string;
    driverName: string;
    vehicleNumber: string;
    dispatchDate: Date;
    status: 'Pending' | 'In Transit' | 'Delivered';
    proofOfDelivery?: string;
    createdAt: Date;
}

const DispatchSchema: Schema = new Schema({
    order: { type: Schema.Types.ObjectId, ref: 'Sale', required: true },
    manifestNumber: { type: String, required: true, unique: true },
    carrier: { type: String, required: true },
    driverName: { type: String, required: true },
    vehicleNumber: { type: String, required: true },
    dispatchDate: { type: Date, required: true },
    status: { type: String, enum: ['Pending', 'In Transit', 'Delivered'], default: 'Pending' },
    proofOfDelivery: { type: String }, // URL or path to the uploaded image
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IDispatch>('Dispatch', DispatchSchema);
