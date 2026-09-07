import React, { useState, useEffect, useCallback } from 'react';
import { Navigation, ShieldAlert, Sparkles, MapPin, Compass } from 'lucide-react';
import { fetchRoute } from '../services/api';
import { getUserLocation } from '../utils/navigation';
import SearchPanel from '../components/SearchPanel';
import RoutePanel from '../components/RoutePanel';
import MapView from '../components/MapView';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';
import ProfileMenu from '../components/ProfileMenu';

export default function MapPage({ user, onLogout }) {
  // Search inputs initialized with primary demo route
  const [source, setSource] = useState('Assam');
  const [destination, setDestination] = useState('Tripura');

  // Route calculation states
  const [routeData, setRouteData] = useState(null);
  const [activeRouteType, setActiveRouteType] = useState('safest'); // 'safest' | 'alternate'
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);

  // User Geolocation
  const [userLocation, setUserLocation] = useState(null);
  const [locationNotice, setLocationNotice] = useState('');

  // Search route handler
  const handleSearchRoute = useCallback(async (src, dest) => {
    const s = src || source;
    const d = dest || destination;

    if (!s || !d) {
      setErrorMessage('Please specify both a starting point and destination.');
      return;
    }

    if (s.trim().toLowerCase() === d.trim().toLowerCase()) {
      setErrorMessage('Source and destination cannot be the same location.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setIsNavigating(false);

    try {
      const data = await fetchRoute(s, d);
      setRouteData(data);
      // Backend guarantees recommended_route is safest; select it by default
      setActiveRouteType('safest');
    } catch (err) {
      setErrorMessage(err.message || 'Unable to compute safe routes at this time.');
    } finally {
      setIsLoading(false);
    }
  }, [source, destination]);

  // Initial load: automatically load primary demo route Assam -> Tripura
  useEffect(() => {
    handleSearchRoute('Assam', 'Tripura');
  }, []);

  // Browser Geolocation trigger
  const handleLocateUser = async () => {
    try {
      const pos = await getUserLocation();
      setUserLocation(pos);
      setLocationNotice('GPS Location acquired successfully.');
      setTimeout(() => setLocationNotice(''), 4000);
    } catch (err) {
      setLocationNotice(err.message);
      setTimeout(() => setLocationNotice(''), 6000);
    }
  };

  return (
    <div className="app-shell">
      {/* TOP HEADER */}
      <header className="top-header">
        {/* Brand & Subtitle */}
        <div className="brand-section">
          <div className="brand-logo-icon">
            <Navigation size={22} />
          </div>
          <div className="brand-title-group">
            <h1>
              <span>NER SmartRoute</span>
              <span className="brand-badge">AI + GIS</span>
            </h1>
            <p className="brand-subtitle">AI-Powered Safe Route Intelligence</p>
          </div>
        </div>

        {/* Center Tagline */}
        <div className="header-center-tagline">
          <span>Find the <strong>safest route</strong> across Northeast India.</span>
        </div>

        {/* Right Status & Profile */}
        <div className="header-right">
          <div className="status-pill">
            <div className="status-dot" />
            <span>Risk Engine: Active</span>
          </div>

          <ProfileMenu user={user} onLogout={onLogout} />
        </div>
      </header>

      {/* DASHBOARD WORKSPACE */}
      <main className="dashboard-workspace">
        {/* LEFT SEARCH & ROUTE PANEL */}
        <aside className="left-panel-container">
          <SearchPanel
            source={source}
            setSource={setSource}
            destination={destination}
            setDestination={setDestination}
            onSearch={handleSearchRoute}
            isLoading={isLoading}
          />

          <div style={{ padding: '0 20px', marginTop: '16px' }}>
            <ErrorMessage
              message={errorMessage || locationNotice}
              onDismiss={() => { setErrorMessage(''); setLocationNotice(''); }}
            />

            {isLoading && (
              <LoadingIndicator
                title="Finding the safest route..."
                subtitle="Analyzing real-time rainfall, terrain slope, and landslide hazard indices..."
              />
            )}
          </div>

          {!isLoading && routeData && (
            <RoutePanel
              routeData={routeData}
              activeRouteType={activeRouteType}
              setActiveRouteType={setActiveRouteType}
              isNavigating={isNavigating}
              setIsNavigating={setIsNavigating}
              userLocation={userLocation}
            />
          )}
        </aside>

        {/* INTERACTIVE FULL-SCREEN MAP CANVAS */}
        <section className="map-canvas-container" aria-label="Interactive Navigation Map">
          <MapView
            routeData={routeData}
            activeRouteType={activeRouteType}
            setActiveRouteType={setActiveRouteType}
            userLocation={userLocation}
            onLocateUser={handleLocateUser}
          />
        </section>
      </main>
    </div>
  );
}
