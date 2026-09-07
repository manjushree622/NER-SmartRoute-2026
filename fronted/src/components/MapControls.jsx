import React from 'react';
import { Locate, Compass, Layers, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import { useMap } from 'react-leaflet';
import { NER_CENTER, NER_DEFAULT_ZOOM } from '../utils/geo';

export default function MapControls({
  onLocateUser,
  onFitRoute,
  hasRoute,
  showDistricts,
  setShowDistricts,
  showStates,
  setShowStates
}) {
  const map = useMap();

  const handleZoomIn = () => map.zoomIn();
  const handleZoomOut = () => map.zoomOut();
  const handleResetNER = () => map.flyTo(NER_CENTER, NER_DEFAULT_ZOOM, { duration: 1 });

  return (
    <div className="map-controls-group">
      {/* Zoom Controls */}
      <button
        type="button"
        className="map-control-btn"
        onClick={handleZoomIn}
        title="Zoom In"
      >
        <ZoomIn size={18} />
      </button>

      <button
        type="button"
        className="map-control-btn"
        onClick={handleZoomOut}
        title="Zoom Out"
      >
        <ZoomOut size={18} />
      </button>

      {/* Center on North East India */}
      <button
        type="button"
        className="map-control-btn"
        onClick={handleResetNER}
        title="Center Map on North East Region"
      >
        <Compass size={18} />
      </button>

      {/* Locate User */}
      <button
        type="button"
        className="map-control-btn"
        onClick={onLocateUser}
        title="Locate My Position"
      >
        <Locate size={18} />
      </button>

      {/* Fit Route Bounds */}
      {hasRoute && (
        <button
          type="button"
          className="map-control-btn"
          onClick={onFitRoute}
          title="Fit Route to Screen"
        >
          <Maximize2 size={18} />
        </button>
      )}

      {/* Toggle District Boundaries */}
      <button
        type="button"
        className={`map-control-btn ${showDistricts ? 'active' : ''}`}
        onClick={() => setShowDistricts(!showDistricts)}
        title={showDistricts ? "Hide District Boundaries" : "Show District Boundaries"}
      >
        <Layers size={18} />
      </button>
    </div>
  );
}
