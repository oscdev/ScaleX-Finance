import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { DesignSystemProvider } from '@strapi/design-system';
import { LeadDetailDashboard } from '../LeadViewDashboard';
import { LeadOverviewDashboard } from '../LeadOverview';
import { AdminNotifications } from '../AdminNotifications';
import { enforceDefaultListSettings } from '../LeadOverview/enforceListSettings';
import './admin-overrides.css';

type StatusBadgeColor = { bg: string; text: string; border: string };

const statusBadgeColors: Record<string, StatusBadgeColor> = {
    NEW: { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' },
    UNDER_PROCESS: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
    'UNDER PROCESS': { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
    APPROVED: { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
    REJECTED: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
    DISBURSED: { bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff' },
};

const reactRoots = new Map<string, Root>();

const unmountAndRemove = (id: string) => {
    const root = reactRoots.get(id);
    if (root) {
        queueMicrotask(() => {
            try {
                root.unmount();
            } catch { }
        });
        reactRoots.delete(id);
    }
    const el = document.getElementById(id);
    if (el && el.parentNode) el.parentNode.removeChild(el);
};

const initOverrides = () => {
    if ((window as any)._is_running_overrides) return;
    (window as any)._is_running_overrides = true;

    try {
        const isLoanPage = window.location.pathname.includes(
            'api::loan-application.loan-application'
        );

        // Strip any leftover query params on the loan page (e.g. old bookmarked URLs)
        if (isLoanPage && window.location.search) {
            const qsId = new URLSearchParams(window.location.search).get('id');
            if (qsId) sessionStorage.setItem('currentLeadId', qsId);
            history.replaceState(null, '', window.location.pathname);
        }

        const leadId = sessionStorage.getItem('currentLeadId');
        const isDashboard = isLoanPage && !!leadId;

        const isLeadsPage = window.location.pathname.includes('api::lead.lead');
        if (isLeadsPage && !(window as any)._advisors_loaded) {
            (window as any)._advisors_loaded = true;
            (window as any).advisorMap = (window as any).advisorMap || {};

            const getToken = () => {
                const sessionT = window.sessionStorage.getItem('jwtToken');
                const localT = window.localStorage.getItem('jwtToken');
                const cookieT = `; ${document.cookie}`.split('; jwtToken=').pop()?.split(';').shift();
                return (sessionT || localT || cookieT || '')?.replace(/"/g, '');
            };
            const token = getToken();

            fetch('/content-manager/collection-types/api::advisor.advisor?pageSize=100', {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            })
                .then((r) => r.json())
                .then((data) => {
                    const advisors = data.results || data.data || [];
                    advisors.forEach((adv: any) => {
                        (window as any).advisorMap[adv.id] = {
                            name: adv.fullName,
                            id: adv.id,
                            email: adv.email,
                            phone: adv.phoneNumber,
                        };
                    });
                })
                .catch(() => {
                    (window as any)._advisors_loaded = false;
                });

            (window as any).leadStatusMap = (window as any).leadStatusMap || {};
            fetch('/content-manager/collection-types/api::lead.lead?pageSize=100', {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            })
                .then((r) => r.json())
                .then((data) => {
                    const leads = data.results || data.data || [];
                    leads.forEach((l: any) => {
                        if (l.id) (window as any).leadStatusMap[l.id] = l.leadStatus || 'NEW';
                        if (l.documentId)
                            (window as any).leadStatusMap[l.documentId] = l.leadStatus || 'NEW';
                    });
                })
                .catch(() => { });
        }

        if (isDashboard && isLoanPage) {
            document.body.classList.add('dashboard-mode');
        } else {
            document.body.classList.remove('dashboard-mode');
        }

        if (isDashboard && leadId && isLoanPage) {
            let dashboardRoot = document.getElementById('custom-dashboard-root');
            const currentId = dashboardRoot?.getAttribute('data-lead-id');

            if (!dashboardRoot || currentId !== leadId) {
                if (dashboardRoot) unmountAndRemove('custom-dashboard-root');
                dashboardRoot = document.createElement('div');
                dashboardRoot.id = 'custom-dashboard-root';
                dashboardRoot.setAttribute('data-lead-id', leadId);
                document.body.prepend(dashboardRoot);
                const root = createRoot(dashboardRoot);
                reactRoots.set('custom-dashboard-root', root);
                root.render(
                    <DesignSystemProvider>
                        <LeadDetailDashboard leadId={leadId} />
                    </DesignSystemProvider>
                );
            }
        } else {
            unmountAndRemove('custom-dashboard-root');
        }

        enforceDefaultListSettings();

        const isLoginPage = window.location.pathname.includes('/admin/auth/login');

        const headings = Array.from(document.querySelectorAll('h1, h2')).filter(
            (h) => h.textContent === 'Sign in to your account'
        );
        if (headings.length > 0 && !document.getElementById('custom-partner-link-container')) {
            const titleNode = headings[0];
            const container = document.createElement('div');
            container.id = 'custom-partner-link-container';
            container.style.textAlign = 'center';
            container.style.marginTop = '0.5rem';
            container.style.marginBottom = '1.5rem';
            container.innerHTML =
                'Or <span id="custom-partner-link" style="color: #2563eb; font-weight: 500; cursor: pointer;">register as a partner</span>';
            if (titleNode.parentNode) titleNode.parentNode.insertBefore(container, titleNode.nextSibling);
        }

        if (isLoginPage) {
            const forms = document.querySelectorAll('form');
            if (forms.length > 0 && !document.getElementById('demo-credentials')) {
                const demoDiv = document.createElement('div');
                demoDiv.id = 'demo-credentials';
                demoDiv.innerHTML = `<div style="text-align: center; margin-top: 1rem; color: #6b7280; font-size: 0.9rem;">Demo: agent@oscprofessionals.in | password</div>`;
                forms[0].parentElement?.appendChild(demoDiv);
            }
        }

        const navLinks = Array.from(document.querySelectorAll('nav a'));
        const leadsLink = navLinks.find(
            (a) =>
                a.textContent?.includes('Leads') || a.getAttribute('href')?.includes('api::lead.lead')
        );
        const loanAppLink = navLinks.find(
            (a) =>
                a.textContent?.includes('Loan Application') ||
                a.getAttribute('href')?.includes('api::loan-application.loan-application')
        );

        if (loanAppLink) {
            (loanAppLink as HTMLElement).style.display = 'none';
            loanAppLink.id = 'original-loan-apps-link';
        }

        if (leadsLink && !document.getElementById('leads-toggle')) {
            const listItem = leadsLink.closest('li');
            if (listItem) {
                (leadsLink as HTMLElement).style.display = 'none';
                leadsLink.id = 'original-leads-link';
                const iconHtml =
                    (leadsLink as HTMLElement).innerHTML.match(/<svg.*<\/svg>/)?.[0] || '';

                const customToggle = document.createElement('div');
                customToggle.id = 'leads-toggle';
                const isLeadsActive =
                    window.location.pathname.includes('api::lead.lead') ||
                    window.location.pathname.includes('api::loan-application.loan-application');
                if (isLeadsActive) customToggle.classList.add('active');

                const isExpanded =
                    sessionStorage.getItem('leads-menu-expanded') === 'true' || isLeadsActive;
                customToggle.innerHTML = `<div style="display: flex; align-items: center; gap: 10px;">${iconHtml}<span>LEADS</span></div><svg width="12" height="12" style="transform: rotate(${isExpanded ? '180deg' : '0deg'
                    });"><polyline points="6 9 12 15 18 9" stroke="currentColor" fill="none"></polyline></svg>`;
                listItem.prepend(customToggle);

                const subMenu = document.createElement('ul');
                subMenu.id = 'advisor-leads-submenu';
                if (isExpanded) subMenu.classList.add('is-expanded');
                subMenu.innerHTML = `
                    <li><span id="custom-add-lead-link" style="color: #4b5563; cursor: pointer;">Add New Lead</span></li>
                    <li><span id="custom-my-leads-link" style="color: inherit; cursor: pointer;">Leads Overview</span></li>
                `;
                listItem.appendChild(subMenu);
            }
        }

        if (window.location.pathname.includes('api::lead.lead')) {
            const table = document.querySelector('table');
            if (table && table.querySelector('thead tr')) {
                const tableParent = table.closest('div')?.parentElement;
                if (tableParent && !document.getElementById('lead-overview-root')) {
                    const overviewRoot = document.createElement('div');
                    overviewRoot.id = 'lead-overview-root';
                    const tableContainer = table.closest('div');
                    if (tableContainer) {
                        tableContainer.parentNode?.insertBefore(overviewRoot, tableContainer);
                        const overviewReactRoot = createRoot(overviewRoot);
                        reactRoots.set('lead-overview-root', overviewReactRoot);
                        overviewReactRoot.render(
                            <DesignSystemProvider>
                                <LeadOverviewDashboard />
                            </DesignSystemProvider>
                        );
                    }
                }

                const headerRow = table.querySelector('thead tr')!;
                const bodyRows = table.querySelectorAll('tbody tr');
                const headers = Array.from(headerRow.querySelectorAll('th'));

                headers.forEach((th) => {
                    const raw = (th.textContent || '').trim().toLowerCase();
                    // Identify columns by technical name OR our professional labels
                    if (raw.includes('fullname') || raw.includes('customer info')) th.id = 'col-customer-info';
                    if (raw.includes('mobile') || raw.includes('mobile')) th.id = 'col-mobile';
                    if (raw.includes('email') || raw.includes('email')) th.id = 'col-email';
                    if (raw.includes('selectedproduct') || raw.includes('product')) th.id = 'col-product';
                    if (raw.includes('requiredamount') || raw.includes('amount')) th.id = 'col-amount';
                    if (raw.includes('createdat') || raw.includes('added')) th.id = 'col-added';
                    if (raw.includes('updatedat') || raw.includes('updated')) th.id = 'col-updated';
                    if (raw.includes('leadstatus') || raw.includes('status')) th.id = 'col-status';
                    if (raw.includes('advisor') || raw.includes('advisor')) th.id = 'col-advisor';
                    if (raw.includes('remarks') || raw.includes('remarks')) th.id = 'col-remarks';
                    if (raw.includes('notification') || raw.includes('notifications')) th.id = 'col-notifications';
                    if (raw === 'id' || raw.startsWith('id')) th.id = 'col-id';
                });

                const labelMap: any = {
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
                    getEmailNotification: 'EMAIL NOTIFICATIONS',
                    pincode: 'PINCODE',
                    remarks: 'REMARKS',
                    locale: 'LOCALE',
                    documentid: 'DOCUMENT ID',
                    createdby: 'CREATED BY',
                    updatedby: 'UPDATED BY',
                };

                headers.forEach((th) => {
                    const raw = th.textContent?.trim().toLowerCase() || '';

                    // Specific exclusion: DO NOT hide the Notifications column title
                    if (th.id === 'col-notifications' || raw.includes('notification')) {
                        return;
                    }

                    if (
                        th.id === 'col-mobile' ||
                        th.id === 'col-email' ||
                        th.id === 'col-added' ||
                        (raw === 'mobile' || raw === 'email' || raw === 'added') ||
                        raw.includes('publication') ||
                        raw.includes('published')
                    ) {
                        th.style.display = 'none';
                        return;
                    }

                    // Priority labeling: match longest keys first to avoid "id" matching "advisorReferralId"
                    const sortedKeys = Object.keys(labelMap).sort((a, b) => b.length - a.length);

                    for (const key of sortedKeys) {
                        const label = labelMap[key];
                        const cleanLabel = label.toLowerCase();
                        if (raw === key || raw === cleanLabel) {
                            const slot = (th.querySelector('span') || th) as HTMLElement;
                            if (slot.textContent !== label) {
                                slot.textContent = label;
                            }
                            if (slot.style) {
                                slot.style.fontWeight = '800';
                                slot.style.color = '#2563eb';
                                slot.style.fontSize = '11px';
                                slot.style.setProperty('color', '#2563eb', 'important');
                            }
                            break;
                        }
                    }
                });

                if (!document.getElementById('custom-actions-header')) {
                    const th = document.createElement('th');
                    th.id = 'custom-actions-header';
                    th.className = 'custom-actions-header';
                    th.innerHTML = '<span class="custom-actions-label">ACTIONS</span>';
                    headerRow.appendChild(th);
                }

                const existingActionsHeader = headerRow.querySelector('#custom-actions-header');
                if (existingActionsHeader && headerRow.lastElementChild !== existingActionsHeader) {
                    headerRow.appendChild(existingActionsHeader);
                }
                if (existingActionsHeader) {
                    existingActionsHeader.setAttribute(
                        'aria-colindex',
                        headerRow.children.length.toString()
                    );
                }

                const allElements = document.querySelectorAll('span, button, label, li, p, div');
                let popoverContainer: any = null;

                const isInsideRadixPortal = (el: Element) =>
                    !!el.closest(
                        '[role="dialog"], [role="listbox"], [role="menu"], [data-radix-portal], [data-radix-popper-content-wrapper], [data-radix-select-content], [data-radix-popover-content]'
                    );

                allElements.forEach((el) => {
                    const text = (el.textContent || '').trim().toLowerCase();

                    // Specifically handle "Configure the view" button inside portals
                    if (
                        (text === 'configure the view' || text === 'configure the fields') &&
                        (el.tagName === 'SPAN' || el.tagName === 'BUTTON' || el.tagName === 'A')
                    ) {
                        const btn = el.closest('button') || el.closest('a') || el;
                        if (btn && !(btn as any)._custom_styled) {
                            (btn as any)._custom_styled = true;
                            const btnEl = btn as HTMLElement;
                            
                            const setWhite = () => {
                                btnEl.style.setProperty('background-color', '#ffffff', 'important');
                                btnEl.style.setProperty('color', '#2563eb', 'important');
                                btnEl.style.setProperty('border', '1px solid #2563eb', 'important');
                                btnEl.querySelectorAll('span, p, div').forEach((child: any) => {
                                    child.style.setProperty('color', '#2563eb', 'important');
                                });
                            };
                            const setBlue = () => {
                                btnEl.style.setProperty('background-color', '#2563eb', 'important');
                                btnEl.style.setProperty('color', '#ffffff', 'important');
                                btnEl.style.setProperty('border', '1px solid #2563eb', 'important');
                                btnEl.querySelectorAll('span, p, div').forEach((child: any) => {
                                    child.style.setProperty('color', '#ffffff', 'important');
                                });
                            };

                            setWhite();
                            btnEl.onmouseenter = setBlue;
                            btnEl.onmouseleave = setWhite;
                        }
                    }

                    if (isInsideRadixPortal(el)) return;
                    if (el.closest('#admin-notifications-root')) return;
                    if (el.id === 'admin-notifications-root') return;
                    
                    if (el.textContent === 'Displayed fields') {
                        const parent = el.closest('div');
                        if (parent && parent.parentElement) {
                            const checkboxes = parent.parentElement.querySelectorAll(
                                'input[type="checkbox"]'
                            );
                            if (checkboxes.length > 0) {
                                popoverContainer = checkboxes[0].closest('div')?.parentElement;
                            }
                        }
                    }
                });

                // Active filter chips — white text
                // 1) Find chips by any close/remove button inside them
                document
                    .querySelectorAll('button')
                    .forEach((btn) => {
                        if (isInsideRadixPortal(btn)) return;
                        if (btn.closest('#admin-notifications-root')) return;
                        const label = (btn.getAttribute('aria-label') || '').toLowerCase();
                        const isCloseBtn =
                            label.includes('clear') ||
                            label.includes('remove') ||
                            label.includes('delete') ||
                            label.includes('filter') ||
                            btn.textContent?.trim() === '×' ||
                            btn.textContent?.trim() === '✕' ||
                            btn.innerHTML?.includes('Close') ||
                            btn.querySelector('svg') !== null && btn.textContent?.trim() === '';

                        if (isCloseBtn) {
                            const chip = btn.parentElement as HTMLElement | null;
                            if (chip && !isInsideRadixPortal(chip)) {
                                chip.style.setProperty('color', '#ffffff', 'important');
                                chip.querySelectorAll('span, p, a').forEach((child) => {
                                    (child as HTMLElement).style.setProperty('color', '#ffffff', 'important');
                                });
                            }
                        }
                    });

                // 2) Find chips and selected menu items by blue background-color (inline or computed)
                document.querySelectorAll('span, div, label, button').forEach((el) => {
                    const htmlEl = el as HTMLElement;
                    
                    // Specific exclusion: DO NOT touch the notifications root
                    if (htmlEl.closest('#admin-notifications-root')) return;

                    const bg = htmlEl.style.backgroundColor || window.getComputedStyle(htmlEl).backgroundColor;
                    
                    // Match #2563eb → rgb(37, 99, 235) and similar blue tones
                    if (
                        bg === 'rgb(37, 99, 235)' ||
                        bg === 'rgb(29, 78, 216)' ||
                        bg === 'rgb(73, 69, 255)' || // Strapi default blue
                        htmlEl.style.backgroundColor?.includes('#2563eb') ||
                        htmlEl.style.backgroundColor?.includes('#1d4ed8') ||
                        htmlEl.style.backgroundColor?.includes('#4945ff')
                    ) {
                        htmlEl.style.setProperty('color', '#ffffff', 'important');
                        htmlEl.querySelectorAll('span, p, a, button, label').forEach((child) => {
                            (child as HTMLElement).style.setProperty('color', '#ffffff', 'important');
                        });
                    }
                });

                // Relabel camelCase field names inside Displayed fields / Filters popovers
                // using nodeValue mutation so React's text-node refs stay intact.
                document
                    .querySelectorAll(
                        '[data-radix-popper-content-wrapper], [role="dialog"], [data-radix-popover-content]'
                    )
                    .forEach((portal) => {
                        const walker = document.createTreeWalker(portal, NodeFilter.SHOW_TEXT);
                        let node: Node | null = walker.nextNode();
                        while (node) {
                            const raw = (node.nodeValue || '').trim().toLowerCase();
                            if (raw) {
                                const mapped = (labelMap as any)[raw];
                                if (mapped && node.nodeValue !== mapped) {
                                    node.nodeValue = mapped;
                                }
                            }
                            node = walker.nextNode();
                        }
                    });

                if (popoverContainer && isInsideRadixPortal(popoverContainer)) {
                    popoverContainer = null;
                }

                if (
                    popoverContainer &&
                    !popoverContainer.querySelector('[data-custom-field="remarks"]')
                ) {
                    const hasRemarks = window.location.search.includes('remarks');
                    const container = document.createElement('div');
                    container.setAttribute('data-custom-field', 'remarks');
                    container.style.padding = '8px 16px';
                    container.style.display = 'flex';
                    container.style.alignItems = 'center';
                    container.style.gap = '12px';
                    container.style.cursor = 'pointer';
                    container.style.transition = 'background-color 0.2s';

                    container.innerHTML = `
                        <input type="checkbox" ${hasRemarks ? 'checked' : ''
                        } style="cursor: pointer; width: 16px; height: 16px; pointer-events: none;" />
                        <span style="font-size: 13px; font-weight: 500; color: #32324d; user-select: none;">REMARKS</span>
                    `;

                    container.onmouseover = () => {
                        container.style.backgroundColor = '#f6f6f9';
                    };
                    container.onmouseleave = () => {
                        container.style.backgroundColor = 'transparent';
                    };

                    container.onclick = (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const params = new URLSearchParams(window.location.search);
                        let fields = params.get('_fields')?.split(',') || [];
                        if (fields.includes('remarks')) {
                            fields = fields.filter((f) => f !== 'remarks');
                        } else {
                            fields.push('remarks');
                        }
                        params.set('_fields', fields.join(','));
                        window.location.href = `${window.location.pathname}?${params.toString()}`;
                    };

                    popoverContainer.appendChild(container);
                }

                if (popoverContainer) {
                    const listItems = popoverContainer.querySelectorAll('span');
                    listItems.forEach((span: HTMLSpanElement) => {
                        if (span.textContent === 'MOBILE' || span.textContent === 'EMAIL') {
                            const rowContainer = span.parentElement?.parentElement;
                            if (rowContainer) {
                                rowContainer.style.setProperty('display', 'none', 'important');
                            }
                        }
                    });
                }

                bodyRows.forEach((row) => {
                    const cells = Array.from(row.querySelectorAll('td'));
                    const currentHeaders = Array.from(headerRow.querySelectorAll('th'));

                    let idIdx = currentHeaders.findIndex((th) => th.id === 'col-id');
                    if (idIdx === -1) idIdx = 0;
                    const nameIdx = currentHeaders.findIndex((th) => th.id === 'col-customer-info');
                    const mIdx = currentHeaders.findIndex((th) => th.id === 'col-mobile');
                    const eIdx = currentHeaders.findIndex((th) => th.id === 'col-email');
                    const pubIdx = currentHeaders.findIndex((th) =>
                        th.textContent?.toLowerCase().includes('published')
                    );

                    const advIdx = currentHeaders.findIndex((th) => th.id === 'col-advisor');
                    const sIdx = currentHeaders.findIndex((th) => th.id === 'col-status');
                    const upIdx = currentHeaders.findIndex((th) => th.id === 'col-updated');
                    const addIdx = currentHeaders.findIndex((th) => th.id === 'col-added');
                    const rIdx = currentHeaders.findIndex((th) => th.id === 'col-remarks');
                    const ntfIdx = currentHeaders.findIndex((th) => th.id === 'col-notifications');

                    cells.forEach((td) => {
                        const text = td.textContent?.toLowerCase() || '';
                        if (text.includes('published') || text.includes('draft')) {
                            td.innerHTML = '';
                        }
                        td.querySelectorAll('span, p, div').forEach((child) => {
                            if (child.textContent?.toLowerCase().includes('publi')) {
                                child.innerHTML = '';
                                (child as HTMLElement).style.display = 'none';
                            }
                        });
                    });

                    if (nameIdx !== -1 && cells[nameIdx]) {
                        const nameCell = cells[nameIdx];
                        if (!nameCell.querySelector('.custom-comm-container')) {
                            const nameText = nameCell.textContent?.trim() || '';
                            const mobileVal = mIdx !== -1 ? cells[mIdx]?.textContent?.trim() : '';
                            const emailVal = eIdx !== -1 ? cells[eIdx]?.textContent?.trim() : '';

                            nameCell.innerHTML = `
                                <div class="custom-comm-container" style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px; padding: 4px 0;">
                                    <span style="font-weight: 600; color: #1e293b; font-size: 13px;">${nameText}</span>
                                    <div style="display: flex; gap: 12px; margin-top: 2px;">
                                        ${mobileVal
                                    ? `<a href="tel:${mobileVal}" title="Call: ${mobileVal}" class="custom-comm-icon" style="color: #2563eb; text-decoration: none; font-size: 16px;">📞</a>`
                                    : ''
                                }
                                        ${mobileVal
                                    ? `<a href="https://wa.me/${mobileVal.replace(
                                        /\D/g,
                                        ''
                                    )}" target="_blank" title="WhatsApp: ${mobileVal}" class="custom-comm-icon" style="color: #22c55e; text-decoration: none; font-size: 16px;">💬</a>`
                                    : ''
                                }
                                        ${emailVal
                                    ? `<a href="mailto:${emailVal}" title="Email: ${emailVal}" class="custom-comm-icon" style="color: #2563eb; text-decoration: none; font-size: 16px;">✉️</a>`
                                    : ''
                                }
                                    </div>
                                </div>
                            `;
                        }
                    }

                    if (advIdx !== -1 && cells[advIdx]) {
                        const advCell = cells[advIdx];
                        const rawId = advCell.textContent?.trim();
                        const map = (window as any).advisorMap || {};
                        const advData = rawId ? map[rawId] : null;

                        if (advData && !advCell.querySelector('.custom-advisor-container')) {
                            advCell.innerHTML = `
                                <div class="custom-advisor-container" style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px; padding: 4px 0;">
                                    <span style="font-weight: 600; color: #1e293b; font-size: 13px;">${advData.name
                                } / #${advData.id}</span>
                                    <div style="display: flex; gap: 12px; margin-top: 2px;">
                                        ${advData.phone
                                    ? `<a href="tel:${advData.phone}" title="Call: ${advData.phone}" class="custom-comm-icon" style="color: #2563eb; text-decoration: none; font-size: 16px;">📞</a>`
                                    : ''
                                }
                                        ${advData.phone
                                    ? `<a href="https://wa.me/${advData.phone.replace(
                                        /\D/g,
                                        ''
                                    )}" target="_blank" title="WhatsApp: ${advData.phone
                                    }" class="custom-comm-icon" style="color: #22c55e; text-decoration: none; font-size: 16px;">💬</a>`
                                    : ''
                                }
                                        ${advData.email
                                    ? `<a href="mailto:${advData.email}" title="Email: ${advData.email}" class="custom-comm-icon" style="color: #2563eb; text-decoration: none; font-size: 16px;">✉️</a>`
                                    : ''
                                }
                                    </div>
                                </div>
                            `;
                        }
                    }

                    if (rIdx !== -1 && cells[rIdx]) {
                        const cell = cells[rIdx];
                        if (
                            cell.textContent?.includes('[object Object]') ||
                            (!cell.querySelector('.custom-remarks-text') &&
                                cell.textContent?.trim() === '')
                        ) {
                            cell.innerHTML = `<span class="custom-remarks-text" style="font-size: 11px; color: #64748b; font-style: italic;">(View in Detail)</span>`;
                        }
                    }

                    if (sIdx !== -1 && cells[sIdx] && idIdx !== -1 && cells[idIdx]) {
                        const statusCell = cells[sIdx];
                        const rowId = cells[idIdx].textContent?.trim();
                        const statusMap = (window as any).leadStatusMap || {};

                        const val = rowId ? statusMap[rowId] : null;
                        const hasGhost = statusCell.textContent?.toLowerCase().includes('published');

                        if (hasGhost || !statusCell.querySelector('.custom-status-badge')) {
                            statusCell.innerHTML = '';

                            if (val) {
                                const style = statusBadgeColors[val] || statusBadgeColors['NEW'];
                                statusCell.innerHTML = `
                                    <div class="custom-status-badge" style="
                                        background: ${style.bg};
                                        color: ${style.text};
                                        border: 1px solid ${style.border};
                                        padding: 4px 10px;
                                        border-radius: 6px;
                                        display: inline-block;
                                        font-size: 10px;
                                        font-weight: 800;
                                        text-transform: uppercase;
                                        letter-spacing: 0.5px;
                                        min-width: 90px;
                                        text-align: center;
                                    ">${val.replace('_', ' ')}</div>
                                `;
                            }
                        }
                    }

                    if (upIdx !== -1 && cells[upIdx] && addIdx !== -1 && cells[addIdx]) {
                        const upCell = cells[upIdx];
                        const upVal = upCell.textContent?.trim() || '';
                        const addVal = cells[addIdx].textContent?.trim() || '';
                        if (!upCell.querySelector('.custom-timeline-container')) {
                            upCell.innerHTML = `
                                <div class="custom-timeline-container" style="display: flex; flex-direction: column; gap: 4px;">
                                    <div style="display: flex; flex-direction: column;">
                                        <span style="font-size: 11px; color: #1e293b; font-weight: 700;">${upVal}</span>
                                        <span style="font-size: 10px; color: #64748b; font-weight: 500;"><b>Added: </b> ${addVal}</span>
                                    </div>
                                </div>
                            `;
                        }
                    }

                    if (mIdx !== -1 && cells[mIdx]) cells[mIdx].style.display = 'none';
                    if (eIdx !== -1 && cells[eIdx]) cells[eIdx].style.display = 'none';
                    if (addIdx !== -1 && cells[addIdx]) cells[addIdx].style.display = 'none';
                    if (pubIdx !== -1 && cells[pubIdx]) cells[pubIdx].style.display = 'none';

                    if (ntfIdx !== -1 && cells[ntfIdx]) {
                        const ntfCell = cells[ntfIdx];
                        const val = ntfCell.textContent?.trim().toLowerCase();
                        if (val === 'true' || val === 'yes' || val === '1') {
                            ntfCell.innerHTML = '<span style="background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700;">YES</span>';
                        } else if (val === 'false' || val === 'no' || val === '0') {
                            ntfCell.innerHTML = '<span style="background: #f1f5f9; color: #64748b; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700;">NO</span>';
                        }
                    }

                    (row as HTMLElement).style.cursor = 'default';
                    (row as HTMLElement).onclick = (e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest('button') || target.closest('a') || target.closest('input'))
                            return;
                        e.preventDefault();
                        e.stopPropagation();
                    };

                    let actTd = row.querySelector('.custom-actions-cell') as HTMLElement;
                    if (!actTd) {
                        actTd = document.createElement('td');
                        actTd.className =
                            'custom-actions-cell sc-bdnAzI cbXjmK sc-dkuEPC iJOdyj sc-eQxoQn eUabAw';

                        const container = document.createElement('div');
                        container.style.display = 'flex';
                        container.style.gap = '8px';
                        container.style.justifyContent = 'flex-end';

                        const aiBtn = document.createElement('button');
                        aiBtn.className = 'custom-ai-match custom-action-btn';
                        aiBtn.innerHTML = 'AI Match';
                        aiBtn.onclick = (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            window.open('/lenders', '_self');
                        };

                        const viewBtn = document.createElement('button');
                        viewBtn.className = 'custom-view-lead custom-action-btn';
                        viewBtn.innerHTML = 'View Lead';
                        viewBtn.onclick = (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const rIdCell = Array.from(row.querySelectorAll('td')).find((c) =>
                                /^\d+$/.test(c.textContent?.trim() || '')
                            );
                            const rId = rIdCell ? rIdCell.textContent?.trim() : '';
                            if (rId)
                                window.open(
                                    `/admin/content-manager/collection-types/api::loan-application.loan-application?view=dashboard&id=${rId}`,
                                    '_self'
                                );
                        };

                        container.appendChild(viewBtn);
                        container.appendChild(aiBtn);
                        actTd.appendChild(container);
                        row.appendChild(actTd);
                    }

                    if (row.lastElementChild !== actTd) {
                        row.appendChild(actTd);
                    }
                    actTd.setAttribute('aria-colindex', row.children.length.toString());
                });
            }
        } else {
            unmountAndRemove('lead-overview-root');
        }

        if (!document.getElementById('admin-notifications-root')) {
            const notifyRoot = document.createElement('div');
            notifyRoot.id = 'admin-notifications-root';
            document.body.appendChild(notifyRoot);
            const notifyReactRoot = createRoot(notifyRoot);
            reactRoots.set('admin-notifications-root', notifyReactRoot);
            notifyReactRoot.render(
                <DesignSystemProvider>
                    <AdminNotifications />
                </DesignSystemProvider>
            );
        }

        if (!document.getElementById('strapi-custom-debug')) {
            const debugDiv = document.createElement('div');
            debugDiv.id = 'strapi-custom-debug';
            debugDiv.textContent = 'Strapi Custom Script Active';
            document.body.prepend(debugDiv);
        }
    } finally {
        (window as any)._is_running_overrides = false;
    }
};

const isCollectionTypePath = (url: string) => {
    try {
        const path = url.startsWith('http') ? new URL(url).pathname : url.split('?')[0];
        return path.includes('/content-manager/collection-types/');
    } catch {
        return false;
    }
};

const cleanUrlForHistory = (url: string): string => {
    try {
        const urlStr = url.toString();
        if (!urlStr.includes('/content-manager/collection-types/')) return urlStr;

        const urlObj = new URL(urlStr.startsWith('http') ? urlStr : `http://x${urlStr}`);
        // NEVER strip if it has a 'view' (dashboard) or 'id' (detail)
        if (urlObj.searchParams.has('view') || urlObj.searchParams.has('id')) {
            return urlStr;
        }

        // Only strip technical query params for the main list view to keep it clean
        return urlObj.pathname;
    } catch {
        return url;
    }
};

const patchHistoryMethods = () => {
    if ((window as any)._history_url_patched) return;
    (window as any)._history_url_patched = true;

    const origPush = history.pushState.bind(history);
    const origReplace = history.replaceState.bind(history);

    history.pushState = (state: any, title: string, url?: string | URL | null) => {
        const clean = url ? cleanUrlForHistory(url.toString()) : url;
        origPush(state, title, clean);
    };

    history.replaceState = (state: any, title: string, url?: string | URL | null) => {
        const clean = url ? cleanUrlForHistory(url.toString()) : url;
        origReplace(state, title, clean);
    };
};

export const startDomOverrides = () => {
    patchHistoryMethods();

    let debounceTimer: any;
    const debouncedOverrides = () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(initOverrides, 200);
    };

    const observer = new MutationObserver((mutations) => {
        if (mutations.some((m) => (m.target as HTMLElement).id?.includes('custom'))) return;
        debouncedOverrides();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    setInterval(debouncedOverrides, 2000);
    initOverrides();
};
