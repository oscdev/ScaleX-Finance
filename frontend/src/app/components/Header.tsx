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

import './Header.css';

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
        <header className="main-header">
            <div className="container header-container">
                <Link href="/" className="header-logo">
                    {fullLogoUrl ? (
                        <img src={fullLogoUrl} alt={logoText} className="header-logo-img" />
                    ) : (
                        <div className="header-logo-fallback">SX</div>
                    )}
                    {logoText}
                </Link>

                <nav className="header-nav">
                    <Link href={homeLink} className="nav-link">
                        {homeLabel}
                    </Link>
                    <Link href={quickLoansLink} className="nav-link">
                        {quickLoansLabel}
                    </Link>
                    <Link href={aboutUsLink} className="nav-link">
                        {aboutUsLabel}
                    </Link>
                    <Link href={contactUsLink} className="nav-link">
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
