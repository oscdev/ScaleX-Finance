export type FieldWidget =
  | 'text'
  | 'number'
  | 'date'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'checkboxGroup'
  | 'stateSelect'
  | 'districtSelect';

/** form_data section key stored on loan-application */
export type FormDataSection =
  | 'businessDetails'
  | 'personalDetails'
  | 'addressDetails'
  | 'propertyDetails'
  | 'incomeDetails'
  | 'otherDetails';

/** Permission section key in loan-app-section-permissions */
export type PermissionSection =
  | 'businessInfo'
  | 'personalDetails'
  | 'addressDetails'
  | 'propertyDetails'
  | 'incomeDetails'
  | 'runningLoans'
  | 'documentDetails';

export type FunnelStep =
  | 'Business'
  | 'Personal'
  | 'Residence'
  | 'Property'
  | 'Income'
  | 'Other'
  | 'Docs';

export interface FormFieldDef {
  section: FormDataSection;
  permissionSection: PermissionSection;
  key: string;
  label: string;
  widget: FieldWidget;
  options?: string[];
  funnelStep: FunnelStep;
  /** Hide when loan type matches (e.g. dependents hidden for BL) */
  hideForLoanTypes?: string[];
  /** Show only when loan type matches */
  showForLoanTypes?: string[];
  /** Show when hasOtherIncome is true (income section) */
  showWhen?: { section: FormDataSection; key: string; equals: unknown };
  placeholder?: string;
}

export interface FunnelContext {
  loanType: string;
  occupation: string;
}

export interface FormSectionDef {
  step: FunnelStep;
  title: string;
  permissionSection: PermissionSection;
  formDataSection: FormDataSection;
}
