import request from 'supertest';
import { app } from '../../app';
import { connectDBForTesting, disconnectDBForTesting, clearDBForTesting } from '../db';
import User from '../../models/User';
import OTP from '../../models/OTP';
import * as mailer from '../../lib/mailer';

// Mock mailer
jest.mock('../../lib/mailer', () => ({
    sendOTP: jest.fn().mockResolvedValue({ success: true })
}));

beforeAll(async () => {
    await connectDBForTesting();
});

afterAll(async () => {
    await disconnectDBForTesting();
});

afterEach(async () => {
    await clearDBForTesting();
});

describe('Auth Integration Tests (Black Box)', () => {
    const testUser = {
        username: 'testintegration',
        name: 'Integration Test',
        email: 'integration@test.com',
        mobile: '9876543210',
        password: 'Password123!'
    };

    describe('POST /api/auth/register', () => {
        it('should register a new user and send OTP', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send(testUser);

            expect(res.status).toBe(201);
            expect(res.body.message).toContain('OTP sent to email');
            
            const user = await User.findOne({ email: testUser.email });
            expect(user).toBeDefined();
            expect(user?.status).toBe('pending');

            const otp = await OTP.findOne({ email: testUser.email });
            expect(otp).toBeDefined();
        });

        it('should fail if fields are missing', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ email: 'test@test.com' });

            expect(res.status).toBe(400);
        });
    });

    describe('POST /api/auth/verify', () => {
        it('should verify a user with correct OTP', async () => {
            // First register
            await request(app).post('/api/auth/register').send(testUser);
            const otpRecord = await OTP.findOne({ email: testUser.email });

            const res = await request(app)
                .post('/api/auth/verify')
                .send({
                    email: testUser.email,
                    otp: otpRecord?.otp
                });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Verified');

            const user = await User.findOne({ email: testUser.email });
            expect(user?.status).toBe('active');
            expect(user?.emailVerified).toBe(true);
        });

        it('should fail with invalid OTP', async () => {
            await request(app).post('/api/auth/register').send(testUser);

            const res = await request(app)
                .post('/api/auth/verify')
                .send({
                    email: testUser.email,
                    otp: '000000'
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Invalid OTP');
        });
    });

    describe('POST /api/auth/login', () => {
        it('should login successfully and return a cookie after verification', async () => {
            // Setup: Register and Verify
            await request(app).post('/api/auth/register').send(testUser);
            const otpRecord = await OTP.findOne({ email: testUser.email });
            await request(app).post('/api/auth/verify').send({ email: testUser.email, otp: otpRecord?.otp });

            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    identifier: testUser.email,
                    password: testUser.password
                });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Login successful');
            expect(res.header['set-cookie']).toBeDefined();
        });

        it('should fail if account is not verified', async () => {
            await request(app).post('/api/auth/register').send(testUser);

            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    identifier: testUser.email,
                    password: testUser.password
                });

            expect(res.status).toBe(403);
            expect(res.body.error).toBe('Account inactive');
        });
    });
});
