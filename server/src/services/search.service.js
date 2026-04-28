import { Parking } from '../models/parking.model.js';

export async function getSearchSuggestions(query, deps = {}) {
  const ParkingModel = deps.ParkingModel ?? Parking;
  const q = query.q?.trim();

  if (!q || q.length < 2) {
    return {
      suggestions: []
    };
  }

  const matcher = new RegExp(escapeRegExp(q), 'i');
  const visibilityFilter = {
    verificationStatus: 'approved',
    isActive: true
  };

  const [cities, areas, titleParkings] = await Promise.all([
    ParkingModel.distinct('city', { ...visibilityFilter, city: matcher }),
    ParkingModel.distinct('area', { ...visibilityFilter, area: matcher }),
    ParkingModel.find({ ...visibilityFilter, title: matcher }).select('title city state').limit(5).lean()
  ]);

  return {
    suggestions: [
      ...cities.filter(Boolean).slice(0, 5).map((value) => ({ type: 'city', value })),
      ...areas.filter(Boolean).slice(0, 5).map((value) => ({ type: 'area', value })),
      ...titleParkings.map((parking) => ({
        type: 'parking',
        value: parking.title,
        city: parking.city,
        state: parking.state
      }))
    ].slice(0, 10)
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
