import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export interface DecodedUser {
    id: string;
    username: string;
    email: string;
    role: 'admin' | 'manager' | 'user';
    status: string;
    [key: string]: any;
}

export const verifyToken = async (req: any, res: Response, next: NextFunction) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized: Access token missing' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        if (!decoded || !decoded.id) {
            return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
        }

        // Fetch user profile to get additional fields (username, role, status)
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', decoded.id)
            .single();

        if (profileError || !profile) {
            return res.status(401).json({ error: 'Unauthorized: User profile not found' });
        }

        req.user = {
            id: profile.id,
            email: profile.email,
            username: profile.username || profile.email,
            role: profile.role || 'user',
            status: profile.status || 'pending',
        };

        next();
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }
};

export const authorize = (allowedRoles: string[]) => {
    return (req: any, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
        }

        const userRole = req.user.role;
        if (!allowedRoles.includes(userRole)) {
            return res
                .status(403)
                .json({ error: `Forbidden: Access restricted to roles: [${allowedRoles.join(', ')}]` });
        }

        next();
    };
};
