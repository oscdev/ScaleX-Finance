
import React from 'react';
import {
    BusinessDetailsFields,
    PersonalDetailsFields,
    ResidenceDetailsFields,
    PropertyFields,
    IncomeDetailsFields,
    OtherDetailsFields,
    DocumentsFields,
    SummarySection
} from '../LoanFields';

export default function HomeLoanFunnel({
    stepName,
    formData,
    setFormData,
    handleChange,
    handleFileChange,
    handleSingleUpload,
    handleAddLoan,
    pageInfo,
    loanProfile,
    leadId,
    vErrors,
    loanType,
    occupation
}: any) {
    switch (stepName) {
        case 'Business': return <BusinessDetailsFields formData={formData} handleChange={handleChange} pageInfo={pageInfo} loanType={loanType} setFormData={setFormData} />;
        case 'Personal': return <PersonalDetailsFields formData={formData} handleChange={handleChange} pageInfo={pageInfo} loanType={loanType} />;
        case 'Residence': return <ResidenceDetailsFields formData={formData} handleChange={handleChange} pageInfo={pageInfo} />;
        case 'Property': return <PropertyFields formData={formData} handleChange={handleChange} pageInfo={pageInfo} loanType={loanType} occupation={occupation} />;
        case 'Income': return <IncomeDetailsFields formData={formData} handleChange={handleChange} pageInfo={pageInfo} />;
        case 'Other': return <OtherDetailsFields formData={formData} handleChange={handleChange} pageInfo={pageInfo} handleAddLoan={handleAddLoan} />;
        case 'Docs':
        case 'Documents': return <DocumentsFields formData={formData} setFormData={setFormData} handleFileChange={handleFileChange} handleSingleUpload={handleSingleUpload} pageInfo={pageInfo} loanType={loanType} occupation={occupation} />;
        case 'Submit':
        case 'Submit Lead': return <SummarySection formData={formData} loanProfile={loanProfile} leadId={leadId} pageInfo={pageInfo} loanType={loanType} occupation={occupation} vErrors={vErrors} handleChange={handleChange} />;
        default: return null;
    }
}
