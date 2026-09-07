import React, { useState, useEffect } from 'react';
import { Navigation, Compass, ShieldCheck, MapPin, XCircle, AlertTriangle } from 'lucide-react';
import { getRiskColor } from '../utils/navigation';

export default function NavigationPanel({
  route,
  isSafest,
  userLocation,
  onExit
}) {
  const [activeSeconds, setActiveSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatElapsed = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const riskColor = getRiskColor(route?.risk_level);
  const travelTime = route?.travel_time || (route?.travel_time_min ? `${route.travel_time_min} min` : 'N/A');

  return (
    <div className="navigation-active-bar" role="region" aria-label="Navigation Mode HUD">
      {/* Banner */}
      <div className="nav-following-banner">
        <div className="nav-live-pulse">
          <div className="status-dot" style={{ backgroundColor: isSafest ? '#10B981' : '#EF4444' }} />
          <span>FOLLOWING: {isSafest ? 'RECOMMENDED SAFEST ROUTE' : 'ALTERNATE ROUTE'}</span>
        </div>
        <button
          type="button"
          className="btn-exit-nav"
          onClick={onExit}
          title="Exit active navigation"
        >
          <XCircle size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
          <span>EXIT NAVIGATION</span>
        </button>
      </div>

      {/* Destination & Source */}
      <div style={{ marginBottom: '12px' }}>
        <p style={{ fontSize: '0.72rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Destination</p>
        <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF' }}>
          {route?.target} {route?.target_capital ? `(${route.target_capital})` : ''}
        </p>
        <p style={{ fontSize: '0.78rem', color: '#64748B' }}>
          Departing from: {route?.source} {route?.source_capital ? `(${route.source_capital})` : ''}
        </p>
      </div>

      {/* Metrics Row */}
      <div className="nav-metrics-row">
        <div className="nav-stat">
          <span className="label">Total Distance</span>
          <span className="val">{route?.distance_km} km</span>
        </div>

        <div className="nav-stat">
          <span className="label">Est. Time</span>
          <span className="val">{travelTime}</span>
        </div>

        <div className="nav-stat">
          <span className="label">En-route Risk</span>
          <span className="val" style={{ color: riskColor }}>{route?.risk_level} ({route?.risk_probability}%)</span>
        </div>
      </div>

      {/* Live Operational Status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#94A3B8' }}>
          <Compass size={14} color="#38BDF8" />
          <span>Active Nav: {formatElapsed(activeSeconds)}</span>
        </div>

        {userLocation ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#38BDF8' }}>
            <MapPin size={13} />
            <span>GPS Tracking Active</span>
          </div>
        ) : (
          <span style={{ fontSize: '0.72rem', color: '#64748B' }}>GPS Standby</span>
        )}
      </div>

      {/* Honest Navigation Notice */}
      <div style={{
        marginTop: '12px',
        padding: '8px 10px',
        borderRadius: '6px',
        background: 'rgba(16, 185, 129, 0.08)',
        border: '1px solid rgba(16, 185, 129, 0.2)',
        fontSize: '0.75rem',
        color: '#94A3B8',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <ShieldCheck size={14} color="#10B981" style={{ flexShrink: 0 }} />
        <span>Tracking GIS safest corridor across North Eastern Region topography.</span>
      </div>
    </div>
  );
}
