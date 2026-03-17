import mongoose, { Schema, Document } from 'mongoose';

export interface IAlert extends Document {
    message: string;
    type: 'LOW_STOCK' | 'SYSTEM' | 'INFO';
    isRead: boolean;
    createdAt: Date;
}

const AlertSchema: Schema = new Schema({
    message: { type: String, required: true },
    type: { type: String, enum: ['LOW_STOCK', 'SYSTEM', 'INFO'], default: 'INFO' },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IAlert>('Alert', AlertSchema);
