import express from 'express';
import articleController from '../controllers/articleController.js';
import auth from '../middleware/auth.js';
import { isAdminOrEditor, isAdmin } from '../middleware/permissions.js';

const router = express.Router();

// Public route - Stream article image (no auth required)
router.get('/:id/image', articleController.streamImage);

// All other routes require authentication
router.use(auth);

// Get all articles (Admin and Editor can view all articles)
router.get('/', isAdminOrEditor, articleController.getAll);

// Get article by ID
router.get('/:id', isAdminOrEditor, articleController.getById);

// Update article (Admin and Editor can edit any article)
router.put('/:id', isAdminOrEditor, articleController.update);

// Delete article (Admin only)
router.delete('/:id', isAdmin, articleController.delete);

export default router;

