import express from 'express';
import analyticsController from '../controllers/analyticsController.js';
import auth from '../middleware/auth.js';
import { isAdminOrEditor } from '../middleware/permissions.js';

const router = express.Router();

// All routes require authentication
router.use(auth);
router.use(isAdminOrEditor);

// Get dashboard analytics
router.get('/dashboard', analyticsController.getDashboard);

// Get article analytics
router.get('/articles', analyticsController.getArticleAnalytics);

export default router;

