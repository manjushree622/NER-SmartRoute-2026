import React, { useEffect, useState } from 'react';
import { GeoJSON, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';

// Approximate visual centers for state labels to keep the map neat & readable
const STATE_LABEL_POSITIONS = [
  { name: 'Assam', pos: [26.2006, 92.9376] },
  { name: 'Arunachal Pradesh', pos: [28.2180, 94.7278] },
  { name: 'Manipur', pos: [24.6637, 93.9063] },
  { name: 'Meghalaya', pos: [25.4670, 91.3662] },
  { name: 'Mizoram', pos: [23.1645, 92.9376] },
  { name: 'Nagaland', pos: [26.1584, 94.5624] },
  { name: 'Sikkim', pos: [27.5330, 88.5122] },
  { name: 'Tripura', pos: [23.9408, 91.9882] }
];

const emptyIcon = L.divIcon({
  className: 'empty-state-marker',
  iconSize: [0, 0]
});

export default function StateLabels({ visible = true }) {
  const [stateGeoJson, setStateGeoJson] = useState(null);

  useEffect(() => {
    fetch('/ner_state_boundaries.geojson')
      .then((res) => {
        if (!res.ok) throw new Error('State GeoJSON not found');
        return res.json();
      })
      .then((data) => {
        setStateGeoJson(data);
      })
      .catch((err) => {
        console.warn('Could not load state boundaries GeoJSON:', err);
      });
  }, []);

  if (!visible) return null;

  const stateBoundaryStyle = {
    color: 'rgba(52, 211, 153, 0.45)', // subtle green boundary
    weight: 1.5,
    dashArray: '5, 5',
    fillColor: 'rgba(16, 185, 129, 0.03)',
    fillOpacity: 0.1
  };

  return (
    <>
      {/* State Boundaries Polygon */}
      {stateGeoJson && (
        <GeoJSON
          data={stateGeoJson}
          style={stateBoundaryStyle}
        />
      )}

      {/* Prominent State Labels */}
      {STATE_LABEL_POSITIONS.map((state) => (
        <Marker
          key={state.name}
          position={state.pos}
          icon={emptyIcon}
          interactive={false}
        >
          <Tooltip
            permanent
            direction="center"
            className="state-label-tooltip"
          >
            {state.name}
          </Tooltip>
        </Marker>
      ))}
    </>
  );
}
