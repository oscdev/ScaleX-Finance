import React from 'react';
import Link from 'next/link';
import { getStrapiPublicUrl, strapiInternalApi, withStrapiPublicUrl } from '@/lib/strapi';

async function getFooterData() {
    const internalUrl = strapiInternalApi('/api/footer?populate=*');
    const publicBase = getStrapiPublicUrl();
    const publicUrl = publicBase ? `${publicBase}/api/footer?populate=*` : null;

    try {
        const res = await fetch(internalUrl, {
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!res.ok) {
            // console.error("Failed to fetch footer data");
            return null;
        }

        const json = await res.json();
        return json.data;

    } catch (error) {
        // console.error("Fetch footer error:", error);

        if (publicUrl) {
            try {
                const res2 = await fetch(publicUrl, { cache: 'no-store', headers: { 'Content-Type': 'application/json' } });
                if (!res2.ok) {
                    return null;
                }
                const json2 = await res2.json();
                return json2.data;
            } catch (error2) {
            }
        }
        return null;
    }
}

import './Footer.css';

export default async function Footer() {
    const data = await getFooterData();

    let footerInfo: any = {};
    if (data) {
        footerInfo = data.attributes || data;
    }

    // Defaults
    const logoText = footerInfo.logoText || 'ScaleX Finance';
    const logoImageUrl = footerInfo.logoImage?.url || footerInfo.logoImage?.data?.attributes?.url;
    const fullLogoUrl = logoImageUrl ? withStrapiPublicUrl(logoImageUrl) : null;

    const description = footerInfo.description || 'Democratizing complete Investment Banking & Debt services through technology and a trusted agent network.';
    const aboutUsLabel = footerInfo.aboutUsLabel || 'About Us';
    const aboutUsLink = footerInfo.aboutUsLink || '/about-us';
    const contactPlatformLabel = footerInfo.contactPlatformLabel || 'Contact Platform';
    const contactPlatformLink = footerInfo.contactPlatformLink || '/contact';
    const copyrightText = footerInfo.copyrightText || '© 2026 ScaleX Finance. All rights reserved.';

    return (
        <footer className="main-footer">
            <div className="container">
                <div className="footer-content">
                    {/* Brand Section */}
                    <div className="footer-brand">
                        <Link href="/" className="footer-logo">
                            {fullLogoUrl ? (
                                <img src={fullLogoUrl} alt={logoText} className="footer-logo-img" />
                            ) : (
                                <div className="footer-logo-fallback">SX</div>
                            )}
                            {logoText}
                        </Link>
                        <p className="footer-description">
                            {description}
                        </p>
                    </div>

                    {/* Links Section */}
                    <div className="footer-links-section">
                        <h4 className="footer-links-title">Platform</h4>
                        <ul className="footer-links-list">
                            <li>
                                <Link href={aboutUsLink} className="footer-link">
                                    {aboutUsLabel}
                                </Link>
                            </li>
                            <li>
                                <Link href={contactPlatformLink} className="footer-link">
                                    {contactPlatformLabel}
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="footer-bottom">
                    {copyrightText}
                </div>
            </div>
        </footer>
    );
}
