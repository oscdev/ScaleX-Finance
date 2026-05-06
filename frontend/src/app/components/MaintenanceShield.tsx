'use client';

import React, { useEffect, useState } from 'react';

/**
 * Maintenance Shield Logic
 * Checks the central Global Setting flag and displays a professional 
 * full-screen overlay if the site is under maintenance.
 */

import './MaintenanceShield.css';

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
    <div className="maintenance-overlay">
      <div className="maintenance-card">
        <div className="maintenance-icon">🛠️</div>
        <h1 className="maintenance-title">
          Maintenance in Progress
        </h1>
        <p className="maintenance-description">
          ScaleX Finance is currently performing scheduled system upgrades. We’re working hard to get back online within the next hour.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="maintenance-btn"
        >
          Check Status
        </button>
      </div>
      <p className="maintenance-footer">
        © 2026 ScaleX Finance. Performance and Security Optimization.
      </p>
    </div>
  );
}
