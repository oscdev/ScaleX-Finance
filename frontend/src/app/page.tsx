import React from 'react';
import Link from 'next/link';
export const dynamic = 'force-dynamic';

import { strapiInternalApi, withStrapiPublicUrl } from '@/lib/strapi';

async function getHomepageData() {
  try {
    const res = await fetch(strapiInternalApi('/api/homepage?populate=*'), {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      // console.error("Failed to fetch homepage data");
      return null;
    }

    const json = await res.json();
    return json.data;
  } catch (error) {
    // console.error("Fetch error:", error);
    return null;
  }
}

function parseBlocks(richtext: any) {
  if (!richtext) return null;
  // If it's a string, just render it as dangerouslySetInnerHTML
  if (typeof richtext === 'string') {
    return <div dangerouslySetInnerHTML={{ __html: richtext }} />;
  }
  return <pre>{JSON.stringify(richtext, null, 2)}</pre>;
}

export default async function Homepage() {
  const data = await getHomepageData();

  // Handle Strapi v4 vs v5 attributes wrapper
  const content = data?.attributes ? data.attributes : data;

  const heroTitle = content?.heroTitle || 'Welcome to ScaleX Finance';
  const heroSubtitle = content?.heroSubtitle || 'The next generation financial platform for advisors and clients.';
  const becomeAnAdvisorText = content?.becomeAnAdvisorButtonText || 'Become an Advisor';
  const becomeAnAdvisorLink = content?.becomeAnAdvisorButtonLink || '/admin/auth/login';
  const applyNowText = content?.applyNowButtonText || 'Apply Now';
  const applyNowLink = content?.applyNowButtonLink || '/products';
  const vpTitle = content?.valuePropositionTitle || 'Why Choose ScaleX?';
  const vpContent = content?.valuePropositionContent || 'Our platform is reliable, fast, and secure. Join thousands who trust us.';
  const vpClientsContent = content?.valuePropositionClientsContent || '<p>Achieve unparalleled financial growth with expert guidance. Access your dashboard anywhere, anytime.</p>';
  const vpSecureContent = content?.valuePropositionSecureContent || '<p>Built with enterprise-ready architecture. Your data is protected with industry-leading security practices.</p>';

  // Media URL extraction (V4 vs V5 handling)
  let bannerUrl = null;
  const bannerObj = content?.heroBanner?.data?.attributes || content?.heroBanner;
  if (bannerObj?.url) {
    bannerUrl = withStrapiPublicUrl(bannerObj.url);
  } else {
    // Fallback beautiful gradient placeholder if no image
    bannerUrl = null;
  }

  return (
    <>
      <section className="hero-section">
        <div className="container animate-fade-in">
          <h1 className="hero-title">{heroTitle}</h1>
          <p className="hero-subtitle delay-100">{heroSubtitle}</p>

          <div className="btn-group delay-200">
            <Link href={applyNowLink} className="btn btn-primary">
              {applyNowText}
            </Link>
            <Link href={becomeAnAdvisorLink} className="btn btn-secondary">
              {becomeAnAdvisorText}
            </Link>
          </div>

          {bannerUrl ? (
            <div className="banner-container delay-300">
              <img src={bannerUrl} alt="Hero Banner" className="banner-image" />
            </div>
          ) : (
            <div className="banner-container delay-300" style={{ height: '400px', background: 'linear-gradient(45deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <h2>Awesome Platform Interface Preview</h2>
            </div>
          )}
        </div>
      </section>

      <section className="value-props-section">
        <div className="container animate-fade-in">
          <h2 className="section-title">{vpTitle}</h2>

          <div className="card-grid">
            <div className="card">
              <h3>For Advisors</h3>
              <div className="rich-text" style={{ marginTop: '1rem' }}>
                {parseBlocks(vpContent)}
              </div>
            </div>

            <div className="card">
              <h3>For Clients</h3>
              <div className="rich-text" style={{ marginTop: '1rem' }}>
                {parseBlocks(vpClientsContent)}
              </div>
            </div>

            <div className="card">
              <h3>Secure & Reliable</h3>
              <div className="rich-text" style={{ marginTop: '1rem' }}>
                {parseBlocks(vpSecureContent)}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
