import React from 'react';
import { ShieldCheck, CloudRain, Mountain, AlertTriangle, Activity, BarChart2, CheckCircle2 } from 'lucide-react';
import { getRiskColor } from '../utils/navigation';
import { formatDistanceKm } from '../utils/navigation';

export default function RiskSummary({
  safestRoute,
  routes = [],
  activeRoute
}) {
  if (!safestRoute) return null;

  const current = activeRoute || safestRoute;
  const isViewingSafest = current === safestRoute;

  const safestTime = safestRoute.travel_time || (safestRoute.travel_time_min ? `${safestRoute.travel_time_min} min` : 'N/A');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* WHY THIS ROUTE? */}
      <div className="why-this-route-card">
        <div className="why-header">
          <ShieldCheck size={18} />
          <span>WHY THIS ROUTE?</span>
        </div>
        <p className="why-text">
          {safestRoute.recommendation_reason || 'Recommended based on the highest safety score. Distance is used as a tie-breaker when safety scores are equal.'}
        </p>
      </div>

      {/* ENVIRONMENTAL RISK DASHBOARD */}
      <div className="comparison-box">
        <div className="comparison-title">
          <Activity size={16} />
          <span>ENVIRONMENTAL RISK FACTORS ({isViewingSafest ? 'SAFEST ROUTE' : 'ALTERNATE ROUTE'})</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#94A3B8' }}>
              <CloudRain size={14} color="#38BDF8" />
              <span>🌧 Rainfall Risk</span>
            </div>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 700, color: '#F8FAFC', marginTop: '4px' }}>
              {current.rainfall_risk || current.rainfall || 'Moderate'}
            </p>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#94A3B8' }}>
              <Mountain size={14} color="#FBBF24" />
              <span>⛰ Terrain Slope</span>
            </div>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 700, color: '#F8FAFC', marginTop: '4px' }}>
              {current.slope_risk || current.slope || 'Normal'}
            </p>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#94A3B8' }}>
              <AlertTriangle size={14} color="#F87171" />
              <span>⚠️ Landslide Risk</span>
            </div>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 700, color: '#F8FAFC', marginTop: '4px' }}>
              {current.landslide_risk || current.landslide || 'Low'}
            </p>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#94A3B8' }}>
              <BarChart2 size={14} color="#34D399" />
              <span>📊 Risk Probability</span>
            </div>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 700, color: getRiskColor(current.risk_level), marginTop: '4px' }}>
              {current.risk_probability !== undefined ? `${current.risk_probability}%` : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {routes.length > 1 && (
        <div className="comparison-box">
          <div className="comparison-title">
            <span>ROUTE COMPARISON MATRIX</span>
          </div>

          <div className="comparison-grid dynamic-route-comparison">
            {routes.map((route) => (
              <div className={`comparison-col ${route.route_type === 'recommended' ? 'safest' : 'alternate'}`} key={route.route_id}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>
                  ROUTE {route.route_number} {route.route_type === 'recommended' ? 'RECOMMENDED' : 'ALTERNATIVE'}
                </span>
                <div className="comp-metric-row"><span className="label">Distance</span><span className="val">{formatDistanceKm(route.distance_km)} km</span></div>
                <div className="comp-metric-row"><span className="label">Est. Time</span><span className="val">{route.travel_time}</span></div>
                <div className="comp-metric-row"><span className="label">Risk</span><span className="val">{route.risk_level}</span></div>
                <div className="comp-metric-row"><span className="label">Safety</span><span className="val">{route.safety_score}%</span></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
