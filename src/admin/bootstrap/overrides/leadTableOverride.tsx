import { createRoot } from 'react-dom/client';
import { DesignSystemProvider } from '@strapi/design-system';
import { LeadOverviewDashboard } from '../../LeadOverview';
import { reactRoots, unmountAndRemove } from './reactRoots';
import { leadLabelMap } from './constants';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isInsideRadixPortal = (el: Element): boolean => {
    const portal = el.closest(
        '[role="dialog"], [role="listbox"], [role="menu"], [data-radix-portal], [data-radix-popper-content-wrapper], [data-radix-select-content], [data-radix-popover-content]'
    );
    if (!portal) return false;
    if (
        portal.textContent?.toLowerCase().includes('filter') ||
        portal.querySelector('input[placeholder*="Search"]') ||
        portal.textContent?.toLowerCase().includes('add a filter')
    ) return false;
    return true;
};

/** Map a lead status value to its CSS modifier class */
const statusBadgeClass = (val: string): string => {
    const map: Record<string, string> = {
        NEW: 'custom-status-badge--new',
        UNDER_PROCESS: 'custom-status-badge--under-process',
        'UNDER PROCESS': 'custom-status-badge--under-process',
        APPROVED: 'custom-status-badge--approved',
        REJECTED: 'custom-status-badge--rejected',
        DISBURSED: 'custom-status-badge--disbursed',
    };
    return map[val] || 'custom-status-badge--new';
};

// ─── Header tagging ───────────────────────────────────────────────────────────

const tagLeadHeaders = (headers: Element[]) => {
    headers.forEach((th) => {
        const raw = (th.textContent || '').trim().toLowerCase();
        if (raw.includes('fullname') || raw.includes('customer info')) th.id = 'col-customer-info';
        if (raw.includes('mobile')) th.id = 'col-mobile';
        if (raw.includes('email')) th.id = 'col-email';
        if (raw.includes('selectedproduct') || raw.includes('product')) th.id = 'col-product';
        if (raw.includes('requiredamount') || raw.includes('amount')) th.id = 'col-amount';
        if (raw.includes('createdat') || raw.includes('added')) th.id = 'col-added';
        if (raw.includes('updatedat') || raw.includes('updated')) th.id = 'col-updated';
        if (raw.includes('leadstatus') || raw.includes('status')) th.id = 'col-status';
        if (raw.includes('advisor')) th.id = 'col-advisor';
        if (raw.includes('remarks')) th.id = 'col-remarks';
        if (raw.includes('notification')) th.id = 'col-notifications';
        if (raw === 'id' || raw.startsWith('id')) th.id = 'col-id';
    });
};

const relabelLeadHeaders = (headers: Element[]) => {
    const sortedKeys = Object.keys(leadLabelMap).sort((a, b) => b.length - a.length);

    headers.forEach((th) => {
        const raw = th.textContent?.trim().toLowerCase() || '';

        if (th.id === 'col-notifications' || raw.includes('notification')) return;

        if (
            th.id === 'col-mobile' ||
            th.id === 'col-email' ||
            th.id === 'col-added' ||
            raw === 'mobile' ||
            raw === 'email' ||
            raw === 'added' ||
            raw.includes('publication') ||
            raw.includes('published')
        ) {
            (th as HTMLElement).style.display = 'none';
            return;
        }

        for (const key of sortedKeys) {
            const label = leadLabelMap[key];
            if (raw === key || raw === label.toLowerCase()) {
                const slot = (th.querySelector('span') || th) as HTMLElement;
                if (slot.textContent !== label) slot.textContent = label;
                // Header label styling is handled by thead th span rule in CSS
                break;
            }
        }
    });
};

const ensureActionsHeader = (headerRow: Element) => {
    if (!document.getElementById('custom-actions-header')) {
        const th = document.createElement('th');
        th.id = 'custom-actions-header';
        th.className = 'custom-actions-header adv-actions-header';
        th.innerHTML = '<span class="custom-actions-label">ACTIONS</span>';
        headerRow.appendChild(th);
    }
    const existing = headerRow.querySelector('#custom-actions-header');
    if (existing && headerRow.lastElementChild !== existing) headerRow.appendChild(existing);
    if (existing) existing.setAttribute('aria-colindex', headerRow.children.length.toString());
};

// ─── Global element styling (Configure View button, blue-bg chips) ─────────────

const applyGlobalElementStyling = () => {
    // "Configure the view" / "Configure the fields" button — apply CSS class
    document.querySelectorAll<HTMLElement>('span, button, label, li, p, div').forEach((el) => {
        const text = (el.textContent || '').trim().toLowerCase();
        if (
            (text === 'configure the view' || text === 'configure the fields') &&
            (el.tagName === 'SPAN' || el.tagName === 'BUTTON' || el.tagName === 'A')
        ) {
            const btn = (el.closest('button') || el.closest('a') || el) as HTMLElement;
            if (btn && !btn.classList.contains('custom-configure-btn')) {
                btn.classList.add('custom-configure-btn');
            }
        }
    });

    // Active filter chips — add CSS class instead of inline setProperty
    document.querySelectorAll('button').forEach((btn) => {
        if (isInsideRadixPortal(btn)) return;
        if (btn.closest('#admin-notifications-root')) return;
        if (btn.closest('nav')) return;
        const label = (btn.getAttribute('aria-label') || '').toLowerCase();
        const isCloseBtn =
            label.includes('clear') ||
            label.includes('remove') ||
            label.includes('delete') ||
            btn.textContent?.trim() === '×' ||
            btn.textContent?.trim() === '✕';
        if (isCloseBtn) {
            const chip = btn.parentElement;
            if (chip && !isInsideRadixPortal(chip) && !chip.textContent?.toLowerCase().includes('filter')) {
                chip.classList.add('custom-filter-chip');
            }
        }
    });

    // Blue-background elements → add/remove data-custom-highlight (CSS handles the color)
    const isConfigPage = window.location.pathname.includes('/configurations/');
    document.body.classList.toggle('is-config-page', isConfigPage);

    document.querySelectorAll<HTMLElement>('span, div, label, button, li').forEach((el) => {
        if (isConfigPage) return;
        if (el.closest('#admin-notifications-root')) return;
        if (el.closest('nav, aside, [class*="SubNav"], [class*="MainNav"]')) return;
        if (el.tagName === 'A' || el.closest('a')) return;

        const bg = el.style.backgroundColor || window.getComputedStyle(el).backgroundColor;
        const isHighlighted =
            bg === 'rgb(37, 99, 235)' ||
            bg === 'rgb(29, 78, 216)' ||
            bg === 'rgb(73, 69, 255)' ||
            el.style.backgroundColor?.includes('#1d4ed8') ||
            el.style.backgroundColor?.includes('#4945ff');

        if (isHighlighted) {
            el.setAttribute('data-custom-highlight', 'true');
        } else if (el.getAttribute('data-custom-highlight') === 'true') {
            el.removeAttribute('data-custom-highlight');
        }
    });

    // Relabel camelCase field names inside portals / popovers
    document
        .querySelectorAll('[data-radix-popper-content-wrapper], [role="dialog"], [data-radix-popover-content]')
        .forEach((portal) => {
            const walker = document.createTreeWalker(portal, NodeFilter.SHOW_TEXT);
            let node: Node | null = walker.nextNode();
            while (node) {
                const raw = (node.nodeValue || '').trim().toLowerCase();
                if (raw) {
                    const mapped = (leadLabelMap as any)[raw];
                    if (mapped && node.nodeValue !== mapped) node.nodeValue = mapped;
                }
                node = walker.nextNode();
            }
        });
};

// ─── Popover field management ─────────────────────────────────────────────────

const applyPopoverFieldOverrides = () => {
    let popoverContainer: HTMLElement | null = null;

    document.querySelectorAll('span, button, label, li, p, div').forEach((el) => {
        if (isInsideRadixPortal(el)) return;
        if (el.closest('#admin-notifications-root')) return;
        if (el.textContent === 'Displayed fields') {
            const parent = el.closest('div');
            if (parent?.parentElement) {
                const checkboxes = parent.parentElement.querySelectorAll('input[type="checkbox"]');
                if (checkboxes.length > 0) {
                    popoverContainer = checkboxes[0].closest('div')?.parentElement as HTMLElement | null;
                }
            }
        }
    });

    if (popoverContainer && isInsideRadixPortal(popoverContainer as Element)) {
        popoverContainer = null;
    }

    if (popoverContainer && !(popoverContainer as HTMLElement).querySelector('[data-custom-field="remarks"]')) {
        const hasRemarks = window.location.search.includes('remarks');
        const container = document.createElement('div');
        container.setAttribute('data-custom-field', 'remarks');
        container.className = 'custom-popover-remarks';
        container.innerHTML = `
            <input type="checkbox" ${hasRemarks ? 'checked' : ''} />
            <span>REMARKS</span>
        `;
        container.onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();
            const params = new URLSearchParams(window.location.search);
            let fields = params.get('_fields')?.split(',') || [];
            fields = fields.includes('remarks') ? fields.filter((f) => f !== 'remarks') : [...fields, 'remarks'];
            params.set('_fields', fields.join(','));
            window.location.href = `${window.location.pathname}?${params.toString()}`;
        };
        (popoverContainer as HTMLElement).appendChild(container);
    }

    if (popoverContainer) {
        (popoverContainer as HTMLElement).querySelectorAll('span').forEach((span) => {
            if (span.textContent === 'MOBILE' || span.textContent === 'EMAIL') {
                const rowContainer = span.parentElement?.parentElement;
                if (rowContainer) rowContainer.style.setProperty('display', 'none', 'important');
            }
        });
    }
};

// ─── Row transforms ───────────────────────────────────────────────────────────

const transformLeadRow = (row: Element, headerRow: Element) => {
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

    // Clear ghost publish/draft text
    cells.forEach((td) => {
        const text = td.textContent?.toLowerCase() || '';
        if (text.includes('published') || text.includes('draft')) td.innerHTML = '';
        td.querySelectorAll('span, p, div').forEach((child) => {
            if (child.textContent?.toLowerCase().includes('publi')) {
                child.innerHTML = '';
                (child as HTMLElement).style.display = 'none';
            }
        });
    });

    // Customer info cell (name + call/WhatsApp/email icons)
    if (nameIdx !== -1 && cells[nameIdx] && !cells[nameIdx].querySelector('.custom-comm-container')) {
        const nameText = cells[nameIdx].textContent?.trim() || '';
        const mobileVal = mIdx !== -1 ? cells[mIdx]?.textContent?.trim() : '';
        const emailVal = eIdx !== -1 ? cells[eIdx]?.textContent?.trim() : '';
        cells[nameIdx].innerHTML = `
            <div class="custom-comm-container">
                <span class="custom-comm-name">${nameText}</span>
                <div class="custom-comm-icons" style="margin-top: 4px;">
                    ${mobileVal ? `<a href="tel:${mobileVal}" onclick="event.stopPropagation()" title="Call: ${mobileVal}" class="custom-comm-icon" style="text-decoration: none; margin-right: 8px;">📞</a>` : ''}
                    ${mobileVal ? `<a href="https://wa.me/${mobileVal.replace(/\D/g, '')}" target="_blank" onclick="event.stopPropagation()" title="WhatsApp: ${mobileVal}" class="custom-comm-icon" style="text-decoration: none; margin-right: 8px;">💬</a>` : ''}
                    ${emailVal ? `<a href="mailto:${emailVal}" onclick="event.stopPropagation()" title="Email: ${emailVal}" class="custom-comm-icon" style="text-decoration: none;">✉️</a>` : ''}
                </div>
            </div>
        `;
    }

    // Advisor cell (name + contact icons)
    if (advIdx !== -1 && cells[advIdx]) {
        const advCell = cells[advIdx];
        const rawId = advCell.textContent?.trim();
        const map = (window as any).advisorMap || {};
        const advData = rawId ? map[rawId] : null;
        if (advData && !advCell.querySelector('.custom-advisor-container')) {
            advCell.innerHTML = `
                <div class="custom-advisor-container">
                    <span class="custom-advisor-name">${advData.name} / ADV${advData.id}</span>
                    <div class="custom-comm-icons" style="margin-top: 4px;">
                        ${advData.phone ? `<a href="tel:${advData.phone}" onclick="event.stopPropagation()" title="Call: ${advData.phone}" class="custom-comm-icon" style="text-decoration: none; margin-right: 8px;">📞</a>` : ''}
                        ${advData.phone ? `<a href="https://wa.me/${advData.phone.replace(/\D/g, '')}" target="_blank" onclick="event.stopPropagation()" title="WhatsApp: ${advData.phone}" class="custom-comm-icon" style="text-decoration: none; margin-right: 8px;">💬</a>` : ''}
                        ${advData.email ? `<a href="mailto:${advData.email}" onclick="event.stopPropagation()" title="Email: ${advData.email}" class="custom-comm-icon" style="text-decoration: none;">✉️</a>` : ''}
                    </div>
                </div>
            `;
        }
    }

    // Remarks cell placeholder
    if (rIdx !== -1 && cells[rIdx]) {
        const cell = cells[rIdx];
        if (
            cell.textContent?.includes('[object Object]') ||
            (!cell.querySelector('.custom-remarks-text') && cell.textContent?.trim() === '')
        ) {
            cell.innerHTML = `<span class="custom-remarks-text">(View in Detail)</span>`;
        }
    }

    // Status badge — CSS modifier class per status value
    if (sIdx !== -1 && cells[sIdx] && idIdx !== -1 && cells[idIdx]) {
        const statusCell = cells[sIdx];
        const rowId = cells[idIdx].textContent?.trim();
        const statusMap = (window as any).leadStatusMap || {};
        const val = rowId ? statusMap[rowId] : null;
        const hasGhost = statusCell.textContent?.toLowerCase().includes('published');

        if (hasGhost || !statusCell.querySelector('.custom-status-badge')) {
            statusCell.innerHTML = '';
            if (val) {
                statusCell.innerHTML = `<div class="custom-status-badge ${statusBadgeClass(val)}">${val.replace('_', ' ')}</div>`;
            }
        }
    }

    // Timeline (Updated / Added)
    if (upIdx !== -1 && cells[upIdx] && addIdx !== -1 && cells[addIdx]) {
        const upCell = cells[upIdx];
        if (!upCell.querySelector('.custom-timeline-container')) {
            const upVal = upCell.textContent?.trim() || '';
            const addVal = cells[addIdx].textContent?.trim() || '';
            upCell.innerHTML = `
                <div class="custom-timeline-container">
                    <div class="custom-timeline-inner">
                        <span class="custom-timeline-updated">${upVal}</span>
                        <span class="custom-timeline-added"><b>Added: </b>${addVal}</span>
                    </div>
                </div>
            `;
        }
    }

    // Hide raw mobile / email / added / published columns
    if (mIdx !== -1 && cells[mIdx]) cells[mIdx].style.display = 'none';
    if (eIdx !== -1 && cells[eIdx]) cells[eIdx].style.display = 'none';
    if (addIdx !== -1 && cells[addIdx]) cells[addIdx].style.display = 'none';
    if (pubIdx !== -1 && cells[pubIdx]) cells[pubIdx].style.display = 'none';

    // Notification badge — CSS class
    if (ntfIdx !== -1 && cells[ntfIdx]) {
        const val = cells[ntfIdx].textContent?.trim().toLowerCase();
        if (val === 'true' || val === 'yes' || val === '1') {
            cells[ntfIdx].innerHTML = '<span class="custom-ntf-yes">YES</span>';
        } else if (val === 'false' || val === 'no' || val === '0') {
            cells[ntfIdx].innerHTML = '<span class="custom-ntf-no">NO</span>';
        }
    }

    // Row navigation is blocked at the history.pushState level (historyPatch.ts),
    // so no tr.onclick is needed here. All React events (including checkbox onChange)
    // flow naturally to React's root listener.

    // Hide Strapi's built-in empty/ghost cells instead of removing them (prevents React insertBefore crash)
    row.querySelectorAll('td').forEach((td) => {
        if (!td.classList.contains('custom-actions-cell') && td.children.length === 0 && td.textContent?.trim() === '') {
            (td as HTMLElement).style.display = 'none';
        }
        // Specific catch for the production sc-eQxoQn classes if they are empty
        if (!td.classList.contains('custom-actions-cell') && td.classList.contains('sc-eQxoQn') && td.children.length === 0) {
            (td as HTMLElement).style.display = 'none';
        }
    });

    // Action buttons: View Lead + AI Match
    let actTd = row.querySelector('.custom-actions-cell') as HTMLElement;
    if (!actTd) {
        actTd = document.createElement('td');
        actTd.className = 'custom-actions-cell';
        actTd.style.padding = '12px 16px';
        actTd.style.verticalAlign = 'middle';

        const container = document.createElement('div');
        container.className = 'custom-actions-btn-row';
        container.style.display = 'flex';
        container.style.gap = '8px';
        container.style.justifyContent = 'flex-end';
        container.style.alignItems = 'center';
        container.style.minWidth = '220px';

        const aiBtn = document.createElement('button');
        aiBtn.className = 'custom-ai-match custom-action-btn';
        aiBtn.textContent = 'AI Match';
        Object.assign(aiBtn.style, {
            padding: '6px 14px',
            backgroundColor: '#1d4ed8',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '700',
            transition: 'background 0.2s'
        });
        aiBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.open('/lenders', '_self');
        };

        const viewBtn = document.createElement('button');
        viewBtn.className = 'custom-view-lead custom-action-btn';
        viewBtn.textContent = 'View Lead';
        Object.assign(viewBtn.style, {
            padding: '6px 14px',
            backgroundColor: '#1d4ed8',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '700',
            transition: 'background 0.2s'
        });
        viewBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const rIdCell = Array.from(row.querySelectorAll('td')).find((c) =>
                /^\d+$/.test(c.textContent?.trim() || '')
            );
            const rId = rIdCell?.textContent?.trim();
            if (rId) {
                window.open(
                    `/admin/content-manager/collection-types/api::loan-application.loan-application?view=dashboard&id=${rId}`,
                    '_self'
                );
            }
        };

        container.appendChild(viewBtn);
        container.appendChild(aiBtn);
        actTd.appendChild(container);
        row.appendChild(actTd);
    }

    if (row.lastElementChild !== actTd) row.appendChild(actTd);
    actTd.setAttribute('aria-colindex', row.children.length.toString());
};

// ─── Public entry point ───────────────────────────────────────────────────────

export const applyLeadTableOverride = () => {
    if (!window.location.pathname.includes('api::lead.lead')) {
        unmountAndRemove('lead-overview-root');
        return;
    }

    const table = document.querySelector('table');
    if (!table || !table.querySelector('thead tr')) return;

    // Mount LeadOverviewDashboard above the table
    const tableContainer = table.closest('div');
    if (tableContainer?.parentElement && !document.getElementById('lead-overview-root')) {
        const overviewRoot = document.createElement('div');
        overviewRoot.id = 'lead-overview-root';
        tableContainer.parentNode?.insertBefore(overviewRoot, tableContainer);
        const root = createRoot(overviewRoot);
        reactRoots.set('lead-overview-root', root);
        root.render(
            <DesignSystemProvider>
                <LeadOverviewDashboard />
            </DesignSystemProvider>
        );
    }

    const headerRow = table.querySelector('thead tr')!;
    const bodyRows = table.querySelectorAll('tbody tr');
    const headers = Array.from(headerRow.querySelectorAll('th'));

    tagLeadHeaders(headers);
    relabelLeadHeaders(headers);
    ensureActionsHeader(headerRow);
    applyGlobalElementStyling();
    applyPopoverFieldOverrides();

    bodyRows.forEach((row) => transformLeadRow(row, headerRow));
};
