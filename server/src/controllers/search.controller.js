import { getSearchSuggestions } from '../services/search.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getSuggestions = asyncHandler(async (req, res) => {
  const data = await getSearchSuggestions(req.validatedQuery);

  res.status(200).json({
    success: true,
    data
  });
});
