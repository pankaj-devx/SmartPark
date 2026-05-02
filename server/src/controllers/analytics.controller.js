import { asyncHandler } from '../utils/asyncHandler.js';
import * as analyticsService from '../services/analytics.service.js';

export const getDriverAnalytics = asyncHandler(async (req, res) => {
  const data = await analyticsService.getDriverAnalytics(req.user._id);
  res.json({ data });
});

export const getOwnerAnalytics = asyncHandler(async (req, res) => {
  const data = await analyticsService.getOwnerAnalytics(req.user._id);
  res.json({ data });
});

export const getAdminAnalytics = asyncHandler(async (req, res) => {
  const data = await analyticsService.getAdminAnalytics();
  res.json({ data });
});
