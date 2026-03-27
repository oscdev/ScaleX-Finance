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
        <footer style={{
            background: 'var(--background)',
            borderTop: '1px solid var(--border-color)',
            padding: '4rem 0 2rem 0',
            marginTop: 'auto'
        }}>
            <div className="container">
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    gap: '3rem',
                    marginBottom: '3rem'
                }}>

                    {/* Brand Section */}
                    <div style={{ flex: '1 1 300px', maxWidth: '400px' }}>
                        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700, fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: '1rem' }}>
                            {fullLogoUrl ? (
                                <img src={fullLogoUrl} alt={logoText} style={{ height: '40px', objectFit: 'contain' }} />
                            ) : (
                                <div style={{ background: 'var(--primary)', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '1.2rem', lineHeight: 1 }}>SX</div>
                            )}
                            {logoText}
                        </Link>
                        <p style={{ opacity: 0.7, fontSize: '0.95rem', lineHeight: 1.6 }}>
                            {description}
                        </p>
                    </div>

                    {/* Links Section */}
                    <div style={{ flex: '1 1 200px' }}>
                        <h4 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>Platform</h4>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <li>
                                <Link href={aboutUsLink} style={{ opacity: 0.8, transition: 'opacity 0.3s ease' }}>
                                    {aboutUsLabel}
                                </Link>
                            </li>
                            <li>
                                <Link href={contactPlatformLink} style={{ opacity: 0.8, transition: 'opacity 0.3s ease' }}>
                                    {contactPlatformLabel}
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <div style={{
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '2rem',
                    textAlign: 'center',
                    opacity: 0.5,
                    fontSize: '0.9rem'
                }}>
                    {copyrightText}
                </div>
            </div>
        </footer>
    );
}
