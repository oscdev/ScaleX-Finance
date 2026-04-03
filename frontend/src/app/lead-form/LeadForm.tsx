'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { strapiPublicApi } from '@/lib/strapi';
import { logEvent } from '@/lib/logger';
import './LeadForm.css';
import BusinessLoanFunnel from './funnels/BusinessLoanFunnel';
import PersonalLoanFunnel from './funnels/PersonalLoanFunnel';
import HomeLoanFunnel from './funnels/HomeLoanFunnel';
import LAPFunnel from './funnels/LAPFunnel';
import { AdvisorReferralField } from './LeadFields';

export const dynamic = 'force-dynamic';

export default function LeadForm({ pageInfo }: { pageInfo: any }) {
    const router = useRouter();

    const [isAdvisorAutoPopulated, setIsAdvisorAutoPopulated] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        requiredAmount: '', // renamed to Loan Requirement in UI
        mobileNumber: '',
        advisorReferralId: '',
        selectedProduct: '',
        pinCode: '',
        aadharCard: '',
        panCard: '',
        propertyType: '',
        propertyStatus: '',
        propertyValue: '',
        employmentType: '',
        leadType: '',
        getEmailNotification: 'No'
    });

    useEffect(() => {
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
    const [submitError, setSubmitError] = useState<string | null>(null);

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
        const product = formData.selectedProduct;

        // Universal fields
        if (!formData.requiredAmount) newErrors.requiredAmount = 'Loan Requirement is required';
        if (!formData.fullName.trim()) newErrors.fullName = 'Customer Name is required';
        if (!formData.mobileNumber) {
            newErrors.mobileNumber = 'Mobile Number is required';
        } else if (!/^\d{10}$/.test(formData.mobileNumber.replace(/\D/g, ''))) {
            newErrors.mobileNumber = 'Please enter a valid 10-digit mobile number';
        }
        if (!formData.pinCode) {
            newErrors.pinCode = 'Pin Code is required';
        } else if (!/^\d{6}$/.test(formData.pinCode.replace(/\D/g, ''))) {
            newErrors.pinCode = 'Please enter a valid 6-digit pin code';
        }
        if (!formData.email) {
            newErrors.email = 'Email Address is required';
        } else if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(formData.email)) {
            newErrors.email = 'Invalid email address';
        }

        // Aadhar and Pan for all
        if (!formData.aadharCard) newErrors.aadharCard = 'Aadhar Card is required';
        else if (!/^\d{12}$/.test(formData.aadharCard.replace(/\s/g, ''))) newErrors.aadharCard = 'Invalid Aadhar Card';

        if (!formData.panCard) newErrors.panCard = 'Pan Card is required';
        else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panCard.toUpperCase())) newErrors.panCard = 'Invalid Pan Card';

        // Conditional fields
        if (product?.includes('LAP')) {
            if (!formData.propertyType) newErrors.propertyType = 'Property Type is required';
            if (!formData.propertyStatus) newErrors.propertyStatus = 'Property Status is required';
            if (!formData.propertyValue) newErrors.propertyValue = 'Property Value is required';
            if (!formData.employmentType) newErrors.employmentType = 'Occupation is required';
        }

        if (product === 'Home Loan') {
            if (!formData.leadType) newErrors.leadType = 'Lead Type is required';
            if (!formData.employmentType) newErrors.employmentType = 'Occupation is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

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
                        mobileNumber: formData.mobileNumber,
                        pinCode: formData.pinCode,
                        advisorReferralId: formData.advisorReferralId || null,
                        selectedProduct: formData.selectedProduct || null,
                        aadharCard: formData.aadharCard,
                        panCard: formData.panCard,
                        propertyType: formData.propertyType || null,
                        propertyStatus: formData.propertyStatus || null,
                        propertyValue: formData.propertyValue ? parseFloat(formData.propertyValue) : null,
                        employmentType: formData.employmentType || null,
                        leadType: formData.leadType || null,
                        getEmailNotification: formData.getEmailNotification === 'Yes'
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
                    metadata: { leadId, email: formData.email, product: formData.selectedProduct }
                });

                // Save lead details for loan application pre-population
                sessionStorage.setItem('requiredAmount', formData.requiredAmount);
                sessionStorage.setItem('getEmailNotification', formData.getEmailNotification);
                sessionStorage.setItem('leadName', formData.fullName);
                sessionStorage.setItem('leadEmail', formData.email);
                sessionStorage.setItem('leadPhone', formData.mobileNumber);
                sessionStorage.setItem('leadAadhar', formData.aadharCard);
                sessionStorage.setItem('leadPan', formData.panCard);
                sessionStorage.setItem('leadOccupation', formData.employmentType);

                if (leadId) {
                    sessionStorage.setItem('lastLeadId', leadId.toString());
                }

                setIsSuccess(true);
            } catch (err: any) {
                setSubmitError(err.message || 'An unexpected error occurred. Please try again later.');
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    if (isSuccess) {
        return (
            <section className="lead-form-section">
                <div className="lead-form-success-container animate-fade-in delay-200">
                    <div className="lead-form-card lead-form-success-card">
                        <h2 className="lead-form-success-title">{formData.selectedProduct} Submitted!</h2>
                        <p className="lead-form-success-text">Thank you for submitting your lead application for <strong>{formData.selectedProduct}</strong>. Please proceed to fill out the detailed loan application form.</p>
                        <button
                            className="btn btn-primary"
                            onClick={() => router.push('/loan-application')}>
                            Continue to Loan Application
                        </button>
                    </div>
                </div>
            </section>
        );
    }

    const backButtonLabel = pageInfo.backButtonLabel ?? "Back";
    const backButtonLink = pageInfo.backButtonLink ?? "/products";
    const submitButtonLabel = pageInfo.submitButtonLabel ?? "Loan Application";

    const renderFunnelFields = () => {
        const product = formData.selectedProduct;
        if (product?.includes('LAP')) {
            return <LAPFunnel formData={formData} errors={errors} handleChange={handleChange} pageInfo={pageInfo} />;
        }
        if (product === 'Home Loan') {
            return <HomeLoanFunnel formData={formData} errors={errors} handleChange={handleChange} pageInfo={pageInfo} />;
        }
        if (product === 'Personal Loan') {
            return <PersonalLoanFunnel formData={formData} errors={errors} handleChange={handleChange} pageInfo={pageInfo} />;
        }
        return <BusinessLoanFunnel formData={formData} errors={errors} handleChange={handleChange} pageInfo={pageInfo} />;
    };

    return (
        <section className="lead-form-section">
            <div className="lead-form-container animate-fade-in delay-200">
                <h2 className="lead-form-title">
                    {formData.selectedProduct ? `${formData.selectedProduct} Lead Form` : 'Lead Form'}
                </h2>
                <form className="lead-form-card" onSubmit={handleSubmit}>
                    
                    {renderFunnelFields()}

                    <AdvisorReferralField 
                        formData={formData} 
                        handleChange={handleChange} 
                        isAutoPopulated={isAdvisorAutoPopulated} 
                    />

                    <div className="lead-form-footer">
                        {submitError && (
                            <div className="lead-form-submit-error">
                                {submitError}
                            </div>
                        )}
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => router.push(backButtonLink)}
                        >
                            {backButtonLabel}
                        </button>

                        <button
                            type="submit"
                            className={`btn btn-primary ${isSubmitting ? 'btn-disabled' : ''}`}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Submitting...' : submitButtonLabel}
                        </button>
                    </div>

                </form>
            </div>
        </section>
    );
}
