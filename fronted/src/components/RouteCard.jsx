import React from 'react';
import { ShieldCheck, AlertTriangle, CloudRain, Mountain, Activity, Clock, Navigation } from 'lucide-react';
import { getRiskColor } from '../utils/navigation';

export default function RouteCard({
  route,
  isSafest,
  isSelected,
  onSelect
}) {
  if (!route) return null;

  const distanceKm = route.distance_km ?? 'N/A';
  const travelTime = route.travel_time ?? (route.travel_time_min ? `${route.travel_time_min} min` : 'N/A');
  const riskLevel = route.risk_level ?? 'MEDIUM';
  const riskProbability = route.risk_probability !== undefined ? `${route.risk_probability}%` : 'N/A';
  const rainfall = route.rainfall_risk ?? route.rainfall ?? 'N/A';
  const slope = route.slope_risk ?? route.slope ?? 'N/A';
  const landslide = route.landslide_risk ?? route.landslide ?? 'N/A';
  const reason = route.recommendation_reason || route.risk_reason || route.reason || '';

  const riskColor = getRiskColor(riskLevel);

  return (
    <div
      className={`route-selection-card ${isSafest ? 'safest' : 'alternate'} ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-label={`${isSafest ? 'Recommended Safest Route' : 'Higher Risk Alternate Route'} card`}
    >
      {/* Header Tag */}
      <div className="card-top-row">
        <span className={`badge-tag ${isSafest ? 'safest' : 'alternate'}`}>
          {isSafest ? (
            <>
              <ShieldCheck size={14} />
              <span>✓ RECOMMENDED SAFEST ROUTE</span>
            </>
          ) : (
            <>
              <AlertTriangle size={14} />
              <span>🔴 HIGHER-RISK ALTERNATE</span>
            </>
          )}
        </span>

        {isSelected && (
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: isSafest ? '#34D399' : '#F87171', textTransform: 'uppercase' }}>
            ● Active View
          </span>
        )}
      </div>

      {/* Main Distance and Travel Time Metrics */}
      <div className="metric-highlights-grid">
        <div className="metric-item">
          <span className="metric-label">Distance</span>
          <span className="metric-val">
            {distanceKm} <span className="metric-unit">km</span>
          </span>
        </div>

        <div className="metric-item">
          <span className="metric-label">Est. Travel Time</span>
          <span className="metric-val" style={{ fontSize: '1.05rem' }}>
            {travelTime}
          </span>
        </div>
      </div>

      {/* Risk Metrics */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Activity size={15} style={{ color: riskColor }} />
          <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>Overall Risk:</span>
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: riskColor }}>
            {riskLevel}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>Risk Probability:</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: riskColor }}>
            {riskProbability}
          </span>
        </div>
      </div>

      {/* Environmental Factors */}
      <div className="risk-factors-row">
        <div className="factor-chip" title="Rainfall Hazard Factor">
          <CloudRain size={13} color="#38BDF8" />
          <span>Rain: <strong>{rainfall}</strong></span>
        </div>

        <div className="factor-chip" title="Terrain Slope Factor">
          <Mountain size={13} color="#FBBF24" />
          <span>Slope: <strong>{slope}</strong></span>
        </div>

        <div className="factor-chip" title="Landslide Vulnerability Factor">
          <AlertTriangle size={13} color="#F87171" />
          <span>Landslide: <strong>{landslide}</strong></span>
        </div>
      </div>

      {/* Decision Reason */}
      {reason && (
        <div className="card-reason-text">
          <strong style={{ color: '#F1F5F9' }}>Note: </strong>
          {reason}
        </div>
      )}
    </div>
  );
}
