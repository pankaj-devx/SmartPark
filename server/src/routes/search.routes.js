import { Router } from 'express';
import { getSuggestions } from '../controllers/search.controller.js';
import { requireDatabase } from '../middleware/requireDatabase.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { searchSuggestionsQuerySchema } from '../validators/parking.validator.js';

export const searchRoutes = Router();

searchRoutes.get('/suggestions', requireDatabase, validateRequest(searchSuggestionsQuerySchema, 'query'), getSuggestions);
