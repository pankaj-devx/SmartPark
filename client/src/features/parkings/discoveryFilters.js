export const initialDiscoveryFilters = {
  search: '',
  state: '',
  district: '',
  city: '',
  area: '',
  date: '',
  startTime: '',
  endTime: '',
  vehicleType: '',
  parkingType: '',
  minPrice: '',
  maxPrice: '',
  amenities: [],
  availableOnly: true,
  openNow: false,
  isOpen24x7: false,
  sort: 'relevance',
  lat: '',
  lng: '',
  radiusKm: '5'
};

export function buildDiscoveryPath(patch = {}) {
  const params = filtersToSearchParams({
    ...initialDiscoveryFilters,
    ...patch
  });
  const query = params.toString();
  return query ? `/parkings?${query}` : '/parkings';
}

export function filtersFromSearchParams(searchParams) {
  const params = searchParams instanceof URLSearchParams ? searchParams : new URLSearchParams(searchParams);

  return {
    ...initialDiscoveryFilters,
    search: params.get('search') ?? '',
    state: params.get('state') ?? '',
    district: params.get('district') ?? '',
    city: params.get('city') ?? '',
    area: params.get('area') ?? '',
    date: params.get('date') ?? '',
    startTime: params.get('startTime') ?? '',
    endTime: params.get('endTime') ?? '',
    vehicleType: params.get('vehicleType') ?? '',
    parkingType: params.get('parkingType') ?? '',
    minPrice: params.get('minPrice') ?? '',
    maxPrice: params.get('maxPrice') ?? '',
    amenities: parseAmenities(params.get('amenities')),
    availableOnly: parseBoolean(params.get('availableOnly'), true),
    openNow: parseBoolean(params.get('openNow'), false),
    isOpen24x7: parseBoolean(params.get('isOpen24x7'), false),
    sort: params.get('sort') ?? 'relevance',
    lat: params.get('lat') ?? '',
    lng: params.get('lng') ?? '',
    radiusKm: params.get('radiusKm') ?? '5'
  };
}

export function filtersToSearchParams(filters) {
  const params = new URLSearchParams();

  setIfValue(params, 'search', filters.search);
  setIfValue(params, 'state', filters.state);
  setIfValue(params, 'district', filters.district);
  setIfValue(params, 'city', filters.city);
  setIfValue(params, 'area', filters.area);
  setIfValue(params, 'date', filters.date);
  setIfValue(params, 'startTime', filters.startTime);
  setIfValue(params, 'endTime', filters.endTime);
  setIfValue(params, 'vehicleType', filters.vehicleType);
  setIfValue(params, 'parkingType', filters.parkingType);
  setIfValue(params, 'minPrice', filters.minPrice);
  setIfValue(params, 'maxPrice', filters.maxPrice);

  if (Array.isArray(filters.amenities) && filters.amenities.length > 0) {
    params.set('amenities', filters.amenities.join(','));
  }

  if (filters.availableOnly === false) {
    params.set('availableOnly', 'false');
  }

  if (filters.openNow) {
    params.set('openNow', 'true');
  }

  if (filters.isOpen24x7) {
    params.set('isOpen24x7', 'true');
  }

  if (filters.sort && filters.sort !== initialDiscoveryFilters.sort) {
    params.set('sort', filters.sort);
  }

  setIfValue(params, 'lat', filters.lat);
  setIfValue(params, 'lng', filters.lng);

  if (filters.radiusKm && filters.radiusKm !== initialDiscoveryFilters.radiusKm) {
    params.set('radiusKm', filters.radiusKm);
  }

  return params;
}

export function toApiParams(filters) {
  return Object.fromEntries(
    Object.entries({
      ...filters,
      amenities: Array.isArray(filters.amenities) ? filters.amenities.join(',') : filters.amenities
    }).filter(([, value]) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }

      return value !== '' && value !== null && value !== undefined && value !== false;
    })
  );
}

function parseAmenities(value) {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBoolean(value, fallback) {
  if (value === null) {
    return fallback;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return fallback;
}

function setIfValue(params, key, value) {
  if (value !== '' && value !== null && value !== undefined) {
    params.set(key, value);
  }
}
