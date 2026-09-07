import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ErrorMessage({ message, onDismiss }) {
  if (!message) return null;

  return (
    <div className="error-banner" role="alert">
      <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: 600, marginBottom: '2px' }}>Route Search Notice</p>
        <p style={{ fontSize: '0.82rem', opacity: 0.9 }}>{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#FCA5A5',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center'
          }}
          title="Dismiss"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
