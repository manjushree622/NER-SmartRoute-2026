import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { geoJsonToLeafletCoordinates, calculateRouteBounds, NER_CENTER, NER_DEFAULT_ZOOM } from '../utils/geo';
import { getRouteRiskColor, getRouteRiskLabel } from '../utils/navigation';
import MapControls from './MapControls';
import DistrictLabels from './DistrictLabels';
import StateLabels from './StateLabels';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

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

function MapClickCapture({ enabled, onMapPick }) {
  useMapEvents({
    click(event) {
      if (enabled) onMapPick({ lat: event.latlng.lat, lon: event.latlng.lng });
    }
  });
  return null;
}

const createHazardIcon = (status) => L.divIcon({
  className: 'hazard-map-pin',
  html: `<span class="hazard-marker ${String(status || '').toLowerCase()}">!</span>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13]
});

export default function MapView({
  routeData,
  activeRouteType,
  setActiveRouteType,
  userLocation,
  onLocateUser,
  hazardReports = [],
  isPickingHazardLocation = false,
  onMapPick = () => {}
}) {
  const [showDistricts, setShowDistricts] = useState(true);
  const [showStates, setShowStates] = useState(true);
  const [fitTrigger, setFitTrigger] = useState(0);

  const routes = routeData?.routes?.length
    ? routeData.routes
    : [routeData?.recommended_route, routeData?.alternate_route].filter(Boolean);
  const routeCoordinates = useMemo(() => routes.map((route) => ({
    route,
    positions: geoJsonToLeafletCoordinates(route.geometry?.coordinates || route.geojson?.coordinates || [])
  })), [routeData?.routes, routeData?.recommended_route, routeData?.alternate_route]);

  const routeBounds = useMemo(() => {
    const allCoordinates = routeCoordinates.map((item) => item.positions);
    if (!allCoordinates.some((coordinates) => coordinates.length)) return null;
    return calculateRouteBounds(...allCoordinates);
  }, [routeCoordinates]);

  const handleManualFit = () => {
    setFitTrigger((prev) => prev + 1);
  };

  // Extract source & destination coordinates for pin placement
  const recommendedCoordinates = routeCoordinates.find((item) => item.route.is_recommended)?.positions
    || routeCoordinates[0]?.positions || [];
  const sourcePoint = recommendedCoordinates[0] || null;
  const targetPoint = recommendedCoordinates[recommendedCoordinates.length - 1] || null;

  const sourceName = routeData?.source || routeData?.recommended_route?.source || 'Origin';
  const targetName = routeData?.target || routeData?.recommended_route?.target || 'Destination';

  return (
    <div className="map-canvas-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MapContainer
        className={isPickingHazardLocation ? 'map-picking-location' : ''}
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
        <MapClickCapture enabled={isPickingHazardLocation} onMapPick={onMapPick} />

        {routeCoordinates.map(({ route, positions }) => {
          if (positions.length < 2) return null;
          const isSelected = route.route_id === activeRouteType;
          const isEmphasized = isSelected || route.is_recommended;
          const routeColor = getRouteRiskColor(route.safety_score);
          return (
            <React.Fragment key={route.route_id}>
              {isSelected && <Polyline positions={positions} pathOptions={{ color: '#FFFFFF', weight: 11, opacity: 0.75, lineCap: 'round', lineJoin: 'round' }} />}
              <Polyline
                positions={positions}
                pathOptions={{
                  color: routeColor,
                  weight: isEmphasized ? 7 : 4,
                  opacity: isEmphasized ? 1 : 0.76,
                  dashArray: isSelected ? undefined : '8, 7',
                  lineCap: 'round',
                  lineJoin: 'round'
                }}
                eventHandlers={{ click: () => setActiveRouteType(route.route_id) }}
              >
                <Popup>
                  <div className="route-map-popup">
                    <strong style={{ color: routeColor }}>Route {route.route_number}{route.is_recommended ? ' · Recommended' : ''} · {getRouteRiskLabel(route.safety_score)}</strong>
                    <span>{route.distance_km} km · {route.travel_time}</span>
                    <span>Risk {route.risk_probability}% · Safety {route.safety_score}/100</span>
                    {route.hazard_warning && <span>{route.hazard_warning}</span>}
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

        {hazardReports.map((report) => (
          <Marker
            key={report.report_id}
            position={[report.latitude, report.longitude]}
            icon={createHazardIcon(report.status)}
          >
            <Popup>
              <div className="hazard-map-popup">
                <strong>{report.hazard_type}</strong>
                <p>{report.description}</p>
                <span>{new Date(report.reported_at).toLocaleString()}</span>
                <span>{report.severity} · {report.status}</span>
                <span>{Number(report.latitude).toFixed(4)}, {Number(report.longitude).toFixed(4)}</span>
                {report.photo_url && <img src={`${API_BASE_URL}${report.photo_url}`} alt="Reported road hazard" />}
              </div>
            </Popup>
          </Marker>
        ))}

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
          hasRoute={routeCoordinates.length > 0}
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
          <div className="legend-item"><span className="safety-swatch low-risk" /> <span>Green · Low Risk · Safety 80–100</span></div>
          <div className="legend-item"><span className="safety-swatch medium-risk" /> <span>Orange · Medium Risk · Safety 40–79</span></div>
          <div className="legend-item"><span className="safety-swatch high-risk" /> <span>Red · High Risk · Safety 0–39</span></div>
          <div className="legend-item"><span className="hazard-legend-marker">!</span> <span>Community report</span></div>
          <div className="legend-item">
            <div className="legend-dot-loc" />
            <span>Current location</span>
          </div>
        </div>
      </div>
    </div>
  );
}
