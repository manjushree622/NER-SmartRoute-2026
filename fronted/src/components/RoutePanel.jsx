import React from 'react';
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
  if (!routeData || !routeData.recommended_route) {
    return null;
  }

  const { recommended_route, alternate_route } = routeData;

  const isSafestSelected = activeRouteType === 'safest';
  const currentActiveRoute = isSafestSelected ? recommended_route : (alternate_route || recommended_route);

  return (
    <div className="route-results-container">
      {/* If actively navigating, render the Navigation HUD */}
      {isNavigating ? (
        <NavigationPanel
          route={currentActiveRoute}
          isSafest={isSafestSelected}
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

          {/* Quick toggle if viewing alternate */}
          {!isSafestSelected && (
            <button
              type="button"
              className="switch-route-action-btn"
              onClick={() => setActiveRouteType('safest')}
            >
              <RotateCcw size={15} />
              <span>VIEW SAFEST ROUTE (RECOMMENDED)</span>
            </button>
          )}

          {/* 🟢 SAFEST / RECOMMENDED ROUTE CARD */}
          <RouteCard
            route={recommended_route}
            isSafest={true}
            isSelected={isSafestSelected}
            onSelect={() => setActiveRouteType('safest')}
          />

          {/* 🔴 HIGHER-RISK ALTERNATE ROUTE CARD */}
          {alternate_route && (
            <RouteCard
              route={alternate_route}
              isSafest={false}
              isSelected={!isSafestSelected}
              onSelect={() => setActiveRouteType('alternate')}
            />
          )}

          {/* ENVIRONMENTAL RISK DASHBOARD & COMPARISON */}
          <RiskSummary
            safestRoute={recommended_route}
            alternateRoute={alternate_route}
            activeRoute={currentActiveRoute}
          />
        </>
      )}
    </div>
  );
}
