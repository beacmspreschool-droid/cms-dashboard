import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const APP_PASSWORD = "Monte$$ori";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem('cms_auth');
    if (saved === 'true') {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === APP_PASSWORD) {
      if (rememberMe) {
        localStorage.setItem('cms_auth', 'true');
      }
      setIsAuthenticated(true);
    } else {
      setError('Incorrect password. Please try again.');
      setPassword('');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('cms_auth');
    setIsAuthenticated(false);
  };

  if (isLoading) return null;

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#fbfcf7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
          padding: '40px',
          width: '100%',
          maxWidth: '400px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            backgroundColor: '#4f5c30',
            borderRadius: '50%',
            margin: '0 auto 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{ fontSize: '36px' }}>🏫</span>
          </div>
          
          <h1 style={{ color: '#4f5c30', fontSize: '24px', fontWeight: '600', margin: '0 0 8px 0' }}>
            CMS Preschool
          </h1>
          <p style={{ color: '#666', fontSize: '14px', margin: '0 0 32px 0' }}>
            Enter password to continue
          </p>

          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="Enter password"
              style={{
                width: '100%',
                padding: '14px 16px',
                fontSize: '16px',
                borderRadius: '8px',
                border: error ? '2px solid #d32f2f' : '2px solid #e8ebe0',
                boxSizing: 'border-box',
                marginBottom: '12px',
                outline: 'none'
              }}
              autoFocus
            />
            
            {error && (
              <p style={{ color: '#d32f2f', fontSize: '13px', margin: '0 0 12px 0', textAlign: 'left' }}>
                {error}
              </p>
            )}

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: '#666',
              marginBottom: '20px',
              cursor: 'pointer',
              justifyContent: 'flex-start'
            }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              Remember me on this device
            </label>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '16px',
                fontWeight: '600',
                backgroundColor: '#4f5c30',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Home Screen with Navigation
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#fbfcf7',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      padding: '20px'
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', paddingTop: '40px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            backgroundColor: '#4f5c30',
            borderRadius: '50%',
            margin: '0 auto 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{ fontSize: '36px' }}>🏫</span>
          </div>
          <h1 style={{ color: '#4f5c30', fontSize: '28px', fontWeight: '600', margin: '0 0 8px 0' }}>
            CMS Preschool
          </h1>
          <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
            Select an option below
          </p>
        </div>

        {/* Navigation Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Check-In Kiosk */}
          <button
            onClick={() => navigate('/kiosk')}
            style={{
              backgroundColor: 'white',
              border: '2px solid #e8ebe0',
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = '#4f5c30'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = '#e8ebe0'}
          >
            <div style={{
              width: '60px',
              height: '60px',
              backgroundColor: '#e8f0e8',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px'
            }}>
              ✓
            </div>
            <div>
              <h2 style={{ color: '#333', fontSize: '18px', fontWeight: '600', margin: '0 0 4px 0' }}>
                Check-In / Check-Out
              </h2>
              <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
                Mark students as arrived or picked up
              </p>
            </div>
          </button>

          {/* Daily Dashboard */}
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              backgroundColor: 'white',
              border: '2px solid #e8ebe0',
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = '#275375'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = '#e8ebe0'}
          >
            <div style={{
              width: '60px',
              height: '60px',
              backgroundColor: '#e8f0f7',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px'
            }}>
              📋
            </div>
            <div>
              <h2 style={{ color: '#333', fontSize: '18px', fontWeight: '600', margin: '0 0 4px 0' }}>
                Daily Roster
              </h2>
              <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
                View today's attendance by classroom
              </p>
            </div>
          </button>

          {/* Attendance Stats */}
          <button
            onClick={() => navigate('/stats')}
            style={{
              backgroundColor: 'white',
              border: '2px solid #e8ebe0',
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = '#7c5c30'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = '#e8ebe0'}
          >
            <div style={{
              width: '60px',
              height: '60px',
              backgroundColor: '#f7f0e8',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px'
            }}>
              📊
            </div>
            <div>
              <h2 style={{ color: '#333', fontSize: '18px', fontWeight: '600', margin: '0 0 4px 0' }}>
                Attendance Stats
              </h2>
              <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
                Summary and ratios for planning
              </p>
            </div>
          </button>
        </div>

        {/* Logout */}
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <button
            onClick={handleLogout}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#999',
              fontSize: '14px',
              cursor: 'pointer',
              padding: '8px 16px'
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
