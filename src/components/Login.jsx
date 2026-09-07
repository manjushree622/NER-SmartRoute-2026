import React, { useState } from 'react';
import { Navigation, ShieldAlert, ArrowRight, Lock, Mail } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [email, setEmail] = useState('demo.officer@nersmartroute.in');
  const [password, setPassword] = useState('smartroute2026');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    // Save session to localStorage
    const authData = {
      email,
      token: 'jwt-ner-hackathon-' + Date.now(),
      loggedInAt: new Date().toISOString()
    };
    localStorage.setItem('ner_smartroute_user', JSON.stringify(authData));
    onLoginSuccess(authData);
  };

  return (
    <div className="login-page-container">
      <div className="login-glass-card">
        <div className="login-brand-header">
          <div className="icon-container">
            <Navigation size={28} />
          </div>
          <h1>NER SmartRoute</h1>
          <p className="subtitle">AI-Powered Safe Route Intelligence</p>
          <p className="tagline">“Find the safest route, not just the shortest route.”</p>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab-btn ${isLoginTab ? 'active' : ''}`}
            onClick={() => { setIsLoginTab(true); setError(''); }}
          >
            LOGIN
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${!isLoginTab ? 'active' : ''}`}
            onClick={() => { setIsLoginTab(false); setError(''); }}
          >
            CREATE ACCOUNT
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#FCA5A5',
            padding: '10px 12px',
            borderRadius: '8px',
            fontSize: '0.82rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <ShieldAlert size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Official Email</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail size={16} style={{ position: 'absolute', left: '14px', color: '#64748B' }} />
              <input
                type="email"
                className="form-input"
                style={{ paddingLeft: '40px', width: '100%' }}
                placeholder="name@organization.gov.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Security Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={16} style={{ position: 'absolute', left: '14px', color: '#64748B' }} />
              <input
                type="password"
                className="form-input"
                style={{ paddingLeft: '40px', width: '100%' }}
                placeholder="Enter account password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-auth-submit">
            <span>{isLoginTab ? 'LOGIN TO DASHBOARD' : 'CREATE ACCOUNT & ACCESS'}</span>
            <ArrowRight size={18} style={{ marginLeft: '6px', verticalAlign: 'middle' }} />
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: '#64748B' }}>
            NER Disaster Management & High-Risk Logistics Portal
          </p>
        </div>
      </div>
    </div>
  );
}
