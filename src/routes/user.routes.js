import express from 'express';
import userController from '../controllers/userController.js';
import auth from '../middleware/auth.js';
import { isAdmin, isAdminOrEditor } from '../middleware/permissions.js';

const router = express.Router();

// All routes require authentication
router.use(auth);

// Create new editor (Admin only)
router.post('/editors', isAdmin, userController.createEditor);

// Get all users (Admin and Editor can view)
router.get('/', isAdminOrEditor, userController.getAll);

// Get user by ID (Admin and Editor can view)
router.get('/:id', isAdminOrEditor, userController.getById);

// Update user role (Admin only)
router.put('/:id/role', isAdmin, userController.updateRole);

// Toggle user active status - suspend/unsuspend (Admin and Editor can do this)
router.put('/:id/status', isAdminOrEditor, userController.toggleActiveStatus);

export default router;

