import React from 'react';
import { AlertTriangle, Check, CloudRain, Mountain, ShieldCheck } from 'lucide-react';
import { getRouteRiskColor, getRouteRiskLabel, VEHICLE_GROUPS } from '../utils/navigation';

export default function RouteCard({ route, isRecommended, isSelected, onSelect, selectedVehicle }) {
  if (!route) return null;

  const riskColor = getRouteRiskColor(route.safety_score);
  const riskLabel = getRouteRiskLabel(route.safety_score);
  const reason = route.recommendation_reason || route.risk_reason || route.reason || '';
  const vehicleLabel = VEHICLE_GROUPS.flatMap((group) => group.options)
    .find(([key]) => key === selectedVehicle)?.[1] || selectedVehicle;

  return (
    <div
      className={`route-selection-card ${isSelected ? 'selected' : ''}`}
      style={{
        borderColor: riskColor,
        borderWidth: isRecommended ? 3 : 2,
        background: 'var(--bg-card)',
        boxShadow: isSelected
          ? `0 0 0 2px ${riskColor}`
          : isRecommended
            ? `0 0 0 1px ${riskColor}`
            : 'none'
      }}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-label={`Route ${route.route_number}, safety ${route.safety_score}`}
    >
      <div className="card-top-row">
        <span className="badge-tag" style={{ color: riskColor, borderColor: riskColor }}>
          {route.not_recommended ? <AlertTriangle size={14} /> : isRecommended ? <ShieldCheck size={14} /> : null}
          <span>{route.not_recommended ? route.recommendation_status : `${route.recommendation_status || `ROUTE ${route.route_number}`} · ${riskLabel}`}</span>
        </span>
        {isSelected && <span className="route-active-tag" style={{ color: riskColor }}>SELECTED</span>}
      </div>

      <div className="metric-highlights-grid">
        <div className="metric-item">
          <span className="metric-label">Distance</span>
          <span className="metric-val">{route.distance_km} <span className="metric-unit">km</span></span>
        </div>
        <div className="metric-item">
          <span className="metric-label">Est. travel time</span>
          <span className="metric-val">{route.travel_time || 'N/A'}</span>
        </div>
      </div>

      <div className="route-score-row">
        <span>Risk: <strong style={{ color: riskColor }}>{riskLabel} ({route.risk_probability}%)</strong></span>
        <span>Safety: <strong style={{ color: riskColor }}>{route.safety_score ?? 'N/A'} / 100</strong></span>
      </div>

      <div className="risk-factors-row">
        <div className="factor-chip"><CloudRain size={13} /><span>Rain: <strong>{route.rainfall_risk}</strong></span></div>
        <div className="factor-chip"><Mountain size={13} /><span>Slope: <strong>{route.slope_risk}</strong></span></div>
        <div className="factor-chip"><AlertTriangle size={13} /><span>Landslide: <strong>{route.landslide_risk}</strong></span></div>
      </div>

      {route.hazard_warning && <div className="route-hazard-warning"><AlertTriangle size={15} /><span>{route.hazard_warning}</span></div>}
      {reason && <div className="card-reason-text"><strong>Reason: </strong>{reason}</div>}

      <div className="vehicle-estimate-row">
        Selected: <strong>{vehicleLabel}</strong>
        <span>Estimated from available road and risk data</span>
      </div>
      <details className="vehicle-suitability-details">
        <summary>Vehicle suitability estimates</summary>
        <div className="vehicle-suitability-list">
          {(route.vehicle_suitability || []).map((vehicle) => (
            <span key={vehicle.vehicle_type}><Check size={13} /> {vehicle.label}: estimated</span>
          ))}
        </div>
      </details>
    </div>
  );
}
