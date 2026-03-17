import mongoose, { Schema, Document } from 'mongoose';

export interface IAsset extends Document {
    name: string;
    type: string;
    serialNumber: string;
    purchaseDate: Date;
    status: 'Active' | 'Under Maintenance' | 'Retired';
    location: string;
}

const AssetSchema = new Schema<IAsset>({
    name: { type: String, required: true },
    type: { type: String, required: true },
    serialNumber: { type: String, required: true, unique: true },
    purchaseDate: { type: Date, required: true },
    status: {
        type: String,
        enum: ['Active', 'Under Maintenance', 'Retired'],
        default: 'Active'
    },
    location: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model<IAsset>('Asset', AssetSchema);
