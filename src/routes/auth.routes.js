import express from 'express';
import jwt from 'jsonwebtoken';
import { login, getProfile } from '../controllers/authController.js';
import auth from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

router.post('/login', login);
router.get('/profile', auth, getProfile);

// Logout should work even with expired tokens - try auth but don't require it
router.post('/logout', async (req, res) => {
  try {
    // Try to authenticate, but if it fails, still allow logout
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (user) {
          user.refreshToken = undefined;
          await user.save();
        }
        return res.json({ message: 'Logged out successfully' });
      } catch (error) {
        // Token is invalid/expired, but still allow logout (clear client-side only)
        return res.json({ message: 'Logged out successfully' });
      }
    }
    // No token provided, just return success
    return res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('❌ Logout error:', error);
    // Even on error, return success to allow client-side cleanup
    return res.json({ message: 'Logged out successfully' });
  }
});

export default router;

