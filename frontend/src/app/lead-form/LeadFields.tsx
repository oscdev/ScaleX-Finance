
import React from 'react';

interface FieldProps {
    formData: any;
    errors: any;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    pageInfo: any;
}

const Label = ({ text }: { text: string }) => (
    <label className="lead-form-label">{text.replace('*', '')}<span className="required-star">*</span></label>
);

export const FullNameField = ({ formData, errors, handleChange, pageInfo }: FieldProps) => {
    const label = pageInfo.fullNameLabel || "Customer Name*";
    const placeholder = pageInfo.fullNamePlaceholder || "Enter Customer Name";
    return (
        <div>
            <Label text={label} />
            <input
                className={`lead-form-input ${errors.fullName ? 'is-error' : ''}`}
                type="text"
                name="fullName"
                placeholder={placeholder}
                value={formData.fullName}
                onChange={handleChange}
            />
            {errors.fullName && <div className="lead-form-error">{errors.fullName}</div>}
        </div>
    );
};

export const EmailField = ({ formData, errors, handleChange, pageInfo }: FieldProps) => {
    const label = pageInfo.emailLabel || "Customer Email*";
    const placeholder = pageInfo.emailPlaceholder || "customer@example.com";
    return (
        <div>
            <Label text={label} />
            <input
                className={`lead-form-input ${errors.email ? 'is-error' : ''}`}
                type="email"
                name="email"
                placeholder={placeholder}
                value={formData.email}
                onChange={handleChange}
            />
            {errors.email && <div className="lead-form-error">{errors.email}</div>}
        </div>
    );
};

export const LoanRequirementField = ({ formData, errors, handleChange, pageInfo }: FieldProps) => {
    const label = pageInfo.loanRequirementLabel || "Loan Requirement*";
    const placeholder = pageInfo.loanRequirementPlaceholder || "500000";
    return (
        <div>
            <Label text={label} />
            <input
                className={`lead-form-input ${errors.requiredAmount ? 'is-error' : ''}`}
                type="number"
                name="requiredAmount"
                placeholder={placeholder}
                value={formData.requiredAmount}
                onChange={handleChange}
            />
            {errors.requiredAmount && <div className="lead-form-error">{errors.requiredAmount}</div>}
        </div>
    );
};

export const MobileNumberField = ({ formData, errors, handleChange, pageInfo }: FieldProps) => {
    const label = pageInfo.mobileNumberLabel || "Customer Mobile*";
    const placeholder = pageInfo.mobileNumberPlaceholder || "9876543210";
    return (
        <div>
            <Label text={label} />
            <input
                className={`lead-form-input ${errors.mobileNumber ? 'is-error' : ''}`}
                type="tel"
                name="mobileNumber"
                placeholder={placeholder}
                value={formData.mobileNumber}
                onChange={handleChange}
            />
            {errors.mobileNumber && <div className="lead-form-error">{errors.mobileNumber}</div>}
        </div>
    );
};

export const PinCodeField = ({ formData, errors, handleChange, pageInfo }: FieldProps) => {
    const label = pageInfo.pinCodeLabel || "Pincode*";
    const placeholder = pageInfo.pinCodePlaceholder || "400001";
    return (
        <div>
            <Label text={label} />
            <input
                className={`lead-form-input ${errors.pinCode ? 'is-error' : ''}`}
                type="text"
                name="pinCode"
                placeholder={placeholder}
                value={formData.pinCode}
                onChange={handleChange}
                maxLength={6}
            />
            {errors.pinCode && <div className="lead-form-error">{errors.pinCode}</div>}
        </div>
    );
};

export const AadharCardField = ({ formData, errors, handleChange, pageInfo }: FieldProps) => {
    const label = pageInfo.aadharCardLabel || "Aadhar Card*";
    const placeholder = pageInfo.aadharCardPlaceholder || "1234 5678 9012";
    return (
        <div>
            <Label text={label} />
            <input
                className={`lead-form-input ${errors.aadharCard ? 'is-error' : ''}`}
                type="text"
                name="aadharCard"
                placeholder={placeholder}
                value={formData.aadharCard}
                onChange={handleChange}
            />
            {errors.aadharCard && <div className="lead-form-error">{errors.aadharCard}</div>}
        </div>
    );
};

export const PanCardField = ({ formData, errors, handleChange, pageInfo }: FieldProps) => {
    const label = pageInfo.panCardLabel || "Pan Card*";
    const placeholder = pageInfo.panCardPlaceholder || "ABCDE1234F";
    return (
        <div>
            <Label text={label} />
            <input
                className={`lead-form-input ${errors.panCard ? 'is-error' : ''}`}
                type="text"
                name="panCard"
                placeholder={placeholder}
                value={formData.panCard}
                onChange={handleChange}
            />
            {errors.panCard && <div className="lead-form-error">{errors.panCard}</div>}
        </div>
    );
};

export const PropertyTypeField = ({ formData, errors, handleChange, pageInfo }: FieldProps) => {
    const label = pageInfo.propertyTypeLabel || "Property Type*";
    const placeholder = pageInfo.propertyTypePlaceholder || "Select Property Type";
    const optionsArr = (pageInfo.propertyTypeOptions ?? "Residential, Commercial, Industrial").split(',').map((o: string) => o.trim()).filter(Boolean);
    return (
        <div>
            <Label text={label} />
            <select
                className={`lead-form-input ${errors.propertyType ? 'is-error' : ''}`}
                name="propertyType"
                value={formData.propertyType}
                onChange={handleChange}
            >
                <option value="">{placeholder}</option>
                {optionsArr.map((opt: string) => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
            {errors.propertyType && <div className="lead-form-error">{errors.propertyType}</div>}
        </div>
    );
};

export const PropertyStatusField = ({ formData, errors, handleChange, pageInfo }: FieldProps) => {
    const label = pageInfo.propertyStatusLabel || "Property Current Status*";
    const placeholder = pageInfo.propertyStatusPlaceholder || "Select Status";
    const optionsArr = (pageInfo.propertyStatusOptions ?? "Constructed, Plot, Boundaries").split(',').map((o: string) => o.trim()).filter(Boolean);
    return (
        <div>
            <Label text={label} />
            <select
                className={`lead-form-input ${errors.propertyStatus ? 'is-error' : ''}`}
                name="propertyStatus"
                value={formData.propertyStatus}
                onChange={handleChange}
            >
                <option value="">{placeholder}</option>
                {optionsArr.map((opt: string) => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
            {errors.propertyStatus && <div className="lead-form-error">{errors.propertyStatus}</div>}
        </div>
    );
};

export const PropertyValueField = ({ formData, errors, handleChange, pageInfo }: FieldProps) => {
    const label = pageInfo.propertyValueLabel || "Property Value*";
    const placeholder = pageInfo.propertyValuePlaceholder || "50,00,000";
    return (
        <div>
            <Label text={label} />
            <input
                className={`lead-form-input ${errors.propertyValue ? 'is-error' : ''}`}
                type="number"
                name="propertyValue"
                placeholder={placeholder}
                value={formData.propertyValue}
                onChange={handleChange}
            />
            {errors.propertyValue && <div className="lead-form-error">{errors.propertyValue}</div>}
        </div>
    );
};

export const EmploymentTypeField = ({ formData, errors, handleChange, pageInfo }: FieldProps) => {
    const label = pageInfo.employmentTypeLabel || "Occupation*";
    const placeholder = pageInfo.employmentTypePlaceholder || "Select Occupation";
    const optionsArr = (pageInfo.employmentTypeOptions ?? "Salaried, Self Employed").split(',').map((o: string) => o.trim()).filter(Boolean);
    return (
        <div>
            <Label text={label} />
            <select
                className={`lead-form-input ${errors.employmentType ? 'is-error' : ''}`}
                name="employmentType"
                value={formData.employmentType}
                onChange={handleChange}
            >
                <option value="">{placeholder}</option>
                {optionsArr.map((opt: string) => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
            {errors.employmentType && <div className="lead-form-error">{errors.employmentType}</div>}
        </div>
    );
};

export const LeadTypeField = ({ formData, errors, handleChange, pageInfo }: FieldProps) => {
    const label = pageInfo.leadTypeLabel || "Lead Type*";
    const placeholder = pageInfo.leadTypePlaceholder || "Select Lead Type";
    const optionsArr = (pageInfo.leadTypeOptions ?? "Fresh (New Lead), BT (Balance Transfer)").split(',').map((o: string) => o.trim()).filter(Boolean);
    return (
        <div>
            <Label text={label} />
            <select
                className={`lead-form-input ${errors.leadType ? 'is-error' : ''}`}
                name="leadType"
                value={formData.leadType}
                onChange={handleChange}
            >
                <option value="">{placeholder}</option>
                {optionsArr.map((opt: string) => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
            {errors.leadType && <div className="lead-form-error">{errors.leadType}</div>}
        </div>
    );
};

export const NotificationField = ({ formData, handleChange, pageInfo }: any) => {
    const label = pageInfo.getEmailNotificationLabel || "Get Email Notification for Lead Updated?*";
    return (
        <div>
            <label className="lead-form-label">{label.replace('*', '')}<span className="required-star">*</span></label>
            <div className="lead-form-radio-group">
                <label className="lead-form-radio-label">
                    <input type="radio" name="getEmailNotification" value="Yes" checked={formData.getEmailNotification === 'Yes'} onChange={handleChange} /> Yes
                </label>
                <label className="lead-form-radio-label">
                    <input type="radio" name="getEmailNotification" value="No" checked={formData.getEmailNotification === 'No'} onChange={handleChange} /> No
                </label>
            </div>
        </div>
    );
};

export const AdvisorReferralField = ({ formData, handleChange, isAutoPopulated }: any) => {
    return (
        <div className="lead-form-advisor-field">
            <label className="lead-form-label">Advisor Referral ID (Optional)</label>
            <input
                className={`lead-form-input ${isAutoPopulated ? 'is-disabled' : ''}`}
                type="text"
                name="advisorReferralId"
                placeholder="ADV123456"
                value={formData.advisorReferralId}
                onChange={handleChange}
                readOnly={isAutoPopulated}
                disabled={isAutoPopulated}
            />
        </div>
    );
};
