"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const OTP_1 = __importDefault(require("../models/OTP"));
const mailer_1 = require("../lib/mailer");
const router = express_1.default.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
// Helpers
const hashPassword = (password) => __awaiter(void 0, void 0, void 0, function* () {
    const salt = yield bcryptjs_1.default.genSalt(10);
    return yield bcryptjs_1.default.hash(password, salt);
});
const verifyPassword = (password, hash) => __awaiter(void 0, void 0, void 0, function* () {
    return yield bcryptjs_1.default.compare(password, hash);
});
const generateToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: '1d' });
};
// Register
router.post('/register', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, name, email, mobile, password } = req.body;
        if (!username || !name || !email || !mobile || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        // Check existing
        const existingUser = yield User_1.default.findOne({
            $or: [{ email }, { username }]
        });
        if (existingUser) {
            // Simple duplicate check for MVP
            if (existingUser.status === 'pending') {
                yield User_1.default.deleteOne({ _id: existingUser._id });
            }
            else {
                return res.status(409).json({ error: 'User already exists' });
            }
        }
        const hashedPassword = yield hashPassword(password);
        const newUser = yield User_1.default.create({
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
        const emailResponse = yield (0, mailer_1.sendOTP)(email, otpValue);
        if (!emailResponse.success) {
            // Rollback user creation if email fails
            yield User_1.default.deleteOne({ _id: newUser._id });
            console.error('Email Error:', emailResponse.error);
            return res.status(500).json({
                error: `Failed to send OTP. Error: ${emailResponse.error.message || emailResponse.error}`
            });
        }
        yield OTP_1.default.deleteMany({ email });
        yield OTP_1.default.create({
            email,
            otp: otpValue,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        });
        res.status(201).json({
            message: 'OTP sent to email. Verify to continue.',
            email: email
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server Error' });
    }
}));
// Verify
router.post('/verify', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, otp } = req.body;
        const otpRecord = yield OTP_1.default.findOne({ email, otp });
        if (!otpRecord)
            return res.status(400).json({ error: 'Invalid OTP' });
        const user = yield User_1.default.findOne({ email });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        user.status = 'active';
        user.emailVerified = true;
        yield user.save();
        yield OTP_1.default.deleteOne({ _id: otpRecord._id });
        res.json({ message: 'Verified' });
    }
    catch (e) {
        res.status(500).json({ error: 'Server Error' });
    }
}));
// Login
router.post('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { identifier, password } = req.body;
        const user = yield User_1.default.findOne({
            $or: [{ email: identifier }, { username: identifier }]
        }).select('+password');
        if (!user || !(yield verifyPassword(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        if (user.status !== 'active') {
            return res.status(403).json({ error: 'Account inactive' });
        }
        user.lastLogin = new Date();
        yield user.save();
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
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server Error' });
    }
}));
exports.default = router;
