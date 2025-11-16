import express from 'express';
import { login, getProfile, logout } from '../controllers/authController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.get('/profile', auth, getProfile);
router.post('/logout', auth, logout);

export default router;

