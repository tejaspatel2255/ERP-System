import express from 'express';
import multer from 'multer';
import path from 'path';
import { verifyToken } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  getDesignFiles,
  uploadDesignFile,
  getDesignFileById,
  uploadNewVersion,
  getDesignTasks,
  createDesignTask,
  updateDesignTask,
  updateDesignTaskStatus,
  getPendingReviews,
  submitReview
} from '../controllers/designController.js';

const router = express.Router();

const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.dwg'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, PNG, JPG, and DWG files are allowed.'), false);
  }
};

const uploadDesign = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter
});

router.use(verifyToken);

const requireDesignReviewPermission = (req, res, next) => {
  const { roles = [], permissions = [] } = req.user || {};

  if (roles.includes('Admin')) {
    return next();
  }

  const canReview = permissions.some(
    (perm) =>
      perm.module_name === 'design' &&
      (perm.action === 'review' || perm.action === 'edit')
  );

  if (!canReview) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden. You do not have permission to review design files.'
    });
  }

  return next();
};

// Files
router.get('/files', requirePermission('design', 'read'), getDesignFiles);
router.post('/files', requirePermission('design', 'create'), uploadDesign.single('file'), uploadDesignFile);
router.get('/files/:id', requirePermission('design', 'read'), getDesignFileById);
router.post('/files/:id/versions', requirePermission('design', 'create'), uploadDesign.single('file'), uploadNewVersion);

// Tasks
router.get('/tasks', requirePermission('design', 'read'), getDesignTasks);
router.post('/tasks', requirePermission('design', 'create'), createDesignTask);
router.put('/tasks/:id', requirePermission('design', 'edit'), updateDesignTask);
router.patch('/tasks/:id/status', requirePermission('design', 'edit'), updateDesignTaskStatus);

// Reviews
router.get('/reviews', requirePermission('design', 'read'), getPendingReviews);
router.post('/files/:id/reviews', requireDesignReviewPermission, submitReview);

export default router;
