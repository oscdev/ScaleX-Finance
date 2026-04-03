'use client';

import React, { useState } from 'react';
import './ContactForm.css';

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

    if (status === 'success') {
        return (
            <div className="contact-success-container">
                <div className="contact-success-icon">🎉</div>
                <h3 className="contact-success-title">Message Sent!</h3>
                <p className="contact-success-description">Thank you for reaching out. Our team will contact you soon.</p>
                <button 
                    onClick={() => setStatus('idle')}
                    className="contact-success-reset"
                >
                    Send another message
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit}>
            <div className="contact-form-grid">
                <div>
                    <label className="contact-form-label">Full Name</label>
                    <input 
                        type="text" 
                        name="name" 
                        placeholder="John Doe" 
                        required 
                        value={formData.name}
                        onChange={handleChange}
                        className="contact-form-input" 
                    />
                </div>
                <div>
                    <label className="contact-form-label">Email Address</label>
                    <input 
                        type="email" 
                        name="email" 
                        placeholder="john@example.com" 
                        required 
                        value={formData.email}
                        onChange={handleChange}
                        className="contact-form-input" 
                    />
                </div>
            </div>

            <div>
                <label className="contact-form-label">Subject</label>
                <input 
                    type="text" 
                    name="subject" 
                    placeholder="How can we help?" 
                    required 
                    value={formData.subject}
                    onChange={handleChange}
                    className="contact-form-input" 
                />
            </div>

            <div>
                <label className="contact-form-label">Message</label>
                <textarea 
                    name="message" 
                    rows={5} 
                    placeholder="Tell us about your requirements..." 
                    required 
                    value={formData.message}
                    onChange={handleChange}
                    className="contact-form-input contact-form-textarea"
                ></textarea>
            </div>

            <button 
                type="submit" 
                disabled={status === 'submitting'}
                className="btn btn-primary contact-form-submit" 
            >
                {status === 'submitting' ? 'Sending...' : 'Send Message'}
            </button>
        </form>
    );
}
