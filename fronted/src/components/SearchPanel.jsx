import React from 'react';
import { MapPin, Navigation, ArrowUpDown, Search, Sparkles } from 'lucide-react';
import { POPULAR_LOCATIONS } from '../utils/navigation';

export default function SearchPanel({
  source,
  setSource,
  destination,
  setDestination,
  onSearch,
  isLoading
}) {
  const handleSwap = () => {
    const temp = source;
    setSource(destination);
    setDestination(temp);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(source, destination);
  };

  return (
    <div className="search-panel-card">
      <div className="panel-header-title">
        <span>Route Selection</span>
        <span style={{ fontSize: '0.72rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Sparkles size={13} />
          <span>AI Risk Aware</span>
        </span>
      </div>
      <p className="panel-header-sub">Enter source and destination to compute disaster-evaluated routes.</p>

      <form onSubmit={handleSubmit}>
        <div className="inputs-wrapper">
          {/* Source Input */}
          <div className="input-row">
            <div className="input-icon-box green">
              <MapPin size={18} />
            </div>
            <input
              type="text"
              id="source-input"
              list="locations-list"
              className="custom-route-input"
              placeholder="Enter source (e.g. Assam, Guwahati)"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              required
              autoComplete="off"
            />
          </div>

          {/* Swap Button */}
          <button
            type="button"
            className="swap-inputs-btn"
            onClick={handleSwap}
            title="Swap Source and Destination"
          >
            <ArrowUpDown size={15} />
          </button>

          {/* Destination Input */}
          <div className="input-row">
            <div className="input-icon-box red">
              <Navigation size={18} />
            </div>
            <input
              type="text"
              id="destination-input"
              list="locations-list"
              className="custom-route-input"
              placeholder="Enter destination (e.g. Tripura, Agartala)"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
              autoComplete="off"
            />
          </div>
        </div>

        {/* Datalist for autocomplete */}
        <datalist id="locations-list">
          {POPULAR_LOCATIONS.map((loc, idx) => (
            <React.Fragment key={idx}>
              <option value={loc.name} />
              <option value={loc.capital} />
            </React.Fragment>
          ))}
        </datalist>

        <button
          type="submit"
          id="find-safest-route-btn"
          className="btn-find-safest"
          disabled={isLoading || !source || !destination}
        >
          <Search size={18} />
          <span>{isLoading ? 'FINDING SAFEST ROUTE...' : 'FIND SAFEST ROUTE'}</span>
        </button>
      </form>
    </div>
  );
}
