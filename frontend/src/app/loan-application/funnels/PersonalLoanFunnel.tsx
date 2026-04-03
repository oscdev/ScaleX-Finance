
import React from 'react';
import {
    PersonalDetailsFields,
    ResidenceDetailsFields,
    IncomeDetailsFields,
    OtherDetailsFields,
    DocumentsFields,
    SummarySection
} from '../LoanFields';

export default function PersonalLoanFunnel({
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
        case 'Personal': return <PersonalDetailsFields formData={formData} handleChange={handleChange} pageInfo={pageInfo} loanType={loanType} />;
        case 'Residence': return <ResidenceDetailsFields formData={formData} handleChange={handleChange} pageInfo={pageInfo} />;
        case 'Income': return <IncomeDetailsFields formData={formData} handleChange={handleChange} pageInfo={pageInfo} />;
        case 'Other': return <OtherDetailsFields formData={formData} handleChange={handleChange} pageInfo={pageInfo} handleAddLoan={handleAddLoan} />;
        case 'Docs':
        case 'Documents': return <DocumentsFields formData={formData} setFormData={setFormData} handleFileChange={handleFileChange} handleSingleUpload={handleSingleUpload} pageInfo={pageInfo} loanType={loanType} occupation={occupation} />;
        case 'Submit':
        case 'Submit Lead': return <SummarySection formData={formData} loanProfile={loanProfile} leadId={leadId} pageInfo={pageInfo} loanType={loanType} occupation={occupation} vErrors={vErrors} handleChange={handleChange} />;
        default: return null;
    }
}
