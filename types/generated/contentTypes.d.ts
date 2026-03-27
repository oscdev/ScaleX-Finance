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
        'MAINTENANCE_TOGGLED',
        'LOGS_PURGED',
        'AI_MATCH_GENERATED',
        'LOAN_STATUS_CHANGED',
      ]
    > &
      Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.Text;
    ipAddress: Schema.Attribute.String;
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
  };
  attributes: {
    advisorStatus: Schema.Attribute.Enumeration<['Approved', 'Disapproved']> &
      Schema.Attribute.DefaultTo<'Disapproved'>;
    bankAccountNumber: Schema.Attribute.String & Schema.Attribute.Required;
    bankName: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    district: Schema.Attribute.String & Schema.Attribute.Required;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
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
    password: Schema.Attribute.Password & Schema.Attribute.Required;
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

export interface ApiAxisBankPageAxisBankPage extends Struct.SingleTypeSchema {
  collectionName: 'axis-bank-pages';
  info: {
    description: 'Dummy page for Axis Bank lender redirection';
    displayName: 'Axis Bank Page';
    pluralName: 'axis-bank-pages';
    singularName: 'axis-bank-page';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    applyButtonText: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Proceed with Application'>;
    backToLendersText: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Back to Lenders'>;
    bankLogo: Schema.Attribute.Media<'images'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    heroSubtitle: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'Your preferred lender choice for financial solutions.'>;
    heroTitle: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Welcome to Axis Bank'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::axis-bank-page.axis-bank-page'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
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
    googleMapUrl: Schema.Attribute.String &
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
      Schema.Attribute.DefaultTo<'/#about'>;
    contactPlatformLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Contact Platform'>;
    contactPlatformLink: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'/#contact'>;
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
    draftAndPublish: false;
  };
  attributes: {
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
    loggingIsEnabled: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    maintenanceModeIsEnabled: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    notificationsIsEnabled: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    publishedAt: Schema.Attribute.DateTime;
    retentionDays: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<30>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiHdfcBankPageHdfcBankPage extends Struct.SingleTypeSchema {
  collectionName: 'hdfc-bank-pages';
  info: {
    description: 'Dummy page for HDFC Bank lender redirection';
    displayName: 'HDFC Bank Page';
    pluralName: 'hdfc-bank-pages';
    singularName: 'hdfc-bank-page';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    applyButtonText: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Apply Now via HDFC'>;
    backToLendersText: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Return to Lenders List'>;
    bankLogo: Schema.Attribute.Media<'images'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    heroSubtitle: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'Trusted financial partner for your loan requirements.'>;
    heroTitle: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'HDFC Bank Portal'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::hdfc-bank-page.hdfc-bank-page'
    > &
      Schema.Attribute.Private;
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
    aboutUsLink: Schema.Attribute.String & Schema.Attribute.DefaultTo<'/about'>;
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
    applyNowButtonLink: Schema.Attribute.String;
    applyNowButtonText: Schema.Attribute.String;
    becomeAnAdvisorButtonLink: Schema.Attribute.String;
    becomeAnAdvisorButtonText: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    heroBanner: Schema.Attribute.Media<'images' | 'videos'>;
    heroSubtitle: Schema.Attribute.Text;
    heroTitle: Schema.Attribute.String;
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
    valuePropositionClientsContent: Schema.Attribute.RichText;
    valuePropositionContent: Schema.Attribute.RichText;
    valuePropositionSecureContent: Schema.Attribute.RichText;
    valuePropositionTitle: Schema.Attribute.String;
  };
}

export interface ApiLeadFormPageLeadFormPage extends Struct.SingleTypeSchema {
  collectionName: 'lead_form_page';
  info: {
    description: 'Content for the Lead Form Page';
    displayName: 'Lead Form Page';
    pluralName: 'lead-form-pages';
    singularName: 'lead-form-page';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    advisorReferralIdLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Advisor Referral ID (Optional)'>;
    advisorReferralIdPlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'e.g., ADV123456'>;
    backButtonLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Back'>;
    backButtonLink: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'/products'>;
    cityLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'City/District'>;
    cityPlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'e.g., Mumbai'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    creditScoreLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Credit Score'>;
    creditScorePlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'e.g., 750'>;
    emailLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Email Address'>;
    emailPlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'e.g., john@example.com'>;
    employmentTypeLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Employment Type'>;
    employmentTypePlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Select Employment Type'>;
    existingLoansLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Existing Loans (Total monthly EMI)'>;
    existingLoansPlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'e.g., 5000'>;
    fullNameLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Full Name'>;
    fullNamePlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'e.g., John Doe'>;
    heroSubtitle: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'Please fill out the details below to proceed.'>;
    heroTitle: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Apply for a Loan'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::lead-form-page.lead-form-page'
    > &
      Schema.Attribute.Private;
    mobileNumberLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Mobile Number'>;
    mobileNumberPlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'e.g., 9876543210'>;
    monthlyIncomeLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Monthly Income'>;
    monthlyIncomePlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'e.g., 75000'>;
    pinCodeLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Pin Code'>;
    pinCodePlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'e.g., 400001'>;
    publishedAt: Schema.Attribute.DateTime;
    requiredAmountLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Required Amount'>;
    requiredAmountPlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'e.g., 500000'>;
    submitButtonLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Submit Application'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiLeadLead extends Struct.CollectionTypeSchema {
  collectionName: 'leads';
  info: {
    description: 'Submitted Lead Applications from Frontend';
    displayName: 'Lead';
    pluralName: 'leads';
    singularName: 'lead';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    advisorReferralId: Schema.Attribute.String;
    city: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    creditScore: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 900;
          min: 300;
        },
        number
      >;
    email: Schema.Attribute.Email & Schema.Attribute.Required;
    employmentType: Schema.Attribute.Enumeration<
      ['Salaried', 'Self Employed', 'Business']
    > &
      Schema.Attribute.Required;
    existingLoans: Schema.Attribute.Decimal & Schema.Attribute.Required;
    fullName: Schema.Attribute.String & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::lead.lead'> &
      Schema.Attribute.Private;
    mobileNumber: Schema.Attribute.String & Schema.Attribute.Required;
    monthlyIncome: Schema.Attribute.Decimal & Schema.Attribute.Required;
    panCard: Schema.Attribute.String;
    pincode: Schema.Attribute.String;
    pinCode: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    remarks: Schema.Attribute.JSON;
    requiredAmount: Schema.Attribute.Decimal & Schema.Attribute.Required;
    selectedProduct: Schema.Attribute.String;
    status: Schema.Attribute.Enumeration<
      ['NEW', 'UNDER_PROCESS', 'APPROVED', 'REJECTED', 'DISBURSED']
    > &
      Schema.Attribute.DefaultTo<'NEW'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiLenderLender extends Struct.CollectionTypeSchema {
  collectionName: 'lenders';
  info: {
    description: 'Financial institutions and banks providing loans';
    displayName: 'Lender';
    pluralName: 'lenders';
    singularName: 'lender';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    applyUrl: Schema.Attribute.String & Schema.Attribute.DefaultTo<'#'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    interestRateOffer: Schema.Attribute.String & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::lender.lender'
    > &
      Schema.Attribute.Private;
    logo: Schema.Attribute.Media<'images'>;
    matchPercentage: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 100;
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<90>;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiLendersPageLendersPage extends Struct.SingleTypeSchema {
  collectionName: 'lenders_pages';
  info: {
    description: 'CMS settings for the Matched Lenders results page';
    displayName: 'Lenders Page';
    pluralName: 'lenders-pages';
    singularName: 'lenders-page';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.Text &
      Schema.Attribute.DefaultTo<'Based on your application, these lenders are the best match for your requirements.'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::lenders-page.lenders-page'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    title: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Matched Lenders'>;
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
    draftAndPublish: false;
  };
  attributes: {
    adharLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Adhar Card Number'>;
    adharPlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'XXXX XXXX XXXX'>;
    applicantNameLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Applicant Name'>;
    applicantNamePlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'e.g., John Doe'>;
    backButtonLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Back'>;
    bankStatementsLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Bank Statements (Last 6 Months)'>;
    businessNameLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Business Name'>;
    businessNamePlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'e.g., Oscprofessionals'>;
    collateralCheckboxLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'I have collateral to offer'>;
    collateralTypeLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Collateral Type'>;
    collateralTypePlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Select Type'>;
    collateralValueLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Estimated Value (\u20B9)'>;
    collateralValuePlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'e.g., 5000000'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    declarationText: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'I hereby declare that the information provided is true and correct. I authorize Scalex Finance and its partners to verify my details and check my credit score.'>;
    docsInstructionText: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Please upload clear copies of the following documents. Supported formats: PDF, JPG, PNG.'>;
    emailLabel: Schema.Attribute.String & Schema.Attribute.DefaultTo<'Email'>;
    emailPlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'e.g., john@example.com'>;
    fileUploadPlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Click to browse or drag file here'>;
    gstReturnsLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'GST Returns (Last 12 Months)'>;
    itReturnsLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Income Tax Returns (Last 2 Years)'>;
    loanAmountLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Loan Amount'>;
    loanTypeLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Loan Type'>;
    loanTypePlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Select Product'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::loan-application-page.loan-application-page'
    > &
      Schema.Attribute.Private;
    nextStepButtonLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Next Step \u2192'>;
    notificationsLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Get Email Notifications for Lead Updated?'>;
    otherDocsLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Other document (Pan/Adhar etc)'>;
    pageSubtitle: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Complete the steps below to submit your request.'>;
    pageTitle: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Loan Application'>;
    panLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'PAN Card Number'>;
    panPlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'ABCDE1234F'>;
    phoneLabel: Schema.Attribute.String & Schema.Attribute.DefaultTo<'Phone'>;
    phonePlaceholder: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'e.g., 9876543210'>;
    publishedAt: Schema.Attribute.DateTime;
    submitButtonLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Submit Application'>;
    summaryTitle: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Application Summary'>;
    tenureLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Tenure (Months)'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
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
    adharNumber: Schema.Attribute.String & Schema.Attribute.Required;
    applicantName: Schema.Attribute.String & Schema.Attribute.Required;
    bankStatements: Schema.Attribute.Media<'files' | 'images', true>;
    businessName: Schema.Attribute.String & Schema.Attribute.Required;
    collateralType: Schema.Attribute.Enumeration<
      [
        'Property (Personal/Commercial)',
        'Gold',
        'Fixed Deposit',
        'Machine/Vehicle',
      ]
    >;
    collateralValue: Schema.Attribute.Decimal;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    declarationAccepted: Schema.Attribute.Boolean & Schema.Attribute.Required;
    email: Schema.Attribute.Email & Schema.Attribute.Required;
    emailNotifications: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    gstReturns: Schema.Attribute.Media<'files' | 'images', true>;
    hasCollateral: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    itReturns: Schema.Attribute.Media<'files' | 'images', true>;
    loanAmount: Schema.Attribute.Decimal & Schema.Attribute.Required;
    loanType: Schema.Attribute.String & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::loan-application.loan-application'
    > &
      Schema.Attribute.Private;
    otherDocs: Schema.Attribute.Media<'files' | 'images', true>;
    panNumber: Schema.Attribute.String & Schema.Attribute.Required;
    phone: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    tenureMonths: Schema.Attribute.Enumeration<
      ['Months_12', 'Months_24', 'Months_36', 'Months_48', 'Months_60']
    > &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
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
    continueButtonLink: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    heroSubtitle: Schema.Attribute.Text;
    heroTitle: Schema.Attribute.String & Schema.Attribute.Required;
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
    draftAndPublish: true;
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
      'api::axis-bank-page.axis-bank-page': ApiAxisBankPageAxisBankPage;
      'api::contact-us-page.contact-us-page': ApiContactUsPageContactUsPage;
      'api::footer.footer': ApiFooterFooter;
      'api::global-setting.global-setting': ApiGlobalSettingGlobalSetting;
      'api::hdfc-bank-page.hdfc-bank-page': ApiHdfcBankPageHdfcBankPage;
      'api::header.header': ApiHeaderHeader;
      'api::homepage.homepage': ApiHomepageHomepage;
      'api::lead-form-page.lead-form-page': ApiLeadFormPageLeadFormPage;
      'api::lead.lead': ApiLeadLead;
      'api::lender.lender': ApiLenderLender;
      'api::lenders-page.lenders-page': ApiLendersPageLendersPage;
      'api::loan-application-page.loan-application-page': ApiLoanApplicationPageLoanApplicationPage;
      'api::loan-application.loan-application': ApiLoanApplicationLoanApplication;
      'api::product-page.product-page': ApiProductPageProductPage;
      'api::product.product': ApiProductProduct;
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
