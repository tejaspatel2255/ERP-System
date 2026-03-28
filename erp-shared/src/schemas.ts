import { z } from 'zod';

export const registerSchema = z.object({
    body: z.object({
        username: z.string().min(3, "Username must be at least 3 characters"),
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Invalid email address"),
        mobile: z.string().regex(/^[0-9]{10}$/, "Mobile number must be 10 digits"),
        password: z.string().min(6, "Password must be at least 6 characters"),
    }),
});

export const loginSchema = z.object({
    body: z.object({
        identifier: z.string().min(1, "Email or Username is required"),
        password: z.string().min(1, "Password is required"),
    }),
});

export const saleItemSchema = z.object({
    productId: z.string().min(1, "Product ID is required"),
    quantity: z.number().positive("Quantity must be positive"),
});

export const createSaleSchema = z.object({
    body: z.object({
        customerId: z.string().min(1, "Customer ID is required"),
        items: z.array(saleItemSchema).min(1, "At least one item is required"),
        status: z.enum(['Pending', 'Completed', 'Cancelled']).optional(),
    }),
});

export const forgotPasswordSchema = z.object({
    body: z.object({
        email: z.string().email("Invalid email address"),
    }),
});

export const resetPasswordSchema = z.object({
    body: z.object({
        email: z.string().email("Invalid email address"),
        otp: z.string().length(6, "OTP must be exactly 6 characters"),
        newPassword: z.string().min(6, "New password must be at least 6 characters"),
    }),
});
