import { hashPassword, verifyPassword, generateToken } from '../../lib/authUtils';
import jwt from 'jsonwebtoken';

describe('Auth Utilities', () => {
    describe('Password Hashing', () => {
        it('should hash a password and be able to verify it', async () => {
            const password = 'mySecretPassword123';
            const hash = await hashPassword(password);

            expect(hash).not.toBe(password);

            const isMatch = await verifyPassword(password, hash);
            expect(isMatch).toBe(true);

            const isWrongMatch = await verifyPassword('wrongpassword', hash);
            expect(isWrongMatch).toBe(false);
        });
    });

    describe('JWT Generation', () => {
        it('should generate a valid JWT', () => {
            const payload = { id: '123', role: 'admin' };
            const token = generateToken(payload);

            expect(token).toBeDefined();
            expect(typeof token).toBe('string');

            const secret = process.env.JWT_SECRET || 'secret';
            const decoded = jwt.verify(token, secret) as any;

            expect(decoded.id).toBe('123');
            expect(decoded.role).toBe('admin');
            expect(decoded.exp).toBeDefined(); // Should have an expiration
        });
    });
});
