Task: Replace lenders with lenders_catalog Across the Application
Objective
The existing lenders table is deprecated and should be completely replaced with lenders_catalog throughout the backend, frontend, Strapi CMS, APIs, and database interactions.
Requirements
1. Replace Database Usage
    • Remove all dependencies on the lenders table.
    • Replace every reference to lenders with lenders_catalog throughout the project.
    • Update all services, controllers, queries, APIs, utilities, frontend requests, and any business logic that currently reads from or writes to the lenders table.
    • Ensure all CRUD operations now use lenders_catalog.
2. Update Strapi Collection Type
    • Replace the existing Collection Type: Lenders with Lenders Catalog.
    • Configure the collection to use the lenders_catalog table.
    • Create all content-type fields to match the schema of the lenders_catalog table.
    • Ensure the admin panel can perform Create, Read, Update, and Delete operations against lenders_catalog.
    • Existing records in lenders_catalog should be displayed automatically.
3. Update Strapi Single Type
    • Remove the existing Single Type: Lender Page.
    • Remove lenders_page table.
4. Update Application Code
Replace every usage of lenders with lenders_catalog, including but not limited to:
    • Strapi controllers
    • Services
    • Routes
    • Content-type schemas
    • API endpoints
    • Database queries
    • Frontend API calls
    • TypeScript interfaces/types
    • Validation logic
    • UI components
    • Forms
    • Filters
    • Search functionality
    • Dropdowns and selectors
    • Any helper or utility functions
5. Maintain Compatibility
    • Do not change any existing business logic unless required for the table replacement.
    • Preserve existing API response formats wherever possible.
    • Ensure there are no remaining references to the deprecated lenders table.
    • Verify that all existing lender-related features continue to work using lenders_catalog.
6. Documentation
As required by CLAUDE.md, update the documentation before completing the task:
    • Replace references to Lender with Lender Catalog where appropriate.
    • Update the Collections section to document lenders_catalog.
    • Update any affected routes, architecture notes, and flow descriptions.
    • Keep CLAUDE.md synchronized with the implementation changes.
Expected Outcome
    • The application no longer depends on the lenders table.
    • All lender-related functionality uses lenders_catalog.
    • Strapi CMS exposes Lenders Catalog instead of Lenders.
    • Existing data from lenders_catalog is visible and editable.
    • Frontend and backend continue to function without regressions.
    • CLAUDE.md is updated to reflect the new implementation.
