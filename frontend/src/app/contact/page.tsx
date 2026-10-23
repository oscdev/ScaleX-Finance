import React from 'react';
export const dynamic = 'force-dynamic';
import { strapiInternalApi, withStrapiPublicUrl } from '@/lib/strapi';
import ContactForm from './ContactForm';
import './ContactForm.css';

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
        <main className="contact-page">
            <div className="container animate-fade-in">
                {/* Hero Header */}
                <div className="contact-hero">
                    <h1 className="contact-hero-title">
                        {heroTitle}
                    </h1>
                    <p className="contact-hero-subtitle">
                        {heroSubtitle}
                    </p>
                </div>

                <div className="contact-layout-grid">
                    {/* Contact Info Sidebar */}
                    <div className="contact-info-sidebar">
                        <div className="card contact-info-card">
                            <h3 className="contact-info-heading">Contact Information</h3>

                            <div className="contact-info-list">
                                <div className="contact-info-row">
                                    <div className="contact-info-icon">📧</div>
                                    <div>
                                        <p className="contact-info-label">Email Us</p>
                                        <p className="contact-info-value">{email}</p>
                                    </div>
                                </div>
                                <div className="contact-info-row">
                                    <div className="contact-info-icon">📞</div>
                                    <div>
                                        <p className="contact-info-label">Call Us</p>
                                        <p className="contact-info-value">{phone}</p>
                                    </div>
                                </div>
                                <div className="contact-info-row">
                                    <div className="contact-info-icon">📍</div>
                                    <div>
                                        <p className="contact-info-label">Visit Us</p>
                                        <p className="contact-info-value">{address}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Map Embed Container */}
                        {mapUrl && (
                            <div className="contact-map-container">
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
                    <div className="card contact-form-card">
                        <h2 className="contact-form-title">{pageInfo?.contactFormTitle || 'Send a Message'}</h2>
                        <p className="contact-form-subtitle">{pageInfo?.contactFormSubtitle || 'We usually respond within a few hours.'}</p>

                        <ContactForm />
                    </div>
                </div>
            </div>
        </main>
    );
}
