import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth.js';
import * as ctrl from '../controllers/eventController.js';

const router = Router();

const ticketTypeSchema = z.object({
  name: z.string().min(1), price: z.number().min(0), capacity: z.number().min(0),
  saleStart: z.coerce.date().optional(), saleEnd: z.coerce.date().optional(),
});

const eventSchema = z.object({
  title: z.string().min(3), description: z.string().min(10),
  category: z.string().min(1), tags: z.array(z.string()).optional().default([]),
  eventType: z.enum(['Birthday Party', 'College Event', 'Workshop', 'Seminar', 'Hackathon', 'Conference', 'Concert', 'Sports', 'Corporate Event', 'Community Event', 'Festival', 'Other']),
  image: z.string().optional().default(''),
  city: z.string().min(1), venue: z.string().min(1),
  location: z.object({ lat: z.number().optional(), lng: z.number().optional() }).optional(),
  date: z.coerce.date(), startTime: z.string(), endTime: z.string(),
  capacity: z.number().min(1), ticketTypes: z.array(ticketTypeSchema).min(1),
  registrationStart: z.coerce.date(), registrationEnd: z.coerce.date(),
  language: z.enum(['English', 'Nepali', 'Both']).optional(),
  visibility: z.enum(['public', 'private']).optional(),
});

router.get('/', optionalAuth, ctrl.listEvents);
router.get('/mine', requireAuth, requireRole('organizer', 'admin'), ctrl.myEvents);
router.get('/:id', optionalAuth, ctrl.getEvent);
router.post('/', requireAuth, requireRole('organizer', 'admin'), validateBody(eventSchema), ctrl.createEvent);
router.put('/:id', requireAuth, requireRole('organizer', 'admin'), ctrl.updateEvent);
router.delete('/:id', requireAuth, requireRole('organizer', 'admin'), ctrl.deleteEvent);
router.post('/:id/submit', requireAuth, requireRole('organizer'), ctrl.submitForApproval);
router.post('/:id/moderate', requireAuth, requireRole('admin'), ctrl.moderateEvent);
router.post('/:id/cancel', requireAuth, requireRole('organizer', 'admin'), ctrl.cancelEvent);
router.post('/:id/favorite', requireAuth, ctrl.toggleFavorite);
router.post('/interactions', requireAuth, ctrl.trackInteraction);

export default router;
