import User from '../models/User';
import OTP from '../models/OTP';
import { sendOTP } from '../lib/mailer';
import { hashPassword, verifyPassword, generateToken } from '../lib/authUtils';

export class AuthService {
    static async register(payload: any) {
        const { username, name, email, mobile, password } = payload;

        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            if (existingUser.status === 'pending') {
                await User.deleteOne({ _id: existingUser._id });
            } else {
                const err: any = new Error('User already exists');
                err.statusCode = 409;
                throw err;
            }
        }

        const hashedPassword = await hashPassword(password);
        const newUser = await User.create({
            username,
            name,
            email,
            mobile,
            password: hashedPassword,
            status: 'pending',
            emailVerified: false,
        });

        const otpValue = Math.floor(100000 + Math.random() * 900000).toString();

        const emailResponse: any = await sendOTP(email, otpValue);

        if (!emailResponse.success) {
            await User.deleteOne({ _id: newUser._id });
            throw new Error(`Failed to send OTP. Error: ${emailResponse.error?.message || emailResponse.error}`);
        }

        await OTP.deleteMany({ email });
        await OTP.create({
            email,
            otp: otpValue,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        });

        return { email };
    }

    static async verify(email: string, otp: string) {
        const otpRecord = await OTP.findOne({ email, otp });
        if (!otpRecord) {
            const err: any = new Error('Invalid OTP');
            err.statusCode = 400;
            throw err;
        }

        const user = await User.findOne({ email });
        if (!user) {
            const err: any = new Error('User not found');
            err.statusCode = 404;
            throw err;
        }

        user.status = 'active';
        user.emailVerified = true;
        await user.save();
        await OTP.deleteOne({ _id: otpRecord._id });

        return true;
    }

    static async login(identifier: string, pass: string) {
        const user = await User.findOne({
            $or: [{ email: identifier }, { username: identifier }]
        }).select('+password');

        if (!user || !(await verifyPassword(pass, user.password as string))) {
            const err: any = new Error('Invalid credentials');
            err.statusCode = 401;
            throw err;
        }
        
        if (user.status !== 'active') {
            const err: any = new Error('Account inactive');
            err.statusCode = 403;
            throw err;
        }

        user.lastLogin = new Date();
        await user.save();

        const token = generateToken({ id: user._id, role: user.role || 'user' });
        return { user, token };
    }

    static async forgotPassword(email: string) {
        const user = await User.findOne({ email });
        if (!user) {
            const err: any = new Error('User not found');
            err.statusCode = 404;
            throw err;
        }

        const otpValue = Math.floor(100000 + Math.random() * 900000).toString();

        const emailResponse: any = await sendOTP(email, otpValue);

        if (!emailResponse.success) {
            throw new Error(`Failed to send OTP. Error: ${emailResponse.error?.message || emailResponse.error}`);
        }

        await OTP.deleteMany({ email });
        await OTP.create({
            email,
            otp: otpValue,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        });

        return true;
    }

    static async resetPassword(email: string, otp: string, newPassword: string) {
        const otpRecord = await OTP.findOne({ email, otp });
        if (!otpRecord) {
            const err: any = new Error('Invalid OTP');
            err.statusCode = 400;
            throw err;
        }

        const user = await User.findOne({ email });
        if (!user) {
            const err: any = new Error('User not found');
            err.statusCode = 404;
            throw err;
        }

        const hashedPassword = await hashPassword(newPassword);
        user.password = hashedPassword;
        await user.save();
        await OTP.deleteOne({ _id: otpRecord._id });

        return true;
    }
}
