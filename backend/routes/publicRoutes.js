import express from 'express';
import * as publicController from '../controllers/publicController.js';
import validate from '../utils/validate.js';
import { zonesSchema, calendarSchema, slotsSchema, quoteSchema } from './validators.js';

const router = express.Router();

router.get('/zones', validate(zonesSchema), publicController.getZones);
router.get('/availability/calendar', validate(calendarSchema), publicController.getCalendar);
router.get('/availability/slots', validate(slotsSchema), publicController.getSlots);
router.post('/pricing/quote', validate(quoteSchema), publicController.getQuote);
router.get('/pricing', publicController.getPricing);

export default router;
