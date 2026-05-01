import { useState } from 'react';
import { ListingImageUploader } from './ListingImageUploader.jsx';

const vehicleOptions = ['2-wheeler', '4-wheeler'];
const amenityOptions = ['covered', 'cctv', 'ev charging', 'security', 'valet', 'accessible'];
const parkingTypeOptions = ['open', 'covered', 'basement', 'garage', 'street', 'lot'];

const emptyForm = {
  title: '',
  description: '',
  address: '',
  city: '',
  district: '',
  area: '',
  state: '',
  pincode: '',
  lat: '',
  lng: '',
  totalSlots: '',
  hourlyPrice: '',
  // Per-vehicle pricing — empty string means "use hourlyPrice fallback"
  price2Wheeler: '',
  price4Wheeler: '',
  vehicleTypes: ['4-wheeler'],
  amenities: [],
  parkingType: 'lot',
  isOpen24x7: true,
  operatingOpen: '00:00',
  operatingClose: '23:59'
};

export function ParkingForm({ initialParking = null, onCancel, onMediaChange, onSubmit, submitLabel }) {
  const [form, setForm] = useState(() => toFormState(initialParking));
  const [pendingImageFiles, setPendingImageFiles] = useState([]);

  function updateField(event) {
    const { checked, name, type, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value
    }));
  }

  function toggleArrayField(field, value) {
    setForm((current) => {
      const hasValue = current[field].includes(value);
      return {
        ...current,
        [field]: hasValue ? current[field].filter((item) => item !== value) : [...current[field], value]
      };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const savedParking = await onSubmit(toPayload(form), pendingImageFiles);

    if (savedParking) {
      setPendingImageFiles([]);
      if (!initialParking) {
        setForm(emptyForm);
      }
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Title" name="title" onChange={updateField} required value={form.title} />
      <Field label="Hourly price (default)" min="1" name="hourlyPrice" onChange={updateField} required type="number" value={form.hourlyPrice} />
      </div>

      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Description
        <textarea
          className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          name="description"
          onChange={updateField}
          required
          value={form.description}
        />
      </label>

      <Field label="Address" name="address" onChange={updateField} required value={form.address} />

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="City" name="city" onChange={updateField} required value={form.city} />
        <Field label="District" name="district" onChange={updateField} value={form.district} />
        <Field label="Area" name="area" onChange={updateField} value={form.area} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="State" name="state" onChange={updateField} required value={form.state} />
        <Field label="Pincode" name="pincode" onChange={updateField} required value={form.pincode} />
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Parking type
          <select className="rounded-md border border-slate-300 px-3 py-2" name="parkingType" onChange={updateField} value={form.parkingType}>
            {parkingTypeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Latitude" max="90" min="-90" name="lat" onChange={updateField} required step="any" type="number" value={form.lat} />
        <Field label="Longitude" max="180" min="-180" name="lng" onChange={updateField} required step="any" type="number" value={form.lng} />
        <Field label="Total slots" min="1" name="totalSlots" onChange={updateField} required type="number" value={form.totalSlots} />
      </div>

      <CheckboxGroup label="Vehicle types" options={vehicleOptions} selected={form.vehicleTypes} onToggle={(value) => toggleArrayField('vehicleTypes', value)} />

      {/* Per-vehicle pricing — optional, overrides the default hourly price */}
      {form.vehicleTypes.length > 0 ? (
        <fieldset className="grid gap-3 rounded-md border border-slate-200 p-4">
          <legend className="px-1 text-sm font-medium text-slate-700">
            Per-vehicle pricing <span className="font-normal text-slate-500">(optional — overrides default rate)</span>
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {form.vehicleTypes.includes('2-wheeler') ? (
              <Field
                label="2-wheeler price (Rs/hr)"
                min="1"
                name="price2Wheeler"
                onChange={updateField}
                placeholder={`Default: Rs ${form.hourlyPrice || '—'}/hr`}
                type="number"
                value={form.price2Wheeler}
              />
            ) : null}
            {form.vehicleTypes.includes('4-wheeler') ? (
              <Field
                label="4-wheeler price (Rs/hr)"
                min="1"
                name="price4Wheeler"
                onChange={updateField}
                placeholder={`Default: Rs ${form.hourlyPrice || '—'}/hr`}
                type="number"
                value={form.price4Wheeler}
              />
            ) : null}
          </div>
          <p className="text-xs text-slate-500">
            Leave blank to use the default hourly price for that vehicle type.
          </p>
        </fieldset>
      ) : null}

      <CheckboxGroup label="Amenities" options={amenityOptions} selected={form.amenities} onToggle={(value) => toggleArrayField('amenities', value)} />

      <ListingImageUploader
        parking={initialParking}
        pendingFiles={pendingImageFiles}
        onChange={onMediaChange}
        onPendingFilesChange={setPendingImageFiles}
      />

      <div className="grid gap-4 md:grid-cols-[180px_1fr_1fr]">
        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
          <input checked={form.isOpen24x7} name="isOpen24x7" onChange={updateField} type="checkbox" />
          Open 24x7
        </label>
        <Field disabled={form.isOpen24x7} label="Opens" name="operatingOpen" onChange={updateField} type="time" value={form.operatingOpen} />
        <Field disabled={form.isOpen24x7} label="Closes" name="operatingClose" onChange={updateField} type="time" value={form.operatingClose} />
      </div>

      <div className="flex flex-wrap gap-3">
        <button className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" type="submit">
          {submitLabel}
        </button>
        {onCancel ? (
          <button className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" type="button" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

function Field({ label, ...props }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      {label}
      <input
        className="rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
        {...props}
      />
    </label>
  );
}

function CheckboxGroup({ label, onToggle, options, selected }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-medium text-slate-700">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option} className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
            <input checked={selected.includes(option)} onChange={() => onToggle(option)} type="checkbox" />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function toFormState(parking) {
  if (!parking) {
    return emptyForm;
  }

  return {
    title: parking.title,
    description: parking.description,
    address: parking.address,
    city: parking.city,
    district: parking.district ?? '',
    area: parking.area ?? '',
    state: parking.state,
    pincode: parking.pincode,
    lat: parking.coordinates.lat,
    lng: parking.coordinates.lng,
    totalSlots: parking.totalSlots,
    hourlyPrice: parking.hourlyPrice,
    // Populate per-vehicle fields from existing pricing map
    price2Wheeler: parking.pricing?.['2-wheeler'] ?? '',
    price4Wheeler: parking.pricing?.['4-wheeler'] ?? '',
    vehicleTypes: parking.vehicleTypes,
    amenities: parking.amenities,
    parkingType: parking.parkingType ?? 'lot',
    isOpen24x7: parking.isOpen24x7 ?? true,
    operatingOpen: parking.operatingHours?.open ?? '00:00',
    operatingClose: parking.operatingHours?.close ?? '23:59'
  };
}

function toPayload(form) {
  // Build pricing map — only include vehicle types that have a valid price set
  const pricing = {};
  if (form.vehicleTypes.includes('2-wheeler') && form.price2Wheeler !== '') {
    const v = Number(form.price2Wheeler);
    if (v > 0) pricing['2-wheeler'] = v;
  }
  if (form.vehicleTypes.includes('4-wheeler') && form.price4Wheeler !== '') {
    const v = Number(form.price4Wheeler);
    if (v > 0) pricing['4-wheeler'] = v;
  }

  return {
    title: form.title,
    description: form.description,
    address: form.address,
    city: form.city,
    district: form.district,
    area: form.area,
    state: form.state,
    pincode: form.pincode,
    coordinates: {
      lat: Number(form.lat),
      lng: Number(form.lng)
    },
    totalSlots: Number(form.totalSlots),
    hourlyPrice: Number(form.hourlyPrice),
    // Only send pricing when at least one vehicle-specific rate is set
    ...(Object.keys(pricing).length > 0 ? { pricing } : {}),
    vehicleTypes: form.vehicleTypes,
    amenities: form.amenities,
    parkingType: form.parkingType,
    isOpen24x7: form.isOpen24x7,
    operatingHours: {
      open: form.isOpen24x7 ? '00:00' : form.operatingOpen,
      close: form.isOpen24x7 ? '23:59' : form.operatingClose
    }
  };
}
