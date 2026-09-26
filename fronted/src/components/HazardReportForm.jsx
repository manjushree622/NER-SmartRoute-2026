import React, { useState } from 'react';
import { MapPin, Upload, X } from 'lucide-react';
import { submitCommunityHazard } from '../services/api';

const HAZARD_TYPES = [
  'Landslide',
  'Flood',
  'Road blockage',
  'Road damage',
  'Heavy rainfall',
  'Accident',
  'Bridge damage',
  'Other'
];

function readPhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to read the selected photo.'));
    reader.readAsDataURL(file);
  });
}

export default function HazardReportForm({ location, onPickLocation, onCancel, onSubmitted }) {
  const [hazardType, setHazardType] = useState('Other');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!location) {
      setError('Select the report location on the map first.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      const photoDataUrl = photo ? await readPhoto(photo) : null;
      const report = await submitCommunityHazard({
        hazard_type: hazardType,
        description,
        latitude: location.lat,
        longitude: location.lon,
        photo_data_url: photoDataUrl
      });
      onSubmitted(report);
    } catch (submitError) {
      setError(submitError.message || 'Unable to submit this report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="hazard-report-panel" aria-label="Report road hazard">
      <div className="hazard-report-heading">
        <h2>Report road hazard</h2>
        <button type="button" className="icon-button" onClick={onCancel} aria-label="Close report form">
          <X size={17} />
        </button>
      </div>
      <form onSubmit={handleSubmit}>
        <label className="vehicle-select-label" htmlFor="hazard-type">Hazard type</label>
        <select id="hazard-type" className="custom-route-input vehicle-select" value={hazardType} onChange={(event) => setHazardType(event.target.value)}>
          {HAZARD_TYPES.map((type) => <option key={type}>{type}</option>)}
        </select>

        <label className="vehicle-select-label" htmlFor="hazard-description">Description</label>
        <textarea
          id="hazard-description"
          className="custom-route-input hazard-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={2000}
          required
          placeholder="Describe what you observed"
        />

        <label className="vehicle-select-label" htmlFor="hazard-photo">Photo (optional)</label>
        <label className="hazard-upload" htmlFor="hazard-photo">
          <Upload size={16} />
          <span>{photo ? photo.name : 'Choose an image'}</span>
        </label>
        <input
          id="hazard-photo"
          className="visually-hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => setPhoto(event.target.files?.[0] || null)}
        />

        <button type="button" className="hazard-location-button" onClick={onPickLocation}>
          <MapPin size={16} />
          <span>{location ? `${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}` : 'Select location on map'}</span>
        </button>
        {error && <p className="hazard-form-error" role="alert">{error}</p>}
        <div className="hazard-form-actions">
          <button className="hazard-submit-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'SUBMITTING...' : 'SUBMIT REPORT'}
          </button>
          <button className="hazard-cancel-button" type="button" onClick={onCancel}>Cancel</button>
        </div>
        <p className="hazard-review-note">Reports start as Pending and require review before being treated as active.</p>
      </form>
    </section>
  );
}