import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function LoadingIndicator({ title = "Finding the safest route...", subtitle = "Evaluating environmental risk, terrain slope, and landslide probability..." }) {
  return (
    <div className="loading-container" aria-live="polite">
      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner-pulse" />
        <ShieldCheck
          size={20}
          color="#10B981"
          style={{ position: 'absolute', opacity: 0.9 }}
        />
      </div>
      <div>
        <p className="loading-text">{title}</p>
        <p className="loading-sub">{subtitle}</p>
      </div>
    </div>
  );
}
