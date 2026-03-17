import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendance extends Document {
    employee: mongoose.Types.ObjectId;
    date: Date;
    checkIn?: Date;
    checkOut?: Date;
    status: 'Present' | 'Absent' | 'Half Day';
}

const AttendanceSchema: Schema = new Schema({
    employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: Date, required: true },
    checkIn: { type: Date },
    checkOut: { type: Date },
    status: { type: String, enum: ['Present', 'Absent', 'Half Day'], default: 'Absent' },
}, { timestamps: true });

export default mongoose.model<IAttendance>('Attendance', AttendanceSchema);
