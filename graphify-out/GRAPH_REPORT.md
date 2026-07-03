# Graph Report - .  (2026-07-03)

## Corpus Check
- 243 files · ~110,978 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 689 nodes · 1007 edges · 71 communities (53 shown, 18 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.73)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_AboutAdvisor Registration Pages|About/Advisor Registration Pages]]
- [[_COMMUNITY_Strapi Admin Type Definitions|Strapi Admin Type Definitions]]
- [[_COMMUNITY_Backend Package Dependencies|Backend Package Dependencies]]
- [[_COMMUNITY_Admin Panel Bootstrap Config|Admin Panel Bootstrap Config]]
- [[_COMMUNITY_Lead Dashboard Admin Overrides|Lead Dashboard Admin Overrides]]
- [[_COMMUNITY_Loan Product Funnel Forms|Loan Product Funnel Forms]]
- [[_COMMUNITY_Lead Detail Dashboard UI|Lead Detail Dashboard UI]]
- [[_COMMUNITY_AdvisorLeadLoan Data Model|Advisor/Lead/Loan Data Model]]
- [[_COMMUNITY_Loan Funnel Forms (Dummy Pages)|Loan Funnel Forms (Dummy Pages)]]
- [[_COMMUNITY_Advisor Dashboard & Login|Advisor Dashboard & Login]]
- [[_COMMUNITY_Admin Users List Overrides|Admin Users List Overrides]]
- [[_COMMUNITY_Frontend Package Dependencies|Frontend Package Dependencies]]
- [[_COMMUNITY_TypeScript Config (Root)|TypeScript Config (Root)]]
- [[_COMMUNITY_TypeScript Config (Frontend)|TypeScript Config (Frontend)]]
- [[_COMMUNITY_TypeScript Config (Variant)|TypeScript Config (Variant)]]
- [[_COMMUNITY_Lead Table Admin Overrides|Lead Table Admin Overrides]]
- [[_COMMUNITY_Loan App Section Permissions|Loan App Section Permissions]]
- [[_COMMUNITY_Advisor Overview Dashboard|Advisor Overview Dashboard]]
- [[_COMMUNITY_Advisor Table Admin Overrides|Advisor Table Admin Overrides]]
- [[_COMMUNITY_Lead Overview Dashboard|Lead Overview Dashboard]]
- [[_COMMUNITY_Admin User Product Mapping Override|Admin User Product Mapping Override]]
- [[_COMMUNITY_Role Tab Admin Override|Role Tab Admin Override]]
- [[_COMMUNITY_Add-Lead Permission Override|Add-Lead Permission Override]]
- [[_COMMUNITY_Admin Notifications Widget|Admin Notifications Widget]]
- [[_COMMUNITY_Email Templates & Bootstrap|Email Templates & Bootstrap]]
- [[_COMMUNITY_Admin Panel Build Tooling|Admin Panel Build Tooling]]
- [[_COMMUNITY_Lender FK Migration|Lender FK Migration]]
- [[_COMMUNITY_Project Overview Docs|Project Overview Docs]]
- [[_COMMUNITY_Next.js Scaffold Docs|Next.js Scaffold Docs]]
- [[_COMMUNITY_API Config|API Config]]
- [[_COMMUNITY_Middlewares Config|Middlewares Config]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
- [[_COMMUNITY_Activity Log Collection|Activity Log Collection]]
- [[_COMMUNITY_Product Collection|Product Collection]]
- [[_COMMUNITY_App Favicon|App Favicon]]
- [[_COMMUNITY_File Icon Asset|File Icon Asset]]
- [[_COMMUNITY_Globe Icon Asset|Globe Icon Asset]]
- [[_COMMUNITY_ScaleX Brand Logo|ScaleX Brand Logo]]
- [[_COMMUNITY_Next.js Logo Asset|Next.js Logo Asset]]
- [[_COMMUNITY_Vercel Logo Asset|Vercel Logo Asset]]
- [[_COMMUNITY_Window Icon Asset|Window Icon Asset]]
- [[_COMMUNITY_Default Banner Image|Default Banner Image]]
- [[_COMMUNITY_Default Logo Image|Default Logo Image]]
- [[_COMMUNITY_Alt Admin Panel Logo|Alt Admin Panel Logo]]
- [[_COMMUNITY_Admin Panel Logo (Globe)|Admin Panel Logo (Globe)]]

## God Nodes (most connected - your core abstractions)
1. `strapiInternalApi()` - 27 edges
2. `withStrapiPublicUrl()` - 20 edges
3. `compilerOptions` - 16 edges
4. `initOverrides()` - 16 edges
5. `compilerOptions` - 15 edges
6. `compilerOptions` - 15 edges
7. `scripts` - 10 edges
8. `strapiPublicApi()` - 9 edges
9. `applyAdminUsersListOverride()` - 9 edges
10. `applyLeadTableOverride()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `user-product-mapping collection` --semantically_similar_to--> `lenders_criteria_pl table`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/lender-matching-pl.md
- `CLAUDE.md Common Commands (npm run dev/build/start)` --semantically_similar_to--> `Strapi CLI commands (develop/start/build)`  [INFERRED] [semantically similar]
  CLAUDE.md → README.md
- `robots.txt search-engine block config` --conceptually_related_to--> `ScaleX Finance MVP (project overview)`  [AMBIGUOUS]
  public/robots.txt → CLAUDE.md
- `cibil_report_summary table` --references--> `loan-application collection`  [INFERRED]
  docs/lender-matching-pl.md → CLAUDE.md
- `lender collection` --shares_data_with--> `lenders_catalog table`  [INFERRED]
  CLAUDE.md → docs/lender-matching-pl.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Personal Loan Lender Matching Database Schema** — docs_lender_matching_pl_lenders_catalog, docs_lender_matching_pl_zip_codes, docs_lender_matching_pl_lender_business_exclusions, docs_lender_matching_pl_cibil_report_summary, docs_lender_matching_pl_lenders_criteria_pl, docs_lender_matching_pl_advanced_lenders_criteria_pl [EXTRACTED 1.00]
- **Three-Role Admin Access Model (Advisor/Staff/Banker)** — claude_md_advisor_role, claude_md_staff_role, claude_md_banker_role, claude_md_user_product_mapping_collection, claude_md_loan_app_section_permission_collection [EXTRACTED 1.00]
- **Lead Onboarding Notification Emails** — src_email_templates_advisor_notification_html_new_lead_email, src_email_templates_welcome_lead_html_welcome_email, claude_md_lead_loan_application_flow [INFERRED 0.75]

## Communities (71 total, 18 thin omitted)

### Community 1 - "About/Advisor Registration Pages"
Cohesion: 0.07
Nodes (39): AboutUsPage(), getAboutUsPageData(), parseBlocks(), AdvisorRegistrationPage(), getAdvisorPageData(), Footer(), getFooterData(), getHeaderData() (+31 more)

### Community 2 - "Strapi Admin Type Definitions"
Cohesion: 0.04
Nodes (48): AdminApiToken, AdminApiTokenPermission, AdminAuditLog, AdminPermission, AdminRole, AdminSession, AdminTransferToken, AdminTransferTokenPermission (+40 more)

### Community 3 - "Backend Package Dependencies"
Cohesion: 0.06
Nodes (35): dependencies, pg, react, react-dom, react-router-dom, @strapi/plugin-cloud, @strapi/plugin-users-permissions, @strapi/provider-email-nodemailer (+27 more)

### Community 4 - "Admin Panel Bootstrap Config"
Cohesion: 0.08
Nodes (22): bootstrap(), appConfig, registerClickHandlers(), startDomOverrides(), installFetchInterceptor(), _fixCollectionPageSize(), _getCollectionUid(), _origEarlyPush (+14 more)

### Community 5 - "Lead Dashboard Admin Overrides"
Cohesion: 0.11
Nodes (21): applyLeadDashboardOverride(), applyNavPermissionWhenReady(), hideEl(), hideStrapiFrame(), initOverrides(), loadAddNewLeadNavPermission(), prefetchAdvisorStatusMap(), prefetchLeadsData() (+13 more)

### Community 6 - "Loan Product Funnel Forms"
Cohesion: 0.21
Nodes (19): BusinessLoanFunnel(), HomeLoanFunnel(), LAPFunnel(), PersonalLoanFunnel(), AadharCardField(), AdvisorReferralField(), EmailField(), EmploymentTypeField() (+11 more)

### Community 7 - "Lead Detail Dashboard UI"
Cohesion: 0.14
Nodes (19): LeadDetailDashboard(), bubbleStyle(), fileFormatBox(), fileFormatText(), logTextStyle, styles, allSectionsAllowed(), authHeaders() (+11 more)

### Community 8 - "Advisor/Lead/Loan Data Model"
Cohesion: 0.14
Nodes (23): advisor collection, Advisor role, Banker role, Strapi Bootstrap Logic (src/index.ts), lead collection, Lead & Loan Application Flow, lead-remark collection, lender collection (+15 more)

### Community 9 - "Loan Funnel Forms (Dummy Pages)"
Cohesion: 0.23
Nodes (16): BusinessLoanFunnel(), HomeLoanFunnel(), LAPFunnel(), PersonalLoanFunnel(), getSteps(), LoanApplicationForm(), BusinessDetailsFields(), DocumentsFields() (+8 more)

### Community 10 - "Advisor Dashboard & Login"
Cohesion: 0.15
Nodes (10): Lead, AdvisorLoginForm(), AdvisorForm(), logEvent(), LogSeverity, getStorage(), noopStorage, safeLocalStorage() (+2 more)

### Community 11 - "Admin Users List Overrides"
Cohesion: 0.15
Nodes (16): AdminUserEntry, applyAdminUsersListOverride(), cleanUrl(), ensureFilterControls(), ensureIdHeader(), fetchAdminUsers(), fetchProductMappings(), FilterState (+8 more)

### Community 12 - "Frontend Package Dependencies"
Cohesion: 0.10
Nodes (19): dependencies, next, react, react-dom, devDependencies, eslint, eslint-config-next, @types/node (+11 more)

### Community 13 - "TypeScript Config (Root)"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 14 - "TypeScript Config (Frontend)"
Cohesion: 0.11
Nodes (17): compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, jsx, lib, module (+9 more)

### Community 15 - "TypeScript Config (Variant)"
Cohesion: 0.11
Nodes (17): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, incremental, lib, module, moduleResolution, noEmitOnError (+9 more)

### Community 16 - "Lead Table Admin Overrides"
Cohesion: 0.24
Nodes (14): applyGlobalElementStyling(), applyLeadTableOverride(), applyPopoverFieldOverrides(), ensureActionsHeader(), getUserRole(), isInsideRadixPortal(), relabelLeadHeaders(), showAdvisorColumn() (+6 more)

### Community 17 - "Loan App Section Permissions"
Cohesion: 0.17
Nodes (8): defaultPerms(), FIELD_PERMS, FieldPerm, LoanAppPermissions(), PermsMap, SECTION_PERMS, SECTION_TREE, SectionPerm

### Community 18 - "Advisor Overview Dashboard"
Cohesion: 0.27
Nodes (7): AdvisorOverviewDashboard(), StatCard(), cardBorderStyle(), styles, AdvisorStats, initialStats, useAdvisorOverview()

### Community 19 - "Advisor Table Admin Overrides"
Cohesion: 0.25
Nodes (9): applyAdvisorTableOverride(), ensureAdvisorActionsHeader(), relabelAdvisorHeaders(), tagAdvisorHeaders(), transformAdvisorRow(), advisorLabelMap, leadLabelMap, StatusBadgeColor (+1 more)

### Community 20 - "Lead Overview Dashboard"
Cohesion: 0.27
Nodes (7): LeadOverviewDashboard(), StatCard(), cardBorderStyle(), styles, initialStats, LeadStats, useLeadOverview()

### Community 21 - "Admin User Product Mapping Override"
Cohesion: 0.43
Nodes (6): applyAdminUserOverride(), fetchExistingProductMapping(), fetchProductOptionsForEdit(), getSelectedRoleOnEditPage(), injectProductFieldOnEditPage(), prefillPassword()

### Community 22 - "Role Tab Admin Override"
Cohesion: 0.39
Nodes (7): activateCustomTab(), applyRoleTabOverride(), fetchRoleName(), getRoleIdFromUrl(), hideCustomPanel(), mountPanel(), setTabInactive()

### Community 23 - "Add-Lead Permission Override"
Cohesion: 0.57
Nodes (6): applyAddNewLeadPermissionRow(), fetchRecord(), getRoleIdFromUrl(), getToken(), loadAddNewLeadShow(), saveAddNewLeadShow()

### Community 24 - "Admin Notifications Widget"
Cohesion: 0.53
Nodes (3): AdminNotifications(), styles, useAdminNotifications()

### Community 25 - "Email Templates & Bootstrap"
Cohesion: 0.47
Nodes (3): getEmailTemplate(), bootstrap(), createAdminUserFromAdvisor()

### Community 26 - "Admin Panel Build Tooling"
Cohesion: 0.40
Nodes (5): Build error: src/admin/app.tsx esbuild syntax error, Vite/esbuild admin panel build tooling, CLAUDE.md Common Commands (npm run dev/build/start), src/admin custom admin panel extensions, Strapi CLI commands (develop/start/build)

### Community 27 - "Lender FK Migration"
Cohesion: 0.60
Nodes (4): down(), FK_CONSTRAINT(), TABLES, up()

### Community 28 - "Project Overview Docs"
Cohesion: 0.67
Nodes (3): ScaleX Finance MVP (project overview), robots.txt search-engine block config, ScaleX-Finance (README project name)

## Ambiguous Edges - Review These
- `ScaleX Finance MVP (project overview)` → `robots.txt search-engine block config`  [AMBIGUOUS]
  public/robots.txt · relation: conceptually_related_to

## Knowledge Gaps
- **200 isolated node(s):** `config`, `config`, `TABLES`, `eslintConfig`, `nextConfig` (+195 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `ScaleX Finance MVP (project overview)` and `robots.txt search-engine block config`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `strapiInternalApi()` connect `About/Advisor Registration Pages` to `Strapi Content-Type Definitions`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `withStrapiPublicUrl()` connect `About/Advisor Registration Pages` to `Strapi Content-Type Definitions`, `Advisor Dashboard & Login`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `applyAdminUsersListOverride()` connect `Admin Users List Overrides` to `Lead Dashboard Admin Overrides`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `config`, `config`, `TABLES` to the rest of the system?**
  _201 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Strapi Content-Type Definitions` be split into smaller, more focused modules?**
  _Cohesion score 0.024096385542168676 - nodes in this community are weakly interconnected._
- **Should `About/Advisor Registration Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.06704260651629072 - nodes in this community are weakly interconnected._