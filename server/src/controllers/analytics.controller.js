import { asyncHandler } from '../utils/asyncHandler.js';
import * as analyticsService from '../services/analytics.service.js';

export const getDriverAnalytics = asyncHandler(async (req, res) => {
  const data = await analyticsService.getDriverAnalytics(req.user._id);
  res.json({ data });
});

export const getOwnerAnalytics = asyncHandler(async (req, res) => {
  // Parse filter options from query parameters
  const options = {};
  
  // Date range filter
  if (req.query.startDate && req.query.endDate) {
    options.startDate = req.query.startDate;
    options.endDate = req.query.endDate;
  } else if (req.query.dateRange) {
    // Support preset ranges: 7d, 30d, 90d
    const days = parseInt(req.query.dateRange);
    if (!isNaN(days) && days > 0) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      options.startDate = startDate.toISOString().slice(0, 10);
      options.endDate = endDate.toISOString().slice(0, 10);
    }
  }
  
  // Parking filter
  if (req.query.parkingId) {
    options.parkingId = req.query.parkingId;
  }
  
  const data = await analyticsService.getOwnerAnalytics(req.user._id, options);
  res.json({ data });
});

export const getAdminAnalytics = asyncHandler(async (req, res) => {
  const data = await analyticsService.getAdminAnalytics();
  res.json({ data });
});
