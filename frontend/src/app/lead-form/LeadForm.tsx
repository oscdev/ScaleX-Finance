'use client';

import React, { useState } from 'react';
import { strapiPublicApi } from '@/lib/strapi';
import { useRouter } from 'next/navigation';
import { logEvent } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export default function LeadForm({ pageInfo }: { pageInfo: any }) {
    const router = useRouter();

    const [isAdvisorAutoPopulated, setIsAdvisorAutoPopulated] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        requiredAmount: '',
        monthlyIncome: '',
        mobileNumber: '',
        city: '',
        creditScore: '',
        employmentType: '',
        existingLoans: '',
        advisorReferralId: '',
        selectedProduct: '',
        pinCode: ''
    });

    React.useEffect(() => {
        const savedProduct = sessionStorage.getItem('selectedProduct');
        if (savedProduct) {
            setFormData(prev => ({ ...prev, selectedProduct: savedProduct }));
        }

        // Auto-populate Advisor ID if logged into Strapi
        const strapiAdvisorId = sessionStorage.getItem('strapiAdvisorId');
        if (strapiAdvisorId) {
            setFormData(prev => ({ ...prev, advisorReferralId: strapiAdvisorId }));
            setIsAdvisorAutoPopulated(true);
        }
    }, []);

    const [errors, setErrors] = useState<any>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Form field level validations -> clear errors
        if (errors[name]) {
            setErrors((prev: any) => ({ ...prev, [name]: undefined }));
        }
    };

    const validate = () => {
        const newErrors: any = {};
        if (!formData.fullName.trim()) newErrors.fullName = 'Full Name is required';

        if (!formData.email) {
            newErrors.email = 'Email Address is required';
        } else if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(formData.email)) {
            newErrors.email = 'Invalid email address';
        }

        if (!formData.requiredAmount) {
            newErrors.requiredAmount = 'Required Amount is required';
        } else if (isNaN(Number(formData.requiredAmount)) || Number(formData.requiredAmount) <= 0) {
            newErrors.requiredAmount = 'Required Amount must be a positive number';
        }

        if (!formData.monthlyIncome) {
            newErrors.monthlyIncome = 'Monthly Income is required';
        } else if (isNaN(Number(formData.monthlyIncome)) || Number(formData.monthlyIncome) <= 0) {
            newErrors.monthlyIncome = 'Monthly Income must be a positive number';
        }

        if (!formData.mobileNumber) {
            newErrors.mobileNumber = 'Mobile Number is required';
        } else if (!/^\d{10}$/.test(formData.mobileNumber.replace(/\D/g, ''))) {
            newErrors.mobileNumber = 'Please enter a valid 10-digit mobile number';
        }

        if (!formData.city.trim()) newErrors.city = 'City/District is required';

        if (!formData.creditScore) {
            newErrors.creditScore = 'Credit Score is required';
        } else if (isNaN(Number(formData.creditScore)) || Number(formData.creditScore) < 300 || Number(formData.creditScore) > 900) {
            newErrors.creditScore = 'Credit score must be between 300 and 900';
        }

        if (!formData.employmentType) newErrors.employmentType = 'Employment Type is required';

        if (!formData.existingLoans) {
            newErrors.existingLoans = 'Existing Loans info is required';
        } else if (isNaN(Number(formData.existingLoans)) || Number(formData.existingLoans) < 0) {
            newErrors.existingLoans = 'Must be zero or a positive number';
        }

        if (!formData.pinCode) {
            newErrors.pinCode = 'Pin Code is required';
        } else if (!/^\d{6}$/.test(formData.pinCode.replace(/\D/g, ''))) {
            newErrors.pinCode = 'Please enter a valid 6-digit pin code';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const [submitError, setSubmitError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError(null);
        if (validate()) {
            setIsSubmitting(true);

            try {
                const payload = {
                    data: {
                        fullName: formData.fullName,
                        email: formData.email,
                        requiredAmount: parseFloat(formData.requiredAmount),
                        monthlyIncome: parseFloat(formData.monthlyIncome),
                        mobileNumber: formData.mobileNumber,
                        city: formData.city,
                        creditScore: parseInt(formData.creditScore, 10),
                        employmentType: formData.employmentType,
                        existingLoans: parseFloat(formData.existingLoans),
                        advisorReferralId: formData.advisorReferralId || null,
                        selectedProduct: formData.selectedProduct || null,
                        pinCode: formData.pinCode
                    }
                };

                const res = await fetch(strapiPublicApi('/api/leads'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) {
                    const errorData = await res.json();
                    const failMsg = errorData?.error?.message || 'Failed to submit application';

                    await logEvent({
                        action: 'LEAD_SUBMISSION_FAILURE',
                        description: `Lead form submission failed for ${formData.email}`,
                        severity: 'error',
                        metadata: { email: formData.email, error: failMsg }
                    });

                    throw new Error(failMsg);
                }

                const responseData = await res.json();
                const leadId = responseData?.data?.id;

                await logEvent({
                    action: 'LEAD_SUBMISSION_SUCCESS',
                    description: `New lead submitted successfully: ${formData.fullName}`,
                    severity: 'info',
                    metadata: { leadId, email: formData.email }
                });

                // Save required amount for loan application pre-population
                sessionStorage.setItem('requiredAmount', formData.requiredAmount);
                if (leadId) {
                    sessionStorage.setItem('lastLeadId', leadId.toString());
                    // console.log('Lead created with ID:', leadId);
                }

                setIsSuccess(true);
            } catch (err: any) {
                // console.error('Submission Error:', err);
                setSubmitError(err.message || 'An unexpected error occurred. Please try again later.');
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const {
        fullNameLabel = "Full Name", fullNamePlaceholder = "John Doe",
        emailLabel = "Email Address", emailPlaceholder = "john@example.com",
        requiredAmountLabel = "Required Amount", requiredAmountPlaceholder = "500000",
        monthlyIncomeLabel = "Monthly Income", monthlyIncomePlaceholder = "75000",
        mobileNumberLabel = "Mobile Number", mobileNumberPlaceholder = "9876543210",
        cityLabel = "City/District", cityPlaceholder = "Mumbai",
        creditScoreLabel = "Credit Score", creditScorePlaceholder = "750",
        employmentTypeLabel = "Employment Type", employmentTypePlaceholder = "Select Employment Type",
        existingLoansLabel = "Existing Loans (Total Monthly EMI)", existingLoansPlaceholder = "5000",
        pinCodeLabel = "Pin Code", pinCodePlaceholder = "400001",
        advisorReferralIdLabel = "Advisor Referral ID (Optional)", advisorReferralIdPlaceholder = "ADV123456",
        backButtonLabel = "Back", backButtonLink = "/products",
        submitButtonLabel = "Loan Application"
    } = pageInfo;

    if (isSuccess) {
        return (
            <section className="form-section" style={{ minHeight: '60vh', paddingBottom: '4rem' }}>
                <div className="container animate-fade-in delay-200" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
                    <div className="card" style={{ padding: '4rem 2rem' }}>
                        <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Lead Submitted!</h2>
                        <p style={{ opacity: 0.8, marginBottom: '2rem' }}>Thank you for submitting your lead application. Please proceed to fill the loan application form.</p>
                        <button
                            className="btn btn-primary"
                            onClick={() => router.push('/loan-application')}>
                            Loan Application
                        </button>
                    </div>
                </div>
            </section>
        );
    }

    const inputStyle = {
        width: '100%',
        padding: '1rem',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        background: 'rgba(255,255,255,0.05)',
        color: 'inherit',
        fontSize: '1rem',
        marginTop: '0.5rem',
        marginBottom: '0.25rem',
        fontFamily: 'inherit',
        outline: 'none',
        transition: 'border-color 0.3s ease'
    };

    const labelStyle = {
        fontWeight: 500,
        fontSize: '0.9rem',
        opacity: 0.9,
        display: 'block',
        marginTop: '1.5rem'
    };

    const errorStyle = {
        color: 'var(--secondary)',
        fontSize: '0.8rem',
        marginTop: '0.2rem'
    };

    return (
        <section className="form-section" style={{ minHeight: '60vh', paddingBottom: '4rem' }}>
            <div className="container animate-fade-in delay-200" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <form className="card" onSubmit={handleSubmit} style={{ padding: '3rem' }}>

                    <div className="card-grid-2" style={{ gap: '0 2rem' }}>
                        <div>
                            <label style={labelStyle}>{fullNameLabel}</label>
                            <input
                                style={{ ...inputStyle, borderColor: errors.fullName ? 'var(--secondary)' : 'var(--border-color)' }}
                                type="text"
                                name="fullName"
                                placeholder={fullNamePlaceholder}
                                value={formData.fullName}
                                onChange={handleChange}
                            />
                            {errors.fullName && <div style={errorStyle}>{errors.fullName}</div>}
                        </div>

                        <div>
                            <label style={labelStyle}>{mobileNumberLabel}</label>
                            <input
                                style={{ ...inputStyle, borderColor: errors.mobileNumber ? 'var(--secondary)' : 'var(--border-color)' }}
                                type="tel"
                                name="mobileNumber"
                                placeholder={mobileNumberPlaceholder}
                                value={formData.mobileNumber}
                                onChange={handleChange}
                            />
                            {errors.mobileNumber && <div style={errorStyle}>{errors.mobileNumber}</div>}
                        </div>

                        <div>
                            <label style={labelStyle}>{emailLabel}</label>
                            <input
                                style={{ ...inputStyle, borderColor: errors.email ? 'var(--secondary)' : 'var(--border-color)' }}
                                type="email"
                                name="email"
                                placeholder={emailPlaceholder}
                                value={formData.email}
                                onChange={handleChange}
                            />
                            {errors.email && <div style={errorStyle}>{errors.email}</div>}
                        </div>

                        <div>
                            <label style={labelStyle}>{cityLabel}</label>
                            <input
                                style={{ ...inputStyle, borderColor: errors.city ? 'var(--secondary)' : 'var(--border-color)' }}
                                type="text"
                                name="city"
                                placeholder={cityPlaceholder}
                                value={formData.city}
                                onChange={handleChange}
                            />
                            {errors.city && <div style={errorStyle}>{errors.city}</div>}
                        </div>

                        <div>
                            <label style={labelStyle}>{requiredAmountLabel}</label>
                            <input
                                style={{ ...inputStyle, borderColor: errors.requiredAmount ? 'var(--secondary)' : 'var(--border-color)' }}
                                type="number"
                                name="requiredAmount"
                                placeholder={requiredAmountPlaceholder}
                                value={formData.requiredAmount}
                                onChange={handleChange}
                            />
                            {errors.requiredAmount && <div style={errorStyle}>{errors.requiredAmount}</div>}
                        </div>

                        <div>
                            <label style={labelStyle}>{creditScoreLabel}</label>
                            <input
                                style={{ ...inputStyle, borderColor: errors.creditScore ? 'var(--secondary)' : 'var(--border-color)' }}
                                type="number"
                                name="creditScore"
                                placeholder={creditScorePlaceholder}
                                value={formData.creditScore}
                                onChange={handleChange}
                                min="300"
                                max="900"
                            />
                            {errors.creditScore && <div style={errorStyle}>{errors.creditScore}</div>}
                        </div>

                        <div>
                            <label style={labelStyle}>{monthlyIncomeLabel}</label>
                            <input
                                style={{ ...inputStyle, borderColor: errors.monthlyIncome ? 'var(--secondary)' : 'var(--border-color)' }}
                                type="number"
                                name="monthlyIncome"
                                placeholder={monthlyIncomePlaceholder}
                                value={formData.monthlyIncome}
                                onChange={handleChange}
                            />
                            {errors.monthlyIncome && <div style={errorStyle}>{errors.monthlyIncome}</div>}
                        </div>

                        <div>
                            <label style={labelStyle}>{employmentTypeLabel}</label>
                            <select
                                style={{ ...inputStyle, borderColor: errors.employmentType ? 'var(--secondary)' : 'var(--border-color)' }}
                                name="employmentType"
                                value={formData.employmentType}
                                onChange={handleChange}
                            >
                                <option value="" disabled hidden>{employmentTypePlaceholder}</option>
                                <option value="Select" style={{ color: '#000' }}>Select Employment Type</option>
                                <option value="Salaried" style={{ color: '#000' }}>Salaried</option>
                                <option value="Self Employed" style={{ color: '#000' }}>Self Employed</option>
                                <option value="Business" style={{ color: '#000' }}>Business</option>
                            </select>
                            {errors.employmentType && <div style={errorStyle}>{errors.employmentType}</div>}
                        </div>
                    </div>

                    <div className="card-grid-2" style={{ gap: '0 2rem' }}>
                        <div>
                            <label style={labelStyle}>{existingLoansLabel}</label>
                            <input
                                style={{ ...inputStyle, borderColor: errors.existingLoans ? 'var(--secondary)' : 'var(--border-color)' }}
                                type="number"
                                name="existingLoans"
                                placeholder={existingLoansPlaceholder}
                                value={formData.existingLoans}
                                onChange={handleChange}
                            />
                            {errors.existingLoans && <div style={errorStyle}>{errors.existingLoans}</div>}
                        </div>

                        <div>
                            <label style={labelStyle}>{pinCodeLabel}</label>
                            <input
                                style={{ ...inputStyle, borderColor: errors.pinCode ? 'var(--secondary)' : 'var(--border-color)' }}
                                type="text"
                                name="pinCode"
                                placeholder={pinCodePlaceholder}
                                value={formData.pinCode}
                                onChange={handleChange}
                                maxLength={6}
                            />
                            {errors.pinCode && <div style={errorStyle}>{errors.pinCode}</div>}
                        </div>
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ ...labelStyle, color: 'inherit', opacity: 0.9 }}>{advisorReferralIdLabel}</label>
                        <input
                            style={{
                                ...inputStyle,
                                borderColor: 'var(--border-color)',
                                opacity: isAdvisorAutoPopulated ? 0.6 : 1,
                                cursor: isAdvisorAutoPopulated ? 'not-allowed' : 'text'
                            }}
                            type="text"
                            name="advisorReferralId"
                            placeholder={advisorReferralIdPlaceholder}
                            value={formData.advisorReferralId}
                            onChange={handleChange}
                            readOnly={isAdvisorAutoPopulated}
                            disabled={isAdvisorAutoPopulated}
                        />
                    </div>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginTop: '3rem',
                        paddingTop: '2rem',
                        position: 'relative'
                    }}>
                        {submitError && (
                            <div style={{ position: 'absolute', top: 0, left: 0, color: 'var(--secondary)', fontSize: '0.9rem' }}>
                                {submitError}
                            </div>
                        )}
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => router.push(backButtonLink || '/products')}
                        >
                            {backButtonLabel || 'Back'}
                        </button>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isSubmitting}
                            style={{
                                opacity: isSubmitting ? 0.7 : 1,
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                pointerEvents: isSubmitting ? 'none' : 'auto'
                            }}
                        >
                            {isSubmitting ? 'Submitting...' : (submitButtonLabel || 'Loan Application')}
                        </button>
                    </div>

                </form>
            </div>
        </section>
    );
}
