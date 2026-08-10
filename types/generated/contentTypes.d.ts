import type { Schema, Struct } from '@strapi/strapi';

export interface AdminApiToken extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_api_tokens';
  info: {
    description: '';
    displayName: 'Api Token';
    name: 'Api Token';
    pluralName: 'api-tokens';
    singularName: 'api-token';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    accessKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Schema.Attribute.DefaultTo<''>;
    encryptedKey: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    expiresAt: Schema.Attribute.DateTime;
    lastUsedAt: Schema.Attribute.DateTime;
    lifespan: Schema.Attribute.BigInteger;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::api-token'> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<
      'oneToMany',
      'admin::api-token-permission'
    >;
    publishedAt: Schema.Attribute.DateTime;
    type: Schema.Attribute.Enumeration<['read-only', 'full-access', 'custom']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'read-only'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminApiTokenPermission extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_api_token_permissions';
  info: {
    description: '';
    displayName: 'API Token Permission';
    name: 'API Token Permission';
    pluralName: 'api-token-permissions';
    singularName: 'api-token-permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'admin::api-token-permission'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    token: Schema.Attribute.Relation<'manyToOne', 'admin::api-token'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminAuditLog extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_audit_logs';
  info: {
    displayName: 'Audit Log';
    pluralName: 'audit-logs';
    singularName: 'audit-log';
  };
  options: {
    draftAndPublish: false;
    timestamps: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    date: Schema.Attribute.DateTime & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::audit-log'> &
      Schema.Attribute.Private;
    payload: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<'oneToOne', 'admin::user'>;
  };
}

export interface AdminPermission extends Struct.CollectionTypeSchema {
  collectionName: 'admin_permissions';
  info: {
    description: '';
    displayName: 'Permission';
    name: 'Permission';
    pluralName: 'permissions';
    singularName: 'permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    actionParameters: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    conditions: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<[]>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::permission'> &
      Schema.Attribute.Private;
    properties: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.Relation<'manyToOne', 'admin::role'>;
    subject: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminRole extends Struct.CollectionTypeSchema {
  collectionName: 'admin_roles';
  info: {
    description: '';
    displayName: 'Role';
    name: 'Role';
    pluralName: 'roles';
    singularName: 'role';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::role'> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<'oneToMany', 'admin::permission'>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    users: Schema.Attribute.Relation<'manyToMany', 'admin::user'>;
  };
}

export interface AdminSession extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_sessions';
  info: {
    description: 'Session Manager storage';
    displayName: 'Session';
    name: 'Session';
    pluralName: 'sessions';
    singularName: 'session';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
    i18n: {
      localized: false;
    };
  };
  attributes: {
    absoluteExpiresAt: Schema.Attribute.DateTime & Schema.Attribute.Private;
    childId: Schema.Attribute.String & Schema.Attribute.Private;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deviceId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    expiresAt: Schema.Attribute.DateTime &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::session'> &
      Schema.Attribute.Private;
    origin: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    sessionId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.Unique;
    status: Schema.Attribute.String & Schema.Attribute.Private;
    type: Schema.Attribute.String & Schema.Attribute.Private;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    userId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
  };
}

export interface AdminTransferToken extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_transfer_tokens';
  info: {
    description: '';
    displayName: 'Transfer Token';
    name: 'Transfer Token';
    pluralName: 'transfer-tokens';
    singularName: 'transfer-token';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    accessKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Schema.Attribute.DefaultTo<''>;
    expiresAt: Schema.Attribute.DateTime;
    lastUsedAt: Schema.Attribute.DateTime;
    lifespan: Schema.Attribute.BigInteger;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'admin::transfer-token'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<
      'oneToMany',
      'admin::transfer-token-permission'
    >;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminTransferTokenPermission
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_transfer_token_permissions';
  info: {
    description: '';
    displayName: 'Transfer Token Permission';
    name: 'Transfer Token Permission';
    pluralName: 'transfer-token-permissions';
    singularName: 'transfer-token-permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'admin::transfer-token-permission'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    token: Schema.Attribute.Relation<'manyToOne', 'admin::transfer-token'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminUser extends Struct.CollectionTypeSchema {
  collectionName: 'admin_users';
  info: {
    description: '';
    displayName: 'User';
    name: 'User';
    pluralName: 'users';
    singularName: 'user';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    blocked: Schema.Attribute.Boolean &
      Schema.Attribute.Private &
      Schema.Attribute.DefaultTo<false>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    firstname: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    isActive: Schema.Attribute.Boolean &
      Schema.Attribute.Private &
      Schema.Attribute.DefaultTo<false>;
    lastname: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::user'> &
      Schema.Attribute.Private;
    password: Schema.Attribute.Password &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    preferedLanguage: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    registrationToken: Schema.Attribute.String & Schema.Attribute.Private;
    resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private;
    roles: Schema.Attribute.Relation<'manyToMany', 'admin::role'> &
      Schema.Attribute.Private;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    username: Schema.Attribute.String;
  };
}

export interface ApiAboutUsPageAboutUsPage extends Struct.SingleTypeSchema {
  collectionName: 'about_us_pages';
  info: {
    description: 'Manage content for the About Us page';
    displayName: 'About Us Page';
    pluralName: 'about-us-pages';
    singularName: 'about-us-page';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    content: Schema.Attribute.RichText;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    heroBanner: Schema.Attribute.Media<'images'>;
    heroSubtitle: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'Empowering financial advisor to grow their business with cutting-edge technology and seamless lender integrations.'>;
    heroTitle: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'About ScaleX Finance'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::about-us-page.about-us-page'
    > &
      Schema.Attribute.Private;
    missionContent: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'To bridge the gap between financial advisors and lenders through a transparent, efficient, and AI-driven platform.'>;
    missionTitle: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Our Mission'>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    visionContent: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'To become the global standard for financial advisor empowerment and credit accessibility.'>;
    visionTitle: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Our Vision'>;
  };
}

export interface ApiActivityLogActivityLog extends Struct.CollectionTypeSchema {
  collectionName: 'activity_logs';
  info: {
    description: 'Centralized system logs for ScaleX Finance';
    displayName: 'Activity Log';
    pluralName: 'activity-logs';
    singularName: 'activity-log';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    action: Schema.Attribute.Enumeration<
      [
        'LEAD_CREATED',
        'EMAIL_DISPATCHED',
        'EMAIL_FAILED',
        'EMAIL_SKIPPED',
        'ADVISOR_LOGIN_SUCCESS',
        'ADVISOR_LOGIN_FAILURE',
        'ADVISOR_REGISTRATION_SUCCESS',
        'ADVISOR_REGISTRATION_FAILURE',
        'ADVISOR_APPROVED',
        'ADMIN_USER_CREATED',
        'LOGIN_SUCCESS',
        'LOGIN_FAILURE',
        'MAINTENANCE_TOGGLED',
        'LOGS_PURGED',
        'LOG_CLEANUP_CRON',
        'LEAD_SUBMISSION_SUCCESS',
        'LEAD_SUBMISSION_FAILURE',
        'LEAD_STATUS_CHANGED',
        'LEAD_REMARK_ADDED',
        'AI_MATCH_GENERATED',
        'LOAN_STATUS_CHANGED',
        'LOAN_ASSIGNMENT_CHANGED',
        'LOAN_APP_SUBMITTED',
        'LOAN_APP_SUBMIT_FAILED',
        'BUREAU_EXTRACT_STARTED',
        'BUREAU_EXTRACT_COMPLETED',
        'BUREAU_EXTRACT_FAILED',
        'PL_ELIGIBILITY_RUN_START',
        'PL_ELIGIBILITY_BLOCKED',
        'PL_ELIGIBILITY_RULE',
        'PL_ELIGIBILITY_RULE_SKIP',
        'PL_ELIGIBILITY_LENDER',
        'PL_ELIGIBILITY_RUN_COMPLETE',
        'PL_ELIGIBILITY_CONNECTION_FAILED',
        'PL_SCORE_RUN_START',
        'PL_SCORE_CRITERION',
        'PL_SCORE_CRITERION_SKIP',
        'PL_SCORE_CRITERION_INACTIVE',
        'PL_SCORE_LENDER',
        'PL_SCORE_RANK_COMPLETE',
        'PL_SCORE_RUN_DONE',
        'PL_SCORE_BLOCKED',
      ]
    > &
      Schema.Attribute.Required;
    category: Schema.Attribute.Enumeration<
      [
        'LEAD_FORM',
        'LOAN_APPLICATION',
        'EMAIL',
        'STATUS_REMARKS',
        'BUREAU_EXTRACTION',
        'LENDER_ELIGIBILITY',
        'LENDER_SCORING',
        'USER_REGISTRATION',
        'SYSTEM',
      ]
    >;
    correlationId: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.Text;
    ipAddress: Schema.Attribute.String;
    leadId: Schema.Attribute.Integer;
    leadName: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::activity-log.activity-log'
    > &
      Schema.Attribute.Private;
    metadata: Schema.Attribute.JSON;
    model: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    severity: Schema.Attribute.Enumeration<
      ['info', 'warning', 'error', 'critical']
    > &
      Schema.Attribute.DefaultTo<'info'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    userId: Schema.Attribute.String;
  };
}

export interface ApiAdvisorRegistrationPageAdvisorRegistrationPage
  extends Struct.SingleTypeSchema {
  collectionName: 'advisor_registration_page';
  info: {
    description: 'Content for the Advisor Registration Page';
    displayName: 'Advisor Registration Page';
    pluralName: 'advisor-registration-pages';
    singularName: 'advisor-registration-page';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    backButtonText: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Back'>;
    bankAccountLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Bank Account Number'>;
    bankAccountPlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'1234567890'>;
    bankNameLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Bank Name'>;
    bankNamePlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'HDFC Bank'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    districtLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'District'>;
    districtPlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Mumbai'>;
    emailLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Email Address'>;
    emailPlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'john@example.com'>;
    fullNameLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Full Name'>;
    fullNamePlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'John Doe'>;
    heroSubtitle: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'Join Scalex Finance and start earning commissions'>;
    heroTitle: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Become a Partner'>;
    ifscLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'IFSC Code'>;
    ifscPlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'HDFC0001234'>;
    licenseLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Professional License (Optional)'>;
    licensePlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'CA/CS/ARN Number'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::advisor-registration-page.advisor-registration-page'
    > &
      Schema.Attribute.Private;
    logoImage: Schema.Attribute.Media<'images'>;
    nextButtonText: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Next Step'>;
    panLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'PAN Number'>;
    panPlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'ABCDE1234F'>;
    passwordLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Create Password'>;
    passwordPlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'********'>;
    payoutAlertText: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'We need your bank details to process your commission payouts. You can update this later.'>;
    phoneNumberLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Phone Number'>;
    phoneNumberPlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'+91 98765 43210'>;
    pinCodeLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Pin Code'>;
    pinCodePlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'400001'>;
    publishedAt: Schema.Attribute.DateTime;
    returnHomeButtonText: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Return Home'>;
    signInLinkText: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Sign in'>;
    signInPromptText: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Already have an account?'>;
    specializationLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Specialization'>;
    specializationOptions: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'Lending,Wealth Management,Insurance'>;
    stateLabel: Schema.Attribute.String & Schema.Attribute.DefaultTo<'State'>;
    statePlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Maharashtra'>;
    step1Label: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Basic Info'>;
    step2Label: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Professional'>;
    step3Label: Schema.Attribute.String & Schema.Attribute.DefaultTo<'Payout'>;
    submitButtonText: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Submit Application'>;
    successMessage: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'Welcome! Our team will review your application shortly.'>;
    successTitle: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Registration Successful!'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiAdvisorAdvisor extends Struct.CollectionTypeSchema {
  collectionName: 'advisors';
  info: {
    description: 'Submitted Advisor Registration Applications';
    displayName: 'Advisor';
    pluralName: 'advisors';
    singularName: 'advisor';
  };
  options: {
    draftAndPublish: false;
    previewable: false;
  };
  attributes: {
    advisorId: Schema.Attribute.String & Schema.Attribute.Unique;
    advisorStatus: Schema.Attribute.Enumeration<['Approved', 'Disapproved']> &
      Schema.Attribute.DefaultTo<'Disapproved'>;
    bankAccountNumber: Schema.Attribute.String & Schema.Attribute.Required;
    bankName: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    district: Schema.Attribute.String & Schema.Attribute.Required;
    earnings: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<0>;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    emailVerified: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    fullName: Schema.Attribute.String & Schema.Attribute.Required;
    ifscCode: Schema.Attribute.String & Schema.Attribute.Required;
    license: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::advisor.advisor'
    > &
      Schema.Attribute.Private;
    panNumber: Schema.Attribute.String & Schema.Attribute.Required;
    password: Schema.Attribute.String & Schema.Attribute.Required;
    phoneNumber: Schema.Attribute.String & Schema.Attribute.Required;
    pinCode: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    specialization: Schema.Attribute.String & Schema.Attribute.Required;
    state: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiBureauDataExtractionCibilReportSummary
  extends Struct.CollectionTypeSchema {
  collectionName: 'cibil_report_summary';
  info: {
    description: 'CIBIL bureau report and salary slip data per loan application';
    displayName: 'CIBIL Report Summary';
    pluralName: 'cibil-report-summaries';
    singularName: 'cibil-report-summary';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    cibilData: Schema.Attribute.JSON;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    dataSource: Schema.Attribute.Enumeration<
      ['MANUAL', 'PDF_EXTRACTION', 'CIBIL_API', 'EXPERIAN', 'EQUIFAX', 'CRIF']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'MANUAL'>;
    leadId: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    loanApplicationId: Schema.Attribute.Integer;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::bureau-data-extraction.cibil-report-summary'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    salarySlipData: Schema.Attribute.JSON;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiContactUsPageContactUsPage extends Struct.SingleTypeSchema {
  collectionName: 'contact_us_pages';
  info: {
    description: 'Manage content for the Contact Us page';
    displayName: 'Contact Us Page';
    pluralName: 'contact-us-pages';
    singularName: 'contact-us-page';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    address: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'ScaleX Finance Tower, Financial District, Mumbai, Maharashtra 400001'>;
    contactFormSubtitle: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'Fill out the form below and our team will get back to you within 24 hours.'>;
    contactFormTitle: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Send us a Message'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    email: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'support@scalexfinance.com'>;
    googleMapUrl: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d113228.47161208035!2d72.8222384!3d19.0760906!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7c6306644edc1%3A0x5da4ed8f8d648c69!2sMumbai%2C%20Maharashtra!5e0!3m2!1sen!2sin!4v1711181234567!5m2!1sen!2sin'>;
    heroBanner: Schema.Attribute.Media<'images'>;
    heroSubtitle: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'Have questions about our financial services or advisor network? Reach out to us today.'>;
    heroTitle: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'Get in Touch'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::contact-us-page.contact-us-page'
    > &
      Schema.Attribute.Private;
    phone: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'+91 1800 123 4567'>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiFooterFooter extends Struct.SingleTypeSchema {
  collectionName: 'footers';
  info: {
    description: 'Global Footer Content';
    displayName: 'Footer';
    pluralName: 'footers';
    singularName: 'footer';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    aboutUsLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'About Us'>;
    aboutUsLink: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'/about-us'>;
    contactPlatformLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Contact Us'>;
    contactPlatformLink: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'/contact'>;
    copyrightText: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u00A9 2026 ScaleX Finance. All rights reserved.'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'Democratizing complete Investment Banking & Debt services through technology and a trusted agent network.'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::footer.footer'
    > &
      Schema.Attribute.Private;
    logoImage: Schema.Attribute.Media<'images'>;
    logoText: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'ScaleX Finance'>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiGlobalSettingGlobalSetting extends Struct.SingleTypeSchema {
  collectionName: 'global_settings';
  info: {
    description: 'Admin configuration for ScaleX Finance';
    displayName: 'Global Setting';
    pluralName: 'global-settings';
    singularName: 'global-setting';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    activityLoggingIsEnabled: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    codeLevelLoggingIsEnabled: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    emailsIsEnabled: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::global-setting.global-setting'
    > &
      Schema.Attribute.Private;
    loggingRetentionDays: Schema.Attribute.Integer &
      Schema.Attribute.DefaultTo<30>;
    maintenanceModeIsEnabled: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    notificationsIsEnabled: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiHeaderHeader extends Struct.SingleTypeSchema {
  collectionName: 'headers';
  info: {
    description: 'Global Header Content';
    displayName: 'Header';
    pluralName: 'headers';
    singularName: 'header';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    aboutUsLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'About Us'>;
    aboutUsLink: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'/about-us'>;
    advisorLoginLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Advisor Login'>;
    advisorLoginLink: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'/admin/auth/login'>;
    advisorRegistrationLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Advisor Registration'>;
    advisorRegistrationLink: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'/advisor-onboarding'>;
    contactUsLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Contact Us'>;
    contactUsLink: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'/contact'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    homeLabel: Schema.Attribute.String & Schema.Attribute.DefaultTo<'Home'>;
    homeLink: Schema.Attribute.String & Schema.Attribute.DefaultTo<'/'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::header.header'
    > &
      Schema.Attribute.Private;
    logoImage: Schema.Attribute.Media<'images'>;
    logoText: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'ScaleX Finance'>;
    publishedAt: Schema.Attribute.DateTime;
    quickLoansLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Quick Loans'>;
    quickLoansLink: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'/products'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiHomepageHomepage extends Struct.SingleTypeSchema {
  collectionName: 'homepage';
  info: {
    description: 'The Scalex MVP Homepage';
    displayName: 'Homepage';
    pluralName: 'homepages';
    singularName: 'homepage';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    applyNowButtonLink: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'/products'>;
    applyNowButtonText: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Apply Now'>;
    becomeAnAdvisorButtonLink: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'/advisor-onboarding'>;
    becomeAnAdvisorButtonText: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Become an Advisor'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    heroBanner: Schema.Attribute.Media<'images' | 'videos'>;
    heroSubtitle: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'Smart lending solutions and a powerful advisor network to help you achieve your financial goals.'>;
    heroTitle: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Scale Your Financial Growth with ScaleX'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::homepage.homepage'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    valuePropositionClientsContent: Schema.Attribute.RichText &
      Schema.Attribute.DefaultTo<'Trusted by over 10,000+ happy clients across the country.'>;
    valuePropositionContent: Schema.Attribute.RichText &
      Schema.Attribute.DefaultTo<'We bring together borrowers, lenders, and expert advisors on a single secure platform to streamline the loan process.'>;
    valuePropositionSecureContent: Schema.Attribute.RichText &
      Schema.Attribute.DefaultTo<'Your data is secured with bank-grade encryption and privacy protocols.'>;
    valuePropositionTitle: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Why Choose ScaleX Finance?'>;
  };
}

export interface ApiLeadFormPageLeadFormPage extends Struct.SingleTypeSchema {
  collectionName: 'lead_form_page';
  info: {
    description: 'Content and configuration for the Lead Form Page';
    displayName: 'Lead Form Page';
    pluralName: 'lead-form-pages';
    singularName: 'lead-form-page';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    aadharCardLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Aadhar Card*'>;
    aadharCardPlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'1234 5678 9012'>;
    advisorReferralIdLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Advisor Referral ID (Optional)'>;
    advisorReferralIdPlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'ADV123456'>;
    backButtonLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Back'>;
    backButtonLink: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'/products'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    emailLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Customer Email*'>;
    emailPlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'customer@example.com'>;
    employmentTypeLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Occupation*'>;
    employmentTypeOptions: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Salaried, Self Employed'>;
    employmentTypePlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Select Occupation'>;
    fullNameLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Customer Name*'>;
    fullNamePlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Enter Customer Name'>;
    getEmailNotificationLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Get Email Notification for Lead Updated?*'>;
    leadTypeLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Lead Type*'>;
    leadTypeOptions: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Fresh (New Lead), BT (Balance Transfer)'>;
    leadTypePlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Select Lead Type'>;
    loanRequirementLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Loan Requirement*'>;
    loanRequirementPlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'500000'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::lead-form-page.lead-form-page'
    > &
      Schema.Attribute.Private;
    mobileNumberLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Customer Mobile*'>;
    mobileNumberPlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'9876543210'>;
    panCardLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Pan Card*'>;
    panCardPlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'ABCDE1234F'>;
    pinCodeLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Pincode*'>;
    pinCodePlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'400001'>;
    propertyStatusLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Property Current Status*'>;
    propertyStatusOptions: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Constructed, Plot, Boundaries'>;
    propertyStatusPlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Select Status'>;
    propertyTypeLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Property Type*'>;
    propertyTypeOptions: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Residential, Commercial, Industrial'>;
    propertyTypePlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Select Property Type'>;
    propertyValueLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Property Value*'>;
    propertyValuePlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'5000000'>;
    publishedAt: Schema.Attribute.DateTime;
    submitButtonLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Loan Application'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiLeadRemarkLeadRemark extends Struct.CollectionTypeSchema {
  collectionName: 'lead_remark';
  info: {
    description: 'Conversation history for leads';
    displayName: 'Lead Remarks';
    pluralName: 'lead-remarks';
    singularName: 'lead-remark';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
  };
  attributes: {
    advisor_admin_staff_remark: Schema.Attribute.JSON;
    banker_admin_staff_remark: Schema.Attribute.JSON;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    leadId: Schema.Attribute.Integer;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::lead-remark.lead-remark'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiLeadLead extends Struct.CollectionTypeSchema {
  collectionName: 'leads';
  info: {
    description: 'Submitted Lead Applications from Frontend';
    displayName: 'Leads';
    pluralName: 'leads';
    singularName: 'lead';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    aadharCard: Schema.Attribute.String;
    advisorReferralId: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    email: Schema.Attribute.Email & Schema.Attribute.Required;
    employmentType: Schema.Attribute.Enumeration<['Salaried', 'Self Employed']>;
    fullName: Schema.Attribute.String & Schema.Attribute.Required;
    getEmailNotification: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    leadStatus: Schema.Attribute.Enumeration<
      ['NEW', 'UNDER_PROCESS', 'APPROVED', 'REJECTED', 'DISBURSED']
    > &
      Schema.Attribute.DefaultTo<'NEW'>;
    leadType: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::lead.lead'> &
      Schema.Attribute.Private;
    mobileNumber: Schema.Attribute.String & Schema.Attribute.Required;
    panCard: Schema.Attribute.String;
    parentAdvisorId: Schema.Attribute.String;
    pinCode: Schema.Attribute.String;
    propertyStatus: Schema.Attribute.String;
    propertyType: Schema.Attribute.String;
    propertyValue: Schema.Attribute.Decimal;
    publishedAt: Schema.Attribute.DateTime;
    requiredAmount: Schema.Attribute.Decimal & Schema.Attribute.Required;
    selectedProduct: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiLenderMasterLendersCatalog
  extends Struct.CollectionTypeSchema {
  collectionName: 'lenders_catalog';
  info: {
    description: 'Master registry of all financial institutions';
    displayName: 'Lenders Catalog';
    pluralName: 'lenders-catalogs';
    singularName: 'lenders-catalog';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    isActive: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    lenderCode: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    lenderName: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    lenderType: Schema.Attribute.Enumeration<
      ['Public Bank', 'Private Bank', 'NBFC', 'Fintech / Digital']
    > &
      Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::lender-master.lenders-catalog'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiLenderMasterZipCode extends Struct.CollectionTypeSchema {
  collectionName: 'zip_codes_to_lenders';
  info: {
    description: 'Serviceable pincodes per lender';
    displayName: 'Zip Codes';
    pluralName: 'zip-codes';
    singularName: 'zip-code';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    coversAllPincodes: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    isActive: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    lenderCode: Schema.Attribute.String & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::lender-master.zip-code'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    zipCode: Schema.Attribute.Integer;
  };
}

export interface ApiLoanAppSectionPermissionLoanAppSectionPermission
  extends Struct.CollectionTypeSchema {
  collectionName: 'loan_app_section_permissions';
  info: {
    description: 'Per-role section-level permissions for the loan application';
    displayName: 'Loan App Section Permission';
    pluralName: 'loan-app-section-permissions';
    singularName: 'loan-app-section-permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::loan-app-section-permission.loan-app-section-permission'
    > &
      Schema.Attribute.Private;
    permissions: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    roleId: Schema.Attribute.Integer;
    roleName: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiLoanApplicationPageLoanApplicationPage
  extends Struct.SingleTypeSchema {
  collectionName: 'loan_application_pages';
  info: {
    description: 'CMS settings for labels and placeholders in the 5-step loan application form';
    displayName: 'Loan Application Page';
    pluralName: 'loan-application-pages';
    singularName: 'loan-application-page';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    addLoanButtonLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'+ Add Loan'>;
    addressLine1Label: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Address Line 1'>;
    addressLine1Placeholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Enter address'>;
    addressLine2Label: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Address Line 2'>;
    addressLine2Placeholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Enter address line 2'>;
    adharBackLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Aadhar Card Back'>;
    adharFrontLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Aadhar Card Front'>;
    allStepsCompletedText: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'All required fields completed! Please review your summary below before final submission.'>;
    alternateNumberLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Alternate Number'>;
    alternateNumberPlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Enter Alternate Mobile'>;
    annualTurnoverLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Annual Turnover'>;
    annualTurnoverOptions: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'20 Lakh, 50 Lakh, 80 Lakh, 1 Crore+, 2 Crore+, 3 Crore+, 5 Crore+'>;
    backButtonLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Back'>;
    bankStatementLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'6 Month Bank Statement'>;
    businessAddressLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Business Address'>;
    businessAddressPlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Enter full business address'>;
    businessAgeLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Business Age'>;
    businessAgeOptions: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'6 Months, 1 years, 2 Years, 3 Years+'>;
    businessNameLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Business Name'>;
    businessNamePlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Enter Business Name'>;
    businessPremisesLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Business Premises'>;
    businessPremisesOptions: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Owned, Rented, Lease'>;
    businessRegProofLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Business Registration Proof'>;
    businessRegProofOptions: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'GST, TIN, MSME, Shop Establishment Certificate, Trade License, Fssai License, Udyam Certificate, Gumasta Certificate'>;
    businessTypeLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Business Type'>;
    businessTypeOptions: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Proprietorship, Partnership, Private Limited'>;
    cityLabel: Schema.Attribute.String & Schema.Attribute.DefaultTo<'City'>;
    cityPlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Enter city'>;
    coAppAadharBackLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Co-Applicant Aadhar Card Back'>;
    coAppAadharFrontLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Co-Applicant Aadhar Card Front'>;
    coAppPanLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Co-Applicant Pan Card'>;
    companyAddressLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Company Address'>;
    companyAddressPlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Enter company address'>;
    companyNameLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Company Name'>;
    companyNamePlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Enter company name'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    declarationText: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'I hereby declare that the information provided is true and correct.'>;
    dependentsLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Dependent'>;
    dependentsPlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Enter number of dependents'>;
    designationLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Designation'>;
    designationPlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Enter designation'>;
    districtLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'District'>;
    dobLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Date of Birth'>;
    docsSubtitle: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'Please upload clear copies of the following documents. Supported formats: PDF, JPG, PNG.'>;
    docsTitle: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Documents'>;
    docTableActionHeader: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'View'>;
    docTableDateHeader: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Date'>;
    docTableFormatHeader: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'File Format'>;
    docTableIdHeader: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Document ID'>;
    docTablePasswordHeader: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Password'>;
    docTableStatusHeader: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Status'>;
    docTableTypeHeader: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Document Type'>;
    docTypeLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Document Type'>;
    docTypeOptions: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'Pan Card, Aadhar Card Front, Aadhar Card Back, Salary Slip 1, Salary Slip 2, Salary Slip 3, 6 Month Bank Statement, Form 16 - 1, Form 16 - 2, Office ID Card Front, Office ID Card Back, Passport Size Photo, Co-Applicant Pan Card, Co-Applicant Aadhar Card Front, Co-Applicant Aadhar Card Back, Property Papers, Other Documents (if any)'>;
    jobStabilityLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Current Job Stability (Months)'>;
    jobStabilityOptions: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'6 Months, 1 year, 2 year, 3 year+'>;
    landmarkLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Landmark'>;
    landmarkPlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Enter landmark'>;
    loanTableAmountHeader: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Loan Amount'>;
    loanTableBankHeader: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Bank Name'>;
    loanTableEmiHeader: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'EMI Amount'>;
    loanTableIdHeader: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Loan ID'>;
    loanTablePaidEmiHeader: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'No of Paid EMI'>;
    loanTableTypeHeader: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Loan Type'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::loan-application-page.loan-application-page'
    > &
      Schema.Attribute.Private;
    maritalStatusLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Marital Status'>;
    maritalStatusOptions: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Single, Married, Divorced, Widowed'>;
    motherNameLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Mother Name'>;
    motherNamePlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Enter Mother Name'>;
    netSalaryLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Net Salary (Per Month)'>;
    netSalaryPlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Enter net salary'>;
    nextStepButtonLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Next Step \u2192'>;
    noDocsUploadedText: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'No documents uploaded yet.'>;
    otherDocsSubtitle: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'( If there is any additional documents )'>;
    otherDocsTitle: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Other Documents'>;
    pageSubtitle: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Complete the steps below to submit your request.'>;
    pageTitle: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Loan Application'>;
    panCardLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Pan Card'>;
    pdfPasswordLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'PDF Password (If any)'>;
    pdfPasswordPlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Enter password if PDF is protected'>;
    pendingStatusText: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u23F3 PENDING'>;
    propertyAddressPincodeLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Property Address With Pincode'>;
    propertyAddressPincodePlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Enter full property address with pincode'>;
    propertyPapersLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Property Papers'>;
    propertyStatusLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Property Current Status'>;
    propertyStatusOptions: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Constructed, Plot, Boundries'>;
    propertyTypeLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Property Type'>;
    propertyTypeOptions: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Residential, Commercial, Industrial'>;
    propertyValueLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Property Value'>;
    propertyValueOptions: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'20L, 50L, 75L, 1Cr, 1.5Cr, 2Cr, 3Cr, 4Cr, 5Cr, 5Cr+'>;
    publishedAt: Schema.Attribute.DateTime;
    residenceTypeLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Residence Type'>;
    residenceTypeOptions: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Owned, Rented, Parental, Company Accommodation'>;
    runningLoanAmountLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Loan Amount'>;
    runningLoanAmountPlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Enter loan amount'>;
    runningLoanBankLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Bank Name'>;
    runningLoanBankPlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Enter bank name'>;
    runningLoanEmiLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'EMI amount'>;
    runningLoanEmiPlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Enter EMI amount'>;
    runningLoanPaidEmiLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'No of Paid EMI'>;
    runningLoanPaidEmiPlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Enter number of paid EMIs'>;
    runningLoanSubtitle: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'Please enter all your running loan details including credit card, Gold loan, Auto loan and any other running loan'>;
    runningLoanTitle: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Running Loan (If Any)'>;
    runningLoanTypeLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Loan Type'>;
    runningLoanTypeOptions: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'Personal Loan, Business Loan, Home Loan, Loan Against Property, Credit Card, Auto Loan, Bike Loan, Consumer Loan, Gold Loan, Education Loan, Over Draft, Other'>;
    salaryModeLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Salary Mode'>;
    salaryModeOptions: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Account Transfer, Cheque, Cash'>;
    salarySlipsLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Salary Slip 1 year'>;
    selectFileLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u2601\uFE0F Select File'>;
    spouseNameLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Spouse Name'>;
    spouseNamePlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Enter Spouse Name'>;
    stateLabel: Schema.Attribute.String & Schema.Attribute.DefaultTo<'State'>;
    submitButtonLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Save & Submit Lead'>;
    submittingButtonLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Submitting...'>;
    summaryAadharLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Aadhar Card Number'>;
    summaryBusinessTitle: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Business Details'>;
    summaryEmailLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Email Address'>;
    summaryIncomePropertyTitle: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Income & Property'>;
    summaryLoanAmountLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Expected Loan Amount'>;
    summaryOverviewTitle: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\uD83D\uDCCB Primary Application Overview'>;
    summaryPanLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'PAN Card Number'>;
    summaryPersonalAddressTitle: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Personal & Address'>;
    summaryPhoneLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Mobile Number'>;
    summaryPropertyTitle: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Property Details'>;
    summaryRunningLoansTitle: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Running Loans Summary'>;
    summaryTitle: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Application Summary'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    uploadButtonLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Upload Document'>;
    uploadedStatusText: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u2714 UPLOADED'>;
    uploadedSuccessfullyText: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Uploaded Successfully'>;
    uploadingButtonLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Uploading...'>;
    validationErrorText: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'Please fill all required fields in all tabs to submit the lead for further processing.'>;
    viewButtonLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\uD83D\uDC41 View'>;
  };
}

export interface ApiLoanApplicationLoanApplication
  extends Struct.CollectionTypeSchema {
  collectionName: 'loan_applications';
  info: {
    description: 'User submitted loan applications with 5-step process';
    displayName: 'Loan Application';
    pluralName: 'loan-applications';
    singularName: 'loan-application';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    aadharCardBack: Schema.Attribute.Media<'files' | 'images'>;
    aadharCardFront: Schema.Attribute.Media<'files' | 'images'>;
    aadharNumber: Schema.Attribute.String;
    applicantName: Schema.Attribute.String;
    assignedBankerId: Schema.Attribute.Integer;
    assignedStaffId: Schema.Attribute.Integer;
    bankStatement: Schema.Attribute.Media<'files' | 'images'>;
    businessName: Schema.Attribute.String;
    businessRegProofDoc: Schema.Attribute.Media<'files' | 'images'>;
    cibilReport: Schema.Attribute.Media<'files' | 'images'>;
    coAppAadharBack: Schema.Attribute.Media<'files' | 'images'>;
    coAppAadharFront: Schema.Attribute.Media<'files' | 'images'>;
    coAppPan: Schema.Attribute.Media<'files' | 'images'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    declarationAccepted: Schema.Attribute.Boolean;
    email: Schema.Attribute.String;
    form_data: Schema.Attribute.JSON;
    leadId: Schema.Attribute.Integer;
    loanAmount: Schema.Attribute.Decimal;
    loanType: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::loan-application.loan-application'
    > &
      Schema.Attribute.Private;
    otherDocs: Schema.Attribute.Media<'files' | 'images', true>;
    panCard: Schema.Attribute.Media<'files' | 'images'>;
    panNumber: Schema.Attribute.String;
    phone: Schema.Attribute.String;
    propertyPapers: Schema.Attribute.Media<'files' | 'images'>;
    proprietorshipDoc: Schema.Attribute.Media<'files' | 'images'>;
    publishedAt: Schema.Attribute.DateTime;
    salarySlips: Schema.Attribute.Media<'files' | 'images', true>;
    status: Schema.Attribute.Enumeration<
      ['Pending', 'Under Review', 'Approved', 'Rejected']
    > &
      Schema.Attribute.DefaultTo<'Pending'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiPersonalLoanEligibilityLendersCriteriaPl
  extends Struct.CollectionTypeSchema {
  collectionName: 'lenders_criteria_pl';
  info: {
    description: 'Personal loan eligibility thresholds per lender';
    displayName: 'Lenders Criteria PL';
    pluralName: 'lenders-criteria-pls';
    singularName: 'lenders-criteria-pl';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    acceptedSalaryTypes: Schema.Attribute.JSON;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    firstTimeBorrowerAllowed: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    foir: Schema.Attribute.Decimal;
    isActive: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    lenderCode: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::personal-loan-eligibility.lenders-criteria-pl'
    > &
      Schema.Attribute.Private;
    maxActiveUnsecuredAccount: Schema.Attribute.Integer;
    maxAge: Schema.Attribute.Integer;
    maxCCUtilizationRatio: Schema.Attribute.Decimal;
    maxDpdCount12months: Schema.Attribute.Integer;
    maxDpdCount3months: Schema.Attribute.Integer;
    maxDpdDaysAllowed: Schema.Attribute.Integer;
    maxEnquiries1month: Schema.Attribute.Integer;
    maxEnquiries3months: Schema.Attribute.Integer;
    maxInterestRate: Schema.Attribute.Decimal;
    maxLoanAmount: Schema.Attribute.Decimal;
    minAge: Schema.Attribute.Integer;
    minCibil: Schema.Attribute.Integer;
    minEmploymentMonths: Schema.Attribute.Integer;
    minInterestRate: Schema.Attribute.Decimal;
    minLoanAmount: Schema.Attribute.Decimal;
    minMonthlyIncome: Schema.Attribute.Decimal;
    pfRequired: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    pincodeCheckRequired: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiPersonalLoanScoringCriteriaLenderScoringCriteria
  extends Struct.CollectionTypeSchema {
  collectionName: 'lender_scoring_criteria';
  info: {
    description: 'Platform catalog for PL scoring criterion weights and JSON band rules';
    displayName: 'Lender Scoring Criteria';
    pluralName: 'lender-scoring-criterias';
    singularName: 'lender-scoring-criteria';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    category: Schema.Attribute.Enumeration<['Credit', 'Business', 'Loan']> &
      Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    criterionCode: Schema.Attribute.String & Schema.Attribute.Required;
    criterionName: Schema.Attribute.String & Schema.Attribute.Required;
    isActive: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    loanType: Schema.Attribute.Enumeration<
      ['Personal Loan', 'Business Loan', 'Home Loan', 'LAP Loan']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'Personal Loan'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::personal-loan-scoring-criteria.lender-scoring-criteria'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    rules: Schema.Attribute.JSON;
    ruleType: Schema.Attribute.Enumeration<
      ['JSON', 'FORMULA', 'STATIC', 'JSON+FORMULA']
    > &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    weight: Schema.Attribute.Decimal & Schema.Attribute.Required;
  };
}

export interface ApiProductPageProductPage extends Struct.SingleTypeSchema {
  collectionName: 'product_page';
  info: {
    description: 'Content for the Product Page';
    displayName: 'Product Page';
    pluralName: 'product-pages';
    singularName: 'product-page';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    backButtonLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Back'>;
    backButtonLink: Schema.Attribute.String & Schema.Attribute.DefaultTo<'/'>;
    continueButtonLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Continue'>;
    continueButtonLink: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'/lead-form'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    heroSubtitle: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'Our diverse range of financial products is designed to scale with your specific needs.'>;
    heroTitle: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'Choose Your Lending Solution'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::product-page.product-page'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiProductProduct extends Struct.CollectionTypeSchema {
  collectionName: 'products';
  info: {
    description: 'Products for the Product page';
    displayName: 'Product';
    pluralName: 'products';
    singularName: 'product';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.RichText;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::product.product'
    > &
      Schema.Attribute.Private;
    logo: Schema.Attribute.Media<'images'>;
    publishedAt: Schema.Attribute.DateTime;
    title: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiUserProductMappingUserProductMapping
  extends Struct.CollectionTypeSchema {
  collectionName: 'user_product_mappings';
  info: {
    description: 'Stores product assignment for admin users (staff/bankers)';
    displayName: 'User Product Mappings';
    pluralName: 'user-product-mappings';
    singularName: 'user-product-mapping';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
  };
  attributes: {
    adminUserId: Schema.Attribute.Integer & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::user-product-mapping.user-product-mapping'
    > &
      Schema.Attribute.Private;
    product: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user_role: Schema.Attribute.String;
  };
}

export interface PluginContentReleasesRelease
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_releases';
  info: {
    displayName: 'Release';
    pluralName: 'releases';
    singularName: 'release';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    actions: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::content-releases.release-action'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::content-releases.release'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    releasedAt: Schema.Attribute.DateTime;
    scheduledAt: Schema.Attribute.DateTime;
    status: Schema.Attribute.Enumeration<
      ['ready', 'blocked', 'failed', 'done', 'empty']
    > &
      Schema.Attribute.Required;
    timezone: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginContentReleasesReleaseAction
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_release_actions';
  info: {
    displayName: 'Release Action';
    pluralName: 'release-actions';
    singularName: 'release-action';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    contentType: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    entryDocumentId: Schema.Attribute.String;
    isEntryValid: Schema.Attribute.Boolean;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::content-releases.release-action'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    release: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::content-releases.release'
    >;
    type: Schema.Attribute.Enumeration<['publish', 'unpublish']> &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginI18NLocale extends Struct.CollectionTypeSchema {
  collectionName: 'i18n_locale';
  info: {
    collectionName: 'locales';
    description: '';
    displayName: 'Locale';
    pluralName: 'locales';
    singularName: 'locale';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    code: Schema.Attribute.String & Schema.Attribute.Unique;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::i18n.locale'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.SetMinMax<
        {
          max: 50;
          min: 1;
        },
        number
      >;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginReviewWorkflowsWorkflow
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_workflows';
  info: {
    description: '';
    displayName: 'Workflow';
    name: 'Workflow';
    pluralName: 'workflows';
    singularName: 'workflow';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    contentTypes: Schema.Attribute.JSON &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'[]'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::review-workflows.workflow'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    stageRequiredToPublish: Schema.Attribute.Relation<
      'oneToOne',
      'plugin::review-workflows.workflow-stage'
    >;
    stages: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::review-workflows.workflow-stage'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginReviewWorkflowsWorkflowStage
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_workflows_stages';
  info: {
    description: '';
    displayName: 'Stages';
    name: 'Workflow Stage';
    pluralName: 'workflow-stages';
    singularName: 'workflow-stage';
  };
  options: {
    draftAndPublish: false;
    version: '1.1.0';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    color: Schema.Attribute.String & Schema.Attribute.DefaultTo<'#4945FF'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::review-workflows.workflow-stage'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String;
    permissions: Schema.Attribute.Relation<'manyToMany', 'admin::permission'>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    workflow: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::review-workflows.workflow'
    >;
  };
}

export interface PluginUploadFile extends Struct.CollectionTypeSchema {
  collectionName: 'files';
  info: {
    description: '';
    displayName: 'File';
    pluralName: 'files';
    singularName: 'file';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    alternativeText: Schema.Attribute.Text;
    caption: Schema.Attribute.Text;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    ext: Schema.Attribute.String;
    focalPoint: Schema.Attribute.JSON;
    folder: Schema.Attribute.Relation<'manyToOne', 'plugin::upload.folder'> &
      Schema.Attribute.Private;
    folderPath: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    formats: Schema.Attribute.JSON;
    hash: Schema.Attribute.String & Schema.Attribute.Required;
    height: Schema.Attribute.Integer;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::upload.file'
    > &
      Schema.Attribute.Private;
    mime: Schema.Attribute.String & Schema.Attribute.Required;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    previewUrl: Schema.Attribute.Text;
    provider: Schema.Attribute.String & Schema.Attribute.Required;
    provider_metadata: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    related: Schema.Attribute.Relation<'morphToMany'>;
    size: Schema.Attribute.Decimal & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    url: Schema.Attribute.Text & Schema.Attribute.Required;
    width: Schema.Attribute.Integer;
  };
}

export interface PluginUploadFolder extends Struct.CollectionTypeSchema {
  collectionName: 'upload_folders';
  info: {
    displayName: 'Folder';
    pluralName: 'folders';
    singularName: 'folder';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    children: Schema.Attribute.Relation<'oneToMany', 'plugin::upload.folder'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    files: Schema.Attribute.Relation<'oneToMany', 'plugin::upload.file'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::upload.folder'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    parent: Schema.Attribute.Relation<'manyToOne', 'plugin::upload.folder'>;
    path: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    pathId: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginUsersPermissionsPermission
  extends Struct.CollectionTypeSchema {
  collectionName: 'up_permissions';
  info: {
    description: '';
    displayName: 'Permission';
    name: 'permission';
    pluralName: 'permissions';
    singularName: 'permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.permission'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginUsersPermissionsRole
  extends Struct.CollectionTypeSchema {
  collectionName: 'up_roles';
  info: {
    description: '';
    displayName: 'Role';
    name: 'role';
    pluralName: 'roles';
    singularName: 'role';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.role'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
    permissions: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.permission'
    >;
    publishedAt: Schema.Attribute.DateTime;
    type: Schema.Attribute.String & Schema.Attribute.Unique;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    users: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.user'
    >;
  };
}

export interface PluginUsersPermissionsUser
  extends Struct.CollectionTypeSchema {
  collectionName: 'up_users';
  info: {
    description: '';
    displayName: 'User';
    name: 'user';
    pluralName: 'users';
    singularName: 'user';
  };
  options: {
    draftAndPublish: false;
    timestamps: true;
  };
  attributes: {
    blocked: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    confirmationToken: Schema.Attribute.String & Schema.Attribute.Private;
    confirmed: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.user'
    > &
      Schema.Attribute.Private;
    password: Schema.Attribute.Password &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    provider: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private;
    role: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    username: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ContentTypeSchemas {
      'admin::api-token': AdminApiToken;
      'admin::api-token-permission': AdminApiTokenPermission;
      'admin::audit-log': AdminAuditLog;
      'admin::permission': AdminPermission;
      'admin::role': AdminRole;
      'admin::session': AdminSession;
      'admin::transfer-token': AdminTransferToken;
      'admin::transfer-token-permission': AdminTransferTokenPermission;
      'admin::user': AdminUser;
      'api::about-us-page.about-us-page': ApiAboutUsPageAboutUsPage;
      'api::activity-log.activity-log': ApiActivityLogActivityLog;
      'api::advisor-registration-page.advisor-registration-page': ApiAdvisorRegistrationPageAdvisorRegistrationPage;
      'api::advisor.advisor': ApiAdvisorAdvisor;
      'api::bureau-data-extraction.cibil-report-summary': ApiBureauDataExtractionCibilReportSummary;
      'api::contact-us-page.contact-us-page': ApiContactUsPageContactUsPage;
      'api::footer.footer': ApiFooterFooter;
      'api::global-setting.global-setting': ApiGlobalSettingGlobalSetting;
      'api::header.header': ApiHeaderHeader;
      'api::homepage.homepage': ApiHomepageHomepage;
      'api::lead-form-page.lead-form-page': ApiLeadFormPageLeadFormPage;
      'api::lead-remark.lead-remark': ApiLeadRemarkLeadRemark;
      'api::lead.lead': ApiLeadLead;
      'api::lender-master.lenders-catalog': ApiLenderMasterLendersCatalog;
      'api::lender-master.zip-code': ApiLenderMasterZipCode;
      'api::loan-app-section-permission.loan-app-section-permission': ApiLoanAppSectionPermissionLoanAppSectionPermission;
      'api::loan-application-page.loan-application-page': ApiLoanApplicationPageLoanApplicationPage;
      'api::loan-application.loan-application': ApiLoanApplicationLoanApplication;
      'api::personal-loan-eligibility.lenders-criteria-pl': ApiPersonalLoanEligibilityLendersCriteriaPl;
      'api::personal-loan-scoring-criteria.lender-scoring-criteria': ApiPersonalLoanScoringCriteriaLenderScoringCriteria;
      'api::product-page.product-page': ApiProductPageProductPage;
      'api::product.product': ApiProductProduct;
      'api::user-product-mapping.user-product-mapping': ApiUserProductMappingUserProductMapping;
      'plugin::content-releases.release': PluginContentReleasesRelease;
      'plugin::content-releases.release-action': PluginContentReleasesReleaseAction;
      'plugin::i18n.locale': PluginI18NLocale;
      'plugin::review-workflows.workflow': PluginReviewWorkflowsWorkflow;
      'plugin::review-workflows.workflow-stage': PluginReviewWorkflowsWorkflowStage;
      'plugin::upload.file': PluginUploadFile;
      'plugin::upload.folder': PluginUploadFolder;
      'plugin::users-permissions.permission': PluginUsersPermissionsPermission;
      'plugin::users-permissions.role': PluginUsersPermissionsRole;
      'plugin::users-permissions.user': PluginUsersPermissionsUser;
    }
  }
}
