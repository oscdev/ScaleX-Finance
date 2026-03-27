'use client';

import React, { useState } from 'react';

export default function ContactForm() {
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('submitting');
        
        // Simulate API call
        setTimeout(() => {
            setStatus('success');
            setFormData({ name: '', email: '', subject: '', message: '' });
        }, 1500);
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '1rem 1.25rem',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '0.75rem',
        color: '#fff',
        fontSize: '1rem',
        transition: 'all 0.3s ease',
        marginBottom: '1.5rem',
        outline: 'none'
    };

    const labelStyle: React.CSSProperties = {
        display: 'block',
        marginBottom: '0.5rem',
        fontSize: '0.9rem',
        fontWeight: 500,
        opacity: 0.8
    };

    if (status === 'success') {
        return (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🎉</div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Message Sent!</h3>
                <p style={{ opacity: 0.7 }}>Thank you for reaching out. Our team will contact you soon.</p>
                <button 
                    onClick={() => setStatus('idle')}
                    style={{ marginTop: '2rem', background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}
                >
                    Send another message
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                    <label style={labelStyle}>Full Name</label>
                    <input 
                        type="text" 
                        name="name" 
                        placeholder="John Doe" 
                        required 
                        value={formData.name}
                        onChange={handleChange}
                        style={inputStyle} 
                    />
                </div>
                <div>
                    <label style={labelStyle}>Email Address</label>
                    <input 
                        type="email" 
                        name="email" 
                        placeholder="john@example.com" 
                        required 
                        value={formData.email}
                        onChange={handleChange}
                        style={inputStyle} 
                    />
                </div>
            </div>

            <div>
                <label style={labelStyle}>Subject</label>
                <input 
                    type="text" 
                    name="subject" 
                    placeholder="How can we help?" 
                    required 
                    value={formData.subject}
                    onChange={handleChange}
                    style={inputStyle} 
                />
            </div>

            <div>
                <label style={labelStyle}>Message</label>
                <textarea 
                    name="message" 
                    rows={5} 
                    placeholder="Tell us about your requirements..." 
                    required 
                    value={formData.message}
                    onChange={handleChange}
                    style={{ ...inputStyle, resize: 'none' }}
                ></textarea>
            </div>

            <button 
                type="submit" 
                disabled={status === 'submitting'}
                className="btn btn-primary" 
                style={{ 
                    width: '100%', 
                    padding: '1.25rem', 
                    fontSize: '1.1rem', 
                    fontWeight: 700,
                    cursor: status === 'submitting' ? 'not-allowed' : 'pointer',
                    opacity: status === 'submitting' ? 0.7 : 1
                }}
            >
                {status === 'submitting' ? 'Sending...' : 'Send Message'}
            </button>
        </form>
    );
}
