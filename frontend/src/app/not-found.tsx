import React from 'react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <main style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <h1 style={{ fontSize: '6rem', fontWeight: 900, color: 'var(--primary)', marginBottom: '1rem' }}>404</h1>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#111827', marginBottom: '1.5rem' }}>Page Not Found</h2>
        <p style={{ color: '#6b7280', fontSize: '1.1rem', marginBottom: '2.5rem' }}>
          Sorry, we couldn't find the page you're looking for.
        </p>
        <Link href="/" className="btn btn-primary">
          Back to Homepage
        </Link>
      </div>
    </main>
  );
}
