import mongoose, { Schema, Document } from 'mongoose';

export interface IMaintenanceLog extends Document {
    asset: mongoose.Types.ObjectId;
    type: 'Scheduled' | 'Issue' | 'Upgrade';
    description: string;
    scheduledDate: Date;
    completionDate?: Date;
    status: 'Pending' | 'In Progress' | 'Completed';
    cost: number;
    technician: string;
}

const MaintenanceLogSchema = new Schema<IMaintenanceLog>({
    asset: { type: Schema.Types.ObjectId, ref: 'Asset', required: true },
    type: {
        type: String,
        enum: ['Scheduled', 'Issue', 'Upgrade'],
        required: true
    },
    description: { type: String, required: true },
    scheduledDate: { type: Date, required: true },
    completionDate: { type: Date },
    status: {
        type: String,
        enum: ['Pending', 'In Progress', 'Completed'],
        default: 'Pending'
    },
    cost: { type: Number, default: 0 },
    technician: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model<IMaintenanceLog>('MaintenanceLog', MaintenanceLogSchema);
