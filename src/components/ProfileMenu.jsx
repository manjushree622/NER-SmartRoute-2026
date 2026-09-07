import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, ShieldCheck, ChevronDown, CheckCircle2 } from 'lucide-react';

export default function ProfileMenu({ user, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div style={{ position: 'relative' }} ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(30, 41, 59, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '9999px',
          padding: '6px 12px 6px 8px',
          color: '#F1F5F9',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        title="Account & Session"
      >
        <div
          style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10B981, #047857)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}
        >
          <User size={15} />
        </div>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user?.email ? user.email.split('@')[0] : 'Officer'}
        </span>
        <ChevronDown size={14} style={{ color: '#94A3B8' }} />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '240px',
            background: 'rgba(15, 23, 42, 0.96)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '12px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
            zIndex: 1000
          }}
        >
          <div style={{ paddingBottom: '10px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '8px' }}>
            <p style={{ fontSize: '0.72rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Authenticated User</p>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F8FAFC', wordBreak: 'break-all' }}>{user?.email || 'officer@nersmartroute.gov.in'}</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', fontSize: '0.78rem', color: '#34D399' }}>
            <CheckCircle2 size={14} />
            <span>AI Risk Model: Active</span>
          </div>

          <button
            onClick={() => {
              setIsOpen(false);
              onLogout();
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '8px',
              padding: '8px 10px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: '#F87171',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <LogOut size={14} />
            <span>Logout Session</span>
          </button>
        </div>
      )}
    </div>
  );
}
