import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendOTP = async (email: string, otp: string) => {
    try {
        const { data, error } = await resend.emails.send({
            from: 'ERP System <onboarding@resend.dev>',
            to: email,
            subject: 'Your ERP Verification Code',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 500px; margin: 0 auto; color: #333;">
                    <h2 style="color: #4F46E5; margin-bottom: 8px;">ERP System</h2>
                    <p style="color: #6b7280; margin-top: 0;">Your verification code</p>
                    <div style="background: #F3F4F6; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
                        <h1 style="letter-spacing: 12px; font-size: 36px; margin: 0; color: #4F46E5;">${otp}</h1>
                    </div>
                    <p style="color: #6b7280; font-size: 14px;">This code is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
                </div>
            `,
        });

        if (error) {
            console.error('Resend error:', error);
            return { success: false, error: error.message };
        }

        console.log('Email sent via Resend:', data?.id);
        return { success: true };
    } catch (error: any) {
        console.error('Error sending email:', error);
        return { success: false, error: error.message || error };
    }
};
