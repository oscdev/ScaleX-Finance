import React from 'react';
export const dynamic = 'force-dynamic';
import AdvisorLoginForm from './AdvisorLoginForm';
import './AdvisorLogin.css';

export default function AdvisorLoginPage() {
    return (
        <>
            <section className="hero-section login-hero-section">
                <div className="container animate-fade-in">
                    <h1 className="hero-title login-hero-title">Advisor Login</h1>
                    <p className="hero-subtitle delay-100">Access your advisor dashboard</p>
                </div>
            </section>

            <AdvisorLoginForm />
        </>
    );
}
