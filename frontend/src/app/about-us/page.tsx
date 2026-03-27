import React from 'react';
export const dynamic = 'force-dynamic';
import { strapiInternalApi, withStrapiPublicUrl } from '@/lib/strapi';

async function getAboutUsPageData() {
    try {
        const res = await fetch(strapiInternalApi(`/api/about-us-page?populate=*&timestamp=${Date.now()}`), {
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            // console.error("Failed to fetch about-us-page data");
            return null;
        }

        const json = await res.json();
        return json.data;
    } catch (error) {
        // console.error("Fetch error about-us-page:", error);
        return null;
    }
}

function parseBlocks(richtext: any) {
    if (!richtext) return null;
    if (typeof richtext === 'string') {
        return <div dangerouslySetInnerHTML={{ __html: richtext }} />;
    }
    return <pre>{JSON.stringify(richtext, null, 2)}</pre>;
}

export default async function AboutUsPage() {
    const pageResponse = await getAboutUsPageData();

    // Handle Strapi mapping
    let pageInfo: any = {};
    if (pageResponse) {
        // Handle Strapi v4 (attributes) and v5 (flat)
        pageInfo = pageResponse.attributes || pageResponse;
    }

    const heroTitle = pageInfo.heroTitle || 'ScaleX Finance';
    const heroSubtitle = pageInfo.heroSubtitle || 'Innovation. Transparency. Growth.';
    const missionTitle = pageInfo.missionTitle || 'Our Mission';
    const missionContent = pageInfo.missionContent || 'To empower financial advisors with modern tools.';
    const visionTitle = pageInfo.visionTitle || 'Our Vision';
    const visionContent = pageInfo.visionContent || 'To create a world where every business has access to fair credit.';

    let bannerUrl = null;
    const bannerObj = pageInfo.heroBanner?.data?.attributes || pageInfo.heroBanner;
    if (bannerObj?.url) {
        bannerUrl = withStrapiPublicUrl(bannerObj.url);
    }

    return (
        <main style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff' }}>
            {/* Hero Section */}
            <section style={{
                padding: '12rem 0 8rem 0',
                background: 'radial-gradient(circle at top right, rgba(59, 130, 246, 0.1), transparent 50%), radial-gradient(circle at bottom left, rgba(147, 51, 234, 0.1), transparent 50%)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div className="container animate-fade-in text-center">
                    <h1 style={{ fontSize: '4rem', fontWeight: 900, marginBottom: '2rem', background: 'linear-gradient(to right, #fff, rgba(255,255,255,0.7))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {heroTitle}
                    </h1>
                    <p style={{ fontSize: '1.25rem', color: 'rgba(255,255,255,0.8)', maxWidth: '800px', margin: '0 auto', lineHeight: '1.8' }}>
                        {heroSubtitle}
                    </p>
                </div>

                {/* Decorative Elements */}
                <div style={{ position: 'absolute', top: '10%', left: '5%', width: '300px', height: '300px', background: 'var(--primary)', filter: 'blur(150px)', opacity: 0.1, zIndex: 0 }}></div>
            </section>

            {/* Mission & Vision Cards */}
            <section style={{ padding: '4rem 0' }}>
                <div className="container">
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: '3rem',
                        marginTop: '-4rem'
                    }}>
                        <div className="card animate-fade-in delay-100" style={{ padding: '3rem', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '1.5rem' }}>🎯</div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--primary)' }}>{missionTitle}</h3>
                            <p style={{ opacity: 0.8, lineHeight: '1.6' }}>{missionContent}</p>
                        </div>

                        <div className="card animate-fade-in delay-200" style={{ padding: '3rem', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '1.5rem' }}>🔭</div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--secondary)' }}>{visionTitle}</h3>
                            <p style={{ opacity: 0.8, lineHeight: '1.6' }}>{visionContent}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Main Content Section */}
            <section style={{ padding: '6rem 0 10rem 0' }}>
                <div className="container">
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        {bannerUrl && (
                            <img
                                src={bannerUrl}
                                alt="About Us Banner"
                                style={{
                                    width: '100%',
                                    borderRadius: '2rem',
                                    marginBottom: '4rem',
                                    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}
                            />
                        )}

                        <div className="rich-text animate-fade-in delay-300" style={{
                            fontSize: '1.15rem',
                            lineHeight: '2',
                            opacity: 0.9,
                            color: '#e5e7eb'
                        }}>
                            {pageInfo.content ? parseBlocks(pageInfo.content) : (
                                <p style={{ textAlign: 'center', fontStyle: 'italic', opacity: 0.5 }}>
                                    Main content will appear here once published in Strapi.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
