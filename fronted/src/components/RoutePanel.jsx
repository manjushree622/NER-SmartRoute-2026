import React from 'react';
import { Navigation } from 'lucide-react';
import RouteCard from './RouteCard';
import RouteComparison from './RouteComparison';
import NavigationPanel from './NavigationPanel';

export default function RoutePanel({
  routeData,
  activeRouteType,
  setActiveRouteType,
  vehicleSuitabilityNote,
  weather,
  selectedVehicle,
  isNavigating,
  setIsNavigating,
  userLocation
}) {
  if (!routeData) {
    return null;
  }

  const routes = routeData.routes?.length
    ? routeData.routes
    : [routeData.recommended_route, routeData.alternate_route].filter(Boolean);
  if (!routes.length) return null;

  const currentActiveRoute = routes.find((route) => route.route_id === activeRouteType)
    || routes.find((route) => route.is_recommended)
    || routes[0];
  const estimatedArrival = new Date(Date.now() + (currentActiveRoute.travel_time_min || 0) * 60000);
  const arrivalText = estimatedArrival.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="route-results-container">
      {/* If actively navigating, render the Navigation HUD */}
      {isNavigating ? (
        <NavigationPanel
          route={currentActiveRoute}
          isSafest={currentActiveRoute.is_recommended}
          userLocation={userLocation}
          onExit={() => setIsNavigating(false)}
        />
      ) : (
        <>
          <div className="journey-preview">
            <div><span>Selected route</span><strong>Route {currentActiveRoute.route_number}</strong></div>
            <div><span>Distance</span><strong>{currentActiveRoute.distance_km} km</strong></div>
            <div><span>Travel time</span><strong>{currentActiveRoute.travel_time}</strong></div>
            <div><span>Estimated arrival</span><strong>{arrivalText}</strong></div>
          </div>
          <button
            type="button"
            className="btn-start-navigation"
            onClick={() => setIsNavigating(true)}
          >
            <Navigation size={18} />
            <span>START JOURNEY</span>
          </button>

          {routes.map((route) => (
            <RouteCard
              key={route.route_id}
              route={route}
              isRecommended={route.is_recommended}
              isSelected={currentActiveRoute.route_id === route.route_id}
              selectedVehicle={selectedVehicle}
              onSelect={() => setActiveRouteType(route.route_id)}
            />
          ))}

          <RouteComparison
            routes={routes}
            weather={weather}
            selectedVehicle={selectedVehicle}
            vehicleSuitabilityNote={vehicleSuitabilityNote}
          />
        </>
      )}
    </div>
  );
}
