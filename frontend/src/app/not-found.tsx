import React from 'react';
import Link from 'next/link';
import './not-found.css';

export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <main className="not-found-page">
      <div className="not-found-content">
        <h1 className="not-found-code">404</h1>
        <h2 className="not-found-title">Page Not Found</h2>
        <p className="not-found-message">
          Sorry, we couldn't find the page you're looking for.
        </p>
        <Link href="/" className="btn btn-primary">
          Back to Homepage
        </Link>
      </div>
    </main>
  );
}
