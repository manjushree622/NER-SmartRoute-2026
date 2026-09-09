import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { geoJsonToLeafletCoordinates, calculateRouteBounds, NER_CENTER, NER_DEFAULT_ZOOM } from '../utils/geo';
import MapControls from './MapControls';
import DistrictLabels from './DistrictLabels';
import StateLabels from './StateLabels';
import { formatDistanceKm, VEHICLE_LABELS } from '../utils/navigation';

const getSafetyColor = (safetyScore = 0) => {
  if (safetyScore >= 80) return '#10B981';
  if (safetyScore >= 60) return '#F59E0B';
  if (safetyScore >= 40) return '#F97316';
  return '#EF4444';
};

// Custom SVG Icons for Source and Target Markers
const createSvgIcon = (color, text, isFinish = false) => {
  return L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div style="
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        transform: translate(-50%, -100%);
        cursor: pointer;
      ">
        <div style="
          background: ${color};
          color: white;
          font-family: 'Outfit', sans-serif;
          font-weight: 700;
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 6px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.5);
          white-space: nowrap;
          border: 1.5px solid white;
          display: flex;
          align-items: center;
          gap: 4px;
        ">
          <span>${isFinish ? '🏁' : '🟢'}</span>
          <span>${text}</span>
        </div>
        <div style="
          width: 0; 
          height: 0; 
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 8px solid ${color};
        "></div>
      </div>
    `,
    iconSize: [0, 0]
  });
};

// Component to handle auto-fit bounds when route changes
function RouteBoundsFitter({ bounds, triggerKey }) {
  const map = useMap();

  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 12,
        animate: true,
        duration: 1.2
      });
    }
  }, [map, bounds, triggerKey]);

  return null;
}

export default function MapView({
  routeData,
  activeRouteType,
  setActiveRouteType,
  userLocation,
  onLocateUser
}) {
  const [showDistricts, setShowDistricts] = useState(true);
  const [showStates, setShowStates] = useState(true);
  const [fitTrigger, setFitTrigger] = useState(0);

  const routes = routeData?.routes || [];
  const renderedRoutes = useMemo(() => routes.map((route) => ({
    route,
    coords: geoJsonToLeafletCoordinates(
      route.geojson?.coordinates || route.geometry?.coordinates
    )
  })).filter(({ coords }) => coords.length >= 2), [routes]);

  useEffect(() => {
    if (routeData) {
      console.info('[NER SmartRoute] Map route diagnostics', {
        routesReceived: routes.length,
        routePolylinesRendered: renderedRoutes.length
      });
    }
  }, [routeData, routes.length, renderedRoutes.length]);

  // Compute bounding box
  const routeBounds = useMemo(() => {
    if (!renderedRoutes.length) return null;
    return calculateRouteBounds(...renderedRoutes.map(({ coords }) => coords));
  }, [renderedRoutes]);

  const handleManualFit = () => {
    setFitTrigger((prev) => prev + 1);
  };

  // Extract source & destination coordinates for pin placement
  const recommendedRoute = routes.find((route) => route.is_recommended) || routes[0];
  const recommendedCoords = renderedRoutes.find(({ route }) => route === recommendedRoute)?.coords || [];
  const sourcePoint = recommendedCoords[0] || null;
  const targetPoint = recommendedCoords[recommendedCoords.length - 1] || null;

  const sourceName = recommendedRoute?.source || 'Origin';
  const targetName = recommendedRoute?.target || 'Destination';

  const getRouteWeight = (route) => route.route_id === activeRouteType || route.is_recommended ? 6 : 3.5;
  const getRouteOpacity = (route) => route.route_id === activeRouteType || route.is_recommended ? 1 : 0.82;

  return (
    <div className="map-canvas-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MapContainer
        center={NER_CENTER}
        zoom={NER_DEFAULT_ZOOM}
        zoomControl={false}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}
      >
        {/* Keyless OpenStreetMap tile layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* State Boundaries & Labels */}
        <StateLabels visible={showStates} />

        {/* District Boundaries & Labels */}
        <DistrictLabels visible={showDistricts} />

        {/* Auto-fit map to calculated route */}
        <RouteBoundsFitter bounds={routeBounds} triggerKey={fitTrigger} />

        {renderedRoutes.map(({ route, coords }) => {
          const isSelected = route.route_id === activeRouteType;
          const color = getSafetyColor(route.safety_score);
          const scoreLabel = route.safety_score >= 80 ? 'EXCELLENT' : route.safety_score >= 60 ? 'GOOD' : route.safety_score >= 40 ? 'MODERATE' : 'HIGH RISK';
          return (
            <React.Fragment key={route.route_id}>
              <Polyline positions={coords} pathOptions={{ color: `${color}55`, weight: getRouteWeight(route) + 5, opacity: getRouteOpacity(route), lineCap: 'round', lineJoin: 'round' }} />
              <Polyline
                positions={coords}
                pathOptions={{ color, weight: getRouteWeight(route), opacity: getRouteOpacity(route), dashArray: isSelected || route.is_recommended ? undefined : '7, 7', lineCap: 'round', lineJoin: 'round' }}
                eventHandlers={{ click: () => setActiveRouteType(route.route_id) }}
              >
                <Popup>
                  <div style={{ padding: '6px', lineHeight: 1.5 }}>
                    <strong style={{ color }}>ROUTE {route.route_number}</strong>
                    <div>{(route.labels || []).join(' · ') || 'Meaningful Route'}</div>
                    <div>Distance: <strong>{formatDistanceKm(route.distance_km)} km</strong></div>
                    <div>Travel Time: <strong>{route.travel_time}</strong></div>
                    <div>Risk: <strong>{route.risk_level}</strong></div>
                    <div>Risk Probability: <strong>{route.risk_probability}%</strong></div>
                    <div>Safety Score: <strong>{route.safety_score}% ({scoreLabel})</strong></div>
                    <div>Vehicle: <strong>{VEHICLE_LABELS[route.vehicle_type] || route.vehicle_type || 'N/A'}</strong></div>
                  </div>
                </Popup>
              </Polyline>
            </React.Fragment>
          );
        })}

        {/* Source Marker */}
        {sourcePoint && (
          <Marker
            position={sourcePoint}
            icon={createSvgIcon('#10B981', sourceName)}
          >
            <Popup>
              <div style={{ padding: '4px' }}>
                <p style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase' }}>Source Origin</p>
                <h4 style={{ fontSize: '14px', fontWeight: 700 }}>{sourceName}</h4>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Destination Marker */}
        {targetPoint && (
          <Marker
            position={targetPoint}
            icon={createSvgIcon('#EF4444', targetName, true)}
          >
            <Popup>
              <div style={{ padding: '4px' }}>
                <p style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase' }}>Destination</p>
                <h4 style={{ fontSize: '14px', fontWeight: 700 }}>{targetName}</h4>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Current User Location Marker (Pulsing Blue) */}
        {userLocation && (
          <>
            <CircleMarker
              center={[userLocation.lat, userLocation.lon]}
              radius={18}
              pathOptions={{
                color: '#38BDF8',
                fillColor: '#38BDF8',
                fillOpacity: 0.2,
                weight: 1.5
              }}
            />
            <CircleMarker
              center={[userLocation.lat, userLocation.lon]}
              radius={7}
              pathOptions={{
                color: '#FFFFFF',
                fillColor: '#0284C7',
                fillOpacity: 1,
                weight: 2
              }}
            >
              <Popup>
                <div style={{ padding: '4px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: '#38BDF8' }}>📍 Your Current Location</p>
                  <p style={{ fontSize: '10px', color: '#94A3B8' }}>
                    GPS coordinates: {userLocation.lat.toFixed(4)}, {userLocation.lon.toFixed(4)}
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          </>
        )}

        {/* Floating Map Controls */}
        <MapControls
          onLocateUser={onLocateUser}
          onFitRoute={handleManualFit}
          hasRoute={renderedRoutes.length > 0}
          showDistricts={showDistricts}
          setShowDistricts={setShowDistricts}
          showStates={showStates}
          setShowStates={setShowStates}
        />
      </MapContainer>

      {/* Clean Map Legend */}
      <div className="map-legend-card" role="region" aria-label="Map Legend">
        <div className="legend-title">Route Intelligence</div>
        <div className="legend-items">
          <div className="legend-item"><span>🟢 80–100% — Excellent</span></div>
          <div className="legend-item"><span>🟡 60–79% — Good</span></div>
          <div className="legend-item"><span>🟠 40–59% — Moderate</span></div>
          <div className="legend-item"><span>🔴 0–39% — High Risk</span></div>
          <div className="legend-item"><span>Recommended route is emphasized</span></div>
          <div className="legend-item">
            <div className="legend-dot-loc" />
            <span>📍 Current Location</span>
          </div>
        </div>
      </div>
    </div>
  );
}
