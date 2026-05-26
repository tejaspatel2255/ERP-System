import { supabase } from '../lib/supabase';
import { hashPassword, verifyPassword, generateToken } from '../lib/authUtils';
import { sendOTP } from '../lib/mailer';

export class AuthService {
    static async register(payload: any) {
        const { username, name, email, mobile, password } = payload;

        // 1. Check if user already exists
        const { data: existingUser, error: checkErr } = await supabase
            .from('profiles')
            .select('id')
            .or(`email.eq.${email},username.eq.${username}`)
            .maybeSingle();

        if (existingUser) {
            const err: any = new Error('Username or email already exists');
            err.statusCode = 400;
            throw err;
        }

        // 2. Hash Password
        const hashedPassword = await hashPassword(password);

        // 3. Create profile in database
        const { data: user, error: insertErr } = await supabase
            .from('profiles')
            .insert([{
                username,
                name,
                email,
                mobile,
                password: hashedPassword,
                role: 'user',
                status: 'pending',
                emailVerified: false
            }])
            .select()
            .single();

        if (insertErr || !user) {
            throw new Error(insertErr?.message || 'Failed to register user');
        }

        // 4. Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

        const { error: otpErr } = await supabase
            .from('otps')
            .insert([{ email, otp, expiresAt }]);

        if (otpErr) {
            throw new Error('Failed to generate verification code');
        }

        // 5. Send OTP via SMTP
        await sendOTP(email, otp);

        return { email };
    }

    static async verify(email: string, otp: string) {
        // Find valid OTP
        const { data: otpRecord, error: otpErr } = await supabase
            .from('otps')
            .select('*')
            .eq('email', email)
            .eq('otp', otp)
            .gte('expiresAt', new Date().toISOString())
            .maybeSingle();

        if (otpErr || !otpRecord) {
            const err: any = new Error('Invalid or expired OTP');
            err.statusCode = 400;
            throw err;
        }

        // Update profile status to active
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ status: 'active', emailVerified: true })
            .eq('email', email);

        if (profileError) {
            throw new Error(profileError.message);
        }

        // Clean up OTP record
        await supabase
            .from('otps')
            .delete()
            .eq('id', otpRecord.id);

        return true;
    }

    static async login(identifier: string, pass: string) {
        // Query user by email or username
        const { data: profile, error: fetchErr } = await supabase
            .from('profiles')
            .select('*')
            .or(`email.eq.${identifier},username.eq.${identifier}`)
            .maybeSingle();

        if (fetchErr || !profile) {
            const err: any = new Error('Invalid credentials');
            err.statusCode = 401;
            throw err;
        }

        if (profile.status === 'pending') {
            const err: any = new Error('Account inactive');
            err.statusCode = 403;
            throw err;
        }

        // Verify password
        const isMatch = await verifyPassword(pass, profile.password);
        if (!isMatch) {
            const err: any = new Error('Invalid credentials');
            err.statusCode = 401;
            throw err;
        }

        // Update last login
        await supabase
            .from('profiles')
            .update({ lastLogin: new Date().toISOString() })
            .eq('id', profile.id);

        // Generate token
        const token = generateToken({ id: profile.id, role: profile.role });

        return {
            user: {
                _id: profile.id,
                username: profile.username,
                email: profile.email,
                role: profile.role,
            },
            token,
        };
    }

    static async forgotPassword(email: string) {
        // Check if user exists
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .maybeSingle();

        if (error || !profile) {
            const err: any = new Error('User not found');
            err.statusCode = 404;
            throw err;
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

        const { error: otpErr } = await supabase
            .from('otps')
            .insert([{ email, otp, expiresAt }]);

        if (otpErr) {
            throw new Error('Failed to generate reset code');
        }

        // Send OTP
        await sendOTP(email, otp);

        return true;
    }

    static async resetPassword(email: string, otp: string, newPassword: string) {
        // Find valid OTP
        const { data: otpRecord, error: otpErr } = await supabase
            .from('otps')
            .select('*')
            .eq('email', email)
            .eq('otp', otp)
            .gte('expiresAt', new Date().toISOString())
            .maybeSingle();

        if (otpErr || !otpRecord) {
            const err: any = new Error('Invalid or expired OTP');
            err.statusCode = 400;
            throw err;
        }

        // Hash new password
        const hashedPassword = await hashPassword(newPassword);

        // Update password
        const { error: updateErr } = await supabase
            .from('profiles')
            .update({ password: hashedPassword })
            .eq('email', email);

        if (updateErr) {
            throw new Error(updateErr.message);
        }

        // Clean up OTP record
        await supabase
            .from('otps')
            .delete()
            .eq('id', otpRecord.id);

        return true;
    }
}
