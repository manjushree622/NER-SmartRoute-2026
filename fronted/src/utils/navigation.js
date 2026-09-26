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

export const VEHICLE_GROUPS = [
  { label: 'Two-Wheelers', options: [['motorcycle', 'Motorcycle'], ['scooter', 'Scooter']] },
  { label: 'Three-Wheelers', options: [['auto_rickshaw', 'Auto-rickshaw'], ['e_rickshaw', 'E-rickshaw']] },
  { label: 'Cars', options: [['hatchback', 'Hatchback'], ['sedan', 'Sedan'], ['suv', 'SUV']] },
  { label: 'Buses', options: [['city_bus', 'City Bus'], ['interstate_luxury_coach', 'Interstate Luxury Coach'], ['mini_bus', 'Mini Bus']] },
  { label: 'Light Commercial Vehicles', options: [['small_cargo_truck', 'Small Cargo Truck'], ['pickup', 'Pickup']] },
  { label: 'Heavy Commercial Vehicles', options: [['multi_axle_truck', 'Multi-axle Truck'], ['tractor_trailer', 'Tractor-trailer'], ['tipper', 'Tipper']] }
];

const WEATHER_LOCATIONS = {
  assam: [26.1445, 91.7362],
  guwahati: [26.1445, 91.7362],
  'arunachal pradesh': [27.0844, 93.6053],
  itanagar: [27.0844, 93.6053],
  manipur: [24.817, 93.9368],
  imphal: [24.817, 93.9368],
  meghalaya: [25.5788, 91.8933],
  shillong: [25.5788, 91.8933],
  mizoram: [23.7271, 92.7176],
  aizawl: [23.7271, 92.7176],
  nagaland: [25.6751, 94.1086],
  kohima: [25.6751, 94.1086],
  sikkim: [27.3389, 88.6065],
  gangtok: [27.3389, 88.6065],
  tripura: [23.8315, 91.2868],
  'west tripura': [23.8315, 91.2868],
  agartala: [23.8315, 91.2868]
};

export function getWeatherCoordinates(location) {
  return WEATHER_LOCATIONS[String(location || '').trim().toLowerCase()] || null;
}

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

function getRouteSafetyBand(score) {
  if (
    score === null
    || score === undefined
    || typeof score === 'boolean'
    || (typeof score === 'string' && !score.trim())
  ) return null;
  const value = Number(score);
  if (!Number.isFinite(value) || value < 0 || value > 100) return null;
  if (value >= 80) return 'low';
  if (value >= 40) return 'medium';
  return 'high';
}

export function getRouteRiskColor(safetyScore) {
  const colors = {
    low: '#16A34A',
    medium: '#F97316',
    high: '#DC2626'
  };
  return colors[getRouteSafetyBand(safetyScore)] || '#6B7280';
}

export function getRouteRiskLabel(safetyScore) {
  const labels = {
    low: 'LOW RISK',
    medium: 'MEDIUM RISK',
    high: 'HIGH RISK'
  };
  return labels[getRouteSafetyBand(safetyScore)] || 'RISK UNAVAILABLE';
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
