import React, { useEffect } from 'react';
import { Navigation, RotateCcw, ArrowRight } from 'lucide-react';
import RouteCard from './RouteCard';
import RiskSummary from './RiskSummary';
import NavigationPanel from './NavigationPanel';

export default function RoutePanel({
  routeData,
  activeRouteType,
  setActiveRouteType,
  isNavigating,
  setIsNavigating,
  userLocation
}) {
  const routes = routeData?.routes || [];

  useEffect(() => {
    if (routeData) {
      console.info('[NER SmartRoute] Frontend route diagnostics', {
        routesReceived: routes.length,
        routeCardsRendered: routes.length
      });
    }
  }, [routeData, routes.length]);

  if (!routeData) return null;

  if (routes.length === 0) {
    return (
      <div className="route-results-container">
        <div style={{ margin: '12px 0', color: '#CBD5E1', fontSize: '0.82rem' }}>
          No connected GIS road route is available for the selected locations.
        </div>
      </div>
    );
  }

  const recommendedRoute = routes.find((route) => route.is_recommended) || routes[0];
  const currentActiveRoute = activeRouteType === 'safest'
    ? recommendedRoute
    : routes.find((route) => route.route_id === activeRouteType) || recommendedRoute;

  return (
    <div className="route-results-container">
      {/* If actively navigating, render the Navigation HUD */}
      {isNavigating ? (
        <NavigationPanel
          route={currentActiveRoute}
          isSafest={currentActiveRoute?.is_safest}
          userLocation={userLocation}
          onExit={() => setIsNavigating(false)}
        />
      ) : (
        <>
          {/* Action button to Start Navigation */}
          <button
            type="button"
            className="btn-start-navigation"
            onClick={() => setIsNavigating(true)}
          >
            <Navigation size={18} />
            <span>START NAVIGATION</span>
          </button>

          <div style={{ margin: '12px 0', color: '#CBD5E1', fontSize: '0.82rem' }}>
            {routes.length === 1
              ? 'Only one meaningful road route is available. NER SmartRoute is showing the available route instead of inventing alternatives.'
              : `${routes.length} meaningful route(s) found.`}
          </div>

          {/* Quick toggle if viewing an alternate */}
          {currentActiveRoute !== recommendedRoute && (
            <button
              type="button"
              className="switch-route-action-btn"
              onClick={() => setActiveRouteType('safest')}
            >
              <RotateCcw size={15} />
              <span>VIEW SAFEST ROUTE (RECOMMENDED)</span>
            </button>
          )}

          {routes.map((route, index) => (
            <RouteCard
              key={route.route_id || `${route.source}-${route.target}-${index}`}
              route={route}
              isSafest={route.is_safest}
              isSelected={route === currentActiveRoute}
              onSelect={() => setActiveRouteType(route.route_id)}
            />
          ))}

          {/* ENVIRONMENTAL RISK DASHBOARD & COMPARISON */}
          <RiskSummary
            recommendedRoute={recommendedRoute}
            routes={routes}
            activeRoute={currentActiveRoute}
          />
        </>
      )}
    </div>
  );
}
