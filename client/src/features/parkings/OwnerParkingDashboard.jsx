import { useCallback, useEffect, useState } from 'react';
import { Edit3, Trash2 } from 'lucide-react';
import { getApiErrorMessage } from '../../lib/getApiErrorMessage.js';
import { createParking, deleteParking, fetchMyParkings, updateParking, uploadParkingImages } from './parkingApi.js';
import { ParkingForm } from './ParkingForm.jsx';

export function OwnerParkingDashboard() {
  const [error, setError] = useState('');
  const [editingParking, setEditingParking] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [parkings, setParkings] = useState([]);

  const loadMine = useCallback(async () => {
    setError('');
    setIsLoading(true);

    try {
      setParkings(await fetchMyParkings());
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to load your parking listings'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(loadMine);
  }, [loadMine]);

  async function handleCreate(payload, imageFiles = []) {
    setError('');

    try {
      let parking = await createParking(payload);

      if (imageFiles.length > 0) {
        parking = await uploadParkingImages(parking.id, imageFiles);
      }

      setParkings((current) => [parking, ...current]);
      setEditingParking(parking);
      return parking;
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to create parking listing'));
      return null;
    }
  }

  async function handleUpdate(payload, imageFiles = []) {
    setError('');

    try {
      let parking = await updateParking(editingParking.id, payload);

      if (imageFiles.length > 0) {
        parking = await uploadParkingImages(parking.id, imageFiles);
      }

      setParkings((current) => current.map((item) => (item.id === parking.id ? parking : item)));
      setEditingParking(null);
      return parking;
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to update parking listing'));
      return null;
    }
  }

  async function handleDelete(id) {
    setError('');

    try {
      await deleteParking(id);
      setParkings((current) => current.filter((item) => item.id !== id));
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to delete parking listing'));
    }
  }

  function handleMediaChange(parking) {
    setParkings((current) => current.map((item) => (item.id === parking.id ? parking : item)));
    setEditingParking(parking);
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-950">Owner parking dashboard</h1>
        <p className="mt-2 text-slate-600">Create and manage your spaces. New or edited listings require admin approval.</p>
      </div>

      {error ? <p className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-slate-950">{editingParking ? 'Edit parking' : 'Create parking'}</h2>
          <ParkingForm
            key={editingParking?.id ?? 'create'}
            initialParking={editingParking}
            onCancel={editingParking ? () => setEditingParking(null) : undefined}
            onMediaChange={handleMediaChange}
            onSubmit={editingParking ? handleUpdate : handleCreate}
            submitLabel={editingParking ? 'Update listing' : 'Create listing'}
          />
        </div>

        <div>
          <h2 className="mb-4 text-xl font-semibold text-slate-950">Your listings</h2>
          {isLoading ? <p className="text-sm text-slate-600">Loading your listings...</p> : null}
          <div className="grid gap-4">
            {parkings.map((parking) => (
              <article key={parking.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                {parking.coverImage ? (
                  <img alt={parking.coverImage.caption || parking.title} className="mb-4 aspect-video w-full rounded-md object-cover" src={parking.coverImage.url} />
                ) : null}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-slate-950">{parking.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {parking.city}, {parking.state} · Rs {parking.hourlyPrice}/hr
                    </p>
                  </div>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold capitalize text-slate-700">{parking.verificationStatus}</span>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  {parking.availableSlots}/{parking.totalSlots} slots available
                </p>
                {parking.rejectionReason ? <p className="mt-3 text-sm text-red-700">Reason: {parking.rejectionReason}</p> : null}
                <div className="mt-4 flex gap-2">
                  <button className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" type="button" onClick={() => setEditingParking(parking)}>
                    <Edit3 className="h-4 w-4" aria-hidden="true" />
                    Edit
                  </button>
                  <button className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" type="button" onClick={() => handleDelete(parking.id)}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!isLoading && parkings.length === 0 ? <p className="rounded-md border border-slate-200 bg-white p-6 text-slate-600">No parking listings yet.</p> : null}
        </div>
      </div>
    </section>
  );
}
