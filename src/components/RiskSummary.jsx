import React from 'react';
import { ShieldCheck, CloudRain, Mountain, AlertTriangle, Activity, BarChart2, CheckCircle2 } from 'lucide-react';
import { getRiskColor } from '../utils/navigation';

export default function RiskSummary({
  safestRoute,
  alternateRoute,
  activeRoute
}) {
  if (!safestRoute) return null;

  const current = activeRoute || safestRoute;
  const isViewingSafest = current === safestRoute;

  const safestTime = safestRoute.travel_time || (safestRoute.travel_time_min ? `${safestRoute.travel_time_min} min` : 'N/A');
  const alternateTime = alternateRoute?.travel_time || (alternateRoute?.travel_time_min ? `${alternateRoute.travel_time_min} min` : 'N/A');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* WHY THIS ROUTE? */}
      <div className="why-this-route-card">
        <div className="why-header">
          <ShieldCheck size={18} />
          <span>WHY THIS ROUTE?</span>
        </div>
        <p className="why-text">
          {safestRoute.recommendation_reason || (
            `This route is recommended because it has a lower overall environmental risk probability (${safestRoute.risk_probability}%) compared to the alternate route, evaluating rainfall hazard (${safestRoute.rainfall_risk || safestRoute.rainfall || 'normal'}), slope (${safestRoute.slope_risk || safestRoute.slope || 'normal'}) and landslide vulnerability (${safestRoute.landslide_risk || safestRoute.landslide || 'low'}).`
          )}
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

      {/* ROUTE COMPARISON MATRIX (🟢 SAFEST vs 🔴 ALTERNATE) */}
      {alternateRoute && (
        <div className="comparison-box">
          <div className="comparison-title">
            <span>ROUTE COMPARISON MATRIX</span>
          </div>

          <div className="comparison-grid">
            {/* Safest Column */}
            <div className="comparison-col safest">
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                🟢 SAFEST
              </span>
              <div className="comp-metric-row safest-val">
                <span className="label">Distance</span>
                <span className="val">{safestRoute.distance_km} km</span>
              </div>
              <div className="comp-metric-row safest-val">
                <span className="label">Est. Time</span>
                <span className="val">{safestTime}</span>
              </div>
              <div className="comp-metric-row safest-val">
                <span className="label">Risk Level</span>
                <span className="val">{safestRoute.risk_level}</span>
              </div>
              <div className="comp-metric-row safest-val">
                <span className="label">Probability</span>
                <span className="val">{safestRoute.risk_probability}%</span>
              </div>
            </div>

            {/* VS Badge */}
            <div className="comparison-vs-badge">VS</div>

            {/* Alternate Column */}
            <div className="comparison-col alternate">
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                🔴 ALTERNATE
              </span>
              <div className="comp-metric-row alternate-val">
                <span className="label">Distance</span>
                <span className="val">{alternateRoute.distance_km} km</span>
              </div>
              <div className="comp-metric-row alternate-val">
                <span className="label">Est. Time</span>
                <span className="val">{alternateTime}</span>
              </div>
              <div className="comp-metric-row alternate-val">
                <span className="label">Risk Level</span>
                <span className="val">{alternateRoute.risk_level}</span>
              </div>
              <div className="comp-metric-row alternate-val">
                <span className="label">Probability</span>
                <span className="val">{alternateRoute.risk_probability}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
