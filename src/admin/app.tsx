import type { StrapiApp } from '@strapi/strapi/admin';
import AuthLogo from './extensions/logo.svg';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { LeadDetailDashboard } from './extensions/LeadDetailDashboard';
import { AdminNotifications } from './extensions/AdminNotifications';
import { DesignSystemProvider } from '@strapi/design-system';

export default {
    config: {
        auth: {
            logo: AuthLogo,
        },
        menu: {
            logo: AuthLogo,
        },
        head: {
            favicon: AuthLogo,
        },
        theme: {
            light: {
                colors: {
                    primary100: '#1d4ed8',
                    primary200: '#c7d2fe',
                    primary500: '#6366f1',
                    primary600: '#2563eb', // Brand Blue (matching screenshot button)
                    primary700: '#1d4ed8',
                }
            }
        },
        locales: [],
        translations: {
            en: {
                'Auth.form.welcome.title': 'Sign in to your account',
                'Auth.form.welcome.subtitle': ' ', // Empty space so React doesn't overwrite our custom DOM injection
                'Auth.form.email.label': 'Email address',
                'global.password': 'Password',
                'Auth.form.email.placeholder': 'you@example.com',
                'Auth.form.button.login': 'Sign in →',
                'Auth.link.forgot-password': 'Forgot your password?',
                'Auth.form.rememberMe.label': 'Remember me',
            },
        }
    },
    bootstrap(app: StrapiApp) {
        // 1. Advisor Session Sync - Bridge between CMS and Frontend
        const findJwtInStorage = () => {
            const storages = [localStorage, sessionStorage];
            const jwtPattern = /^"?eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+"?$/;

            // Check Cookies first
            const cookies = document.cookie.split('; ');
            for (const cookie of cookies) {
                const [name, value] = cookie.split('=');
                if (value && jwtPattern.test(value)) {
                    // console.log(`%c [Advisor Session] Found token in Cookie: "${name}"`, 'color: #8b5cf6;');
                    return value;
                }
            }

            // Check Storage fallback
            for (const storage of storages) {
                for (let i = 0; i < storage.length; i++) {
                    const key = storage.key(i);
                    if (!key) continue;
                    const value = storage.getItem(key);
                    if (value && jwtPattern.test(value)) {
                        // console.log(`%c [Advisor Session] Found token in Storage: "${key}"`, 'color: #8b5cf6;');
                        return value.startsWith('"') ? JSON.parse(value) : value;
                    }
                    try {
                        const parsed = JSON.parse(value || '');
                        if (parsed?.token && jwtPattern.test(parsed.token)) return parsed.token;
                        if (parsed?.jwt && jwtPattern.test(parsed.jwt)) return parsed.jwt;
                    } catch (e) { }
                }
            }
            return null;
        };

        const syncAdvisorSession = async (isRetry = false) => {
            if (!isRetry) {
                // console.log('%c [Advisor Session] Starting Discovery...', 'color: #2563eb; font-weight: bold;');
                // console.log('[Advisor Session] Storage Keys:', Object.keys(localStorage));
            }

            try {
                // 1a. Try to get profile - Include credentials for Cookies
                const token = findJwtInStorage();
                const headers: any = {};
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const userRes = await fetch('/admin/users/me', {
                    headers,
                    credentials: 'include' // CRITICAL for cookie-based auth
                });

                if (!userRes.ok) {
                    if (!isRetry) {
                        // console.log('%c [Advisor Session] Profile check 401. Retrying in 2s...', 'color: #f59e0b;');
                        setTimeout(() => syncAdvisorSession(true), 2000);
                    } else {
                        // console.error('[Advisor Session] Final Auth Failure. Please log out and log back in.');
                    }
                    return;
                }

                const userData = await userRes.json();
                const adminUser = userData.data;

                if (!adminUser) return;
                // console.log('%c [Advisor Session] Authenticated as:', 'color: #10b981;', adminUser.email);

                // 1b. Check if user is an Advisor
                const isAdvisor = adminUser.roles.some((role: any) =>
                    ['strapi-advisor', 'Advisor', 'advisor', 'Advisior'].includes(role.code) ||
                    ['strapi-advisor', 'Advisor', 'advisor', 'Advisior'].includes(role.name)
                );

                if (!isAdvisor) {
                    // console.log('[Advisor Session] User is not an Advisor. Roles:', adminUser.roles.map((r: any) => r.code || r.name));
                    return;
                }

                // 1c. Fetch advisor record from API
                const advisorRes = await fetch(`/api/advisors?filters[email][$eq]=${adminUser.email}`);

                if (advisorRes.ok) {
                    const advisorData = await advisorRes.json();
                    const advisor = advisorData.data?.[0];
                    if (advisor) {
                        sessionStorage.setItem('strapiAdvisorId', advisor.id.toString());
                        sessionStorage.setItem('strapiAdvisorEmail', advisor.email);
                        // console.log(`%c [Advisor Session] SUCCESS! Synced: ${advisor.email} (ID: ${advisor.id})`, 'color: #10b981; font-weight: bold;');
                    } else {
                        // console.warn('[Advisor Session] No record in Advisor table for:', adminUser.email);
                    }
                }
            } catch (err) {
                // console.error('[Advisor Session] Sync Error:', err);
            }
        };

        // Run sync on load
        syncAdvisorSession();

        if (typeof window !== 'undefined') {

            // Global event listener to catch clicks and redirect, bypassing React Router
            window.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                if (target && target.id === 'custom-partner-link') {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    window.location.href = '/advisor-onboarding';
                }
                if (target && target.id === 'custom-add-lead-link') {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    // Redirect to frontend products page
                    window.location.href = '/products';
                }

                if (target && (target.id === 'custom-my-leads-link' || target.closest('#custom-my-leads-link'))) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    // Trigger click on the hidden original Strapi link to navigate smoothly without reload
                    const originalLink = document.getElementById('original-leads-link') as HTMLElement | null;
                    if (originalLink) {
                        originalLink.click();
                    }
                }

                if (target && (target.id === 'custom-loan-apps-link' || target.closest('#custom-loan-apps-link'))) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    // Trigger click on the hidden original Strapi link
                    const originalLink = document.getElementById('original-loan-apps-link') as HTMLElement | null;
                    if (originalLink) {
                        originalLink.click();
                    }
                }

                // Toggle Leads Submenu
                if (target && (target.closest('#leads-toggle'))) {
                    e.preventDefault();
                    e.stopPropagation();
                    const subMenu = document.getElementById('advisor-leads-submenu') as HTMLElement | null;
                    if (subMenu) {
                        const isHidden = subMenu.style.display === 'none';
                        const newState = isHidden ? 'flex' : 'none';
                        subMenu.style.display = newState;
                        sessionStorage.setItem('leads-menu-expanded', isHidden ? 'true' : 'false');

                        // Rotate arrow icon
                        const arrow = document.getElementById('leads-toggle-arrow') as HTMLElement | null;
                        if (arrow) {
                            arrow.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
                        }
                    }
                }
            }, true);

            const enforceAdvisorFilters = () => {
                const advisorId = sessionStorage.getItem('strapiAdvisorId');
                if (!advisorId) return;

                const path = window.location.pathname;
                const search = window.location.search;

                // 1. Leads Filtering
                if (path.includes('api::lead.lead') && !path.includes('configurations')) {
                    if (!search.includes('filters[advisorReferralId][$eq]=') || !search.includes(advisorId)) {
                        // console.log('%c [Advisor Session] Enforcing Lead Filters...', 'color: #2563eb;');
                        window.location.href = `${path}?filters[advisorReferralId][$eq]=${advisorId}&sort=id:DESC`;
                    }
                }

                // 2. Loan Applications Filtering (Optional but logical)
                // if (path.includes('api::loan-application.loan-application') && !search.includes('filters')) {
                //     window.location.href = `${path}?filters[advisorId][$eq]=${advisorId}`;
                // }
            };

            const initOverrides = () => {
                const params = new URLSearchParams(window.location.search);
                const isDashboard = params.get('view') === 'dashboard';
                const leadId = params.get('id');
                const isLoanPage = window.location.pathname.includes('api::loan-application.loan-application');

                // 1. CSS Cloaking for Dashboard (Preserving Sidebars)
                let cloak = document.getElementById('dashboard-layout-style');
                if (isDashboard && isLoanPage) {
                    if (!cloak) {
                        cloak = document.createElement('style');
                        cloak.id = 'dashboard-layout-style';
                        cloak.innerHTML = `
                            /* Hide only the main content area's native Strapi UI */
                            main[role="main"] > * {
                                display: none !important;
                            }
                            
                            /* Position our dashboard to the right of the sidebars */
                            #custom-dashboard-root {
                                position: fixed;
                                top: 0;
                                right: 0;
                                bottom: 0;
                                /* Offset for Strapi sidebars: 
                                   74px (SideNav) + 232px (ContentManagerNav) = ~306px
                                   We use a safe 306px left offset */
                                left: 306px; 
                                background: #f6f6f9;
                                z-index: 10;
                                overflow: auto;
                                display: block !important;
                                visibility: visible !important;
                                border-left: 1px solid #dcdce4;
                            }

                            /* Ensure top bar stays visible if needed, or if not, we overlap it */
                            header {
                                z-index: 1;
                            }
                        `;
                        document.head.appendChild(cloak);
                    }
                } else {
                    if (cloak) cloak.remove();
                    const nuclear = document.getElementById('dashboard-nuclear-style');
                    if (nuclear) nuclear.remove();
                }

                if (isDashboard && leadId && isLoanPage) {
                    let dashboardRoot = document.getElementById('custom-dashboard-root');
                    const currentId = dashboardRoot?.getAttribute('data-lead-id');

                    if (!dashboardRoot || currentId !== leadId) {
                        if (dashboardRoot) dashboardRoot.remove();

                        // console.log(`[NUCLEAR DASHBOARD] Injecting for ID: ${leadId}`);
                        dashboardRoot = document.createElement('div');
                        dashboardRoot.id = 'custom-dashboard-root';
                        dashboardRoot.setAttribute('data-lead-id', leadId);

                        // Attach directly to body to bypass Strapi structure
                        document.body.prepend(dashboardRoot);

                        const root = createRoot(dashboardRoot);
                        root.render(
                            <DesignSystemProvider>
                                <LeadDetailDashboard leadId={leadId} />
                            </DesignSystemProvider>
                        );
                    }
                } else {
                    const existing = document.getElementById('custom-dashboard-root');
                    if (existing) existing.remove();
                }

                // Force filters for advisors
                enforceAdvisorFilters();

                // Check if we're on the login page
                const isLoginPage = window.location.pathname === '/admin/auth/login' ||
                    window.location.pathname.includes('/admin/auth/login');

                // Find the title element to locate the subtitle P tag safely
                const headings = Array.from(document.querySelectorAll('h1, h2')).filter(h => h.textContent === 'Sign in to your account');
                if (headings.length > 0) {
                    const titleNode = headings[0];
                    if (!document.getElementById('custom-partner-link-container')) {
                        const container = document.createElement('div');
                        container.id = 'custom-partner-link-container';
                        container.style.color = '#6b7280';
                        container.style.textAlign = 'center';
                        container.style.marginTop = '0.5rem';
                        container.style.marginBottom = '1.5rem';
                        container.style.fontSize = '1.875rem';
                        container.innerHTML = 'Or <span id="custom-partner-link" style="color: #2563eb; text-decoration: none; font-weight: 500; cursor: pointer;">register as a partner</span>';

                        if (titleNode.parentNode) {
                            titleNode.parentNode.insertBefore(container, titleNode.nextSibling);
                        }
                    }
                }

                // Add Demo Credentials section - ONLY on login page
                if (isLoginPage) {
                    const forms = document.querySelectorAll('form');
                    if (forms.length > 0) {
                        const form = forms[0];

                        if (!document.getElementById('demo-credentials')) {
                            const demoDiv = document.createElement('div');
                            demoDiv.id = 'demo-credentials';
                            demoDiv.innerHTML = `
              <div style="position: relative; text-align: center; margin-top: 2rem; margin-bottom: 1.5rem;">
                 <div style="border-top: 1px solid #f6f7f8ff; width: 100%;"></div>
                 <span style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: white; padding: 0 10px; font-size: 1.8rem; color: #9ca3af;">Demo Credentials</span>
              </div>
              <div style="display: flex; justify-content: space-around; font-size: 1.0rem; color: #6b7280;">
                  <div style="text-align: center;">
                      <p style="font-weight: 600; margin-bottom: 0.2rem; color: #374151;">Agent</p>
                      <p style="margin: 0;">agent@oscprofessionals.in</p>
                      <p style="margin: 0;">password</p>
                  </div>
                  <div style="text-align: center;">
                      <p style="font-weight: 600; margin-bottom: 0.2rem; color: #374151;">Admin</p>
                      <p style="margin: 0;">admin@oscprofessionals.in</p>
                      <p style="margin: 0;">password</p>
                  </div>
              </div>
            `;
                            // Append after the form inside the card
                            if (form.parentElement) {
                                form.parentElement.appendChild(demoDiv);
                            }
                        }
                    }
                }
                // Add Leads Sub-interface for Advisors
                const navLinks = Array.from(document.querySelectorAll('nav a'));
                const leadsLink = navLinks.find(a => a.textContent?.includes('Leads') || a.getAttribute('href')?.includes('api::lead.lead'));
                const loanAppLink = navLinks.find(a => a.textContent?.includes('Loan Application') || a.getAttribute('href')?.includes('api::loan-application.loan-application'));

                if (loanAppLink) {
                    (loanAppLink as HTMLElement).style.display = 'none';
                    loanAppLink.id = 'original-loan-apps-link';
                }

                if (leadsLink && !document.getElementById('leads-toggle')) {
                    const listItem = leadsLink.closest('li');
                    if (listItem) {
                        const hl = leadsLink as HTMLElement;
                        // Hide original link but keep it for navigation (smooth transition)
                        hl.style.display = 'none';
                        hl.id = 'original-leads-link';

                        // Extract content for custom toggle
                        const originalContent = hl.innerHTML;
                        const iconHtml = originalContent.includes('svg') ? originalContent.match(/<svg.*<\/svg>/)?.[0] : '';

                        // Create global styles for custom elements
                        if (!document.getElementById('custom-admin-styles')) {
                            const style = document.createElement('style');
                            style.id = 'custom-admin-styles';
                            style.innerHTML = `
                                /* Target all sidebar elements: Leads, Advisor, Lender, Product, and all others */
                                #leads-toggle:hover,
                                #leads-toggle.active,
                                #advisor-leads-submenu span:hover,
                                #advisor-leads-submenu span.active,
                                nav a:hover,
                                nav a[aria-current="page"],
                                nav [role="link"]:hover,
                                nav [role="button"]:hover,
                                nav button:hover {
                                    background-color: #2563eb !important;
                                    color: #fff !important;
                                    border-radius: 6px !important;
                                }

                                /* Ensure all text/icons inside hovered/active elements turn white */
                                nav a:hover *, 
                                nav a[aria-current="page"] *,
                                nav [role="link"]:hover *,
                                nav [role="button"]:hover *,
                                #leads-toggle.active *,
                                #leads-toggle:hover *,
                                #advisor-leads-submenu span:hover,
                                #advisor-leads-submenu span.active {
                                    color: #fff !important;
                                    stroke: #fff !important;
                                    fill: #fff !important;
                                }

                                /* Universal svg handling for sidebar icons */
                                nav a[aria-current="page"] svg,
                                nav a:hover svg,
                                #leads-toggle.active svg,
                                #leads-toggle:hover svg,
                                nav [role="link"]:hover svg,
                                nav [role="button"]:hover svg {
                                    stroke: #fff !important;
                                    fill: #fff !important;
                                }

                                /* Sub-menu styling for a premium feel */
                                #advisor-leads-submenu span {
                                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                                    border-radius: 4px;
                                }
                                #advisor-leads-submenu span:hover {
                                    padding-left: 14px !important;
                                    background-color: #2563eb !important;
                                }
                            `;
                            document.head.appendChild(style);
                        }

                        // Determine if Leads or Loan Apps is active
                        const path = window.location.pathname;
                        const isLeadsActive = path.includes('api::lead.lead');
                        const isLoanAppsActive = path.includes('api::loan-application.loan-application');
                        const isAnyLeadsActive = isLeadsActive || isLoanAppsActive;

                        // Create custom toggle button
                        const customToggle = document.createElement('div');
                        customToggle.id = 'leads-toggle';
                        if (isAnyLeadsActive) customToggle.classList.add('active');
                        customToggle.style.cursor = 'pointer';
                        customToggle.style.display = 'flex';
                        customToggle.style.justifyContent = 'space-between';
                        customToggle.style.alignItems = 'center';
                        customToggle.style.backgroundColor = isAnyLeadsActive ? '#2563eb' : 'transparent';
                        customToggle.style.color = isAnyLeadsActive ? 'white' : '#4b5563';
                        customToggle.style.padding = '10px 16px';
                        customToggle.style.borderRadius = '6px';
                        customToggle.style.margin = '4px 0';
                        customToggle.style.textTransform = 'uppercase';
                        customToggle.style.fontWeight = 'bold';
                        customToggle.style.transition = 'all 0.2s';

                        // Check initial expansion state
                        const isExpanded = sessionStorage.getItem('leads-menu-expanded') === 'true' || isAnyLeadsActive;

                        customToggle.innerHTML = `
                            <div style="display: flex; align-items: center; gap: 10px;">
                                ${iconHtml}
                                <span>LEADS</span>
                            </div>
                            <svg id="leads-toggle-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.3s; transform: rotate(${isExpanded ? '180deg' : '0deg'});">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        `;

                        listItem.prepend(customToggle);

                        const subMenu = document.createElement('ul');
                        subMenu.id = 'advisor-leads-submenu';
                        subMenu.style.listStyle = 'none';
                        subMenu.style.paddingLeft = '1.5rem';
                        subMenu.style.marginTop = '0.4rem';
                        subMenu.style.marginBottom = '0.8rem';
                        subMenu.style.display = isExpanded ? 'flex' : 'none';
                        subMenu.style.flexDirection = 'column';
                        subMenu.style.gap = '0.6rem';
                        subMenu.style.borderLeft = '2px solid #2563eb';
                        subMenu.style.marginLeft = '1rem';

                        subMenu.innerHTML = `
                            <li>
                                <span id="custom-add-lead-link" style="text-decoration: none; color: #4b5563; font-size: 0.95rem; display: block; font-weight: 500; padding: 4px 8px; cursor: pointer; transition: all 0.2s;">Add New Lead</span>
                            </li>
                            <li>
                                <span id="custom-my-leads-link" class="${isLeadsActive ? 'active' : ''}" style="text-decoration: none; color: inherit; font-size: 0.95rem; display: block; font-weight: 500; padding: 4px 8px; cursor: pointer; transition: all 0.2s;">Leads Overview</span>
                            </li>
                        `;
                        listItem.appendChild(subMenu);
                    }
                }

                // Add "AI Match" Action Button to Leads Overview
                if (window.location.pathname.includes('api::lead.lead')) {
                    // console.log('%c [STRAPI CUSTOM] Lead Overview detected. Running injection...', 'background: #2563eb; color: #fff; padding: 2px 5px;');                    // 1. Header Injection (Next to "Create new entry")
                    if (!document.getElementById('header-ai-match')) {
                        const allButtons = Array.from(document.querySelectorAll('button'));
                        const createBtn = allButtons.find(btn => btn.textContent?.includes('Create new entry'));

                        if (createBtn && createBtn.parentElement) {
                            // Container to hold our custom buttons
                            const customHeaderBtns = document.createElement('div');
                            customHeaderBtns.style.display = 'inline-flex';
                            customHeaderBtns.style.gap = '10px';
                            customHeaderBtns.style.marginRight = '12px';

                            // 1a. AI Match Header Button
                            const globalAiBtn = document.createElement('button');
                            globalAiBtn.id = 'header-ai-match';
                            globalAiBtn.innerHTML = 'AI MATCH (LENDERS)';
                            globalAiBtn.setAttribute('style', `
                                background-color: #2563eb;
                                color: white;
                                padding: 8px 16px;
                                border: 2px solid #fff;
                                border-radius: 4px;
                                font-weight: 700;
                                cursor: pointer;
                                font-size: 13px;
                                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                            `);
                            globalAiBtn.onclick = () => window.open('/lenders', '_self');

                            // 1b. View Lead Header Button
                            const globalViewBtn = document.createElement('button');
                            globalViewBtn.id = 'header-view-lead';
                            globalViewBtn.innerHTML = 'VIEW LEADS APP';
                            globalViewBtn.setAttribute('style', `
                                background-color: #2563eb;
                                color: white;
                                padding: 8px 16px;
                                border: 2px solid #fff;
                                border-radius: 4px;
                                font-weight: 700;
                                cursor: pointer;
                                font-size: 13px;
                                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                            `);
                            globalViewBtn.onclick = () => window.open('/admin/content-manager/collection-types/api::loan-application.loan-application', '_self');

                            customHeaderBtns.appendChild(globalViewBtn);
                            customHeaderBtns.appendChild(globalAiBtn);

                            createBtn.parentElement.prepend(customHeaderBtns);
                            // console.log('[STRAPI CUSTOM] Header buttons injected.');
                        }
                    }

                    // 2. Row Injection
                    const rows = document.querySelectorAll('tr, [role="row"]');
                    rows.forEach(row => {
                        // Skip header
                        if (row.querySelector('th') || row.getAttribute('aria-rowindex') === '1' || row.textContent?.includes('ID')) return;

                        const cells = Array.from(row.querySelectorAll('td, [role="gridcell"]'));
                        if (cells.length === 0) return;

                        // Target the last cell (usually actions)
                        const actionCell = cells[cells.length - 1] as HTMLElement;

                        if (actionCell && !actionCell.querySelector('.custom-ai-match')) {
                            // Find the internal container that Strapi uses for actions (often many nested divs)
                            // We'll just look for the first div or span inside the cell, or use the cell itself
                            const container = actionCell.querySelector('div') || actionCell;

                            // 2a. AI Match Button
                            const aiBtn = document.createElement('button');
                            aiBtn.className = 'custom-ai-match';
                            aiBtn.innerHTML = 'AI Match';
                            aiBtn.setAttribute('style', `
                                padding: 4px 10px;
                                margin-left: 8px;
                                background-color: #2563eb;
                                color: white;
                                border: 1px solid white;
                                border-radius: 4px;
                                cursor: pointer;
                                font-size: 11px;
                                font-weight: 800;
                                white-space: nowrap;
                                display: inline-block;
                                vertical-align: middle;
                                box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                            `);

                            aiBtn.addEventListener('click', (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                window.open('/lenders', '_self');
                            });

                            // 2b. View Lead Button
                            const viewBtn = document.createElement('button');
                            viewBtn.className = 'custom-view-lead';
                            viewBtn.innerHTML = 'View Lead';
                            viewBtn.setAttribute('style', `
                                padding: 4px 10px;
                                margin-left: 8px;
                                background-color: #2563eb;
                                color: white;
                                border: 1px solid white;
                                border-radius: 4px;
                                cursor: pointer;
                                font-size: 11px;
                                font-weight: 800;
                                white-space: nowrap;
                                display: inline-block;
                                vertical-align: middle;
                                box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                            `);

                            viewBtn.addEventListener('click', (e: any) => {
                                e.preventDefault();
                                e.stopPropagation();

                                // Extract ID from the current row
                                // We find a cell that contains only digits. Usually ID is cell[1]
                                const idCell = cells.find(c => /^\d+$/.test(c.textContent?.trim() || ''));
                                const rowId = idCell ? idCell.textContent?.trim() : '';

                                if (rowId) {
                                    // console.log(`[View Action] Navigating to Loan Application Dashboard: ${rowId}`);
                                    window.open(`/admin/content-manager/collection-types/api::loan-application.loan-application?view=dashboard&id=${rowId}`, '_self');
                                } else {
                                    window.open('/admin/content-manager/collection-types/api::loan-application.loan-application', '_self');
                                }
                            });

                            container.appendChild(viewBtn);
                            container.appendChild(aiBtn);
                        }
                    });
                }
                // 3. Header Notification Bell Injection (Top Right Lock)
                if (!document.getElementById('admin-notifications-root')) {
                    const notifyRoot = document.createElement('div');
                    notifyRoot.id = 'admin-notifications-root';

                    // Force the position to the TOP RIGHT corner
                    notifyRoot.style.position = 'fixed';
                    notifyRoot.style.top = '4px';
                    notifyRoot.style.right = '240px'; // To the left of the debug label and profile
                    notifyRoot.style.zIndex = '999999';
                    notifyRoot.style.display = 'flex';
                    notifyRoot.style.alignItems = 'center';

                    // Append straight to the body so it floats above all layouts
                    document.body.appendChild(notifyRoot);

                    const root = createRoot(notifyRoot);
                    root.render(
                        <DesignSystemProvider>
                            <AdminNotifications />
                        </DesignSystemProvider>
                    );
                }
            };

            // Add a debug DIV at the top of the body to confirm the script is running.
            if (!document.getElementById('strapi-custom-debug')) {
                const debugDiv = document.createElement('div');
                debugDiv.id = 'strapi-custom-debug';
                debugDiv.style.position = 'fixed';
                debugDiv.style.top = '10px';
                debugDiv.style.right = '10px';
                debugDiv.style.backgroundColor = '#2563eb';
                debugDiv.style.color = 'white';
                debugDiv.style.padding = '5px 10px';
                debugDiv.style.borderRadius = '4px';
                debugDiv.style.fontSize = '12px';
                debugDiv.style.zIndex = '99999';
                debugDiv.textContent = 'Strapi Custom Script Active';
                document.body.prepend(debugDiv);
            }

            // Expose globally to allow manual trigger if observer misses something
            (window as any).triggerAIInjection = initOverrides;

            // Initial run
            initOverrides();

            // Interval fallback (Safety net for SPA)
            setInterval(initOverrides, 1000);

            const observer = new MutationObserver(initOverrides);
            observer.observe(document.body, { childList: true, subtree: true });
        }
    },
};
