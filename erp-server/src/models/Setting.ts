import mongoose, { Schema, Document } from 'mongoose';

export interface ISetting extends Document {
    key: string;
    value: any;
    category: 'General' | 'Security' | 'Notifications' | 'System';
    description?: string;
    updatedBy?: mongoose.Types.ObjectId;
}

const SettingSchema: Schema = new Schema({
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true }, // Allows flexible data types
    category: { type: String, enum: ['General', 'Security', 'Notifications', 'System'], required: true },
    description: { type: String },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model<ISetting>('Setting', SettingSchema);
