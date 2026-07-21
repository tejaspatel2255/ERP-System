import express from 'express';
import { body } from 'express-validator';
import { login, refresh, logout, me, register, seedAdmin } from '../controllers/authController.js';
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

const registerValidation = [
  body('name')
    .notEmpty()
    .withMessage('Name is required.')
    .trim(),
  body('email')
    .isEmail()
    .withMessage('Must be a valid email address.')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long.')
];

const tokenValidation = (req, res, next) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!token) {
    return res.status(400).json({ success: false, message: 'Refresh token is required.' });
  }
  next();
};

// Auth Routes
router.get('/seed', seedAdmin);
router.post('/login', loginValidation, login);
router.post('/register', registerValidation, register);
router.post('/refresh', tokenValidation, refresh);
router.post('/logout', logout);
router.get('/me', verifyToken, me);

export default router;
