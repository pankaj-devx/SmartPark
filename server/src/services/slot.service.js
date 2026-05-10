/**
 * slot.service.js
 * 
 * DEPRECATED: This service is being phased out in favor of dynamic occupancy calculation.
 * 
 * The SmartPark system now uses a pure dynamic availability model where:
 * - Authoritative truth: parking.totalSlots + live booking documents
 * - Availability formula: totalSlots - overlapping active bookings
 * - No DB field mutation on booking lifecycle events
 * 
 * This file is kept for backward compatibility but should not be used in new code.
 * Use occupancy.service.js instead for all availability calculations.
 */

// This file intentionally left minimal - all functions have been removed
// as they are no longer needed with the dynamic occupancy model.
// 
// If you need to calculate availability, use:
// - calculateOccupiedSlots() from occupancy.service.js
// - calculateAvailableSlots() from occupancy.service.js
// - calculateOccupancyMetrics() from occupancy.service.js
