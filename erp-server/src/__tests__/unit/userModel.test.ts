import mongoose from 'mongoose';
import User from '../../models/User';
import { connectDBForTesting, disconnectDBForTesting, clearDBForTesting } from '../db';

beforeAll(async () => {
    await connectDBForTesting();
});

afterAll(async () => {
    await disconnectDBForTesting();
});

afterEach(async () => {
    await clearDBForTesting();
});

describe('User Model', () => {
    it('should create and save a user successfully', async () => {
        const validUser = new User({
            username: 'testuser',
            name: 'Test User',
            email: 'test@example.com',
            mobile: '1234567890',
            password: 'hashedpassword',
        });
        
        const savedUser = await validUser.save();
        
        expect(savedUser._id).toBeDefined();
        expect(savedUser.username).toBe('testuser');
        expect(savedUser.role).toBe('user'); // Default role
        expect(savedUser.status).toBe('pending'); // Default status
    });

    it('should fail validation if required fields are missing', async () => {
        const userWithoutRequired = new User({ name: 'Test' });
        
        let err;
        try {
            await userWithoutRequired.save();
        } catch (error) {
            err = error as mongoose.Error.ValidationError;
        }
        
        expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
        if (err) {
            expect(err.errors.username).toBeDefined();
            expect(err.errors.email).toBeDefined();
            expect(err.errors.mobile).toBeDefined();
            expect(err.errors.password).toBeDefined();
        }
    });

    it('should fail validation if email is invalid', async () => {
        const userWithInvalidEmail = new User({
            username: 'testuser2',
            name: 'Test',
            email: 'invalid-email',
            mobile: '1234567890',
            password: 'pass',
        });
        
        let err;
        try {
            await userWithInvalidEmail.save();
        } catch (error) {
            err = error as mongoose.Error.ValidationError;
        }
        
        expect(err).toBeDefined();
        if (err) {
            expect(err.errors.email.message).toBe('Please use a valid email address');
        }
    });
});
