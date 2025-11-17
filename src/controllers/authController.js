import User from '../models/User.js';
import { generateAccessToken, generateRefreshToken } from '../utils/helpers.js';

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Validate JWT secrets are available
    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      console.error('❌ JWT secrets not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is suspended. Please contact administrator.' });
    }

    // Only allow Admin and Éditeur to login to admin panel
    if (!['Admin', 'Éditeur'].includes(user.role)) {
      return res.status(403).json({ error: 'Access denied. Admin or Editor role required.' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token to database
    user.refreshToken = refreshToken;
    await user.save();

    return res.json({
      accessToken,
      refreshToken,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    console.error('❌ Error stack:', error.stack);
    return res.status(500).json({ error: 'Login failed. Please try again later.' });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -refreshToken');
    return res.json({ user });
  } catch (error) {
    console.error('❌ Get profile error:', error);
    return res.status(500).json({ error: 'Failed to get profile' });
  }
};

const logout = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (user) {
      // Clear refresh token from database
      user.refreshToken = undefined;
      await user.save();
    }

    return res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('❌ Logout error:', error);
    return res.status(500).json({ error: 'Logout failed' });
  }
};

export { login, getProfile, logout };

