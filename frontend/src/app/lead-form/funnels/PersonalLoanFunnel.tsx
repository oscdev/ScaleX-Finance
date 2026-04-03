
import React from 'react';
import { 
    LoanRequirementField, 
    FullNameField, 
    MobileNumberField, 
    AadharCardField, 
    PanCardField, 
    PinCodeField, 
    EmailField, 
    NotificationField 
} from '../LeadFields';

export default function PersonalLoanFunnel({ formData, errors, handleChange, pageInfo }: any) {
    return (
        <div className="lead-form-grid">
            <LoanRequirementField formData={formData} errors={errors} handleChange={handleChange} pageInfo={pageInfo} />
            <FullNameField formData={formData} errors={errors} handleChange={handleChange} pageInfo={pageInfo} />
            <MobileNumberField formData={formData} errors={errors} handleChange={handleChange} pageInfo={pageInfo} />
            <AadharCardField formData={formData} errors={errors} handleChange={handleChange} pageInfo={pageInfo} />
            <PanCardField formData={formData} errors={errors} handleChange={handleChange} pageInfo={pageInfo} />
            <PinCodeField formData={formData} errors={errors} handleChange={handleChange} pageInfo={pageInfo} />
            <EmailField formData={formData} errors={errors} handleChange={handleChange} pageInfo={pageInfo} />
            <NotificationField formData={formData} handleChange={handleChange} pageInfo={pageInfo} />
        </div>
    );
}
