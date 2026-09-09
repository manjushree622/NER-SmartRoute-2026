import React from 'react';
import { ShieldCheck, AlertTriangle, CloudRain, Mountain, Activity, Thermometer, Droplets, Wind, MapPin } from 'lucide-react';
import { getRiskColor, getSafetyClassification, formatDistanceKm, VEHICLE_LABELS } from '../utils/navigation';

export default function RouteCard({
  route,
  isSafest,
  isSelected,
  onSelect
}) {
  if (!route) return null;

  const distanceKm = formatDistanceKm(route.distance_km);
  const travelTime = route.travel_time ?? (route.travel_time_min ? `${route.travel_time_min} min` : 'N/A');
  const riskLevel = route.risk_level ?? 'MEDIUM';
  const riskProbability = route.risk_probability !== undefined ? `${route.risk_probability}%` : 'N/A';
  const rainfall = route.rainfall_risk ?? route.rainfall ?? 'N/A';
  const slope = route.slope_risk ?? route.slope ?? 'N/A';
  const landslide = route.landslide_risk ?? route.landslide ?? 'N/A';
  const reason = route.is_recommended
    ? (route.recommendation_reason || '')
    : '';
  const isRecommended = Boolean(route.is_recommended || route.route_type === 'recommended');
  const labels = route.labels || [
    ...(isRecommended ? ['RECOMMENDED'] : []),
    ...(route.is_safest || isSafest ? ['SAFEST'] : []),
    ...(route.is_shortest ? ['SHORTEST'] : [])
  ];
  const safetyScore = Number(route.safety_score ?? 0);
  const safety = getSafetyClassification(safetyScore);

  const riskColor = getRiskColor(riskLevel);
  const weather = route.live_weather;
  const weatherSamples = Array.isArray(weather?.samples) ? weather.samples : [];
  const formatWeatherText = (value) => String(value || '')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
  const formatWeatherValue = (value, suffix = '') => (
    value === null || value === undefined || value === '' ? 'Unavailable' : `${value}${suffix}`
  );
  const weatherDescriptions = Array.isArray(weather?.descriptions)
    ? [...new Set(weather.descriptions.filter(Boolean).map(formatWeatherText))]
    : [];
  const weatherConditions = Array.isArray(weather?.conditions)
    ? [...new Set(weather.conditions.filter(Boolean).map(formatWeatherText))]
    : [];

  const renderWeatherSample = (sample, index) => {
    const locationName = sample.location_name;
    const locationLabel = locationName || 'Location name unavailable';
    const description = formatWeatherText(sample.description || sample.conditions || sample.weather);
    return (
      <div className="live-weather-sample" key={`${locationName || 'sample'}-${index}`}>
        <div className="live-weather-location">
          <MapPin size={13} />
          <span>{locationLabel}</span>
        </div>
        <strong className="live-weather-condition">
          <CloudRain size={14} /> {description || 'Live weather unavailable'}
        </strong>
        <div className="live-weather-sample-values">
          {formatWeatherValue(sample.temperature_c, '°C')} · {formatWeatherValue(sample.humidity, '% humidity')} · Rain: {formatWeatherValue(sample.rain_1h, ' mm/h')} · Wind: {formatWeatherValue(sample.wind_speed, ' m/s')}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`route-selection-card ${isRecommended ? 'safest' : 'alternate'} ${isSelected ? 'selected' : ''}`}
      style={{ '--route-safety-color': safety.color }}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-label={`Route ${route.route_number}: ${labels.join(', ') || 'Meaningful Route'} card`}
    >
      {/* Header Tag */}
      <div className="card-top-row">
        <span className={`badge-tag ${isRecommended ? 'safest' : 'alternate'}`}>
          {isRecommended ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
          <span>ROUTE {route.route_number} · {labels.join(' · ') || 'MEANINGFUL ROUTE'}</span>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>Safety Score:</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#34D399' }}>
            <span style={{ color: safety.color }}>{safetyScore}% {safety.emoji} {safety.label}</span>
          </span>
        </div>
      </div>

      {route.vehicle_type && (
        <div className="vehicle-route-label">{VEHICLE_LABELS[route.vehicle_type] || route.vehicle_type}</div>
      )}

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

      <div className="live-weather-panel">
        <div className="live-weather-heading">
          <CloudRain size={16} />
          <span>LIVE WEATHER ALONG ROUTE</span>
          {weather?.sample_count !== undefined && (
            <span className="live-weather-count">{weather.sample_count} sampled point{weather.sample_count === 1 ? '' : 's'}</span>
          )}
        </div>

        {weatherSamples.length > 0 ? (
          <div className="live-weather-samples">
            {weatherSamples.map(renderWeatherSample)}
          </div>
        ) : weather ? (
          <>
            <div className="live-weather-location unavailable">
              <MapPin size={13} />
              <span>Location name unavailable</span>
            </div>
            <div className="live-weather-condition">
              <CloudRain size={14} />
              <span>{weatherDescriptions.join(' · ') || weatherConditions.join(' · ') || 'Live weather unavailable'}</span>
            </div>
            <div className="live-weather-values">
              <span><Thermometer size={14} /> {formatWeatherValue(weather.temperature_c, '°C')}</span>
              <span><Droplets size={14} /> {formatWeatherValue(weather.humidity, '%')}</span>
              <span><CloudRain size={14} /> Rain: {formatWeatherValue(weather.rain_1h, ' mm/h')}</span>
              <span><Wind size={14} /> Wind: {formatWeatherValue(weather.wind_speed, ' m/s')}</span>
            </div>
          </>
        ) : (
          <div className="live-weather-unavailable">Live weather unavailable</div>
        )}
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
