import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as ctrl from '../controllers/aiController.js';

const router = Router();
router.get('/recommendations', requireAuth, ctrl.getRecommendations);
router.get('/attendance/model-info', requireAuth, requireRole('organizer', 'admin'), ctrl.attendancePredictionInfo);
router.post('/attendance/retrain', requireAuth, requireRole('admin'), ctrl.retrainAttendanceModel);
router.get('/attendance/event/:eventId', requireAuth, requireRole('organizer', 'admin'), ctrl.predictEventAttendance);

export default router;
