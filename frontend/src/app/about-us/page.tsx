import React from 'react';
import './AboutUs.css';

export default function AboutUsPage() {
    const heroTitle = 'ScaleX Finance';
    const heroSubtitle = 'Innovation. Transparency. Growth.';
    const missionTitle = 'Our Mission';
    const missionContent = 'To empower financial advisors with modern tools.';
    const visionTitle = 'Our Vision';
    const visionContent = 'To create a world where every business has access to fair credit.';

    return (
        <main className="about-us-main">
            <section className="about-us-hero">
                <div className="container animate-fade-in text-center">
                    <h1 className="about-us-title">
                        {heroTitle}
                    </h1>
                    <p className="about-us-subtitle">
                        {heroSubtitle}
                    </p>
                </div>

                <div className="about-us-blob"></div>
            </section>

            <section className="mv-section">
                <div className="container">
                    <div className="mv-grid">
                        <div className="card mv-card animate-fade-in delay-100">
                            <div className="mv-icon">🎯</div>
                            <h3 className="mv-title mv-title-primary">{missionTitle}</h3>
                            <p className="mv-content">{missionContent}</p>
                        </div>

                        <div className="card mv-card animate-fade-in delay-200">
                            <div className="mv-icon">🔭</div>
                            <h3 className="mv-title mv-title-secondary">{visionTitle}</h3>
                            <p className="mv-content">{visionContent}</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="content-section">
                <div className="container">
                    <div className="content-container">
                        <div className="rich-text about-us-rich-text animate-fade-in delay-300">
                            <p className="content-placeholder">
                                Main content will appear here once published in Strapi.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
