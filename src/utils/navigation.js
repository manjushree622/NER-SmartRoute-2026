/**
 * NER SmartRoute - Navigation & Demo Route Utilities
 */

export const DEMO_ROUTES = [
  { source: 'Assam', target: 'Tripura', label: 'Assam → Tripura (Primary Demo)' },
  { source: 'Manipur', target: 'Mizoram', label: 'Manipur → Mizoram' },
  { source: 'Arunachal Pradesh', target: 'Meghalaya', label: 'Arunachal Pradesh → Meghalaya' },
  { source: 'Sikkim', target: 'Nagaland', label: 'Sikkim → Nagaland' },
  { source: 'Assam', target: 'West Tripura', label: 'Assam → West Tripura' },
  { source: 'Meghalaya', target: 'Assam', label: 'Meghalaya → Assam' },
  { source: 'Nagaland', target: 'Manipur', label: 'Nagaland → Manipur' },
  { source: 'Mizoram', target: 'Tripura', label: 'Mizoram → Tripura' },
  { source: 'Sikkim', target: 'Assam', label: 'Sikkim → Assam' },
  { source: 'Arunachal Pradesh', target: 'Nagaland', label: 'Arunachal Pradesh → Nagaland' }
];

export const POPULAR_LOCATIONS = [
  { name: 'Assam', capital: 'Guwahati' },
  { name: 'Tripura', capital: 'Agartala' },
  { name: 'Manipur', capital: 'Imphal' },
  { name: 'Meghalaya', capital: 'Shillong' },
  { name: 'Mizoram', capital: 'Aizawl' },
  { name: 'Nagaland', capital: 'Kohima' },
  { name: 'Sikkim', capital: 'Gangtok' },
  { name: 'Arunachal Pradesh', capital: 'Itanagar' },
  { name: 'West Tripura', capital: 'Agartala' }
];

/**
 * Returns color hex code for risk level
 * @param {string} level - LOW | MEDIUM | HIGH
 */
export function getRiskColor(level) {
  const norm = String(level || '').toUpperCase();
  if (norm === 'LOW') return '#10B981'; // green
  if (norm === 'MEDIUM') return '#F59E0B'; // amber/orange
  if (norm === 'HIGH') return '#EF4444'; // red
  return '#6B7280';
}

/**
 * Returns a human-friendly background badge style
 */
export function getRiskBadgeClass(level) {
  const norm = String(level || '').toUpperCase();
  if (norm === 'LOW') return 'badge-low';
  if (norm === 'MEDIUM') return 'badge-medium';
  if (norm === 'HIGH') return 'badge-high';
  return 'badge-neutral';
}

/**
 * Requests current geolocation from browser
 * @returns {Promise<{lat: number, lon: number}>}
 */
export function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (err) => {
        let msg = 'Unable to retrieve location.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission was denied. You can still use NER SmartRoute by entering locations manually.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'Current location is unavailable.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Location request timed out.';
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  });
}
