import { useState } from 'react';

const vehicleOptions = ['2-wheeler', '4-wheeler'];
const amenityOptions = ['covered', 'cctv', 'ev charging', 'security', 'valet', 'accessible'];

const emptyForm = {
  title: '',
  description: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  lat: '',
  lng: '',
  totalSlots: '',
  hourlyPrice: '',
  vehicleTypes: ['4-wheeler'],
  amenities: []
};

export function ParkingForm({ initialParking = null, onCancel, onSubmit, submitLabel }) {
  const [form, setForm] = useState(() => toFormState(initialParking));

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
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

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(toPayload(form));
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Title" name="title" onChange={updateField} required value={form.title} />
        <Field label="Hourly price" min="1" name="hourlyPrice" onChange={updateField} required type="number" value={form.hourlyPrice} />
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
        <Field label="State" name="state" onChange={updateField} required value={form.state} />
        <Field label="Pincode" name="pincode" onChange={updateField} required value={form.pincode} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Latitude" max="90" min="-90" name="lat" onChange={updateField} required step="any" type="number" value={form.lat} />
        <Field label="Longitude" max="180" min="-180" name="lng" onChange={updateField} required step="any" type="number" value={form.lng} />
        <Field label="Total slots" min="1" name="totalSlots" onChange={updateField} required type="number" value={form.totalSlots} />
      </div>

      <CheckboxGroup label="Vehicle types" options={vehicleOptions} selected={form.vehicleTypes} onToggle={(value) => toggleArrayField('vehicleTypes', value)} />
      <CheckboxGroup label="Amenities" options={amenityOptions} selected={form.amenities} onToggle={(value) => toggleArrayField('amenities', value)} />

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
    state: parking.state,
    pincode: parking.pincode,
    lat: parking.coordinates.lat,
    lng: parking.coordinates.lng,
    totalSlots: parking.totalSlots,
    hourlyPrice: parking.hourlyPrice,
    vehicleTypes: parking.vehicleTypes,
    amenities: parking.amenities
  };
}

function toPayload(form) {
  return {
    title: form.title,
    description: form.description,
    address: form.address,
    city: form.city,
    state: form.state,
    pincode: form.pincode,
    coordinates: {
      lat: Number(form.lat),
      lng: Number(form.lng)
    },
    totalSlots: Number(form.totalSlots),
    hourlyPrice: Number(form.hourlyPrice),
    vehicleTypes: form.vehicleTypes,
    amenities: form.amenities
  };
}

