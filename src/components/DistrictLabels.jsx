import React, { useEffect, useState } from 'react';
import { GeoJSON, useMap } from 'react-leaflet';

export default function DistrictLabels({ visible = true }) {
  const [districtData, setDistrictData] = useState(null);
  const [currentZoom, setCurrentZoom] = useState(7);
  const map = useMap();

  useEffect(() => {
    // Listen for zoom changes
    const onZoom = () => {
      setCurrentZoom(map.getZoom());
    };
    map.on('zoomend', onZoom);
    setCurrentZoom(map.getZoom());
    return () => {
      map.off('zoomend', onZoom);
    };
  }, [map]);

  useEffect(() => {
    fetch('/ner_district_boundaries.geojson')
      .then((res) => {
        if (!res.ok) throw new Error('District GeoJSON not found');
        return res.json();
      })
      .then((data) => {
        setDistrictData(data);
      })
      .catch((err) => {
        console.warn('Could not load district boundaries GeoJSON:', err);
      });
  }, []);

  if (!visible || !districtData) return null;

  // Style for district polygons
  const districtStyle = {
    color: 'rgba(148, 163, 184, 0.4)',
    weight: 1,
    dashArray: '3, 4',
    fillColor: 'rgba(51, 65, 85, 0.1)',
    fillOpacity: 0.15
  };

  const onEachFeature = (feature, layer) => {
    const props = feature.properties || {};
    const districtName = props.district_name || props.NAME_2 || 'District';
    const stateName = props.state_name || props.NAME_1 || 'NER';

    // Tooltip: only permanent when zoomed in sufficiently (>= 8.5)
    layer.bindTooltip(
      `<div style="font-family: Inter, sans-serif; font-weight: 600; font-size: 11px;">
        ${districtName}
       </div>`,
      {
        permanent: currentZoom >= 8.5,
        direction: 'center',
        className: 'district-label-tooltip'
      }
    );

    // Interactive popup with district risk stats
    const rainfall = props.rainfall_mm ? `${props.rainfall_mm} mm` : 'Monitored';
    const slope = props.slope_deg ? `${props.slope_deg}°` : 'Monitored';
    const risk = props.risk_level || 'Monitored';

    layer.bindPopup(
      `<div style="padding: 6px 4px; font-family: Inter, sans-serif;">
        <p style="font-size: 10px; color: #94A3B8; text-transform: uppercase; margin-bottom: 2px;">${stateName}</p>
        <h4 style="font-size: 14px; font-weight: 700; color: #F8FAFC; margin-bottom: 6px;">${districtName}</h4>
        <div style="font-size: 11px; color: #CBD5E1; line-height: 1.5;">
          <div>Terrain Slope: <strong>${slope}</strong></div>
          <div>Avg Rainfall: <strong>${rainfall}</strong></div>
          <div>Risk Level: <strong>${risk}</strong></div>
        </div>
      </div>`
    );

    layer.on({
      mouseover: (e) => {
        const l = e.target;
        l.setStyle({
          weight: 2,
          color: '#34D399',
          fillOpacity: 0.35
        });
      },
      mouseout: (e) => {
        const l = e.target;
        l.setStyle(districtStyle);
      }
    });
  };

  return (
    <GeoJSON
      key={`districts-zoom-${currentZoom >= 8.5 ? 'close' : 'far'}`}
      data={districtData}
      style={districtStyle}
      onEachFeature={onEachFeature}
    />
  );
}
