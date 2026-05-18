export type StatusBadgeColor = { bg: string; text: string; border: string };

export const statusBadgeColors: Record<string, StatusBadgeColor> = {
    NEW: { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' },
    UNDER_PROCESS: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
    'UNDER PROCESS': { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
    APPROVED: { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
    REJECTED: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
    DISBURSED: { bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff' },
};

export const leadLabelMap: Record<string, string> = {
    id: 'ID',
    fullname: 'CUSTOMER INFO',
    selectedproduct: 'PRODUCT',
    requiredamount: 'AMOUNT',
    advisorreferralid: 'ADVISOR',
    createdat: 'ADDED',
    updatedat: 'UPDATED',
    leadstatus: 'STATUS',
    mobilenumber: 'MOBILE',
    email: 'EMAIL',
    pancard: 'PAN CARD',
    aadharcard: 'AADHAR CARD',
    propertytype: 'PROPERTY TYPE',
    propertystatus: 'PROPERTY STATUS',
    propertyvalue: 'PROPERTY VALUE',
    employmenttype: 'EMPLOYMENT',
    leadtype: 'LEAD TYPE',
    getemailnotification: 'EMAIL NOTIFICATIONS',
    pincode: 'PINCODE',
    remarks: 'REMARKS',
    locale: 'LOCALE',
    documentid: 'DOCUMENT ID',
    createdby: 'CREATED BY',
    updatedby: 'UPDATED BY',
};

export const advisorLabelMap: Record<string, string> = {
    advisorid: 'ADVISOR CODE',
    createdat: 'JOINING DATE',
    fullname: 'ADVISOR NAME',
    mobile: 'ADVISOR CONTACT',
    phonenumber: 'ADVISOR CONTACT',
    'advisor contact': 'ADVISOR CONTACT',
    emailverified: 'EMAIL VERIFY STATUS',
    earnings: 'EARNINGS',
    advisorstatus: 'ADVISOR STATUS',
};
