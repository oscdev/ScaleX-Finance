
import React from 'react';
import { 
    LoanRequirementField, 
    FullNameField, 
    MobileNumberField, 
    PropertyTypeField,
    PropertyStatusField,
    PropertyValueField,
    AadharCardField, 
    PanCardField, 
    PinCodeField, 
    EmailField, 
    EmploymentTypeField,
    NotificationField 
} from '../LeadFields';

export default function LAPFunnel({ formData, errors, handleChange, pageInfo }: any) {
    return (
        <div className="lead-form-grid">
            <LoanRequirementField formData={formData} errors={errors} handleChange={handleChange} pageInfo={pageInfo} />
            <FullNameField formData={formData} errors={errors} handleChange={handleChange} pageInfo={pageInfo} />
            <MobileNumberField formData={formData} errors={errors} handleChange={handleChange} pageInfo={pageInfo} />
            <PropertyTypeField formData={formData} errors={errors} handleChange={handleChange} pageInfo={pageInfo} />
            <PropertyStatusField formData={formData} errors={errors} handleChange={handleChange} pageInfo={pageInfo} />
            <PropertyValueField formData={formData} errors={errors} handleChange={handleChange} pageInfo={pageInfo} />
            <AadharCardField formData={formData} errors={errors} handleChange={handleChange} pageInfo={pageInfo} />
            <PanCardField formData={formData} errors={errors} handleChange={handleChange} pageInfo={pageInfo} />
            <PinCodeField formData={formData} errors={errors} handleChange={handleChange} pageInfo={pageInfo} />
            <EmailField formData={formData} errors={errors} handleChange={handleChange} pageInfo={pageInfo} />
            <EmploymentTypeField formData={formData} errors={errors} handleChange={handleChange} pageInfo={pageInfo} />
            <NotificationField formData={formData} handleChange={handleChange} pageInfo={pageInfo} />
        </div>
    );
}
