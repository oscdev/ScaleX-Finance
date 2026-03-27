import React from 'react';
import Link from 'next/link';
import { getStrapiInternalUrl, withStrapiPublicUrl } from '@/lib/strapi';

async function getHeaderData() {
    try {
        const url = `${getStrapiInternalUrl()}/api/header?populate=*`;
        const res = await fetch(url, {
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!res.ok) {
            // console.error("Failed to fetch header data");
            return null;
        }

        const json = await res.json();
        return json.data;

    } catch (error) {
        // console.error("Fetch header error:", error);
        return null;
    }
}

export default async function Header() {
    const data = await getHeaderData();

    let headerInfo: any = {};
    if (data) {
        headerInfo = data.attributes || data;
    }

    const logoText = headerInfo.logoText || 'ScaleX Finance';
    const logoImageUrl = headerInfo.logoImage?.url || headerInfo.logoImage?.data?.attributes?.url;
    const homeLabel = headerInfo.homeLabel || 'Home';
    const homeLink = headerInfo.homeLink || '/';
    const quickLoansLabel = headerInfo.quickLoansLabel || 'Quick Loans';
    const quickLoansLink = headerInfo.quickLoansLink || '/products';
    const aboutUsLabel = headerInfo.aboutUsLabel || 'About Us';
    const aboutUsLink = headerInfo.aboutUsLink || '/about-us';
    const contactUsLabel = headerInfo.contactUsLabel || 'Contact Us';
    const contactUsLink = headerInfo.contactUsLink || '/contact';
    const advisorRegistrationLabel = headerInfo.advisorRegistrationLabel || 'Advisor Registration';
    const advisorRegistrationLink = headerInfo.advisorRegistrationLink || '/advisor-onboarding';
    const advisorLoginLabel = headerInfo.advisorLoginLabel || 'Advisor Login';
    const advisorLoginLink = headerInfo.advisorLoginLink || '/admin/auth/login';

    const fullLogoUrl = logoImageUrl ? withStrapiPublicUrl(logoImageUrl) : null;

    return (
        <header style={{
            background: 'var(--card-bg)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid var(--border-color)',
            position: 'sticky',
            top: 0,
            zIndex: 100
        }}>
            <div className="container" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                height: '80px'
            }}>
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700, fontSize: '1.5rem', fontFamily: 'var(--font-display)' }}>
                    {fullLogoUrl ? (
                        <img src={fullLogoUrl} alt={logoText} style={{ height: '40px', objectFit: 'contain' }} />
                    ) : (
                        <div style={{ background: 'var(--primary)', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '1.2rem', lineHeight: 1 }}>SX</div>
                    )}
                    {logoText}
                </Link>

                <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center', fontSize: '1rem', fontWeight: 500 }}>
                    <Link href={homeLink} style={{ transition: 'color 0.3s ease' }} className="nav-link">
                        {homeLabel}
                    </Link>
                    <Link href={quickLoansLink} style={{ transition: 'color 0.3s ease' }} className="nav-link">
                        {quickLoansLabel}
                    </Link>
                    <Link href={aboutUsLink} style={{ transition: 'color 0.3s ease' }} className="nav-link">
                        {aboutUsLabel}
                    </Link>
                    <Link href={contactUsLink} style={{ transition: 'color 0.3s ease' }} className="nav-link">
                        {contactUsLabel}
                    </Link>
                    <Link href={advisorRegistrationLink} className="btn btn-primary">
                        {advisorRegistrationLabel}
                    </Link>
                    <Link href={advisorLoginLink} className="btn btn-secondary">
                        {advisorLoginLabel}
                    </Link>
                </nav>
            </div>
        </header >
    );
}
