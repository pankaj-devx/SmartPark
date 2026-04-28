import { useEffect, useMemo, useState } from 'react';
import { ImagePlus, Star, Trash2, UploadCloud, X } from 'lucide-react';
import { getApiErrorMessage } from '../../lib/getApiErrorMessage.js';
import { deleteParkingImage, setPrimaryParkingImage, uploadParkingImages } from './parkingApi.js';

const maxImages = 5;

export function ListingImageUploader({ pendingFiles = [], parking = null, onChange, onPendingFilesChange }) {
  const [draftFiles, setDraftFiles] = useState(pendingFiles);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const existingImages = parking?.images ?? [];
  const existingCount = parking?.imageCount ?? existingImages.length;
  const canUploadImmediately = Boolean(parking?.id);

  const previews = useMemo(
    () =>
      draftFiles.map((file) => ({
        file,
        url: URL.createObjectURL(file)
      })),
    [draftFiles]
  );

  useEffect(
    () => () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    },
    [previews]
  );

  function addFiles(files) {
    const images = Array.from(files).filter((file) => file.type.startsWith('image/'));
    const availableSlots = maxImages - existingCount - draftFiles.length;

    if (images.length > availableSlots) {
      setError(`You can add ${availableSlots} more image${availableSlots === 1 ? '' : 's'}.`);
      return;
    }

    setError('');
    updateDraftFiles([...draftFiles, ...images]);
  }

  async function uploadDrafts() {
    if (draftFiles.length === 0) {
      return;
    }

    setError('');
    setIsUploading(true);
    setProgress(0);

    try {
      const updated = await uploadParkingImages(parking.id, draftFiles, (event) => {
        if (event.total) {
          setProgress(Math.round((event.loaded * 100) / event.total));
        }
      });
      updateDraftFiles([]);
      onChange(updated);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to upload images'));
    } finally {
      setIsUploading(false);
    }
  }

  async function removeImage(imageId) {
    setError('');

    try {
      onChange(await deleteParkingImage(parking.id, imageId));
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to remove image'));
    }
  }

  async function makePrimary(imageId) {
    setError('');

    try {
      onChange(await setPrimaryParkingImage(parking.id, imageId));
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to update cover image'));
    }
  }

  function updateDraftFiles(files) {
    setDraftFiles(files);
    onPendingFilesChange?.(files);
  }

  return (
    <section className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-950">Listing images</h3>
        <span className="text-xs font-medium text-slate-500">{existingCount + draftFiles.length}/5</span>
      </div>

      <label
        className={`grid min-h-32 cursor-pointer place-items-center rounded-lg border border-dashed px-4 py-6 text-center ${
          isDragging ? 'border-brand-600 bg-brand-50' : 'border-slate-300 bg-white'
        }`}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          addFiles(event.dataTransfer.files);
        }}
      >
        <input
          accept="image/*"
          className="sr-only"
          multiple
          onChange={(event) => addFiles(event.target.files)}
          type="file"
        />
        <span className="grid justify-items-center gap-2 text-sm text-slate-600">
          <UploadCloud className="h-6 w-6 text-brand-600" aria-hidden="true" />
          Drag images here or browse
        </span>
      </label>

      {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      {draftFiles.length > 0 ? (
        <div className="grid gap-3">
          <p className="text-xs font-semibold uppercase text-slate-500">New selected images</p>
          <div className="grid grid-cols-3 gap-3">
            {previews.map((preview) => (
              <div className="relative overflow-hidden rounded-md border border-slate-200 bg-white" key={preview.url}>
                <img alt="" className="aspect-video w-full object-cover" src={preview.url} />
                <span className="absolute left-1 top-1 rounded bg-white/90 px-2 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
                  Local
                </span>
                <button
                  aria-label="Remove selected image"
                  className="absolute right-1 top-1 rounded-md bg-white/90 p-1 text-slate-700 shadow-sm hover:bg-white"
                  onClick={() => updateDraftFiles(draftFiles.filter((file) => file !== preview.file))}
                  type="button"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
          {canUploadImmediately ? (
            <button
              className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isUploading}
              onClick={uploadDrafts}
              type="button"
            >
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
              {isUploading ? `Uploading ${progress}%` : 'Upload selected images'}
            </button>
          ) : (
            <p className="rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-700">Selected images will upload after the listing is created.</p>
          )}
        </div>
      ) : null}

      {existingImages.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {existingImages.map((image) => (
            <div className="overflow-hidden rounded-md border border-slate-200 bg-white" key={image.id}>
              <div className="relative">
                <img alt={image.caption || parking.title} className="aspect-video w-full object-cover" src={image.url} />
                <span className="absolute left-1 top-1 rounded bg-white/90 px-2 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
                  Uploaded
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 p-2">
                <button
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${
                    image.isPrimary ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  onClick={() => makePrimary(image.id)}
                  type="button"
                >
                  <Star className="h-3.5 w-3.5" aria-hidden="true" />
                  Cover
                </button>
                <button
                  aria-label="Remove image"
                  className="rounded-md p-1 text-red-700 hover:bg-red-50"
                  onClick={() => removeImage(image.id)}
                  type="button"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
