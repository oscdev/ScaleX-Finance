import React from 'react';
import ContactForm from './ContactForm';
import './ContactForm.css';

export default function ContactUsPage() {
    const heroTitle = 'Get in Touch';
    const heroSubtitle = 'We are here to help you with your financial journey.';
    const email = 'support@scalexfinance.com';
    const phone = '+91 1800 123 4567';
    const address = 'Mumbai, India';

    return (
        <main className="contact-page">
            <div className="container animate-fade-in">
                <div className="contact-hero">
                    <h1 className="contact-hero-title">
                        {heroTitle}
                    </h1>
                    <p className="contact-hero-subtitle">
                        {heroSubtitle}
                    </p>
                </div>

                <div className="contact-layout-grid">
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
                    </div>

                    <div className="card contact-form-card">
                        <h2 className="contact-form-title">Send a Message</h2>
                        <p className="contact-form-subtitle">We usually respond within a few hours.</p>

                        <ContactForm />
                    </div>
                </div>
            </div>
        </main>
    );
}
