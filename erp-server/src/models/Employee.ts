import mongoose, { Schema, Document } from 'mongoose';

export interface IEmployee extends Document {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: 'Admin' | 'Manager' | 'Employee';
    department: string;
    joiningDate: Date;
    salary: number;
    status: 'Active' | 'On Leave' | 'Terminated';
}

const EmployeeSchema: Schema = new Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    role: { type: String, enum: ['Admin', 'Manager', 'Employee'], default: 'Employee' },
    department: { type: String, required: true },
    joiningDate: { type: Date, required: true },
    salary: { type: Number, required: true },
    status: { type: String, enum: ['Active', 'On Leave', 'Terminated'], default: 'Active' },
}, { timestamps: true });

export default mongoose.model<IEmployee>('Employee', EmployeeSchema);
