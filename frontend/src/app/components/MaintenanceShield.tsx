'use client';

import React, { useEffect, useState } from 'react';

/**
 * Maintenance Shield Logic
 * Checks the central Global Setting flag and displays a professional 
 * full-screen overlay if the site is under maintenance.
 */

export default function MaintenanceShield() {
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch('https://scalex.local/api/global-setting');
        if (res.ok) {
          const data = await res.json();
          const active = data?.data?.maintenanceModeIsEnabled ?? false;
          setIsMaintenance(active);
        }
      } catch (err) {
        // console.error('[Maintenance] Failed to join the maintenance check.', err);
      } finally {
        setIsLoading(false);
      }
    }

    checkStatus();
    // Re-check periodically if it's already in maintenance to auto-refresh when it opens
    const interval = setInterval(checkStatus, 30000); 
    return () => clearInterval(interval);
  }, []);

  if (!isMaintenance || isLoading) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: '#f8fafc',
      zIndex: 100000,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <div style={{
        maxWidth: '500px',
        background: 'white',
        padding: '3rem',
        borderRadius: '16px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛠️</div>
        <h1 style={{ color: '#1e293b', fontSize: '1.8rem', fontWeight: 700, marginBottom: '1rem' }}>
          Maintenance in Progress
        </h1>
        <p style={{ color: '#64748b', fontSize: '1.1rem', marginBottom: '2rem', lineHeight: 1.6 }}>
          ScaleX Finance is currently performing scheduled system upgrades. We’re working hard to get back online within the next hour.
        </p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            backgroundColor: '#2563eb',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Check Status
        </button>
      </div>
      <p style={{ marginTop: '2rem', color: '#94a3b8', fontSize: '0.9rem' }}>
        © 2026 ScaleX Finance. Performance and Security Optimization.
      </p>
    </div>
  );
}
