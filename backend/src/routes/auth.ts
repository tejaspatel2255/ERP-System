import express from 'express';
import { AuthService } from '../services/AuthService';
import { validate } from '../middlewares/validate';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from 'shared';
import { AuditLogger } from '../utils/auditLogger';

const router = express.Router();

router.post('/register', validate(registerSchema), async (req: any, res: any) => {
    const { email } = await AuthService.register(req.body);
    res.status(201).json({
        message: 'OTP sent to email. Verify to continue.',
        email: email,
    });
});

router.post('/verify', async (req: any, res: any) => {
    const { email, otp } = req.body;
    await AuthService.verify(email, otp);
    res.json({ message: 'Verified' });
});

router.post('/login', validate(loginSchema), async (req: any, res: any) => {
    const { identifier, password } = req.body;
    const { user, token } = await AuthService.login(identifier, password);

    await AuditLogger.log(user._id.toString(), user.username, 'LOGIN', 'User', user._id.toString(), {
        ipAddress: req.ip,
    });

    res.cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 86400000,
    });

    res.json({
        message: 'Login successful',
        user: { username: user.username, email: user.email, role: user.role },
    });
});

router.post('/forgot-password', validate(forgotPasswordSchema), async (req: any, res: any) => {
    await AuthService.forgotPassword(req.body.email);
    res.json({ message: 'If the email exists, an OTP has been sent.' });
});

router.post('/reset-password', validate(resetPasswordSchema), async (req: any, res: any) => {
    const { email, otp, newPassword } = req.body;
    await AuthService.resetPassword(email, otp, newPassword);
    res.json({ message: 'Password has been reset successfully.' });
});

export default router;
