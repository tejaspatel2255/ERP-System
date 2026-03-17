import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    username: string;
    name: string;
    email: string;
    mobile: string;
    password?: string;
    role: 'admin' | 'user' | 'manager';
    status: 'active' | 'pending' | 'blocked';
    emailVerified: boolean;
    createdAt: Date;
    lastLogin?: Date;
}

const UserSchema = new Schema<IUser>({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
    },
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'],
    },
    mobile: {
        type: String,
        required: true,
        match: [/^[0-9]{10}$/, 'Mobile number must be 10 digits'],
    },
    password: {
        type: String,
        required: true,
        select: false,
    },
    role: {
        type: String,
        enum: ['admin', 'user', 'manager'],
        default: 'user',
    },
    status: {
        type: String,
        enum: ['active', 'pending', 'blocked'],
        default: 'pending',
    },
    emailVerified: {
        type: Boolean,
        default: false,
    },
    lastLogin: {
        type: Date,
    },
}, {
    timestamps: true
});

export default mongoose.model<IUser>('User', UserSchema);
