require('dotenv').config();
const nodemailer = require('nodemailer');

console.log("SMTP_HOST:", process.env.SMTP_HOST);
console.log("SMTP_PORT:", process.env.SMTP_PORT);
console.log("SMTP_USER:", process.env.SMTP_USER);
console.log("SMTP_PASS:", process.env.SMTP_PASS);

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    family: 4,
});

transporter.sendMail({
    from: `"ERP System" <${process.env.SMTP_USER}>`,
    to: 'tejaspatel220505@gmail.com',
    subject: "Test OTP Delivery",
    text: "This is a test to verify Nodemailer SMTP delivery.",
}).then(info => {
    console.log("SUCCESS! Mail sent:", info.messageId);
    process.exit(0);
}).catch(err => {
    console.error("FAIL! Error sending email:", err);
    process.exit(1);
});
