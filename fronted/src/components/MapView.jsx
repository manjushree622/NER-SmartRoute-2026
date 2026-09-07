import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { geoJsonToLeafletCoordinates, calculateRouteBounds, NER_CENTER, NER_DEFAULT_ZOOM } from '../utils/geo';
import MapControls from './MapControls';
import DistrictLabels from './DistrictLabels';
import StateLabels from './StateLabels';

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

  // Convert backend GeoJSON geometry to Leaflet coordinates
  const safestCoords = useMemo(() => {
    if (!routeData?.recommended_route?.geometry?.coordinates) return [];
    return geoJsonToLeafletCoordinates(routeData.recommended_route.geometry.coordinates);
  }, [routeData?.recommended_route]);

  const alternateCoords = useMemo(() => {
    if (!routeData?.alternate_route?.geometry?.coordinates) return [];
    return geoJsonToLeafletCoordinates(routeData.alternate_route.geometry.coordinates);
  }, [routeData?.alternate_route]);

  // Compute bounding box
  const routeBounds = useMemo(() => {
    if (safestCoords.length === 0 && alternateCoords.length === 0) return null;
    return calculateRouteBounds(safestCoords, alternateCoords);
  }, [safestCoords, alternateCoords]);

  const handleManualFit = () => {
    setFitTrigger((prev) => prev + 1);
  };

  // Extract source & destination coordinates for pin placement
  const sourcePoint = safestCoords[0] || null;
  const targetPoint = safestCoords[safestCoords.length - 1] || null;

  const sourceName = routeData?.recommended_route?.source || 'Origin';
  const targetName = routeData?.recommended_route?.target || 'Destination';

  const isSafestActive = activeRouteType === 'safest';

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

        {/* =========================================================
            🔴 HIGHER-RISK ALTERNATE ROUTE (ALWAYS VISIBLE)
            ========================================================= */}
        {alternateCoords.length >= 2 && (
          <>
            {/* Glow / Casing for Alternate */}
            <Polyline
              positions={alternateCoords}
              pathOptions={{
                color: !isSafestActive ? 'rgba(239, 68, 68, 0.45)' : 'rgba(239, 68, 68, 0.25)',
                weight: !isSafestActive ? 9 : 7,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />

            {/* Core Polyline */}
            <Polyline
              positions={alternateCoords}
              pathOptions={{
                color: '#EF4444',
                weight: !isSafestActive ? 5 : 3.5,
                dashArray: !isSafestActive ? undefined : '6, 8',
                opacity: !isSafestActive ? 1 : 0.85,
                lineCap: 'round',
                lineJoin: 'round'
              }}
              eventHandlers={{
                click: () => setActiveRouteType('alternate')
              }}
            >
              <Popup>
                <div style={{ padding: '6px', fontFamily: 'Inter, sans-serif' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#EF4444' }}>
                    🔴 HIGHER-RISK ALTERNATE ROUTE
                  </span>
                  <div style={{ fontSize: '12px', marginTop: '4px', lineHeight: 1.4 }}>
                    <div>Distance: <strong>{routeData?.alternate_route?.distance_km} km</strong></div>
                    <div>Travel Time: <strong>{routeData?.alternate_route?.travel_time}</strong></div>
                    <div>Risk Level: <strong>{routeData?.alternate_route?.risk_level} ({routeData?.alternate_route?.risk_probability}%)</strong></div>
                  </div>
                </div>
              </Popup>
            </Polyline>
          </>
        )}

        {/* =========================================================
            🟢 RECOMMENDED SAFEST ROUTE (ALWAYS VISIBLE & EMPHASIZED)
            ========================================================= */}
        {safestCoords.length >= 2 && (
          <>
            {/* Emerald Neon Glow Outer Casing */}
            <Polyline
              positions={safestCoords}
              pathOptions={{
                color: isSafestActive ? 'rgba(16, 185, 129, 0.5)' : 'rgba(16, 185, 129, 0.25)',
                weight: isSafestActive ? 12 : 9,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />

            {/* Main Thick Emerald Line */}
            <Polyline
              positions={safestCoords}
              pathOptions={{
                color: '#10B981',
                weight: isSafestActive ? 6.5 : 5,
                opacity: 1,
                lineCap: 'round',
                lineJoin: 'round'
              }}
              eventHandlers={{
                click: () => setActiveRouteType('safest')
              }}
            >
              <Popup>
                <div style={{ padding: '6px', fontFamily: 'Inter, sans-serif' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#10B981' }}>
                    🟢 RECOMMENDED SAFEST ROUTE
                  </span>
                  <div style={{ fontSize: '12px', marginTop: '4px', lineHeight: 1.4 }}>
                    <div>Distance: <strong>{routeData?.recommended_route?.distance_km} km</strong></div>
                    <div>Travel Time: <strong>{routeData?.recommended_route?.travel_time}</strong></div>
                    <div>Risk Level: <strong>{routeData?.recommended_route?.risk_level} ({routeData?.recommended_route?.risk_probability}%)</strong></div>
                    <p style={{ marginTop: '4px', fontSize: '11px', color: '#CBD5E1' }}>
                      {routeData?.recommended_route?.recommendation_reason}
                    </p>
                  </div>
                </div>
              </Popup>
            </Polyline>
          </>
        )}

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
          hasRoute={safestCoords.length > 0}
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
          <div className="legend-item">
            <div className="legend-line safest" />
            <span>🟢 Safest Route (Selected)</span>
          </div>
          <div className="legend-item">
            <div className="legend-line alternate" />
            <span>🔴 Higher-Risk Alternate</span>
          </div>
          <div className="legend-item">
            <div className="legend-dot-loc" />
            <span>📍 Current Location</span>
          </div>
        </div>
      </div>
    </div>
  );
}
