'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { strapiPublicApi } from '@/lib/strapi';
import { logEvent } from '@/lib/logger';

const STEPS = [
    { id: 1, name: 'Basics', icon: '📋' },
    { id: 2, name: 'Collateral', icon: '🏠' },
    { id: 3, name: 'Business', icon: '🏢' },
    { id: 4, name: 'Docs', icon: '📂' },
    { id: 5, name: 'Review', icon: '✅' }
];

const TENURE_OPTIONS = [12, 24, 36, 48, 60];
const COLLATERAL_OPTIONS = [
    'Property (Personal/Commercial)',
    'Gold',
    'Fixed Deposit',
    'Machine/Vehicle'
];

export default function LoanApplicationForm({ pageInfo = {} }: { pageInfo: any }) {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [products, setProducts] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // Dynamic labels and placeholders with defaults
    const {
        loanAmountLabel = "Loan Amount",
        loanTypeLabel = "Loan Type",
        loanTypePlaceholder = "Select Product",
        tenureLabel = "Tenure (Months)",
        adharLabel = "Adhar Card Number",
        adharPlaceholder = "XXXX XXXX XXXX",
        panLabel = "PAN Card Number",
        panPlaceholder = "ABCDE1234F",
        notificationsLabel = "Get Email Notifications for Lead Updated?",
        collateralCheckboxLabel = "I have collateral to offer",
        collateralTypeLabel = "Collateral Type",
        collateralTypePlaceholder = "Select Type",
        collateralValueLabel = "Estimated Value (₹)",
        collateralValuePlaceholder = "5000000",
        businessNameLabel = "Business Name",
        businessNamePlaceholder = "Oscprofessionals",
        applicantNameLabel = "Applicant Name",
        applicantNamePlaceholder = "John Doe",
        emailLabel = "Email",
        emailPlaceholder = "john@example.com",
        phoneLabel = "Phone",
        phonePlaceholder = "9876543210",
        docsInstructionText = "Please upload clear copies of the following documents. Supported formats: PDF, JPG, PNG.",
        gstReturnsLabel = "GST Returns (Last 12 Months)",
        bankStatementsLabel = "Bank Statements (Last 6 Months)",
        itReturnsLabel = "Income Tax Returns (Last 2 Years)",
        otherDocsLabel = "Other document (Pan/Adhar etc)",
        fileUploadPlaceholder = "Click to browse or drag file here",
        summaryTitle = "Application Summary",
        declarationText = "I hereby declare that the information provided is true and correct. I authorize Scalex Finance and its partners to verify my details and check my credit score.",
        nextStepButtonLabel = "Next Step →",
        backButtonLabel = "Back",
        submitButtonLabel = "Submit Application"
    } = pageInfo;

    const [formData, setFormData] = useState({
        loanAmount: 500000,
        loanType: '',
        tenureMonths: 'Months_24',
        adharNumber: '',
        panNumber: '',
        emailNotifications: true,
        hasCollateral: false,
        collateralType: '',
        collateralValue: '',
        businessName: '',
        applicantName: '',
        email: '',
        phone: '',
        gstReturns: [] as File[],
        bankStatements: [] as File[],
        itReturns: [] as File[],
        otherDocs: [] as File[],
        declarationAccepted: false
    });

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await fetch(strapiPublicApi('/api/products'));
                const data = await res.json();
                if (data?.data) {
                    setProducts(data.data);
                }
            } catch (err) {
                // console.error('Failed to fetch products:', err);
            }
        };
        fetchProducts();

        // Pre-populate Loan Type and Amount from sessionStorage
        const savedProduct = sessionStorage.getItem('selectedProduct');
        if (savedProduct) {
            setFormData(prev => ({ ...prev, loanType: savedProduct }));
        }

        const savedAmount = sessionStorage.getItem('requiredAmount');
        if (savedAmount) {
            setFormData(prev => ({ ...prev, loanAmount: Number(savedAmount) }));
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setFormData(prev => ({ ...prev, [name]: val }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setFormData(prev => ({ ...prev, [fieldName]: [...(prev as any)[fieldName], ...newFiles] }));
        }
    };

    const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitError(null);

        try {
            // 1. Upload Files first
            const fileFields = ['gstReturns', 'bankStatements', 'itReturns', 'otherDocs'];
            const uploadedFileIds: any = {};

            for (const field of fileFields) {
                const files = (formData as any)[field];
                if (files.length > 0) {
                    const uploadFormData = new FormData();
                    files.forEach((file: File) => {
                        uploadFormData.append('files', file);
                    });

                    const uploadRes = await fetch(strapiPublicApi('/api/upload'), {
                        method: 'POST',
                        body: uploadFormData
                    });

                    if (!uploadRes.ok) throw new Error(`Failed to upload ${field}`);
                    const uploadData = await uploadRes.json();
                    uploadedFileIds[field] = uploadData.map((file: any) => file.id);

                    await logEvent({
                        action: 'LOAN_DOCS_UPLOADED',
                        description: `Files uploaded for field: ${field}`,
                        severity: 'info',
                        metadata: { field, count: uploadData.length }
                    });
                }
            }

            // 2. Submit Form Data
            const leadId = sessionStorage.getItem('lastLeadId');

            const payload = {
                data: {
                    id: leadId ? parseInt(leadId, 10) : undefined,
                    loanAmount: Number(formData.loanAmount),
                    loanType: formData.loanType,
                    tenureMonths: formData.tenureMonths,
                    adharNumber: formData.adharNumber,
                    panNumber: formData.panNumber,
                    emailNotifications: formData.emailNotifications,
                    hasCollateral: formData.hasCollateral,
                    collateralType: formData.collateralType || null,
                    collateralValue: formData.collateralValue ? Number(formData.collateralValue) : null,
                    businessName: formData.businessName,
                    applicantName: formData.applicantName,
                    email: formData.email,
                    phone: formData.phone,
                    declarationAccepted: formData.declarationAccepted,
                    gstReturns: uploadedFileIds.gstReturns || [],
                    bankStatements: uploadedFileIds.bankStatements || [],
                    itReturns: uploadedFileIds.itReturns || [],
                    otherDocs: uploadedFileIds.otherDocs || []
                }
            };

            const res = await fetch(strapiPublicApi('/api/loan-applications'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json();
                const failMsg = errData?.error?.message || 'Failed to submit application';

                await logEvent({
                    action: 'LOAN_SUBMISSION_FAILURE',
                    description: `Loan submission failed for ${formData.email}`,
                    severity: 'error',
                    metadata: { email: formData.email, error: failMsg }
                });

                throw new Error(failMsg);
            }

            await logEvent({
                action: 'LOAN_SUBMISSION_SUCCESS',
                description: `Loan application submitted successfully: ${formData.applicantName}`,
                severity: 'info',
                metadata: { email: formData.email, amount: formData.loanAmount }
            });

            // Redirect logic: If logged into CMS as advisor, return to CMS Overview. Else show success page.
            const isAdvisorSession = !!sessionStorage.getItem('strapiAdvisorId');
            if (isAdvisorSession) {
                window.location.href = '/admin/content-manager/collection-types/api::lead.lead?sort=id:DESC';
            } else {
                router.push('/loan-application-success');
            }
        } catch (err: any) {
            // console.error('Submission error:', err);
            setSubmitError(err.message || 'An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="animate-fade-in">
                        <div style={{ marginBottom: '2.5rem' }}>
                            <label style={{ display: 'block', fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                                {loanAmountLabel}: ₹{formData.loanAmount.toLocaleString('en-IN')}
                            </label>
                            <input
                                type="range"
                                name="loanAmount"
                                min="10000"
                                max="10000000"
                                step="10000"
                                value={formData.loanAmount}
                                onChange={handleChange}
                                style={{ width: '100%', cursor: 'pointer', height: '6px', appearance: 'none', background: '#e2e8f0', borderRadius: '3px' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', color: '#64748b', fontSize: '0.9rem' }}>
                                <span>₹10K</span>
                                <span>₹1Cr</span>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                            <div>
                                <label className="form-label">{loanTypeLabel}</label>
                                <select name="loanType" className="form-select" value={formData.loanType} onChange={handleChange}>
                                    <option value="">{loanTypePlaceholder}</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.title}>{p.title}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">{tenureLabel}</label>
                                <select name="tenureMonths" className="form-select" value={formData.tenureMonths} onChange={handleChange}>
                                    {TENURE_OPTIONS.map(opt => (
                                        <option key={opt} value={`Months_${opt}`}>{opt} Months</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                            <div>
                                <label className="form-label">{adharLabel}</label>
                                <input type="text" name="adharNumber" className="form-input" placeholder={adharPlaceholder} value={formData.adharNumber} onChange={handleChange} />
                            </div>
                            <div>
                                <label className="form-label">{panLabel}</label>
                                <input type="text" name="panNumber" className="form-input" placeholder={panPlaceholder} value={formData.panNumber} onChange={handleChange} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                            <span style={{ fontSize: '0.95rem' }}>{notificationsLabel}</span>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input type="radio" checked={formData.emailNotifications} onChange={() => setFormData(p => ({ ...p, emailNotifications: true }))} /> Yes
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input type="radio" checked={!formData.emailNotifications} onChange={() => setFormData(p => ({ ...p, emailNotifications: false }))} /> No
                                </label>
                            </div>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="animate-fade-in">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', marginBottom: '2rem', fontSize: '1.1rem' }}>
                            <input
                                type="checkbox"
                                name="hasCollateral"
                                checked={formData.hasCollateral}
                                onChange={handleChange}
                                style={{ width: '20px', height: '20px' }}
                            />
                            {collateralCheckboxLabel}
                        </label>

                        {formData.hasCollateral && (
                            <div className="card" style={{ padding: '2rem', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label className="form-label">{collateralTypeLabel}</label>
                                    <select name="collateralType" className="form-select" value={formData.collateralType} onChange={handleChange}>
                                        <option value="">{collateralTypePlaceholder}</option>
                                        {COLLATERAL_OPTIONS.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">{collateralValueLabel}</label>
                                    <input
                                        type="number"
                                        name="collateralValue"
                                        className="form-input"
                                        placeholder={collateralValuePlaceholder}
                                        value={formData.collateralValue}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 3:
                return (
                    <div className="animate-fade-in">
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label className="form-label">{businessNameLabel}</label>
                            <input type="text" name="businessName" className="form-input" placeholder={businessNamePlaceholder} value={formData.businessName} onChange={handleChange} />
                        </div>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label className="form-label">{applicantNameLabel}</label>
                            <input type="text" name="applicantName" className="form-input" placeholder={applicantNamePlaceholder} value={formData.applicantName} onChange={handleChange} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div>
                                <label className="form-label">{emailLabel}</label>
                                <input type="email" name="email" className="form-input" placeholder={emailPlaceholder} value={formData.email} onChange={handleChange} />
                            </div>
                            <div>
                                <label className="form-label">{phoneLabel}</label>
                                <input type="tel" name="phone" className="form-input" placeholder={phonePlaceholder} value={formData.phone} onChange={handleChange} />
                            </div>
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div className="animate-fade-in">
                        <p style={{ marginBottom: '2rem', opacity: 0.8, background: '#f8fafc', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--primary)' }}>
                            {docsInstructionText}
                        </p>

                        {[
                            { id: 'gstReturns', label: gstReturnsLabel },
                            { id: 'bankStatements', label: bankStatementsLabel },
                            { id: 'itReturns', label: itReturnsLabel },
                            { id: 'otherDocs', label: otherDocsLabel }
                        ].map(field => (
                            <div key={field.id} style={{ marginBottom: '1.5rem' }}>
                                <label className="form-label">{field.label}</label>
                                <div style={{
                                    border: '2px dashed #cbd5e1',
                                    borderRadius: '12px',
                                    padding: '1.5rem',
                                    textAlign: 'center',
                                    position: 'relative',
                                    transition: 'border-color 0.3s ease',
                                    cursor: 'pointer'
                                }}
                                    onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                                    onMouseOut={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
                                    onClick={() => document.getElementById(`file-${field.id}`)?.click()}
                                >
                                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📤</div>
                                    <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
                                        {(formData as any)[field.id].length > 0
                                            ? `${(formData as any)[field.id].length} files selected`
                                            : fileUploadPlaceholder}
                                    </p>
                                    <input
                                        id={`file-${field.id}`}
                                        type="file"
                                        multiple
                                        style={{ display: 'none' }}
                                        onChange={(e) => handleFileChange(e, field.id)}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                );
            case 5:
                return (
                    <div className="animate-fade-in">
                        <h3 style={{ marginBottom: '1.5rem' }}>{summaryTitle}</h3>
                        <div className="card" style={{ background: '#f8fafc', padding: '1.5rem', marginBottom: '2rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <p><strong>{loanAmountLabel}:</strong> ₹{formData.loanAmount.toLocaleString('en-IN')}</p>
                                <p><strong>{tenureLabel.split('(')[0].trim()}:</strong> {formData.tenureMonths.replace('Months_', '')} Months</p>
                                <p><strong>{loanTypeLabel}:</strong> {formData.loanType || 'N/A'}</p>
                                <p><strong>Collateral:</strong> {formData.hasCollateral ? `${formData.collateralType} (₹${formData.collateralValue})` : 'None'}</p>
                                <p><strong>{businessNameLabel}:</strong> {formData.businessName}</p>
                                <p><strong>{applicantNameLabel}:</strong> {formData.applicantName}</p>
                            </div>
                        </div>

                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', color: '#475569' }}>
                            <input
                                type="checkbox"
                                name="declarationAccepted"
                                checked={formData.declarationAccepted}
                                onChange={handleChange}
                                style={{ marginTop: '0.2rem' }}
                            />
                            {declarationText}
                        </label>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {/* Stepper Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3rem', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '20px', left: 0, right: 0, height: '2px', background: '#e2e8f0', zIndex: 0 }}></div>
                <div style={{ position: 'absolute', top: '20px', left: 0, width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%`, height: '2px', background: 'var(--primary)', zIndex: 0, transition: 'width 0.3s ease' }}></div>

                {STEPS.map(step => (
                    <div key={step.id} style={{ zIndex: 1, textAlign: 'center', pointerEvents: 'none' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: currentStep >= step.id ? 'var(--primary)' : '#fff',
                            border: `2px solid ${currentStep >= step.id ? 'var(--primary)' : '#e2e8f0'}`,
                            color: currentStep >= step.id ? '#fff' : '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 0.5rem',
                            fontWeight: 700,
                            boxShadow: currentStep === step.id ? '0 0 0 4px rgba(59, 130, 246, 0.2)' : 'none',
                            transition: 'all 0.3s ease'
                        }}>
                            {currentStep > step.id ? '✓' : step.id}
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: currentStep >= step.id ? 'var(--primary)' : '#64748b' }}>
                            {step.name}
                        </span>
                    </div>
                ))}
            </div>

            <form className="card" onSubmit={handleSubmit} style={{ padding: '2.5rem', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1 }}>
                    {renderStep()}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
                    {currentStep > 1 && (
                        <button type="button" onClick={prevStep} className="btn btn-secondary" style={{ padding: '0.75rem 2rem' }}>
                            {backButtonLabel}
                        </button>
                    )}
                    <div style={{ flex: 1 }}></div>
                    {currentStep < STEPS.length ? (
                        <button type="button" onClick={nextStep} className="btn btn-primary" style={{ padding: '0.75rem 2.5rem' }}>
                            {nextStepButtonLabel}
                        </button>
                    ) : (
                        <div>
                            {submitError && <p style={{ color: 'var(--secondary)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>{submitError}</p>}
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={isSubmitting || !formData.declarationAccepted}
                                style={{ padding: '0.75rem 3rem', opacity: (isSubmitting || !formData.declarationAccepted) ? 0.6 : 1 }}
                            >
                                {isSubmitting ? 'Submitting...' : submitButtonLabel}
                            </button>
                        </div>
                    )}
                </div>
            </form>

            <style jsx>{`
                .form-label {
                    display: block;
                    font-size: 0.9rem;
                    font-weight: 500;
                    margin-bottom: 0.5rem;
                    color: #475569;
                }
                .form-input, .form-select {
                    width: 100%;
                    padding: 0.75rem 1rem;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    font-size: 1rem;
                    transition: border-color 0.2s;
                    background: #fff;
                    color: #111;
                }
                .form-input:focus, .form-select:focus {
                    outline: none;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }
            `}</style>
        </div>
    );
}
