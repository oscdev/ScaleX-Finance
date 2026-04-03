'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { logEvent } from '@/lib/logger';
import { strapiPublicApi, withStrapiPublicUrl } from '@/lib/strapi';
import Link from 'next/link';
import './AdvisorOnboarding.css';

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
            <section className="form-section onboarding-success-section">
                <div className="container onboarding-success-container animate-fade-in delay-200">
                    <div className="card onboarding-card text-center">
                        <div className="success-check-icon">✓</div>
                        <h2 className="mb-4">{successTitle}</h2>
                        <p className="opacity-80 mb-4">{successMessage}</p>
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

    const steps = [
        { num: 1, label: step1Label },
        { num: 2, label: step2Label },
        { num: 3, label: step3Label },
    ];

    return (
        <section className="onboarding-section">
            {/* Header Content */}
            <div className="onboarding-header">
                <div className="logo-container">
                    {fullLogoUrl ? (
                        <img src={fullLogoUrl} alt="Logo" className="logo-img" />
                    ) : (
                        <div className="logo-fallback">S</div>
                    )}
                </div>

                <h1 className="onboarding-title">
                    {heroTitle}
                </h1>

                <p className="onboarding-subtitle">
                    {heroSubtitle}
                </p>
            </div>

            <div className="onboarding-container animate-fade-in delay-200">
                <div className="card onboarding-card">

                    {/* Stepper Header */}
                    <div className="stepper-header">
                        {/* Connecting Line */}
                        <div className="stepper-line" />

                        {steps.map(step => {
                            const isActive = currentStep === step.num;
                            const isCompleted = currentStep > step.num;

                            return (
                                <div key={step.num} className="step-item">
                                    <div className={`step-circle ${isCompleted || isActive ? 'active' : 'inactive'}`}>
                                        {isCompleted ? (
                                            <svg width="14" height="10" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M1 5L5 9L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        ) : step.num}
                                    </div>
                                    <span className={`step-label ${!isActive && !isCompleted ? 'inactive' : ''}`}>
                                        {step.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {submitError && currentStep === 3 && (
                        <div className="onboarding-error-banner">
                            {submitError}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>

                        {/* STEP 1: Basic Info */}
                        {currentStep === 1 && (
                            <div className="animate-fade-in">
                                <div>
                                    <label className="onboarding-label">{fullNameLabel}</label>
                                    <div className="input-wrapper">
                                        <svg className="onboarding-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="12" cy="7" r="4"></circle>
                                        </svg>
                                        <input
                                            className={`onboarding-input ${errors.fullName ? 'is-error' : ''}`}
                                            type="text" name="fullName" placeholder={fullNamePlaceholder}
                                            value={formData.fullName} onChange={handleChange}
                                        />
                                    </div>
                                    {errors.fullName && <div className="onboarding-error">{errors.fullName}</div>}
                                </div>

                                <div>
                                    <label className="onboarding-label">{emailLabel}</label>
                                    <div className="input-wrapper">
                                        <svg className="onboarding-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                            <polyline points="22,6 12,13 2,6"></polyline>
                                        </svg>
                                        <input
                                            className={`onboarding-input ${errors.email ? 'is-error' : ''}`}
                                            type="email" name="email" placeholder={emailPlaceholder}
                                            value={formData.email} onChange={handleChange}
                                        />
                                    </div>
                                    {errors.email && <div className="onboarding-error">{errors.email}</div>}
                                </div>

                                <div>
                                    <label className="onboarding-label">{passwordLabel}</label>
                                    <div className="input-wrapper">
                                        <svg className="onboarding-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                        </svg>
                                        <input
                                            className={`onboarding-input ${errors.password ? 'is-error' : ''}`}
                                            type="password" name="password" placeholder={passwordPlaceholder}
                                            value={formData.password} onChange={handleChange}
                                        />
                                    </div>
                                    {errors.password && <div className="onboarding-error">{errors.password}</div>}
                                </div>

                                <div>
                                    <label className="onboarding-label">{phoneNumberLabel}</label>
                                    <div className="input-wrapper">
                                        <svg className="onboarding-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                        </svg>
                                        <input
                                            className={`onboarding-input ${errors.phoneNumber ? 'is-error' : ''}`}
                                            type="tel" name="phoneNumber" placeholder={phoneNumberPlaceholder}
                                            value={formData.phoneNumber} onChange={handleChange}
                                        />
                                    </div>
                                    {errors.phoneNumber && <div className="onboarding-error">{errors.phoneNumber}</div>}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="onboarding-label">{stateLabel}</label>
                                        <div className="input-wrapper">
                                            <svg className="onboarding-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                                <circle cx="12" cy="10" r="3"></circle>
                                            </svg>
                                            <input
                                                className={`onboarding-input ${errors.state ? 'is-error' : ''}`}
                                                type="text" name="state" placeholder={statePlaceholder}
                                                value={formData.state} onChange={handleChange}
                                            />
                                        </div>
                                        {errors.state && <div className="onboarding-error">{errors.state}</div>}
                                    </div>
                                    <div>
                                        <label className="onboarding-label">{districtLabel}</label>
                                        <div className="input-wrapper">
                                            <svg className="onboarding-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="12" cy="12" r="10"></circle>
                                                <line x1="2" y1="12" x2="22" y2="12"></line>
                                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                                            </svg>
                                            <input
                                                className={`onboarding-input ${errors.district ? 'is-error' : ''}`}
                                                type="text" name="district" placeholder={districtPlaceholder}
                                                value={formData.district} onChange={handleChange}
                                            />
                                        </div>
                                        {errors.district && <div className="onboarding-error">{errors.district}</div>}
                                    </div>
                                </div>

                                <div>
                                    <label className="onboarding-label">{pinCodeLabel}</label>
                                    <div className="input-wrapper">
                                        <svg className="onboarding-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                            <circle cx="12" cy="10" r="3"></circle>
                                        </svg>
                                        <input
                                            className={`onboarding-input ${errors.pinCode ? 'is-error' : ''}`}
                                            type="text" name="pinCode" placeholder={pinCodePlaceholder}
                                            value={formData.pinCode} onChange={handleChange}
                                        />
                                    </div>
                                    {errors.pinCode && <div className="onboarding-error">{errors.pinCode}</div>}
                                </div>
                            </div>
                        )}

                        {/* STEP 2: Professional */}
                        {currentStep === 2 && (
                            <div className="animate-fade-in">
                                <div>
                                    <label className="onboarding-label">{licenseLabel}</label>
                                    <div className="input-wrapper">
                                        <svg className="onboarding-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                        </svg>
                                        <input
                                            className={`onboarding-input ${errors.license ? 'is-error' : ''}`}
                                            type="text" name="license" placeholder={licensePlaceholder}
                                            value={formData.license} onChange={handleChange}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="onboarding-label">{panLabel}</label>
                                    <div className="input-wrapper">
                                        <svg className="onboarding-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                            <polyline points="14 2 14 8 20 8"></polyline>
                                            <line x1="16" y1="13" x2="8" y2="13"></line>
                                            <line x1="16" y1="17" x2="8" y2="17"></line>
                                            <polyline points="10 9 9 9 8 9"></polyline>
                                        </svg>
                                        <input
                                            className={`onboarding-input ${errors.panNumber ? 'is-error' : ''} uppercase`}
                                            type="text" name="panNumber" placeholder={panPlaceholder}
                                            value={formData.panNumber} onChange={handleChange}
                                        />
                                    </div>
                                    {errors.panNumber && <div className="onboarding-error">{errors.panNumber}</div>}
                                </div>

                                <div>
                                    <label className="onboarding-label">{specializationLabel}</label>
                                    <select
                                        className={`onboarding-input onboarding-select ${errors.specialization ? 'is-error' : ''} ${!formData.specialization ? 'text-gray-400' : ''}`}
                                        name="specialization"
                                        value={formData.specialization} onChange={handleChange}
                                    >
                                        <option value="" disabled hidden>Select Specialization</option>
                                        {specializationOptions.split(',').map((opt: string) => (
                                            <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                                        ))}
                                    </select>
                                    {errors.specialization && <div className="onboarding-error">{errors.specialization}</div>}
                                </div>
                            </div>
                        )}

                        {/* STEP 3: Payout */}
                        {currentStep === 3 && (
                            <div className="animate-fade-in">
                                <div className="payout-alert">
                                    <svg className="mt-1 flex-shrink-0" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                        <line x1="3" y1="9" x2="21" y2="9"></line>
                                        <line x1="9" y1="21" x2="9" y2="9"></line>
                                    </svg>
                                    <div>{payoutAlertText}</div>
                                </div>

                                <div>
                                    <label className="onboarding-label">{bankAccountLabel}</label>
                                    <div className="input-wrapper">
                                        <svg className="onboarding-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect>
                                            <line x1="2" y1="10" x2="22" y2="10"></line>
                                        </svg>
                                        <input
                                            className={`onboarding-input ${errors.bankAccountNumber ? 'is-error' : ''}`}
                                            type="text" name="bankAccountNumber" placeholder={bankAccountPlaceholder}
                                            value={formData.bankAccountNumber} onChange={handleChange}
                                        />
                                    </div>
                                    {errors.bankAccountNumber && <div className="onboarding-error">{errors.bankAccountNumber}</div>}
                                </div>

                                <div>
                                    <label className="onboarding-label">{ifscLabel}</label>
                                    <input
                                        className={`onboarding-input pl-4 ${errors.ifscCode ? 'is-error' : ''}`}
                                        type="text" name="ifscCode" placeholder={ifscPlaceholder}
                                        value={formData.ifscCode} onChange={handleChange}
                                    />
                                    {errors.ifscCode && <div className="onboarding-error">{errors.ifscCode}</div>}
                                </div>

                                <div>
                                    <label className="onboarding-label">{bankNameLabel}</label>
                                    <input
                                        className={`onboarding-input pl-4 ${errors.bankName ? 'is-error' : ''}`}
                                        type="text" name="bankName" placeholder={bankNamePlaceholder}
                                        value={formData.bankName} onChange={handleChange}
                                    />
                                    {errors.bankName && <div className="onboarding-error">{errors.bankName}</div>}
                                </div>
                            </div>
                        )}

                        <div className="onboarding-footer">
                            {currentStep > 1 ? (
                                <button
                                    type="button"
                                    onClick={prevStep}
                                    className="back-btn"
                                >
                                    {backButtonText}
                                </button>
                            ) : <div></div>}

                            {currentStep < 3 ? (
                                <button
                                    type="button"
                                    className="btn btn-primary px-6 py-2.5 text-sm"
                                    onClick={nextStep}
                                >
                                    {nextButtonText} &rarr;
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    className="btn btn-primary px-6 py-2.5 text-sm"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Submitting...' : submitButtonText}
                                </button>
                            )}
                        </div>

                    </form>
                </div>

                {/* Footer Sign In Link */}
                <div className="signin-prompt">
                    <p className="signin-text">
                        {signInPromptText}{" "}
                        <a href="/admin/auth/login" className="signin-link">
                            {signInLinkText}
                        </a>
                    </p>
                </div>
            </div>
        </section>
    );
}
