/**
 * NER SmartRoute - API Service
 * Connects to the existing FastAPI backend as the single source of truth.
 * Default URL: http://127.0.0.1:8000
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

/**
 * Fetch safest and alternate routes between source and target locations
 * @param {string} source - Source state or capital
 * @param {string} target - Target state or capital
 * @returns {Promise<Object>} Backend route response
 */
export async function fetchRoute(source, target) {
  if (!source || !target) {
    throw new Error('Please enter both source and destination.');
  }

  const cleanSource = source.trim();
  const cleanTarget = target.trim();

  if (cleanSource.toLowerCase() === cleanTarget.toLowerCase()) {
    throw new Error('Source and destination cannot be the same location.');
  }

  const url = `${API_BASE_URL}/get_route?source=${encodeURIComponent(cleanSource)}&target=${encodeURIComponent(cleanTarget)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      let parsedMessage = `Server error (${response.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        parsedMessage = errorJson.detail || errorJson.error || errorJson.message || parsedMessage;
      } catch {
        // use fallback
      }
      throw new Error(parsedMessage);
    }

    const data = await response.json();

    if (data.success === false) {
      throw new Error(data.error || 'Failed to calculate routes.');
    }

    if (!data.recommended_route) {
      throw new Error('No recommended safest route found for the given locations.');
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error(
        `Unable to reach NER SmartRoute API at ${API_BASE_URL}. Please ensure the backend server is running on port 8000.`
      );
    }
    throw error;
  }
}

/**
 * Fetch supported locations from backend
 */
export async function fetchSupportedLocations() {
  try {
    const response = await fetch(`${API_BASE_URL}/locations`);
    if (!response.ok) throw new Error('Failed to fetch locations');
    const data = await response.json();
    return data.locations || [];
  } catch {
    // Fallback list of confirmed supported states & capitals
    return [
      'Assam',
      'Arunachal Pradesh',
      'Manipur',
      'Meghalaya',
      'Mizoram',
      'Nagaland',
      'Sikkim',
      'Tripura',
      'West Tripura'
    ];
  }
}

/**
 * Health check for backend
 */
export async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, { method: 'GET' });
    if (!response.ok) return false;
    const data = await response.json();
    return data.success === true || data.status === 'healthy';
  } catch {
    return false;
  }
}
