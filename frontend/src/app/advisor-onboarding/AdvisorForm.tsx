'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { logEvent } from '@/lib/logger';
import { strapiPublicApi, withStrapiPublicUrl } from '@/lib/strapi';
import Link from 'next/link';

export default function AdvisorForm({ pageInfo }: { pageInfo: any }) {
    const router = useRouter();

    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phoneNumber: '',
        password: '',
        state: '',
        district: '',
        pinCode: '',
        license: '',
        panNumber: '',
        specialization: '',
        bankAccountNumber: '',
        ifscCode: '',
        bankName: ''
    });

    const [errors, setErrors] = useState<any>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        if (errors[name]) {
            setErrors((prev: any) => ({ ...prev, [name]: undefined }));
        }
    };

    const validateStep = (step: number) => {
        const newErrors: any = {};

        if (step === 1) {
            if (!formData.fullName.trim()) newErrors.fullName = 'Full Name is required';
            if (!formData.email) {
                newErrors.email = 'Email Address is required';
            } else if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(formData.email)) {
                newErrors.email = 'Invalid email address';
            }
            if (!formData.phoneNumber) {
                newErrors.phoneNumber = 'Phone Number is required';
            } else if (!/^\+?\d{10,14}$/.test(formData.phoneNumber.replace(/[\s-]/g, ''))) {
                newErrors.phoneNumber = 'Valid phone number is required';
            }
            if (!formData.password) newErrors.password = 'Password is required';
            if (!formData.state) newErrors.state = 'State is required';
            if (!formData.district) newErrors.district = 'District is required';
            if (!formData.pinCode) {
                newErrors.pinCode = 'Pin Code is required';
            } else if (!/^\d{6}$/.test(formData.pinCode)) {
                newErrors.pinCode = 'Invalid Pin Code (6 digits required)';
            }
        } else if (step === 2) {
            // license is optional
            if (!formData.panNumber.trim()) newErrors.panNumber = 'PAN Number is required';
            if (!formData.specialization.trim()) newErrors.specialization = 'Specialization is required';
        } else if (step === 3) {
            if (!formData.bankAccountNumber.trim()) newErrors.bankAccountNumber = 'Bank Account Number is required';
            if (!formData.ifscCode.trim()) newErrors.ifscCode = 'IFSC Code is required';
            if (!formData.bankName.trim()) newErrors.bankName = 'Bank Name is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const nextStep = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const prevStep = () => {
        setCurrentStep(prev => prev - 1);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (currentStep !== 3) return; // Prevent enter key submitting form prematurely

        setSubmitError(null);

        if (validateStep(3)) {
            setIsSubmitting(true);

            try {
                const res = await fetch('/api/advisors', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data: formData })
                });

                if (!res.ok) {
                    const errorData = await res.json();
                    const failMsg = errorData?.error?.message || 'Failed to submit registration';

                    await logEvent({
                        action: 'ADVISOR_REGISTRATION_FAILURE',
                        description: `Advisor registration failed for ${formData.email}`,
                        severity: 'warning',
                        metadata: { email: formData.email, error: failMsg }
                    });

                    throw new Error(failMsg);
                }

                await logEvent({
                    action: 'ADVISOR_REGISTRATION_SUCCESS',
                    description: `New advisor registration submitted: ${formData.fullName}`,
                    severity: 'info',
                    metadata: { email: formData.email }
                });

                setIsSuccess(true);
            } catch (err: any) {
                // console.error('Registration Error:', err);
                let errorMessage = err.message || 'An unexpected error occurred. Please try again later.';
                if (errorMessage.toLowerCase().includes('must be unique')) {
                    errorMessage = 'This email is already registered.';
                }
                setSubmitError(errorMessage);
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const pi = pageInfo || {};
    const logoImage = pi.logoImage || {};
    const heroTitle = pi.heroTitle || "Become a Partner";
    const heroSubtitle = pi.heroSubtitle || "Join Scalex Finance and start earning commissions";
    const step1Label = pi.step1Label || "Basic Info";
    const step2Label = pi.step2Label || "Professional";
    const step3Label = pi.step3Label || "Payout";
    const fullNameLabel = pi.fullNameLabel || "Full Name";
    const fullNamePlaceholder = pi.fullNamePlaceholder || "John Doe";
    const emailLabel = pi.emailLabel || "Email Address";
    const emailPlaceholder = pi.emailPlaceholder || "john@example.com";
    const phoneNumberLabel = pi.phoneNumberLabel || "Phone Number";
    const phoneNumberPlaceholder = pi.phoneNumberPlaceholder || "+91 98765 43210";
    const passwordLabel = pi.passwordLabel || "Create Password";
    const passwordPlaceholder = pi.passwordPlaceholder || "********";
    const stateLabel = pi.stateLabel || "State";
    const statePlaceholder = pi.statePlaceholder || "Maharashtra";
    const districtLabel = pi.districtLabel || "District";
    const districtPlaceholder = pi.districtPlaceholder || "Mumbai";
    const pinCodeLabel = pi.pinCodeLabel || "Pin Code";
    const pinCodePlaceholder = pi.pinCodePlaceholder || "400001";
    const licenseLabel = pi.licenseLabel || "Professional License (Optional)";
    const licensePlaceholder = pi.licensePlaceholder || "CA/CS/ARN Number";
    const panLabel = pi.panLabel || "PAN Number";
    const panPlaceholder = pi.panPlaceholder || "ABCDE1234F";
    const specializationLabel = pi.specializationLabel || "Specialization";
    const specializationOptions = pi.specializationOptions || "Lending,Wealth Management,Insurance";
    const payoutAlertText = pi.payoutAlertText || "We need your bank details to process your commission payouts. You can update this later.";
    const bankAccountLabel = pi.bankAccountLabel || "Bank Account Number";
    const bankAccountPlaceholder = pi.bankAccountPlaceholder || "1234567890";
    const ifscLabel = pi.ifscLabel || "IFSC Code";
    const ifscPlaceholder = pi.ifscPlaceholder || "HDFC0001234";
    const bankNameLabel = pi.bankNameLabel || "Bank Name";
    const bankNamePlaceholder = pi.bankNamePlaceholder || "HDFC Bank";
    const nextButtonText = pi.nextButtonText || "Next Step";
    const backButtonText = pi.backButtonText || "Back";
    const submitButtonText = pi.submitButtonText || "Submit Application";
    const signInPromptText = pi.signInPromptText || "Already have an account?";
    const signInLinkText = pi.signInLinkText || "Sign in";
    const successTitle = pi.successTitle || "Registration Successful!";
    const successMessage = pi.successMessage || "Welcome! Our team will review your application shortly.";
    const returnHomeButtonText = pi.returnHomeButtonText || "Return Home";

    const logoImageUrl = logoImage?.url || logoImage?.data?.attributes?.url;
    const fullLogoUrl = logoImageUrl ? withStrapiPublicUrl(logoImageUrl) : null;

    if (isSuccess) {
        return (
            <section className="form-section" style={{ minHeight: '60vh', paddingBottom: '4rem', paddingTop: '4rem' }}>
                <div className="container animate-fade-in delay-200" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
                    <div className="card" style={{ padding: '4rem 2rem', background: 'var(--background)', borderRadius: '12px' }}>
                        <div style={{ color: 'var(--primary)', marginBottom: '1.5rem', fontSize: '3rem' }}>✓</div>
                        <h2 style={{ marginBottom: '1rem', color: 'var(--foreground)' }}>{successTitle}</h2>
                        <p style={{ opacity: 0.8, marginBottom: '2rem' }}>{successMessage}</p>
                        <button
                            className="btn btn-primary"
                            onClick={() => router.push('/')}
                        >
                            {returnHomeButtonText}
                        </button>
                    </div>
                </div>
            </section>
        );
    }

    const inputStyle = {
        width: '100%',
        padding: '0.8rem 1rem 0.8rem 2.8rem',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        background: 'transparent',
        color: 'var(--foreground)',
        fontSize: '0.95rem',
        marginTop: '0.5rem',
        marginBottom: '0.25rem',
        outline: 'none',
        transition: 'border-color 0.3s ease'
    };

    // For selects without icons or just standard padding
    const selectStyle = {
        ...inputStyle,
        padding: '0.8rem 1rem',
        appearance: 'none',
        backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23999%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E")',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 1rem top 50%',
        backgroundSize: '0.65em auto',
    };

    const labelStyle = {
        fontWeight: 600,
        fontSize: '0.9rem',
        color: 'var(--foreground)',
        display: 'block',
        marginTop: '1.25rem'
    };

    const errorStyle = {
        color: 'var(--secondary)',
        fontSize: '0.8rem',
        marginTop: '0.2rem'
    };

    const steps = [
        { num: 1, label: step1Label },
        { num: 2, label: step2Label },
        { num: 3, label: step3Label },
    ];

    const iconStyle = {
        position: 'absolute' as const,
        left: '1rem',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '18px',
        height: '18px',
        color: 'gray',
        opacity: 0.6,
        pointerEvents: 'none' as const,
        marginTop: '0.15rem'
    };

    return (
        <section style={{
            minHeight: '80vh',
            paddingBottom: '4rem',
            background: 'var(--background)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: '2rem'
        }}>

            {/* Header Content */}
            <div style={{ textAlign: 'center', marginBottom: '2rem', marginTop: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                    {fullLogoUrl ? (
                        <img src={fullLogoUrl} alt="Logo" style={{ height: '48px', objectFit: 'contain' }} />
                    ) : (
                        <div style={{
                            background: 'var(--primary)',
                            color: 'white',
                            width: '48px',
                            height: '48px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '8px',
                            fontSize: '1.75rem',
                            fontWeight: 'bold',
                            fontFamily: 'var(--font-display)'
                        }}>
                            S
                        </div>
                    )}
                </div>

                <h1 style={{
                    fontSize: '2rem',
                    fontWeight: 800,
                    color: 'var(--foreground)',
                    marginBottom: '0.5rem',
                    fontFamily: 'var(--font-sans)',
                    letterSpacing: '-0.02em'
                }}>
                    {heroTitle}
                </h1>

                <p style={{ color: 'var(--foreground)', opacity: 0.7, fontSize: '0.95rem' }}>
                    {heroSubtitle}
                </p>
            </div>

            <div className="container animate-fade-in delay-200" style={{ maxWidth: '600px', width: '100%', margin: '0 auto' }}>
                <div className="card" style={{
                    padding: '2.5rem',
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}>

                    {/* Stepper Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2.5rem', padding: '0 1rem', position: 'relative' }}>
                        {/* Connecting Line */}
                        <div style={{
                            position: 'absolute',
                            top: '16px',
                            left: '10%',
                            right: '10%',
                            height: '2px',
                            background: 'var(--border-color)',
                            zIndex: 0
                        }} />

                        {steps.map(step => {
                            const isActive = currentStep === step.num;
                            const isCompleted = currentStep > step.num;

                            return (
                                <div key={step.num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, isolation: 'isolate' }}>
                                    <div style={{
                                        width: '32px', height: '32px',
                                        borderRadius: '50%',
                                        background: isCompleted || isActive ? 'var(--primary)' : 'var(--background)',
                                        border: isCompleted || isActive ? 'none' : '2px solid var(--border-color)',
                                        color: isCompleted || isActive ? 'white' : 'var(--foreground)',
                                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                                        marginBottom: '0.5rem',
                                        fontSize: '0.9rem',
                                        fontWeight: 600,
                                        transition: 'all 0.3s'
                                    }}>
                                        {isCompleted ? (
                                            <svg width="14" height="10" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M1 5L5 9L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        ) : step.num}
                                    </div>
                                    <span style={{
                                        fontSize: '0.8rem',
                                        fontWeight: 500,
                                        color: isActive || isCompleted ? 'var(--foreground)' : 'var(--foreground)',
                                        opacity: isActive || isCompleted ? 1 : 0.6
                                    }}>
                                        {step.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {submitError && currentStep === 3 && (
                        <div style={{ padding: '1rem', background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                            {submitError}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>

                        {/* STEP 1: Basic Info */}
                        {currentStep === 1 && (
                            <div className="animate-fade-in">
                                <div>
                                    <label style={labelStyle}>{fullNameLabel}</label>
                                    <div style={{ position: 'relative' }}>
                                        <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="12" cy="7" r="4"></circle>
                                        </svg>
                                        <input
                                            style={{ ...inputStyle, borderColor: errors.fullName ? 'var(--secondary)' : 'var(--border-color)' }}
                                            type="text" name="fullName" placeholder={fullNamePlaceholder}
                                            value={formData.fullName} onChange={handleChange}
                                        />
                                    </div>
                                    {errors.fullName && <div style={errorStyle}>{errors.fullName}</div>}
                                </div>

                                <div>
                                    <label style={labelStyle}>{emailLabel}</label>
                                    <div style={{ position: 'relative' }}>
                                        <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                            <polyline points="22,6 12,13 2,6"></polyline>
                                        </svg>
                                        <input
                                            style={{ ...inputStyle, borderColor: errors.email ? 'var(--secondary)' : 'var(--border-color)' }}
                                            type="email" name="email" placeholder={emailPlaceholder}
                                            value={formData.email} onChange={handleChange}
                                        />
                                    </div>
                                    {errors.email && <div style={errorStyle}>{errors.email}</div>}
                                </div>

                                <div>
                                    <label style={labelStyle}>{passwordLabel}</label>
                                    <div style={{ position: 'relative' }}>
                                        <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                        </svg>
                                        <input
                                            style={{ ...inputStyle, borderColor: errors.password ? 'var(--secondary)' : 'var(--border-color)' }}
                                            type="password" name="password" placeholder={passwordPlaceholder}
                                            value={formData.password} onChange={handleChange}
                                        />
                                    </div>
                                    {errors.password && <div style={errorStyle}>{errors.password}</div>}
                                </div>

                                <div>
                                    <label style={labelStyle}>{phoneNumberLabel}</label>
                                    <div style={{ position: 'relative' }}>
                                        <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                        </svg>
                                        <input
                                            style={{ ...inputStyle, borderColor: errors.phoneNumber ? 'var(--secondary)' : 'var(--border-color)' }}
                                            type="tel" name="phoneNumber" placeholder={phoneNumberPlaceholder}
                                            value={formData.phoneNumber} onChange={handleChange}
                                        />
                                    </div>
                                    {errors.phoneNumber && <div style={errorStyle}>{errors.phoneNumber}</div>}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={labelStyle}>{stateLabel}</label>
                                        <div style={{ position: 'relative' }}>
                                            <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                                <circle cx="12" cy="10" r="3"></circle>
                                            </svg>
                                            <input
                                                style={{ ...inputStyle, borderColor: errors.state ? 'var(--secondary)' : 'var(--border-color)' }}
                                                type="text" name="state" placeholder={statePlaceholder}
                                                value={formData.state} onChange={handleChange}
                                            />
                                        </div>
                                        {errors.state && <div style={errorStyle}>{errors.state}</div>}
                                    </div>
                                    <div>
                                        <label style={labelStyle}>{districtLabel}</label>
                                        <div style={{ position: 'relative' }}>
                                            <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="12" cy="12" r="10"></circle>
                                                <line x1="2" y1="12" x2="22" y2="12"></line>
                                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                                            </svg>
                                            <input
                                                style={{ ...inputStyle, borderColor: errors.district ? 'var(--secondary)' : 'var(--border-color)' }}
                                                type="text" name="district" placeholder={districtPlaceholder}
                                                value={formData.district} onChange={handleChange}
                                            />
                                        </div>
                                        {errors.district && <div style={errorStyle}>{errors.district}</div>}
                                    </div>
                                </div>

                                <div>
                                    <label style={labelStyle}>{pinCodeLabel}</label>
                                    <div style={{ position: 'relative' }}>
                                        <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                            <circle cx="12" cy="10" r="3"></circle>
                                        </svg>
                                        <input
                                            style={{ ...inputStyle, borderColor: errors.pinCode ? 'var(--secondary)' : 'var(--border-color)' }}
                                            type="text" name="pinCode" placeholder={pinCodePlaceholder}
                                            value={formData.pinCode} onChange={handleChange}
                                        />
                                    </div>
                                    {errors.pinCode && <div style={errorStyle}>{errors.pinCode}</div>}
                                </div>
                            </div>
                        )}

                        {/* STEP 2: Professional */}
                        {currentStep === 2 && (
                            <div className="animate-fade-in">
                                <div style={{ position: 'relative' }}>
                                    <label style={labelStyle}>{licenseLabel}</label>
                                    <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                    </svg>
                                    <input
                                        style={{ ...inputStyle, borderColor: errors.license ? 'var(--secondary)' : 'var(--border-color)' }}
                                        type="text" name="license" placeholder={licensePlaceholder}
                                        value={formData.license} onChange={handleChange}
                                    />
                                </div>

                                <div style={{ position: 'relative' }}>
                                    <label style={labelStyle}>{panLabel}</label>
                                    <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                        <polyline points="14 2 14 8 20 8"></polyline>
                                        <line x1="16" y1="13" x2="8" y2="13"></line>
                                        <line x1="16" y1="17" x2="8" y2="17"></line>
                                        <polyline points="10 9 9 9 8 9"></polyline>
                                    </svg>
                                    <input
                                        type="text" name="panNumber" placeholder={panPlaceholder}
                                        value={formData.panNumber} onChange={handleChange}
                                        style={{ ...inputStyle, borderColor: errors.panNumber ? 'var(--secondary)' : 'var(--border-color)', textTransform: 'uppercase' }}
                                    />
                                    {errors.panNumber && <div style={errorStyle}>{errors.panNumber}</div>}
                                </div>

                                <div>
                                    <label style={labelStyle}>{specializationLabel}</label>
                                    <select
                                        style={{ ...selectStyle as React.CSSProperties, borderColor: errors.specialization ? 'var(--secondary)' : 'var(--border-color)', color: formData.specialization ? 'var(--foreground)' : 'gray' }}
                                        name="specialization"
                                        value={formData.specialization} onChange={handleChange}
                                    >
                                        <option value="" disabled hidden>Select Specialization</option>
                                        {specializationOptions.split(',').map((opt: string) => (
                                            <option key={opt.trim()} value={opt.trim()} style={{ color: '#000' }}>{opt.trim()}</option>
                                        ))}
                                    </select>
                                    {errors.specialization && <div style={errorStyle}>{errors.specialization}</div>}
                                </div>
                            </div>
                        )}

                        {/* STEP 3: Payout */}
                        {currentStep === 3 && (
                            <div className="animate-fade-in">
                                <div style={{
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    border: '1px solid rgba(59, 130, 246, 0.2)',
                                    borderRadius: '8px',
                                    padding: '1rem',
                                    display: 'flex',
                                    gap: '1rem',
                                    alignItems: 'flex-start',
                                    marginBottom: '1.5rem',
                                    color: 'var(--primary)',
                                    fontSize: '0.9rem',
                                    lineHeight: 1.5
                                }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                        <line x1="3" y1="9" x2="21" y2="9"></line>
                                        <line x1="9" y1="21" x2="9" y2="9"></line>
                                    </svg>
                                    <div>{payoutAlertText}</div>
                                </div>

                                <div style={{ position: 'relative' }}>
                                    <label style={labelStyle}>{bankAccountLabel}</label>
                                    <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect>
                                        <line x1="2" y1="10" x2="22" y2="10"></line>
                                    </svg>
                                    <input
                                        style={{ ...inputStyle, borderColor: errors.bankAccountNumber ? 'var(--secondary)' : 'var(--border-color)' }}
                                        type="text" name="bankAccountNumber" placeholder={bankAccountPlaceholder}
                                        value={formData.bankAccountNumber} onChange={handleChange}
                                    />
                                    {errors.bankAccountNumber && <div style={errorStyle}>{errors.bankAccountNumber}</div>}
                                </div>

                                <div>
                                    <label style={labelStyle}>{ifscLabel}</label>
                                    <input
                                        style={{ ...inputStyle, paddingLeft: '1rem', borderColor: errors.ifscCode ? 'var(--secondary)' : 'var(--border-color)' }}
                                        type="text" name="ifscCode" placeholder={ifscPlaceholder}
                                        value={formData.ifscCode} onChange={handleChange}
                                    />
                                    {errors.ifscCode && <div style={errorStyle}>{errors.ifscCode}</div>}
                                </div>

                                <div>
                                    <label style={labelStyle}>{bankNameLabel}</label>
                                    <input
                                        style={{ ...inputStyle, paddingLeft: '1rem', borderColor: errors.bankName ? 'var(--secondary)' : 'var(--border-color)' }}
                                        type="text" name="bankName" placeholder={bankNamePlaceholder}
                                        value={formData.bankName} onChange={handleChange}
                                    />
                                    {errors.bankName && <div style={errorStyle}>{errors.bankName}</div>}
                                </div>
                            </div>
                        )}

                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '2.5rem',
                        }}>
                            {currentStep > 1 ? (
                                <button
                                    type="button"
                                    onClick={prevStep}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--foreground)',
                                        cursor: 'pointer',
                                        fontSize: '0.95rem',
                                        fontWeight: 500,
                                        opacity: 0.8
                                    }}
                                >
                                    {backButtonText}
                                </button>
                            ) : <div></div>}

                            {currentStep < 3 ? (
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={nextStep}
                                    style={{ padding: '0.6rem 1.5rem', fontSize: '0.95rem', borderRadius: '6px' }}
                                >
                                    {nextButtonText} &rarr;
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={isSubmitting}
                                    style={{
                                        padding: '0.6rem 1.5rem',
                                        fontSize: '0.95rem',
                                        borderRadius: '6px',
                                        opacity: isSubmitting ? 0.7 : 1,
                                        cursor: isSubmitting ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {isSubmitting ? 'Submitting...' : submitButtonText}
                                </button>
                            )}
                        </div>

                    </form>
                </div>

                {/* Footer Sign In Link */}
                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                    <p style={{ color: 'var(--foreground)', opacity: 0.8, fontSize: '0.9rem' }}>
                        {signInPromptText}{" "}
                        <a href="/admin/auth/login" style={{ color: 'var(--primary)', fontWeight: 500, textDecoration: 'none' }}>
                            {signInLinkText}
                        </a>
                    </p>
                </div>
            </div>
        </section>
    );
}
