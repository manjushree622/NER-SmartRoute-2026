import React, { useState, useEffect } from 'react';
import { Navigation, ShieldCheck, XCircle } from 'lucide-react';

export default function NavigationPanel({
  route,
  isSafest,
  userLocation,
  onExit
}) {
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [startTime] = useState(() => Date.now());

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

  const travelTime = route?.travel_time || (route?.travel_time_min ? `${route.travel_time_min} min` : 'N/A');
  const journeySeconds = Math.max(0, Math.round((route?.travel_time_min || 0) * 60));
  const remainingSeconds = Math.max(0, journeySeconds - activeSeconds);
  const estimatedArrival = new Date(startTime + journeySeconds * 1000);
  const formatClock = (value) => value.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="navigation-active-bar" role="region" aria-label="Navigation Mode HUD">
      {/* Banner */}
      <div className="nav-following-banner">
        <div className="nav-live-pulse">
          <div className="status-dot" style={{ backgroundColor: isSafest ? '#10B981' : '#EF4444' }} />
          <span>JOURNEY: {isSafest ? 'RECOMMENDED ROUTE' : 'SELECTED ROUTE'}</span>
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
          <span className="label">Estimated arrival</span>
          <span className="val">{formatClock(estimatedArrival)}</span>
        </div>
      </div>

      <div className="journey-clock-grid">
        <div><span>Start time</span><strong>{formatClock(new Date(startTime))}</strong></div>
        <div><span>Elapsed</span><strong>{formatElapsed(activeSeconds)}</strong></div>
        <div><span>Remaining</span><strong>{formatElapsed(remainingSeconds)}</strong></div>
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
        <span>Journey timer uses estimated route duration. GPS position is not being tracked live.</span>
      </div>
    </div>
  );
}
