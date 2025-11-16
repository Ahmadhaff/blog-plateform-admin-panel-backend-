import User from '../models/User.js';

const userController = {
  // Create a new editor (Admin can create editors)
  async createEditor(req, res) {
    try {
      const { email, password, username } = req.body;

      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // Validate password length
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }

      // Check if user with this email already exists
      const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
      if (existingUser) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      // Generate username from email if not provided
      const finalUsername = username || email.split('@')[0];

      // Validate username
      if (finalUsername.length < 3 || finalUsername.length > 50) {
        return res.status(400).json({ error: 'Username must be between 3 and 50 characters' });
      }

      // Check if username is already taken
      const existingUsername = await User.findOne({ username: finalUsername });
      if (existingUsername) {
        return res.status(409).json({ error: 'Username already taken' });
      }

      // Create new editor user
      // Editors created by admin are automatically verified and active
      const newEditor = new User({
        email: email.toLowerCase().trim(),
        password,
        username: finalUsername,
        role: 'Éditeur',
        verified: true,
        isActive: true
      });

      await newEditor.save();

      return res.status(201).json({
        message: 'Editor created successfully',
        user: {
          _id: newEditor._id,
          username: newEditor.username,
          email: newEditor.email,
          role: newEditor.role,
          verified: newEditor.verified,
          isActive: newEditor.isActive,
          createdAt: newEditor.createdAt
        }
      });
    } catch (error) {
      console.error('❌ Error creating editor:', error);
      
      // Handle duplicate key error (email or username)
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(409).json({ 
          error: `${field === 'email' ? 'Email' : 'Username'} already exists` 
        });
      }
      
      return res.status(500).json({ error: 'Failed to create editor' });
    }
  },

  // Get all editors with pagination and filters (Admin only)
  async getAllEditors(req, res) {
    try {
      const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
      const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
      const skip = (page - 1) * limit;

      const filter = { role: 'Éditeur' };
      
      if (req.query.isActive !== undefined && req.query.isActive !== '') {
        filter.isActive = req.query.isActive === 'true';
      }
      
      if (req.query.search) {
        filter.$or = [
          { username: { $regex: req.query.search, $options: 'i' } },
          { email: { $regex: req.query.search, $options: 'i' } }
        ];
      }

      const [users, total] = await Promise.all([
        User.find(filter)
          .select('-password -refreshToken')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        User.countDocuments(filter)
      ]);

      return res.json({
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit) || 1
        }
      });
    } catch (error) {
      console.error('❌ Error fetching editors', error);
      return res.status(500).json({ error: 'Failed to fetch editors' });
    }
  },

  // Get all users with pagination and filters
  async getAll(req, res) {
    try {
      const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
      const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
      const skip = (page - 1) * limit;

      const filter = {};
      
      // Build filter conditions - exclude Admin and Éditeur, only show Rédacteur and Lecteur
      if (req.query.role) {
        // Only allow filtering by Rédacteur or Lecteur
        if (req.query.role === 'Rédacteur' || req.query.role === 'Lecteur') {
          filter.role = req.query.role;
        } else {
          // If someone tries to filter by Admin or Éditeur, return empty result
          filter.role = 'NonExistentRole12345';
        }
      } else {
        // Exclude Admin and Éditeur - only show Rédacteur and Lecteur
        filter.role = { $in: ['Rédacteur', 'Lecteur'] };
      }
      
      if (req.query.isActive !== undefined && req.query.isActive !== '') {
        filter.isActive = req.query.isActive === 'true';
      }
      
      if (req.query.search) {
        filter.$or = [
          { username: { $regex: req.query.search, $options: 'i' } },
          { email: { $regex: req.query.search, $options: 'i' } }
        ];
      }

      const [users, total] = await Promise.all([
        User.find(filter)
          .select('-password -refreshToken')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        User.countDocuments(filter)
      ]);

      return res.json({
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit) || 1
        }
      });
    } catch (error) {
      console.error('❌ Error fetching users', error);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
  },

  // Get user by ID
  async getById(req, res) {
    try {
      const { id } = req.params;
      
      const user = await User.findById(id).select('-password -refreshToken');

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json({ user });
    } catch (error) {
      console.error('❌ Error fetching user by id', error);
      return res.status(500).json({ error: 'Failed to fetch user' });
    }
  },

  // Update user role
  // Admin can only change roles between 'Lecteur' and 'Rédacteur'
  async updateRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;

      // Only allow changing to 'Lecteur' or 'Rédacteur'
      if (!['Rédacteur', 'Lecteur'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role. Only Lecteur and Rédacteur roles can be assigned.' });
      }

      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Prevent changing admin's own role
      if (user._id.toString() === req.user._id.toString() && user.role === 'Admin') {
        return res.status(400).json({ error: 'Cannot change your own role' });
      }

      // Prevent changing roles for Admin or Éditeur users
      if (user.role === 'Admin' || user.role === 'Éditeur') {
        return res.status(403).json({ error: 'Cannot change role for Admin or Éditeur users' });
      }

      user.role = role;
      await user.save();

      return res.json({
        message: 'User role updated successfully',
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          isActive: user.isActive
        }
      });
    } catch (error) {
      console.error('❌ Error updating user role', error);
      return res.status(500).json({ error: 'Failed to update user role' });
    }
  },

  // Suspend/unsuspend user account
  async toggleActiveStatus(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Prevent suspending yourself
      if (user._id.toString() === req.user._id.toString()) {
        return res.status(400).json({ error: 'Cannot suspend your own account' });
      }

      user.isActive = !user.isActive;
      await user.save();

      return res.json({
        message: `User account ${user.isActive ? 'activated' : 'suspended'} successfully`,
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          isActive: user.isActive
        }
      });
    } catch (error) {
      console.error('❌ Error toggling user active status', error);
      return res.status(500).json({ error: 'Failed to update user status' });
    }
  }
};

export default userController;

