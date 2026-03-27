import React from 'react';
export const dynamic = 'force-dynamic';
import { strapiInternalApi, withStrapiPublicUrl } from '@/lib/strapi';
import ContactForm from './ContactForm';

async function getContactUsPageData() {
    try {
        const res = await fetch(strapiInternalApi(`/api/contact-us-page?populate=*&timestamp=${Date.now()}`), {
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            // console.error("Failed to fetch contact-us-page data");
            return null;
        }

        const json = await res.json();
        return json.data;
    } catch (error) {
        // console.error("Fetch error contact-us-page:", error);
        return null;
    }
}

export default async function ContactUsPage() {
    // console.log("[ContactUsPage] Rendering started");
    let pageResponse = null;
    try {
        pageResponse = await getContactUsPageData();
        // console.log("[ContactUsPage] Fetch success:", !!pageResponse);
    } catch (err) {
        // console.error("[ContactUsPage] Runtime crash during fetch:", err);
    }

    // Handle Strapi mapping
    let pageInfo: any = {};
    try {
        if (pageResponse) {
            // Handle Strapi v4 (attributes) and v5 (flat)
            pageInfo = pageResponse.attributes || pageResponse;
        }
    } catch (err) {
        // console.error("[ContactUsPage] Mapping error:", err);
    }

    const heroTitle = pageInfo?.heroTitle || 'Get in Touch';
    const heroSubtitle = pageInfo?.heroSubtitle || 'We are here to help you with your financial journey.';
    const email = pageInfo?.email || 'support@scalexfinance.com';
    const phone = pageInfo?.phone || '+91 1800 123 4567';
    const address = pageInfo?.address || 'Mumbai, India';
    const mapUrl = pageInfo?.googleMapUrl;

    let bannerUrl = null;
    const bannerObj = pageInfo?.heroBanner?.data?.attributes || pageInfo?.heroBanner;
    if (bannerObj?.url) {
        bannerUrl = withStrapiPublicUrl(bannerObj.url);
    }

    return (
        <main style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', paddingTop: '8rem' }}>
            <div className="container animate-fade-in">
                {/* Hero Header */}
                <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
                    <h1 style={{ fontSize: '3.5rem', fontWeight: 900, marginBottom: '1.5rem', background: 'linear-gradient(to right, #fff, rgba(255,255,255,0.6))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {heroTitle}
                    </h1>
                    <p style={{ fontSize: '1.15rem', color: 'rgba(255,255,255,0.7)', maxWidth: '600px', margin: '0 auto' }}>
                        {heroSubtitle}
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '4rem', marginBottom: '6rem' }}>
                    {/* Contact Info Sidebar */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div className="card" style={{ padding: '2.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '2rem', color: 'var(--primary)' }}>Contact Information</h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                    <div style={{ fontSize: '1.5rem' }}>📧</div>
                                    <div>
                                        <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Email Us</p>
                                        <p style={{ opacity: 0.7 }}>{email}</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                    <div style={{ fontSize: '1.5rem' }}>📞</div>
                                    <div>
                                        <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Call Us</p>
                                        <p style={{ opacity: 0.7 }}>{phone}</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                    <div style={{ fontSize: '1.5rem' }}>📍</div>
                                    <div>
                                        <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Visit Us</p>
                                        <p style={{ opacity: 0.7 }}>{address}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Map Embed Container */}
                        {mapUrl && (
                            <div style={{
                                height: '300px',
                                border: '1px solid rgba(255,255,255,0.05)',
                                borderRadius: '1.5rem',
                                overflow: 'hidden',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
                            }}>
                                <iframe
                                    src={mapUrl}
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0 }}
                                    allowFullScreen
                                    loading="lazy"
                                ></iframe>
                            </div>
                        )}
                    </div>

                    {/* Contact Form Container */}
                    <div className="card" style={{ padding: '3rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '2rem', backdropFilter: 'blur(20px)' }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem' }}>{pageInfo?.contactFormTitle || 'Send a Message'}</h2>
                        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2.5rem' }}>{pageInfo?.contactFormSubtitle || 'We usually respond within a few hours.'}</p>

                        <ContactForm />
                    </div>
                </div>
            </div>
        </main>
    );
}
