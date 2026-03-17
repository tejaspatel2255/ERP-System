import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import OTP from '../models/OTP';
import { sendOTP } from '../lib/mailer';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Helpers
const hashPassword = async (password: string) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

const verifyPassword = async (password: string, hash: string) => {
    return await bcrypt.compare(password, hash);
};

const generateToken = (payload: any) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
};

// Register
router.post('/register', async (req: any, res: any) => {
    try {
        const { username, name, email, mobile, password } = req.body;

        if (!username || !name || !email || !mobile || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check existing
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            // Simple duplicate check for MVP
            if (existingUser.status === 'pending') {
                await User.deleteOne({ _id: existingUser._id });
            } else {
                return res.status(409).json({ error: 'User already exists' });
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

        // OTP
        const otpValue = Math.floor(100000 + Math.random() * 900000).toString();

        // Send Email First
        const emailResponse: any = await sendOTP(email, otpValue);

        if (!emailResponse.success) {
            // Rollback user creation if email fails
            await User.deleteOne({ _id: newUser._id });
            console.error('Email Error:', emailResponse.error);
            return res.status(500).json({
                error: `Failed to send OTP. Error: ${emailResponse.error.message || emailResponse.error}`
            });
        }

        await OTP.deleteMany({ email });
        await OTP.create({
            email,
            otp: otpValue,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        });

        res.status(201).json({
            message: 'OTP sent to email. Verify to continue.',
            email: email
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server Error' });
    }
});

// Verify
router.post('/verify', async (req: any, res: any) => {
    try {
        const { email, otp } = req.body;
        const otpRecord = await OTP.findOne({ email, otp });
        if (!otpRecord) return res.status(400).json({ error: 'Invalid OTP' });

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.status = 'active';
        user.emailVerified = true;
        await user.save();
        await OTP.deleteOne({ _id: otpRecord._id });

        res.json({ message: 'Verified' });
    } catch (e) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// Login
router.post('/login', async (req: any, res: any) => {
    try {
        const { identifier, password } = req.body;
        const user = await User.findOne({
            $or: [{ email: identifier }, { username: identifier }]
        }).select('+password');

        if (!user || !(await verifyPassword(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        if (user.status !== 'active') {
            return res.status(403).json({ error: 'Account inactive' });
        }

        user.lastLogin = new Date();
        await user.save();

        const token = generateToken({ id: user._id, role: user.role || 'user' });

        // HTTP Only Cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict', // Might need 'lax' if on different ports locally without proxy
            maxAge: 86400000
        });

        // Also return token in body for client storage option if needed, but cookie is better.
        // For cors cross-port, credentialed reqs need specific origin.
        res.json({
            message: 'Login successful',
            user: { username: user.username, email: user.email, role: user.role }
        });

    } catch (e: any) {
        console.error('Login Error:', e);
        res.status(500).json({ error: 'Server Error', details: e.message });
    }
});

export default router;
