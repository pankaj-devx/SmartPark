import { SlidersHorizontal } from 'lucide-react';

const amenities = ['covered', 'cctv', 'ev charging', 'security', 'valet', 'accessible'];
const vehicleTypes = ['2-wheeler', '4-wheeler'];
const parkingTypes = ['open', 'covered', 'basement', 'garage', 'street', 'lot'];

export function FilterSidebar({ filters, onChange, onReset }) {
  function updateField(event) {
    const { name, type, value, checked } = event.target;
    onChange({ [name]: type === 'checkbox' ? checked : value });
  }

  function toggleAmenity(value) {
    const nextAmenities = filters.amenities.includes(value)
      ? filters.amenities.filter((item) => item !== value)
      : [...filters.amenities, value];

    onChange({ amenities: nextAmenities });
  }

  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-950">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Filters
        </h2>
        <button className="text-sm font-medium text-brand-700 hover:text-brand-600" onClick={onReset} type="button">
          Reset
        </button>
      </div>

      <div className="grid gap-4">
        <Field label="State" name="state" onChange={updateField} placeholder="Maharashtra" value={filters.state} />
        <Field label="District" name="district" onChange={updateField} placeholder="Pune" value={filters.district} />
        <Field label="City" name="city" onChange={updateField} placeholder="Pune" value={filters.city} />
        <Field label="Area" name="area" onChange={updateField} placeholder="Camp" value={filters.area} />

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Vehicle
          <select className="rounded-md border border-slate-300 px-3 py-2" name="vehicleType" onChange={updateField} value={filters.vehicleType}>
            <option value="">Any vehicle</option>
            {vehicleTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Parking type
          <select className="rounded-md border border-slate-300 px-3 py-2" name="parkingType" onChange={updateField} value={filters.parkingType}>
            <option value="">Any type</option>
            {parkingTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Min price" min="1" name="minPrice" onChange={updateField} type="number" value={filters.minPrice} />
          <Field label="Max price" min="1" name="maxPrice" onChange={updateField} type="number" value={filters.maxPrice} />
        </div>

        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium text-slate-700">Amenities</legend>
          <div className="flex flex-wrap gap-2">
            {amenities.map((amenity) => (
              <button
                className={`rounded-md border px-3 py-2 text-xs font-medium ${
                  filters.amenities.includes(amenity)
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-slate-300 bg-white text-slate-700'
                }`}
                key={amenity}
                onClick={() => toggleAmenity(amenity)}
                type="button"
              >
                {amenity}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
          <input checked={filters.availableOnly} name="availableOnly" onChange={updateField} type="checkbox" />
          Available slots only
        </label>
        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
          <input checked={filters.openNow} name="openNow" onChange={updateField} type="checkbox" />
          Open now
        </label>
        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
          <input checked={filters.isOpen24x7} name="isOpen24x7" onChange={updateField} type="checkbox" />
          24x7
        </label>
      </div>
    </aside>
  );
}

function Field({ label, ...props }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      {label}
      <input className="rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" {...props} />
    </label>
  );
}
