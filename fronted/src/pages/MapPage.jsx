import React, { useState, useEffect, useCallback } from 'react';
import { Navigation, ShieldAlert, Sparkles, MapPin, Compass } from 'lucide-react';
import { fetchCommunityHazards, fetchRoute, fetchWeather } from '../services/api';
import { getUserLocation, getWeatherCoordinates } from '../utils/navigation';
import SearchPanel from '../components/SearchPanel';
import RoutePanel from '../components/RoutePanel';
import MapView from '../components/MapView';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';
import ProfileMenu from '../components/ProfileMenu';
import HazardReportForm from '../components/HazardReportForm';

export default function MapPage({ user, onLogout }) {
  // Search inputs initialized with primary demo route
  const [source, setSource] = useState('Assam');
  const [destination, setDestination] = useState('Tripura');
  const [vehicleType, setVehicleType] = useState('sedan');

  // Route calculation states
  const [routeData, setRouteData] = useState(null);
  const [activeRouteType, setActiveRouteType] = useState('safest'); // 'safest' | 'alternate'
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [weather, setWeather] = useState({ source: null, destination: null });
  const [hazardReports, setHazardReports] = useState([]);
  const [showHazardForm, setShowHazardForm] = useState(false);
  const [isPickingHazardLocation, setIsPickingHazardLocation] = useState(false);
  const [hazardLocation, setHazardLocation] = useState(null);

  // User Geolocation
  const [userLocation, setUserLocation] = useState(null);
  const [locationNotice, setLocationNotice] = useState('');

  // Search route handler
  const handleSearchRoute = useCallback(async (src, dest, selectedVehicle = vehicleType) => {
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
    setWeather({ source: null, destination: null });

    try {
      const data = await fetchRoute(s, d, selectedVehicle);
      setRouteData(data);
      setActiveRouteType(data.recommended_route?.route_id || data.routes?.[0]?.route_id || 'safest');
    } catch (err) {
      setErrorMessage(err.message || 'Unable to compute safe routes at this time.');
    } finally {
      setIsLoading(false);
    }
  }, [source, destination, vehicleType]);

  // Initial load: automatically load primary demo route Assam -> Tripura
  useEffect(() => {
    handleSearchRoute('Assam', 'Tripura');
  }, []);

  useEffect(() => {
    fetchCommunityHazards()
      .then((data) => setHazardReports(data.reports || []))
      .catch(() => setHazardReports([]));
  }, []);

  useEffect(() => {
    if (!routeData) return;
    const sourceCoordinates = getWeatherCoordinates(routeData.source);
    const destinationCoordinates = getWeatherCoordinates(routeData.target);
    if (!sourceCoordinates || !destinationCoordinates) return;

    let isCurrent = true;
    Promise.allSettled([
      fetchWeather(...sourceCoordinates),
      fetchWeather(...destinationCoordinates)
    ]).then(([sourceResult, destinationResult]) => {
      if (!isCurrent) return;
      setWeather({
        source: sourceResult.status === 'fulfilled' ? sourceResult.value : null,
        destination: destinationResult.status === 'fulfilled' ? destinationResult.value : null
      });
    });
    return () => { isCurrent = false; };
  }, [routeData]);

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

  const handleHazardSubmitted = (report) => {
    setHazardReports((current) => [report, ...current]);
    setShowHazardForm(false);
    setIsPickingHazardLocation(false);
    handleSearchRoute(source, destination, vehicleType);
  };

  const handleMapPick = (point) => {
    if (!isPickingHazardLocation) return;
    setHazardLocation(point);
    setIsPickingHazardLocation(false);
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
            vehicleType={vehicleType}
            setVehicleType={setVehicleType}
            onSearch={handleSearchRoute}
            onReportHazard={() => setShowHazardForm(true)}
            isLoading={isLoading}
          />

          {showHazardForm && (
            <HazardReportForm
              location={hazardLocation}
              onPickLocation={() => setIsPickingHazardLocation(true)}
              onCancel={() => { setShowHazardForm(false); setIsPickingHazardLocation(false); }}
              onSubmitted={handleHazardSubmitted}
            />
          )}
          {isPickingHazardLocation && (
            <p className="map-pick-instruction">Click the map to place the hazard report.</p>
          )}

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
              vehicleSuitabilityNote={routeData.vehicle_suitability_note}
              weather={weather}
              selectedVehicle={routeData.vehicle_type || vehicleType}
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
            hazardReports={hazardReports}
            isPickingHazardLocation={isPickingHazardLocation}
            onMapPick={handleMapPick}
          />
        </section>
      </main>
    </div>
  );
}
