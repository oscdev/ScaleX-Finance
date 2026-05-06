'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { strapiPublicApi } from '@/lib/strapi';
import './LoanApplication.css';
import BusinessLoanFunnel from './funnels/BusinessLoanFunnel';
import HomeLoanFunnel from './funnels/HomeLoanFunnel';
import LAPFunnel from './funnels/LAPFunnel';
import PersonalLoanFunnel from './funnels/PersonalLoanFunnel';

const getSteps = (loanType: string, occupation: string) => {
    const isSelfEmployed = occupation === 'Self Employed';
    const isLAP = loanType === 'LAP' || loanType === 'LAP (Loan Against Property)';

    if (isSelfEmployed && loanType === 'Home Loan') {
        return [
            { id: 1, name: 'Business', icon: '🏢' },
            { id: 2, name: 'Personal', icon: '👤' },
            { id: 3, name: 'Residence', icon: '🏠' },
            { id: 4, name: 'Property', icon: '🏘️' },
            { id: 5, name: 'Other', icon: '➕' },
            { id: 6, name: 'Docs', icon: '📂' },
            { id: 7, name: 'Submit', icon: '✅' }
        ];
    }

    if (isSelfEmployed && isLAP) {
        return [
            { id: 1, name: 'Business', icon: '🏢' },
            { id: 2, name: 'Personal', icon: '👤' },
            { id: 3, name: 'Residence', icon: '🏠' },
            { id: 4, name: 'Other', icon: '➕' },
            { id: 5, name: 'Docs', icon: '📂' },
            { id: 6, name: 'Submit', icon: '✅' }
        ];
    }

    switch (loanType) {
        case 'Business Loan':
            return [
                { id: 1, name: 'Business', icon: '🏢' },
                { id: 2, name: 'Personal', icon: '👤' },
                { id: 3, name: 'Residence', icon: '📍' },
                { id: 4, name: 'Other', icon: '➕' },
                { id: 5, name: 'Docs', icon: '📂' },
                { id: 6, name: 'Submit', icon: '✅' }
            ];
        case 'LAP':
        case 'LAP (Loan Against Property)':
            return [
                { id: 1, name: 'Personal', icon: '👤' },
                { id: 2, name: 'Residence', icon: '📍' },
                { id: 3, name: 'Income', icon: '💰' },
                { id: 4, name: 'Other', icon: '➕' },
                { id: 5, name: 'Docs', icon: '📂' },
                { id: 6, name: 'Submit', icon: '✅' }
            ];
        case 'Home Loan':
            return [
                { id: 1, name: 'Personal', icon: '👤' },
                { id: 2, name: 'Residence', icon: '🏠' },
                { id: 3, name: 'Property', icon: '🏘️' },
                { id: 4, name: 'Income', icon: '💰' },
                { id: 5, name: 'Other', icon: '➕' },
                { id: 6, name: 'Docs', icon: '📂' },
                { id: 7, name: 'Submit', icon: '✅' }
            ];
        case 'Personal Loan':
        default:
            return [
                { id: 1, name: 'Personal', icon: '👤' },
                { id: 2, name: 'Residence', icon: '📍' },
                { id: 3, name: 'Income', icon: '💰' },
                { id: 4, name: 'Other', icon: '➕' },
                { id: 5, name: 'Docs', icon: '📂' },
                { id: 6, name: 'Submit', icon: '✅' }
            ];
    }
};

export default function LoanApplicationForm({ pageInfo = {} }: { pageInfo: any }) {
    const router = useRouter();
    const [loanType, setLoanType] = useState('');
    const [occupation, setOccupation] = useState('');
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // Profile state from session (Client-only)
    const [loanProfile, setLoanProfile] = useState({
        name: 'Applicant',
        phone: 'N/A',
        email: 'N/A',
        pan: 'N/A',
        aadhar: 'N/A'
    });
    const [leadId, setLeadId] = useState('N/A');

    const STEPS = getSteps(loanType, occupation);

    interface LoanFormData {
        businessName: string; businessPremises: string; businessType: string; annualTurnover: string; businessAge: string; businessRegProof: string; businessAddress: string;
        applicantName: string; dob: string; maritalStatus: string; spouseName: string; motherName: string; alternateNumber: string; dependents: string;
        addressLine1: string; addressLine2: string; landmark: string; state: string; district: string; city: string; residenceType: string; propertyAddressPincode: string;
        propertyType: string; propertyStatus: string; propertyValue: string;
        companyName: string; designation: string; companyAddress: string; netSalary: string; salaryMode: string; jobStability: string;
        runningLoans: any[]; tempLoanId: string; tempLoanType: string; tempBankName: string; tempLoanAmount: string; tempEmiAmount: string; tempPaidEmi: string;
        proprietorshipDoc: File | null; panCard: File | null; aadharCardFront: File | null; aadharCardBack: File | null; businessRegProofDoc: File | null;
        bankStatement: File | null; propertyPapers: File | null; coAppPan: File | null; coAppAadharFront: File | null; coAppAadharBack: File | null;
        salarySlips: File[]; otherDocs: File[];
        addedDocs: any[]; uploadedFields: Record<string, boolean>;
        pdfPasswords: Record<string, string>; docType: string; declarationAccepted: boolean; loanAmount: number;
    }

    const [formData, setFormData] = useState<LoanFormData>({
        businessName: '',
        businessPremises: '',
        businessType: '',
        annualTurnover: '',
        businessAge: '',
        businessRegProof: '',
        businessAddress: '',
        applicantName: '',
        dob: '',
        maritalStatus: '',
        spouseName: '',
        motherName: '',
        alternateNumber: '',
        dependents: '',
        addressLine1: '',
        addressLine2: '',
        landmark: '',
        state: '',
        district: '',
        city: '',
        residenceType: '',
        propertyAddressPincode: '',
        propertyType: '',
        propertyStatus: '',
        propertyValue: '',
        companyName: '',
        designation: '',
        companyAddress: '',
        netSalary: '',
        salaryMode: '',
        jobStability: '',
        runningLoans: [],
        tempLoanId: '',
        tempLoanType: '',
        tempBankName: '',
        tempLoanAmount: '',
        tempEmiAmount: '',
        tempPaidEmi: '',
        proprietorshipDoc: null,
        panCard: null,
        aadharCardFront: null,
        aadharCardBack: null,
        businessRegProofDoc: null,
        bankStatement: null,
        propertyPapers: null,
        coAppPan: null,
        coAppAadharFront: null,
        coAppAadharBack: null,
        salarySlips: [],
        otherDocs: [],
        addedDocs: [],
        uploadedFields: {},
        pdfPasswords: {},
        docType: '',
        declarationAccepted: false,
        loanAmount: 0
    });

    useEffect(() => {
        const savedProduct = sessionStorage.getItem('selectedProduct');
        if (savedProduct) setLoanType(savedProduct);
        const savedOccupation = sessionStorage.getItem('leadOccupation');
        if (savedOccupation) setOccupation(savedOccupation);
        const savedAmount = sessionStorage.getItem('requiredAmount');
        if (savedAmount) setFormData(prev => ({ ...prev, loanAmount: Number(savedAmount) }));

        // Get lead profile details safely
        setLoanProfile({
            name: sessionStorage.getItem('leadName') || 'Applicant',
            phone: sessionStorage.getItem('leadPhone') || 'N/A',
            email: sessionStorage.getItem('leadEmail') || 'N/A',
            pan: sessionStorage.getItem('leadPan') || 'N/A',
            aadhar: sessionStorage.getItem('leadAadhar') || 'N/A'
        });
        setLeadId(sessionStorage.getItem('lastLeadId') || 'N/A');
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

        // Reset district if state changes
        if (name === 'state') {
            setFormData(prev => ({ ...prev, state: value, district: '' }));
        } else {
            setFormData(prev => ({ ...prev, [name]: val }));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            if (fieldName === 'salarySlips' || fieldName === 'otherDocs') {
                setFormData(prev => ({ ...prev, [fieldName]: [...(prev as any)[fieldName], ...files] }));
            } else {
                setFormData(prev => ({ ...prev, [fieldName]: files[0] }));
            }
            // Mark as selected but not yet uploaded via manual button
        }
    };

    const handleSingleUpload = (fieldKey: string, fieldName: string) => {
        const file = (formData as any)[fieldKey];
        // Handle array fields special
        const currentFile = (fieldKey === 'salarySlips' || fieldKey === 'otherDocs')
            ? (file && file[0])
            : file;

        if (!currentFile) {
            alert(`Please select a file for ${fieldName} first.`);
            return;
        }

        setFormData(prev => {
            const docId = `Doc-${prev.addedDocs.length + 1}`;
            const newDoc = {
                id: docId,
                name: fieldName,
                format: currentFile.name.split('.').pop()?.toUpperCase() || 'UNKNOWN',
                password: prev.pdfPasswords[fieldKey] || 'No',
                date: new Date().toLocaleDateString('en-IN'),
                status: 'Staged'
            };

            return {
                ...prev,
                uploadedFields: { ...prev.uploadedFields, [fieldKey]: true },
                addedDocs: [...prev.addedDocs, newDoc]
                // We DO NOT clear the file or password here, because they are need for final sequential submit
            };
        });
    };

    const handleAddLoan = () => {
        if (!formData.tempLoanType || !formData.tempBankName || !formData.tempLoanAmount || !formData.tempEmiAmount || !formData.tempPaidEmi) return;
        const nextId = formData.runningLoans.length + 1;
        const newLoan = {
            id: String(nextId),
            type: formData.tempLoanType,
            bank: formData.tempBankName,
            amount: formData.tempLoanAmount,
            emi: formData.tempEmiAmount,
            paidEmi: formData.tempPaidEmi
        };
        setFormData(prev => ({
            ...prev,
            runningLoans: [...prev.runningLoans, newLoan],
            tempLoanId: '',
            tempLoanType: '',
            tempBankName: '',
            tempLoanAmount: '',
            tempEmiAmount: '',
            tempPaidEmi: ''
        }));
    };

    const validateStep = () => {
        const errors = getValidationErrors();
        const currentStepName = STEPS[currentStep - 1].name;
        
        // Find if any error belongs to the current tab
        // Note: Tab names in error messages match STEPS[].name (Business, Personal, Residence, Docs, etc.)
        const currentStepErrors = errors.filter(err => err.includes(`"${currentStepName}" tab`) || err.includes(`in "${currentStepName}"`));
        
        if (currentStepErrors.length > 0) {
            alert(currentStepErrors[0]);
            return false;
        }
        return true;
    };

    const nextStep = () => {
        if (validateStep()) setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    };
    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const errors = getValidationErrors();
        if (errors.length > 0) {
            setSubmitError(`Please fix all validation errors before submitting. (${errors.length} pending)`);
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);

        try {
            const leadId = sessionStorage.getItem('lastLeadId');
            const uploadedFileIds: Record<string, any> = {};
            const filesToUpload = [
                'proprietorshipDoc', 'panCard', 'aadharCardFront', 'aadharCardBack',
                'businessRegProofDoc', 'bankStatement', 'propertyPapers',
                'coAppPan', 'coAppAadharFront', 'coAppAadharBack'
            ];

            for (const field of filesToUpload) {
                const file = (formData as any)[field];
                if (file) {
                    const uploadData = new FormData();
                    uploadData.append('files', file);
                    const res = await fetch(strapiPublicApi('/strapi-api/upload'), { method: 'POST', body: uploadData });
                    if (res.ok) {
                        const data = await res.json();
                        uploadedFileIds[field] = data[0].id;
                    } else {
                        const errBody = await res.text().catch(() => 'No body');
                        console.error(`Upload failed for ${field} (${res.status}):`, errBody.substring(0, 500));
                        throw new Error(`Upload failed for ${field} (${res.status}): ${res.statusText}`);
                    }
                }
            }

            for (const field of ['salarySlips', 'otherDocs']) {
                const files = (formData as any)[field];
                if (files.length > 0) {
                    const uploadData = new FormData();
                    files.forEach((f: File) => uploadData.append('files', f));
                    const res = await fetch(strapiPublicApi('/strapi-api/upload'), { method: 'POST', body: uploadData });
                    if (res.ok) {
                        const data = await res.json();
                        uploadedFileIds[field] = data.map((f: any) => f.id);
                    } else {
                        const errBody = await res.text().catch(() => 'No body');
                        console.error(`Upload failed for ${field} (${res.status}):`, errBody.substring(0, 500));
                        throw new Error(`Upload failed for ${field} (${res.status}): ${res.statusText}`);
                    }
                }
            }

            const cleanLeadId = (leadId && leadId !== 'N/A') ? parseInt(leadId, 10) : null;
            const cleanLoanAmount = parseFloat(String(formData.loanAmount)) || 0;

            const payload = {
                data: {
                    leadId: cleanLeadId,
                    loanType,
                    loanAmount: cleanLoanAmount,
                    applicantName: sessionStorage.getItem('leadName') || formData.applicantName || 'Applicant',
                    email: sessionStorage.getItem('leadEmail') || '',
                    phone: sessionStorage.getItem('leadPhone') || '',
                    aadharNumber: sessionStorage.getItem('leadAadhar') || '',
                    panNumber: sessionStorage.getItem('leadPan') || '',
                    form_data: {
                        businessDetails: {
                            name: formData.businessName, premises: formData.businessPremises,
                            type: formData.businessType, turnover: formData.annualTurnover,
                            age: formData.businessAge, regProof: formData.businessRegProof,
                            address: formData.businessAddress
                        },
                        personalDetails: {
                            dob: formData.dob, maritalStatus: formData.maritalStatus,
                            spouseName: formData.spouseName, motherName: formData.motherName,
                            alternateNumber: formData.alternateNumber, dependents: formData.dependents
                        },
                        addressDetails: {
                            line1: formData.addressLine1, line2: formData.addressLine2,
                            landmark: formData.landmark, state: formData.state,
                            district: formData.district, city: formData.city,
                            residenceType: formData.residenceType, propertyAddressPincode: formData.propertyAddressPincode
                        },
                        incomeDetails: {
                            companyName: formData.companyName, designation: formData.designation,
                            companyAddress: formData.companyAddress,
                            netSalary: formData.netSalary,
                            salaryMode: formData.salaryMode, jobStability: formData.jobStability
                        },
                        propertyDetails: {
                            type: formData.propertyType, status: formData.propertyStatus, value: formData.propertyValue
                        },
                        otherDetails: { runningLoans: formData.runningLoans },
                        pdfPasswords: formData.pdfPasswords
                    },
                    ...uploadedFileIds,
                    status: 'Pending',
                    declarationAccepted: formData.declarationAccepted
                }
            };

            console.log('Sending Loan Application Payload:', JSON.stringify(payload, null, 2));

            const res = await fetch(strapiPublicApi('/strapi-api/loan-applications'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const contentType = res.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await res.json();
                    throw new Error(errorData?.error?.message || 'Submission failed');
                } else {
                    const errorText = await res.text();
                    console.error('Non-JSON Error Response:', errorText.substring(0, 500));
                    throw new Error(`Server Error (${res.status}): Please check if Strapi is accessible.`);
                }
            }

            router.push('/loan-application-success');
        } catch (err: any) {
            console.error('Submission Error:', err);
            setSubmitError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getValidationErrors = () => {
        const errors = [];
        const isBusinessStyleFlow = loanType === 'Business Loan' || occupation === 'Self Employed';

        // 1. Business Tab (Required for Business Loan or Self Employed LAP/Home)
        if (isBusinessStyleFlow) {
            if (!formData.businessName) errors.push(`Please enter "${pageInfo.businessNameLabel || 'Business Name'}*" in "Business" tab.`);
            if (!formData.businessPremises) errors.push(`Please enter "${pageInfo.businessPremisesLabel || 'Business Premises'}*" in "Business" tab.`);
            if (!formData.businessType) errors.push(`Please enter "${pageInfo.businessTypeLabel || 'Business Type'}*" in "Business" tab.`);
            if (!formData.annualTurnover) errors.push(`Please enter "${pageInfo.annualTurnoverLabel || 'Annual Turnover'}*" in "Business" tab.`);
            if (!formData.businessAge) errors.push(`Please enter "${pageInfo.businessAgeLabel || 'Business Age'}*" in "Business" tab.`);
            if (!formData.businessRegProof) errors.push(`Please select "${pageInfo.businessRegProofLabel || 'Business Registration Proof'}*" in "Business" tab.`);
            if (!formData.businessAddress) errors.push(`Please enter "${pageInfo.businessAddressLabel || 'Business Address'}*" in "Business" tab.`);

            // Require Personal, Residence, Property for SE if applicable
            if (!formData.dob) errors.push(`Please enter "${pageInfo.dobLabel || 'Date of Birth'}*" in "Personal" tab.`);
            if (!formData.maritalStatus) errors.push(`Please enter "${pageInfo.maritalStatusLabel || 'Marital Status'}*" in "Personal" tab.`);
            if (!formData.motherName) errors.push(`Please enter "${pageInfo.motherNameLabel || 'Mother Name'}*" in "Personal" tab.`);

            if (!formData.addressLine1) errors.push(`Please enter "${pageInfo.addressLine1Label || 'Address Line 1'}*" in "Residence" tab.`);
            if (!formData.landmark) errors.push(`Please enter "${pageInfo.landmarkLabel || 'Landmark'}*" in "Residence" tab.`);
            if (!formData.state) errors.push(`Please enter "${pageInfo.stateLabel || 'State'}*" in "Residence" tab.`);
            if (!formData.district) errors.push(`Please enter "${pageInfo.districtLabel || 'District'}*" in "Residence" tab.`);
            if (!formData.city) errors.push(`Please enter "${pageInfo.cityLabel || 'City'}*" in "Residence" tab.`);
            if (!formData.residenceType) errors.push(`Please enter "${pageInfo.residenceTypeLabel || 'Residence Type'}*" in "Residence" tab.`);

            if (loanType === 'Home Loan') {
                if (!formData.propertyType) errors.push(`Please select "${pageInfo.propertyTypeLabel || 'Property Type'}*" in "Property" tab.`);
                if (!formData.propertyStatus) errors.push(`Please select "${pageInfo.propertyStatusLabel || 'Property Status'}*" in "Property" tab.`);
                if (!formData.propertyValue) errors.push(`Please select "${pageInfo.propertyValueLabel || 'Property Value'}*" in "Property" tab.`);
                if (!formData.propertyAddressPincode) {
                    errors.push(`Please enter "${pageInfo.propertyAddressPincodeLabel || 'Property Address With Pincode'}*" in "Property" tab.`);
                }
            }

            if (!formData.uploadedFields['proprietorshipDoc']) {
                const label = formData.businessType ? `Document for ${formData.businessType}` : 'Business Type Document';
                errors.push(`Please upload "${label}*" in "Docs" tab.`);
            }
            return errors;
        }

        // 2. Standard Validation for other loans (Personal, Home Salaried, LAP Salaried)
        const isLAPStandard = loanType === 'LAP' || loanType === 'LAP (Loan Against Property)';
        if (!formData.dob) errors.push(`Please enter "${pageInfo.dobLabel || 'Date of Birth'}*" in "Personal" tab.`);
        if (!formData.maritalStatus) errors.push(`Please enter "${pageInfo.maritalStatusLabel || 'Marital Status'}*" in "Personal" tab.`);
        if (!formData.motherName) errors.push(`Please enter "${pageInfo.motherNameLabel || 'Mother Name'}*" in "Personal" tab.`);

        if (!formData.addressLine1) {
            errors.push(`Please enter "${pageInfo.addressLine1Label || 'Address Line 1'}*" in "Residence" tab.`);
        }
        if (!formData.landmark) errors.push(`Please enter "${pageInfo.landmarkLabel || 'Landmark'}*" in "Residence" tab.`);
        if (!formData.state) errors.push(`Please enter "${pageInfo.stateLabel || 'State'}*" in "Residence" tab.`);
        if (!formData.district) errors.push(`Please enter "${pageInfo.districtLabel || 'District'}*" in "Residence" tab.`);
        if (!formData.city) errors.push(`Please enter "${pageInfo.cityLabel || 'City'}*" in "Residence" tab.`);
        if (!formData.residenceType) errors.push(`Please enter "${pageInfo.residenceTypeLabel || 'Residence Type'}*" in "Residence" tab.`);

        if (loanType === 'Home Loan' || isLAPStandard) {
            const tabName = isLAPStandard ? 'Residence' : 'Property';
            if (loanType === 'Home Loan') {
                if (!formData.propertyType) errors.push(`Please enter "${pageInfo.propertyTypeLabel || 'Property Type'}*" in "${tabName}" tab.`);
                if (!formData.propertyStatus) errors.push(`Please enter "${pageInfo.propertyStatusLabel || 'Property Status'}*" in "${tabName}" tab.`);
                if (!formData.propertyValue) errors.push(`Please enter "${pageInfo.propertyValueLabel || 'Property Value'}*" in "${tabName}" tab.`);
                if (!formData.propertyAddressPincode) errors.push(`Please enter "${pageInfo.propertyAddressPincodeLabel || 'Property Address With Pincode'}*" in "${tabName}" tab.`);
            }
        }

        if (!formData.companyName) errors.push(`Please enter "${pageInfo.companyNameLabel || 'Company Name'}*" in "Income" tab.`);
        if (!formData.designation) errors.push(`Please enter "${pageInfo.designationLabel || 'Designation'}*" in "Income" tab.`);
        if (!formData.netSalary) errors.push(`Please enter "${pageInfo.netSalaryLabel || 'Net Salary'}*" in "Income" tab.`);
        if (!formData.salaryMode) errors.push(`Please enter "${pageInfo.salaryModeLabel || 'Salary Mode'}*" in "Income" tab.`);
        if (!formData.jobStability) errors.push(`Please enter "${pageInfo.jobStabilityLabel || 'Current Job Stability'}*" in "Income" tab.`);

        if (!formData.uploadedFields['panCard']) errors.push(`Please upload "${pageInfo.panCardLabel || 'Pan Card'}*" in "Docs" tab.`);
        if (!formData.uploadedFields['aadharCardFront']) errors.push(`Please upload "${pageInfo.adharFrontLabel || 'Aadhar Card Front'}*" in "Docs" tab.`);
        if (!formData.uploadedFields['aadharCardBack']) errors.push(`Please upload "${pageInfo.adharBackLabel || 'Aadhar Card Back'}*" in "Docs" tab.`);

        if (loanType === 'Home Loan') {
            if (!formData.uploadedFields['coAppPan']) errors.push(`Please upload "${pageInfo.coAppPanLabel || 'Co-Applicant Pan Card'}*" in "Docs" tab.`);
            if (!formData.uploadedFields['coAppAadharFront']) errors.push(`Please upload "${pageInfo.coAppAadharFrontLabel || 'Co-Applicant Aadhar Card Front'}*" in "Docs" tab.`);
            if (!formData.uploadedFields['coAppAadharBack']) errors.push(`Please upload "${pageInfo.coAppAadharBackLabel || 'Co-Applicant Aadhar Card Back'}*" in "Docs" tab.`);
            if (!formData.uploadedFields['salarySlips']) errors.push(`Please upload "${pageInfo.salarySlipsLabel || 'Salary Slip 1 year'}*" in "Docs" tab.`);
            if (!formData.uploadedFields['bankStatement']) errors.push(`Please upload "${pageInfo.bankStatementLabel || '6 Month Bank Statement'}*" in "Docs" tab.`);
            if (!formData.uploadedFields['propertyPapers']) errors.push(`Please upload "${pageInfo.propertyPapersLabel || 'Property Papers'}*" in "Docs" tab.`);
        } else if (loanType === 'Personal Loan' || isLAPStandard) {
            if (!formData.uploadedFields['salarySlips']) errors.push(`Please upload "${pageInfo.salarySlipsLabel || 'Salary Slip 1 year'}*" in "Docs" tab.`);
            if (!formData.uploadedFields['bankStatement']) errors.push(`Please upload "${pageInfo.bankStatementLabel || '6 Month Bank Statement'}*" in "Docs" tab.`);
        }

        return errors;
    };

    const renderStep = () => {
        const step = STEPS[currentStep - 1];
        if (!step) return null;

        const funnelProps = {
            stepName: step.name,
            formData,
            setFormData,
            handleChange,
            handleFileChange,
            handleSingleUpload,
            handleAddLoan,
            pageInfo,
            loanProfile,
            leadId,
            vErrors: getValidationErrors(),
            loanType,
            occupation
        };

        switch (loanType) {
            case 'Business Loan':
                return <BusinessLoanFunnel {...funnelProps} />;
            case 'Home Loan':
                return <HomeLoanFunnel {...funnelProps} />;
            case 'LAP':
            case 'LAP (Loan Against Property)':
                return <LAPFunnel {...funnelProps} />;
            case 'Personal Loan':
            default:
                return <PersonalLoanFunnel {...funnelProps} />;
        }
    };

    return (
        <section className="loan-app-section">
            <div className="container animate-fade-in delay-200">

                <div className="loan-app-header-container shadow-sm">
                    {/* Green Success Bar now containing Lead info with Occupation */}
                    <div className="status-success-bar">
                        {loanType} - {occupation} Lead #{leadId}
                    </div>

                    {/* Stepper Header */}
                    <div className="step-nav">
                        {STEPS.map((step, index) => {
                            const isActive = index + 1 === currentStep;
                            return (
                                <div 
                                    key={step.id} 
                                    className={`step-item ${isActive ? 'active' : ''}`}
                                    onClick={() => setCurrentStep(index + 1)}
                                >
                                    <span className="step-number">{index + 1}</span>
                                    <span className="step-name">{step.name}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="card shadow-sm loan-form-card">
                    <div className="loan-step-header">
                        <h2 className="loan-step-title">{STEPS[currentStep - 1].name} Details</h2>
                    </div>

                    {renderStep()}

                    {/* Applicant Profile Footer Bar - Shown on all steps except final Summary */}
                    {currentStep < STEPS.length && (
                        <div className="loan-app-footer-profile shadow-sm">
                            <div className="footer-profile-header">
                                <span className="loan-profile-icon">👤</span>
                                <span className="footer-profile-name">{loanProfile.name}</span>
                            </div>
                            
                            <div className="footer-details-grid">
                                {/* Contact Info */}
                                <div className="footer-contact-col">
                                    <span className="footer-contact-label">Contact Details</span>
                                    <div className="footer-contact-item">
                                        <span>📞</span> {loanProfile.phone}
                                    </div>
                                    <div className="footer-contact-item">
                                        <span>✉</span> {loanProfile.email}
                                    </div>
                                </div>

                                {/* Loan Info */}
                                <div className="footer-loan-col">
                                    <span className="loan-profile-icon">💵</span>
                                    <div className="loan-type-info">
                                        <span className="loan-badge loan-badge-inline">LOAN</span>
                                        <span className="footer-loan-title">{loanType}</span>
                                    </div>
                                </div>

                                {/* Amount Info */}
                                <div className="footer-amount-col">
                                    <div className="loan-docs-icon">
                                        <span>📚</span>
                                    </div>
                                    <div className="footer-amount-box">
                                        <span className="footer-amount-label">Required Loan Amount</span>
                                        <div className="footer-amount-value">₹ {formData.loanAmount.toLocaleString('en-IN')}.00</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="loan-app-footer">
                        <button
                            type="button"
                            className={`btn btn-secondary ${currentStep === 1 ? 'btn-back-disabled' : ''}`}
                            onClick={prevStep}
                        >
                            Back
                        </button>

                        <div className="loan-nav-spacer"></div>

                        {submitError && (
                            <div className="loan-error-msg">
                                {submitError}
                            </div>
                        )}

                        {currentStep < STEPS.length ? (
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={nextStep}
                            >
                                {pageInfo.nextStepButtonLabel || 'Next Step →'}
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="btn btn-primary"
                                disabled={isSubmitting || !formData.declarationAccepted || getValidationErrors().length > 0}
                                onClick={handleSubmit}
                            >
                                {isSubmitting ? (pageInfo.submittingButtonLabel || 'Submitting...') : (pageInfo.submitButtonLabel || 'Save & Submit Lead')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
