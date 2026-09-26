import React from 'react';
import { CloudRain } from 'lucide-react';
import { getRouteRiskColor, getRouteRiskLabel } from '../utils/navigation';

function WeatherBlock({ title, data }) {
  return (
    <section className="weather-block">
      <h3><CloudRain size={15} /> {title}</h3>
      {data ? (
        <div className="weather-values">
          <span>{data.temperature_c ?? 'N/A'}°C</span>
          <span>Rain {data.rain_1h ?? 0} mm/h</span>
          <span>Wind {data.wind_speed ?? 'N/A'} m/s</span>
          <span>{data.description || data.weather || 'Conditions unavailable'}</span>
        </div>
      ) : <p className="weather-unavailable">Weather unavailable</p>}
    </section>
  );
}

export default function RouteComparison({ routes, weather, vehicleSuitabilityNote, selectedVehicle }) {
  if (!routes?.length) return null;
  const vehicleLabel = selectedVehicle?.replaceAll('_', ' ') || 'Selected vehicle';

  return (
    <div className="route-comparison-wrap">
      <div className="weather-summary">
        <WeatherBlock title="Source weather" data={weather?.source} />
        <WeatherBlock title="Destination weather" data={weather?.destination} />
      </div>
      <div className="comparison-box">
        <div className="comparison-title">Route comparison</div>
        <div className="comparison-table-scroll">
          <table className="route-comparison-table">
            <thead>
              <tr>
                <th>Route</th>
                <th>Distance</th>
                <th>Travel time</th>
                <th>Rainfall risk</th>
                <th>Slope risk</th>
                <th>Landslide risk</th>
                <th>Overall risk</th>
                <th>Safety</th>
                <th>Vehicle suitability</th>
                <th>Community alerts</th>
              </tr>
            </thead>
            <tbody>
              {routes.map((route) => (
                <tr key={route.route_id}>
                  <th scope="row">Route {route.route_number}{route.is_recommended ? ' · Recommended' : ''}</th>
                  <td>{route.distance_km} km</td>
                  <td>{route.travel_time}</td>
                  <td>{route.rainfall_risk}</td>
                  <td>{route.slope_risk}</td>
                  <td>{route.landslide_risk}</td>
                  <td style={{ color: getRouteRiskColor(route.safety_score), fontWeight: 700 }}>
                    {getRouteRiskLabel(route.safety_score)} ({route.risk_probability}%)
                  </td>
                  <td style={{ color: getRouteRiskColor(route.safety_score), fontWeight: 800 }}>
                    {route.safety_score ?? 'N/A'}/100
                  </td>
                  <td>{vehicleLabel} · estimated</td>
                  <td>{route.community_alert_count || 0}{route.active_hazard_count ? ` (${route.active_hazard_count} active)` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="vehicle-data-note">{vehicleSuitabilityNote}</p>
      </div>
    </div>
  );
}