
import React, { useState } from 'react';
import { INDIA_STATES_DISTRICTS } from '@/data/india-states-districts';

interface FieldProps {
    formData: any;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    pageInfo: any;
}

export const BusinessDetailsFields = ({ formData, handleChange, pageInfo }: FieldProps) => (
    <div className="animate-fade-in card-grid-2">
        <div className="form-group">
            <label className="form-label">{pageInfo.businessNameLabel || 'Business Name'}<span className="required-star">*</span></label>
            <input name="businessName" className="form-input" value={formData.businessName} onChange={handleChange} placeholder={pageInfo.businessNamePlaceholder || 'Enter Business Name'} />
        </div>
        <div className="form-group">
            <label className="form-label">{pageInfo.businessPremisesLabel || 'Business Premises'}<span className="required-star">*</span></label>
            <select name="businessPremises" className="form-select" value={formData.businessPremises} onChange={handleChange}>
                <option value="">Select</option>
                {(pageInfo.businessPremisesOptions || 'Owned, Rented, Lease').split(',').map((opt: string) => (
                    <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                ))}
            </select>
        </div>
        <div className="form-group">
            <label className="form-label">{pageInfo.businessTypeLabel || 'Business Type'}<span className="required-star">*</span></label>
            <select name="businessType" className="form-select" value={formData.businessType} onChange={handleChange}>
                <option value="">Select Type</option>
                {(pageInfo.businessTypeOptions || 'Proprietorship, Partnership, Private Limited').split(',').map((opt: string) => (
                    <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                ))}
            </select>
        </div>
        <div className="form-group">
            <label className="form-label">{pageInfo.annualTurnoverLabel || 'Annual Turnover'}<span className="required-star">*</span></label>
            <select name="annualTurnover" className="form-select" value={formData.annualTurnover} onChange={handleChange}>
                <option value="">Select Turnover</option>
                {(pageInfo.annualTurnoverOptions || '20 Lakh, 50 Lakh, 80 Lakh, 1 Crore+, 2 Crore+, 3 Crore+, 5 Crore+').split(',').map((opt: string) => (
                    <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                ))}
            </select>
        </div>
        <div className="form-group">
            <label className="form-label">{pageInfo.businessAgeLabel || 'Business Age'}<span className="required-star">*</span></label>
            <select name="businessAge" className="form-select" value={formData.businessAge} onChange={handleChange}>
                <option value="">Select Age</option>
                {(pageInfo.businessAgeOptions || '6 Months, 1 years, 2 Years, 3 Years+').split(',').map((opt: string) => (
                    <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                ))}
            </select>
        </div>
        <div className="form-group">
            <label className="form-label">{pageInfo.businessRegProofLabel || 'Business Registration Proof'}<span className="required-star">*</span></label>
            <select name="businessRegProof" className="form-select" value={formData.businessRegProof} onChange={handleChange}>
                <option value="">Select Proof</option>
                {(pageInfo.businessRegProofOptions || 'GST, TIN, MSME, Shop Establishment Certificate, Trade License, Fssai License, Udyam Certificate, Gumasta Certificate').split(',').map((opt: string) => (
                    <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                ))}
            </select>
        </div>
        <div className="form-group business-address-container">
            <label className="form-label">{pageInfo.businessAddressLabel || 'Business Address'}<span className="required-star">*</span></label>
            <textarea name="businessAddress" className="form-textarea" value={formData.businessAddress} onChange={handleChange} placeholder={pageInfo.businessAddressPlaceholder || 'Enter full business address'} />
        </div>
    </div>
);

export const PersonalDetailsFields = ({ formData, handleChange, pageInfo, loanType }: any) => (
    <div className="animate-fade-in card-grid-2">
        <div className="form-group"><label className="form-label">{pageInfo.dobLabel || 'Date of Birth'}<span className="required-star">*</span></label><input type="date" name="dob" className="form-input" value={formData.dob} onChange={handleChange} /></div>
        <div className="form-group"><label className="form-label">{pageInfo.maritalStatusLabel || 'Marital Status'}<span className="required-star">*</span></label>
            <select name="maritalStatus" className="form-select" value={formData.maritalStatus} onChange={handleChange}>
                <option value="">Select</option>
                {(pageInfo.maritalStatusOptions || 'Single, Married, Divorced, Widowed').split(',').map((opt: string) => (
                    <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                ))}
            </select>
        </div>
        <div className="form-group"><label className="form-label">{pageInfo.spouseNameLabel || 'Spouse Name'}</label><input name="spouseName" className="form-input" value={formData.spouseName} onChange={handleChange} placeholder={pageInfo.spouseNamePlaceholder || 'Enter Spouse Name'} /></div>
        <div className="form-group"><label className="form-label">{pageInfo.motherNameLabel || 'Mother Name'}<span className="required-star">*</span></label><input name="motherName" className="form-input" value={formData.motherName} onChange={handleChange} placeholder={pageInfo.motherNamePlaceholder || 'Enter Mother Name'} /></div>
        <div className="form-group"><label className="form-label">{pageInfo.alternateNumberLabel || 'Alternate Number'}</label><input name="alternateNumber" className="form-input" value={formData.alternateNumber} onChange={handleChange} placeholder={pageInfo.alternateNumberPlaceholder || 'Enter Alternate Mobile'} /></div>
        {(loanType !== 'Business Loan') && <div className="form-group"><label className="form-label">{pageInfo.dependentsLabel || 'Dependent'}</label><input name="dependents" className="form-input" value={formData.dependents} onChange={handleChange} placeholder={pageInfo.dependentsPlaceholder || 'Enter number of dependents'} /></div>}
    </div>
);

export const ResidenceDetailsFields = ({ formData, handleChange, pageInfo }: FieldProps) => {
    const selectedStateData = INDIA_STATES_DISTRICTS.find(s => s.state === formData.state);
    const districtOptions = selectedStateData ? selectedStateData.districts : [];

    return (
        <div className="animate-fade-in card-grid-2">
            <div className="form-group business-address-container">
                <label className="form-label">{pageInfo.addressLine1Label || 'Address Line 1'}<span className="required-star">*</span></label>
                <input name="addressLine1" className="form-input" value={formData.addressLine1} onChange={handleChange} placeholder={pageInfo.addressLine1Placeholder || 'Enter address'} />
            </div>
            <div className="form-group business-address-container">
                <label className="form-label">{pageInfo.addressLine2Label || 'Address Line 2'}</label>
                <input name="addressLine2" className="form-input" value={formData.addressLine2} onChange={handleChange} placeholder={pageInfo.addressLine2Placeholder || 'Enter address line 2'} />
            </div>
            <div className="form-group">
                <label className="form-label">{pageInfo.landmarkLabel || 'Landmark'}<span className="required-star">*</span></label>
                <input name="landmark" className="form-input" value={formData.landmark} onChange={handleChange} placeholder={pageInfo.landmarkPlaceholder || 'Enter landmark'} />
            </div>

            <div className="form-group">
                <label className="form-label">{pageInfo.stateLabel || 'State'}<span className="required-star">*</span></label>
                <select name="state" className="form-select" value={formData.state} onChange={handleChange}>
                    <option value="">Select State</option>
                    {INDIA_STATES_DISTRICTS.map(s => (
                        <option key={s.state} value={s.state}>{s.state}</option>
                    ))}
                </select>
            </div>

            <div className="form-group">
                <label className="form-label">{pageInfo.districtLabel || 'District'}<span className="required-star">*</span></label>
                <select name="district" className="form-select" value={formData.district} onChange={handleChange} disabled={!formData.state}>
                    <option value="">Select District</option>
                    {districtOptions.map(d => (
                        <option key={d} value={d}>{d}</option>
                    ))}
                </select>
            </div>

            <div className="form-group">
                <label className="form-label">{pageInfo.cityLabel || 'City'}<span className="required-star">*</span></label>
                <input name="city" className="form-input" value={formData.city} onChange={handleChange} placeholder={pageInfo.cityPlaceholder || 'Enter city'} />
            </div>

            <div className="form-group">
                <label className="form-label">{pageInfo.residenceTypeLabel || 'Residence Type'}<span className="required-star">*</span></label>
                <select name="residenceType" className="form-select" value={formData.residenceType} onChange={handleChange}>
                    <option value="">Select</option>
                    {(pageInfo.residenceTypeOptions || 'Owned, Rented, Parental, Company Accommodation').split(',').map((opt: string) => (
                        <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export const PropertyFields = ({ formData, handleChange, pageInfo, loanType, occupation }: any) => (
    <div className="animate-fade-in card-grid-2">
        <div className="form-group">
            <label className="form-label">{pageInfo.propertyTypeLabel || 'Property Type'}<span className="required-star">*</span></label>
            <select name="propertyType" className="form-select" value={formData.propertyType} onChange={handleChange}>
                <option value="">Select Type</option>
                {(pageInfo.propertyTypeOptions || 'Residential, Commercial, Industrial').split(',').map((opt: string) => (
                    <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                ))}
            </select>
        </div>
        <div className="form-group">
            <label className="form-label">{pageInfo.propertyStatusLabel || 'Property Current Status'}<span className="required-star">*</span></label>
            <select name="propertyStatus" className="form-select" value={formData.propertyStatus} onChange={handleChange}>
                <option value="">Select Status</option>
                {(pageInfo.propertyStatusOptions || 'Constructed, Plot, Boundries').split(',').map((opt: string) => (
                    <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                ))}
            </select>
        </div>
        <div className="form-group">
            <label className="form-label">{pageInfo.propertyValueLabel || 'Property Value'}<span className="required-star">*</span></label>
            <select name="propertyValue" className="form-select" value={formData.propertyValue} onChange={handleChange}>
                <option value="">Select Value</option>
                {(pageInfo.propertyValueOptions || '20L, 50L, 75L, 1Cr, 1.5Cr, 2Cr, 3Cr, 4Cr, 5Cr, 5Cr+').split(',').map((opt: string) => (
                    <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                ))}
            </select>
        </div>
        {(loanType === 'Home Loan' || occupation === 'Self Employed') && (
            <div className="form-group business-address-container">
                <label className="form-label">{pageInfo.propertyAddressPincodeLabel || 'Property Address With Pincode'}<span className="required-star">*</span></label>
                <textarea name="propertyAddressPincode" className="form-textarea" value={formData.propertyAddressPincode} onChange={handleChange} placeholder={pageInfo.propertyAddressPincodePlaceholder || 'Enter full property address with pincode'} />
            </div>
        )}
    </div>
);

const YesNoRadio = ({
    name,
    label,
    value,
    handleChange,
    required = false,
}: {
    name: string;
    label: string;
    value: boolean | null;
    handleChange: FieldProps['handleChange'];
    required?: boolean;
}) => (
    <div className="form-group">
        <label className="form-label">
            {label}
            {required && <span className="required-star">*</span>}
        </label>
        <div className="loan-form-radio-group">
            <label className="loan-form-radio-label">
                <input
                    type="radio"
                    name={name}
                    value="true"
                    checked={value === true}
                    onChange={handleChange}
                />{' '}
                Yes
            </label>
            <label className="loan-form-radio-label">
                <input
                    type="radio"
                    name={name}
                    value="false"
                    checked={value === false}
                    onChange={handleChange}
                />{' '}
                No
            </label>
        </div>
    </div>
);

export const IncomeDetailsFields = ({ formData, handleChange, pageInfo }: FieldProps) => (
    <div className="animate-fade-in card-grid-2">
        <div className="form-group">
            <label className="form-label">{pageInfo.companyNameLabel || 'Company Name'}<span className="required-star">*</span></label>
            <input name="companyName" className="form-input" value={formData.companyName} onChange={handleChange} placeholder={pageInfo.companyNamePlaceholder || 'Enter company name'} />
        </div>
        <div className="form-group">
            <label className="form-label">{pageInfo.designationLabel || 'Designation'}<span className="required-star">*</span></label>
            <input name="designation" className="form-input" value={formData.designation} onChange={handleChange} placeholder={pageInfo.designationPlaceholder || 'Enter designation'} />
        </div>
        <div className="form-group">
            <label className="form-label">{pageInfo.companyAddressLabel || 'Company Address'}</label>
            <input name="companyAddress" className="form-input" value={formData.companyAddress} onChange={handleChange} placeholder={pageInfo.companyAddressPlaceholder || 'Enter company address'} />
        </div>
        <div className="form-group">
            <label className="form-label">{pageInfo.netSalaryLabel || 'Net Salary (Per Month)'}<span className="required-star">*</span></label>
            <input name="netSalary" className="form-input" value={formData.netSalary} onChange={handleChange} placeholder={pageInfo.netSalaryPlaceholder || 'Enter net salary'} />
        </div>
        <div className="form-group">
            <label className="form-label">{pageInfo.salaryModeLabel || 'Salary Mode'}<span className="required-star">*</span></label>
            <select name="salaryMode" className="form-select" value={formData.salaryMode} onChange={handleChange}>
                <option value="">Select</option>
                {(pageInfo.salaryModeOptions || 'Account Transfer, Cheque, Cash').split(',').map((opt: string) => (
                    <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                ))}
            </select>
        </div>
        <div className="form-group">
            <label className="form-label">{pageInfo.jobStabilityLabel || 'Current Job Stability (Months)'}<span className="required-star">*</span></label>
            <div className="input-with-suffix">
                <input
                    type="number"
                    name="jobStability"
                    className="form-input"
                    value={formData.jobStability}
                    onChange={handleChange}
                    min="0"
                    step="1"
                    placeholder="e.g. 24"
                />
                <span className="input-suffix" aria-hidden="true">Months</span>
            </div>
        </div>
        <YesNoRadio
            name="pfDeducted"
            label={pageInfo.pfDeductedLabel || 'PF Deducted'}
            value={formData.pfDeducted}
            handleChange={handleChange}
            required
        />
        <YesNoRadio
            name="hasOtherIncome"
            label={pageInfo.hasOtherIncomeLabel || 'Other Income'}
            value={formData.hasOtherIncome}
            handleChange={handleChange}
            required
        />
        {formData.hasOtherIncome === true && (
            <>
                <div className="form-group">
                    <label className="form-label">{pageInfo.otherIncomeSourceLabel || 'Income Source'}<span className="required-star">*</span></label>
                    <input
                        name="otherIncomeSource"
                        className="form-input"
                        value={formData.otherIncomeSource}
                        onChange={handleChange}
                        placeholder={pageInfo.otherIncomeSourcePlaceholder || 'Enter income source'}
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">{pageInfo.otherIncomeAmountLabel || 'Income Amount'}<span className="required-star">*</span></label>
                    <input
                        type="number"
                        name="otherIncomeAmount"
                        className="form-input"
                        value={formData.otherIncomeAmount}
                        onChange={handleChange}
                        min="0"
                        step="any"
                        placeholder={pageInfo.otherIncomeAmountPlaceholder || 'Enter income amount'}
                    />
                </div>
            </>
        )}
    </div>
);

export const OtherDetailsFields = ({ formData, handleChange, pageInfo, handleAddLoan }: any) => (
    <div className="animate-fade-in">
        <h4>{pageInfo.runningLoanTitle || 'Running Loan (If Any)'}</h4>
        <p className="running-loan-note">{pageInfo.runningLoanSubtitle || 'Please enter all your running loan details including credit card, Gold loan, Auto loan and any other running loan'}</p>
        <div className="card-grid-2 running-loan-grid">
            <div className="form-group">
                <label className="form-label">{pageInfo.runningLoanTypeLabel || 'Loan Type'}<span className="required-star">*</span></label>
                <select name="tempLoanType" className="form-select" value={formData.tempLoanType} onChange={handleChange}>
                    <option value="">Select Type</option>
                    {(pageInfo.runningLoanTypeOptions || 'Personal Loan, Business Loan, Home Loan, Loan Against Property, Credit Card, Auto Loan, Bike Loan, Consumer Loan, Gold Loan, Education Loan, Over Draft, Other').split(',').map((opt: string) => (
                        <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                    ))}
                </select>
            </div>
            <div className="form-group">
                <label className="form-label">{pageInfo.runningLoanBankLabel || 'Bank Name'}<span className="required-star">*</span></label>
                <input name="tempBankName" className="form-input" value={formData.tempBankName} onChange={handleChange} placeholder={pageInfo.runningLoanBankPlaceholder || 'Enter bank name'} />
            </div>
            <div className="form-group">
                <label className="form-label">{pageInfo.runningLoanAmountLabel || 'Loan Amount'}<span className="required-star">*</span></label>
                <input name="tempLoanAmount" className="form-input" value={formData.tempLoanAmount} onChange={handleChange} placeholder={pageInfo.runningLoanAmountPlaceholder || 'Enter loan amount'} />
            </div>
            <div className="form-group">
                <label className="form-label">{pageInfo.runningLoanEmiLabel || 'EMI amount'}<span className="required-star">*</span></label>
                <input name="tempEmiAmount" className="form-input" value={formData.tempEmiAmount} onChange={handleChange} placeholder={pageInfo.runningLoanEmiPlaceholder || 'Enter EMI amount'} />
            </div>
            <div className="form-group">
                <label className="form-label">{pageInfo.runningLoanPaidEmiLabel || 'No of Paid EMI'}<span className="required-star">*</span></label>
                <input name="tempPaidEmi" className="form-input" value={formData.tempPaidEmi} onChange={handleChange} placeholder={pageInfo.runningLoanPaidEmiPlaceholder || 'Enter number of paid EMIs'} />
            </div>
            <div className="add-loan-row">
                <button type="button" className="btn btn-secondary add-loan-btn" onClick={handleAddLoan}>{pageInfo.addLoanButtonLabel || '+ Add Loan'}</button>
            </div>
        </div>

        {formData.runningLoans.length > 0 && (
            <div className="card loan-list-card">
                <table className="loan-list-table">
                    <thead>
                        <tr>
                            <th>{pageInfo.loanTableIdHeader || 'Loan ID'}</th>
                            <th>{pageInfo.loanTableTypeHeader || 'Loan Type'}</th>
                            <th>{pageInfo.loanTableAmountHeader || 'Loan Amount'}</th>
                            <th>{pageInfo.loanTableBankHeader || 'Bank Name'}</th>
                            <th>{pageInfo.loanTableEmiHeader || 'EMI Amount'}</th>
                            <th>{pageInfo.loanTablePaidEmiHeader || 'No of Paid EMI'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {formData.runningLoans.map((l: any, i: number) => (
                            <tr key={i}>
                                <td>{l.id}</td>
                                <td>{l.type}</td>
                                <td>{l.amount}</td>
                                <td>{l.bank}</td>
                                <td>{l.emi}</td>
                                <td>{l.paidEmi}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
    </div>
);

export const DocumentsFields = ({ formData, setFormData, handleFileChange, handleSingleUpload, pageInfo, loanType, occupation }: any) => {
    const [pendingDoc, setPendingDoc] = useState<any>(null);
    const [inputPassword, setInputPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const handleViewClick = (doc: any) => {
        if (!doc.previewUrl) return;
        if (doc.password && doc.password !== 'No') {
            setPendingDoc(doc);
            setInputPassword('');
            setPasswordError('');
        } else {
            window.open(doc.previewUrl, '_blank');
        }
    };

    const handlePasswordSubmit = () => {
        if (!pendingDoc) return;
        if (inputPassword === pendingDoc.password) {
            window.open(pendingDoc.previewUrl, '_blank');
            setPendingDoc(null);
            setInputPassword('');
            setPasswordError('');
        } else {
            setPasswordError('Incorrect password. Please try again.');
        }
    };

    const isSelfEmployedDoc = occupation === 'Self Employed';
    const cibilField = { name: pageInfo.cibilReportLabel || 'CIBIL Report', key: 'cibilReport', id: '#CIBIL' };
    const docFields = (loanType === 'Business Loan' || isSelfEmployedDoc) ? [
        { name: formData.businessType ? `Document for ${formData.businessType}` : 'Select Business Type in Business Details', key: 'proprietorshipDoc', id: '#1' },
        cibilField,
    ] : loanType === 'Home Loan' ? [
        { name: pageInfo.panCardLabel || 'Pan Card', key: 'panCard', id: '#1' },
        cibilField,
        { name: pageInfo.adharFrontLabel || 'Aadhar Card Front', key: 'aadharCardFront', id: '#2' },
        { name: pageInfo.adharBackLabel || 'Aadhar Card Back', key: 'aadharCardBack', id: '#3' },
        { name: pageInfo.coAppPanLabel || 'Co-Applicant Pan Card', key: 'coAppPan', id: '#4' },
        { name: pageInfo.coAppAadharFrontLabel || 'Co-Applicant Aadhar Card Front', key: 'coAppAadharFront', id: '#5' },
        { name: pageInfo.coAppAadharBackLabel || 'Co-Applicant Aadhar Card Back', key: 'coAppAadharBack', id: '#6' },
        { name: pageInfo.salarySlipsLabel || 'Salary Slip 1 year', key: 'salarySlips', id: '#7' },
        { name: pageInfo.bankStatementLabel || '6 Month Bank Statement', key: 'bankStatement', id: '#8' },
        { name: pageInfo.propertyPapersLabel || 'Property Papers', key: 'propertyPapers', id: '#9' },
    ] : [
        { name: pageInfo.panCardLabel || 'Pan Card', key: 'panCard', id: '#1' },
        cibilField,
        { name: pageInfo.adharFrontLabel || 'Aadhar Card Front', key: 'aadharCardFront', id: '#2' },
        { name: pageInfo.adharBackLabel || 'Aadhar Card Back', key: 'aadharCardBack', id: '#3' },
        { name: pageInfo.salarySlipsLabel || 'Salary Slip 1 year', key: 'salarySlips', id: '#4' },
        { name: pageInfo.bankStatementLabel || '6 Month Bank Statement', key: 'bankStatement', id: '#5' },
    ];

    return (
        <div className="animate-fade-in">
            <div className="doc-upload-grid">
                {docFields.map((field) => {
                    const isUploaded = formData.uploadedFields[field.key];
                    return (
                        <div key={field.key} className="doc-card shadow-sm">
                            <h4 className="doc-card-title">{field.id} - {field.name}<span className="required-star">*</span></h4>
                            <div className={`doc-status-badge ${isUploaded ? 'doc-status-uploaded' : 'doc-status-pending'}`}>
                                {isUploaded ? (pageInfo.uploadedStatusText || '✔ UPLOADED') : (pageInfo.pendingStatusText || '⏳ PENDING')}
                            </div>
                            <label className="form-label doc-label">{pageInfo.pdfPasswordLabel || 'PDF Password (If any)'}</label>
                            <input className="form-input doc-input" value={formData.pdfPasswords[field.key] || ''} onChange={(e) => setFormData((p: any) => ({ ...p, pdfPasswords: { ...p.pdfPasswords, [field.key]: e.target.value } }))} placeholder={pageInfo.pdfPasswordPlaceholder || 'Enter password if PDF is protected'} />
                            <div className="doc-file-row">
                                <div className="doc-file-item">
                                    <span style={{ opacity: 0.7, whiteSpace: 'nowrap', flexShrink: 0 }}>{pageInfo.selectFileLabel || '☁️ Select File'}</span>
                                    <input
                                        type="file"
                                        key={`${field.key}-${formData.uploadedFields[field.key]}`}
                                        onChange={(e) => handleFileChange(e, field.key)}
                                        className="doc-file-input"
                                    />
                                </div>
                                <button
                                    type="button"
                                    className={`btn ${isUploaded ? 'btn-secondary' : 'btn-primary'} doc-upload-btn`}
                                    disabled={isUploaded}
                                    onClick={() => handleSingleUpload(field.key, field.name)}
                                >
                                    {isUploaded ? (pageInfo.uploadedSuccessfullyText || 'Uploaded Successfully') : (pageInfo.uploadButtonLabel || 'Upload Document')}
                                </button>
                            </div>
                        </div>
                    );
                })}

                {loanType !== 'Business Loan' && !(occupation === 'Self Employed' && (loanType === 'Home Loan' || loanType === 'LAP' || loanType === 'LAP (Loan Against Property)')) && (
                    <div className="doc-card shadow-sm doc-other-card">
                        <h4>{pageInfo.otherDocsTitle || 'Other Documents'}</h4>
                        <p style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '1rem' }}>{pageInfo.otherDocsSubtitle || '( If there is any additional documents )'}</p>
                        <label className="form-label" style={{ color: '#cbd5e1' }}>{pageInfo.docTypeLabel || 'Document Type'}</label>
                        <select className="form-select doc-other-select" value={formData.docType} onChange={(e) => setFormData((p: any) => ({ ...p, docType: e.target.value }))}>
                            <option value="">Select Document Type</option>
                            {(pageInfo.docTypeOptions || 'Pan Card, Aadhar Card Front, Aadhar Card Back, Salary Slip 1, Salary Slip 2, Salary Slip 3, 6 Month Bank Statement, Form 16 - 1, Form 16 - 2, Office ID Card Front, Office ID Card Back, Passport Size Photo, Co-Applicant Pan Card, Co-Applicant Aadhar Card Front, Co-Applicant Aadhar Card Back, Property Papers, Other Documents (if any)').split(',').map((opt: string) => (
                                <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                            ))}
                        </select>
                        <label className="form-label" style={{ color: '#cbd5e1' }}>{pageInfo.pdfPasswordLabel || 'PDF Password (If any)'}</label>
                        <input className="form-input doc-other-input" value={formData.pdfPasswords['otherDocs'] || ''} onChange={(e) => setFormData((p: any) => ({ ...p, pdfPasswords: { ...p.pdfPasswords, otherDocs: e.target.value } }))} placeholder={pageInfo.pdfPasswordPlaceholder || 'Enter password'} />
                        <div className="doc-file-row">
                            <div className="doc-other-file-row">
                                <span style={{ color: '#000', fontSize: '0.7rem', opacity: 0.7, whiteSpace: 'nowrap', flexShrink: 0 }}>{pageInfo.selectFileLabel || '☁️ Select File'}</span>
                                <input
                                    type="file"
                                    key={`otherDocs-${formData.addedDocs.length}`}
                                    multiple
                                    onChange={(e) => handleFileChange(e, 'otherDocs')}
                                    className="doc-other-file-input"
                                />
                            </div>
                            <button
                                type="button"
                                className="btn btn-primary doc-upload-btn"
                                onClick={() => handleSingleUpload('otherDocs', formData.docType || 'Other Document')}
                            >
                                {pageInfo.uploadButtonLabel || 'Upload'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
            <div className="card loan-list-card">
                <table className="loan-list-table">
                    <thead>
                        <tr>
                            <th>{pageInfo.docTableIdHeader || 'Document ID'}</th>
                            <th>{pageInfo.docTableTypeHeader || 'Document Type'}</th>
                            <th>{pageInfo.docTableFormatHeader || 'File Format'}</th>
                            <th>{pageInfo.docTablePasswordHeader || 'Password'}</th>
                            <th>{pageInfo.docTableDateHeader || 'Date'}</th>
                            <th>{pageInfo.docTableStatusHeader || 'Status'}</th>
                            <th className="doc-td-center">{pageInfo.docTableActionHeader || 'View'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {formData.addedDocs.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="table-empty-row">{pageInfo.noDocsUploadedText || 'No documents uploaded yet.'}</td>
                            </tr>
                        ) : (
                            formData.addedDocs.map((doc: any, idx: number) => (
                                <tr key={idx}>
                                    <td className="doc-td-name">{doc.id}</td>
                                    <td>{doc.name}</td>
                                    <td><span className="doc-td-badge">{doc.format}</span></td>
                                    <td>{doc.password}</td>
                                    <td>{doc.date}</td>
                                    <td>
                                        <span className="doc-status-uploaded-text">
                                            ● {doc.status}
                                        </span>
                                    </td>
                                    <td className="doc-td-center">
                                        <button
                                            type="button"
                                            className="doc-view-btn"
                                            onClick={() => handleViewClick(doc)}
                                            disabled={!doc.previewUrl}
                                            title={doc.previewUrl ? 'View document' : 'No preview available'}
                                        >
                                            {pageInfo.viewButtonLabel || '👁 View'}
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {pendingDoc && (
                <div className="doc-pw-overlay" onClick={() => setPendingDoc(null)}>
                    <div className="doc-pw-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="doc-pw-modal-header">
                            <span className="doc-pw-lock-icon">🔒</span>
                            <h3 className="doc-pw-title">Password Required</h3>
                        </div>
                        <p className="doc-pw-desc">
                            <strong>{pendingDoc.name}</strong> is password protected.<br />
                            Enter the password to view this document.
                        </p>
                        <input
                            type="password"
                            className={`form-input doc-pw-input${passwordError ? ' doc-pw-input-error' : ''}`}
                            placeholder="Enter document password"
                            value={inputPassword}
                            onChange={(e) => { setInputPassword(e.target.value); setPasswordError(''); }}
                            onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                            autoFocus
                        />
                        {passwordError && <p className="doc-pw-error">{passwordError}</p>}
                        <div className="doc-pw-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setPendingDoc(null)}>Cancel</button>
                            <button type="button" className="btn btn-primary" onClick={handlePasswordSubmit}>Open Document</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const SummarySection = ({ formData, loanProfile, leadId, pageInfo, loanType, occupation, vErrors, handleChange }: any) => (
    <div className="animate-fade-in">
        <div className="summary-errors">
            {vErrors.map((error: string, idx: number) => (
                <div key={idx} className="validation-error-item">
                    <span>{idx + 1} - {error}</span>
                </div>
            ))}
        </div>

        {vErrors.length === 0 && (
            <div className="summary-main">
                <div className="success-banner">
                    <span>✅</span> {pageInfo.allStepsCompletedText || 'All required fields completed! Please review your summary below before final submission.'}
                </div>

                <div className="card-grid-2 summary-grid-wrap">
                    <div className="summary-card primary">
                        <h5 className="summary-header">{pageInfo.summaryOverviewTitle || '📋 Primary Application Overview'}</h5>
                        <div className="summary-grid">
                            <div className="summary-item"><span className="summary-label">{pageInfo.summaryLoanAmountLabel || 'Expected Loan Amount'}</span><span className="summary-value large">₹{formData.loanAmount.toLocaleString('en-IN')}</span></div>
                            <div className="summary-item"><span className="summary-label">{pageInfo.summaryPhoneLabel || 'Mobile Number'}</span><span className="summary-value">{loanProfile.phone}</span></div>
                            <div className="summary-item"><span className="summary-label">{pageInfo.summaryEmailLabel || 'Email Address'}</span><span className="summary-value summary-val-break">{loanProfile.email}</span></div>
                            <div className="summary-item"><span className="summary-label">{pageInfo.summaryPanLabel || 'PAN Card Number'}</span><span className="summary-value">{loanProfile.pan}</span></div>
                            <div className="summary-item"><span className="summary-label">{pageInfo.summaryAadharLabel || 'Aadhar Card Number'}</span><span className="summary-value">{loanProfile.aadhar}</span></div>
                        </div>
                    </div>

                    <div className="summary-card shadow-sm">
                        <h5 className="summary-header">{pageInfo.summaryPersonalAddressTitle || 'Personal & Address'}</h5>
                        <div className="summary-inner-grid">
                            <p className="summary-p"><strong>{pageInfo.dobLabel || 'Date of Birth'}:</strong> {formData.dob}</p>
                            <p className="summary-p"><strong>{pageInfo.maritalStatusLabel || 'Marital Status'}:</strong> {formData.maritalStatus}</p>
                            <p className="summary-p"><strong>{pageInfo.motherNameLabel || 'Mother Name'}:</strong> {formData.motherName}</p>
                            <p className="summary-p"><strong>{pageInfo.residenceTypeLabel || 'Residence Type'}:</strong> {formData.residenceType}</p>
                            <p className="summary-p" style={{ marginTop: '0.5rem' }}><strong>Current Address:</strong></p>
                            <p className="summary-p-muted">{formData.addressLine1}, {formData.addressLine2 ? `${formData.addressLine2}, ` : ''}{formData.landmark}, {formData.city}, {formData.state} - {formData.district}</p>
                        </div>
                    </div>

                    {(loanType === 'Business Loan' || occupation === 'Self Employed') && (
                        <div className="summary-card shadow-sm">
                            <h5 className="summary-header">{pageInfo.summaryBusinessTitle || 'Business Details'}</h5>
                            <div className="summary-inner-grid">
                                <p className="summary-p"><strong>{pageInfo.businessNameLabel || 'Business Name'}:</strong> {formData.businessName}</p>
                                <p className="summary-p"><strong>{pageInfo.businessPremisesLabel || 'Premises'}:</strong> {formData.businessPremises}</p>
                                <p className="summary-p"><strong>{pageInfo.businessTypeLabel || 'Type'}:</strong> {formData.businessType}</p>
                                <p className="summary-p"><strong>{pageInfo.annualTurnoverLabel || 'Turnover'}:</strong> {formData.annualTurnover}</p>
                                <p className="summary-p"><strong>{pageInfo.businessAgeLabel || 'Age'}:</strong> {formData.businessAge}</p>
                                <p className="summary-p" style={{ marginTop: '0.5rem' }}><strong>Business Address:</strong></p>
                                <p className="summary-p-muted">{formData.businessAddress}</p>
                            </div>
                        </div>
                    )}

                    {occupation !== 'Self Employed' && loanType !== 'Business Loan' && (
                        <div className="summary-card shadow-sm">
                            <h5 className="summary-header">{pageInfo.summaryIncomePropertyTitle || 'Income & Property'}</h5>
                            <div className="summary-inner-grid">
                                <p className="summary-p"><strong>{pageInfo.companyNameLabel || 'Company'}:</strong> {formData.companyName}</p>
                                <p className="summary-p"><strong>{pageInfo.designationLabel || 'Designation'}:</strong> {formData.designation}</p>
                                <p className="summary-p"><strong>{pageInfo.netSalaryLabel || 'Net Salary'}:</strong> ₹{parseInt(formData.netSalary || '0').toLocaleString('en-IN')}</p>
                                <p className="summary-p"><strong>{pageInfo.pfDeductedLabel || 'PF Deducted'}:</strong> {formData.pfDeducted === true ? 'Yes' : formData.pfDeducted === false ? 'No' : '—'}</p>
                                <p className="summary-p"><strong>{pageInfo.hasOtherIncomeLabel || 'Other Income'}:</strong> {formData.hasOtherIncome === true ? 'Yes' : formData.hasOtherIncome === false ? 'No' : '—'}</p>
                                {formData.hasOtherIncome === true && (
                                    <>
                                        <p className="summary-p"><strong>{pageInfo.otherIncomeSourceLabel || 'Income Source'}:</strong> {formData.otherIncomeSource}</p>
                                        <p className="summary-p"><strong>{pageInfo.otherIncomeAmountLabel || 'Income Amount'}:</strong> ₹{parseFloat(formData.otherIncomeAmount || '0').toLocaleString('en-IN')}</p>
                                    </>
                                )}
                                {loanType === 'Home Loan' && (
                                    <div className="summary-property-detail">
                                        <p className="summary-prop-label">Property Detail:</p>
                                        <p className="summary-p"><strong>{pageInfo.propertyTypeLabel || 'Type'}:</strong> {formData.propertyType}</p>
                                        <p className="summary-p"><strong>{pageInfo.propertyStatusLabel || 'Status'}:</strong> {formData.propertyStatus}</p>
                                        <p className="summary-p"><strong>{pageInfo.propertyValueLabel || 'Value'}:</strong> {formData.propertyValue}</p>
                                        <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8 }}>{formData.propertyAddressPincode}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Only show Property Details for Home Loan or journeys that actually include a property step */}
                    {(loanType === 'Home Loan') && (
                        <div className="summary-card shadow-sm">
                            <h5 className="summary-header">{pageInfo.summaryPropertyTitle || 'Property Details'}</h5>
                            <div className="summary-inner-grid">
                                <p className="summary-p"><strong>{pageInfo.propertyTypeLabel || 'Type'}:</strong> {formData.propertyType}</p>
                                <p className="summary-p"><strong>{pageInfo.propertyStatusLabel || 'Status'}:</strong> {formData.propertyStatus}</p>
                                <p className="summary-p"><strong>{pageInfo.propertyValueLabel || 'Value'}:</strong> {formData.propertyValue}</p>
                                <p className="summary-p" style={{ marginTop: '0.5rem' }}><strong>Property Address:</strong></p>
                                <p className="summary-p-muted">{formData.propertyAddressPincode}</p>
                            </div>
                        </div>
                    )}

                    {formData.runningLoans.length > 0 && (
                        <div className="summary-card shadow-sm primary">
                            <h5 className="summary-header">{pageInfo.summaryRunningLoansTitle || 'Running Loans Summary'}</h5>
                            <div className="summary-overflow">
                                <table className="loan-list-table">
                                    <thead>
                                        <tr>
                                            <th>Bank</th>
                                            <th>Type</th>
                                            <th>Amount</th>
                                            <th>EMI</th>
                                            <th>Paid</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {formData.runningLoans.map((l: any, i: number) => (
                                            <tr key={i}>
                                                <td>{l.bank}</td>
                                                <td>{l.type}</td>
                                                <td>₹{parseInt(l.amount || '0').toLocaleString('en-IN')}</td>
                                                <td>₹{parseInt(l.emi || '0').toLocaleString('en-IN')}</td>
                                                <td>{l.paidEmi}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}

        {vErrors.length > 0 && (
            <div className="validation-error-banner">
                {pageInfo.validationErrorText || 'Please fill all required fields in all tabs to submit the lead for further processing.'}
            </div>
        )}
        <label className="declaration-label">
            <input 
                type="checkbox" 
                name="declarationAccepted"
                checked={!!formData.declarationAccepted} 
                onChange={handleChange} 
            />
            {pageInfo.declarationText || 'I hereby declare that the information provided is true and correct.'}
        </label>
    </div>
);
