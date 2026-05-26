import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export const sendOTP = async (email: string, otp: string) => {
    try {
        const info = await transporter.sendMail({
            from: `"ERP System" <${process.env.SMTP_USER}>`,
            to: email,
            subject: "Your Verification Code",
            text: `Your OTP for account verification is: ${otp}. It is valid for 10 minutes.`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #4F46E5;">ERP System Verification</h2>
                    <p>Your OTP for account verification is:</p>
                    <h1 style="background: #F3F4F6; padding: 10px; display: inline-block; border-radius: 5px; letter-spacing: 5px;">${otp}</h1>
                    <p>This code is valid for 10 minutes.</p>
                </div>
            `,
        });
        console.log("Message sent: %s", info.messageId);
        return { success: true };
    } catch (error: any) {
        console.error("Error sending email: ", error);
        return { success: false, error: error.message || error };
    }
};
