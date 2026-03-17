import mongoose, { Schema, Document } from 'mongoose';

export interface IOTP extends Document {
    email: string;
    otp: string;
    expiresAt: Date;
}

const OTPSchema = new Schema<IOTP>({
    email: {
        type: String,
        required: true,
        index: true,
    },
    otp: {
        type: String,
        required: true,
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: '0s' }, // Auto-delete after expiry
    },
}, {
    timestamps: true,
});

export default mongoose.model<IOTP>('OTP', OTPSchema);
