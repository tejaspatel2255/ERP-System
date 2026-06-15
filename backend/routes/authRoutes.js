import express from 'express';
import { body } from 'express-validator';
import { login, refresh, logout, me } from '../controllers/authController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Input validation rules
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Must be a valid email address.')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required.')
];

const tokenValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required.')
];

// Auth Routes
router.post('/login', loginValidation, login);
router.post('/refresh', tokenValidation, refresh);
router.post('/logout', tokenValidation, logout);
router.get('/me', verifyToken, me);

export default router;
