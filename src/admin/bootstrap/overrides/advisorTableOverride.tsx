import { createRoot } from 'react-dom/client';
import { DesignSystemProvider } from '@strapi/design-system';
import { AdvisorOverviewDashboard } from '../../AdvisorOverview';
import { reactRoots, unmountAndRemove } from './reactRoots';
import { advisorLabelMap } from './constants';
import { getStrapiToken } from './strapiToken';

// ─── Header tagging ───────────────────────────────────────────────────────────

const tagAdvisorHeaders = (headers: Element[]) => {
    headers.forEach((th) => {
        const raw = (th.textContent || '').trim().toLowerCase();
        if (raw.includes('advisorid') || raw.includes('advisor code')) th.id = 'adv-col-id';
        if (raw.includes('createdat') || raw.includes('joining date')) th.id = 'adv-col-joining';
        if (raw.includes('fullname') || raw.includes('advisor name')) th.id = 'adv-col-name';
        if (raw.includes('phonenumber') || raw.includes('mobile') || raw.includes('advisor contact')) th.id = 'adv-col-phone';
        if (raw.includes('email') && !raw.includes('verified')) th.id = 'adv-col-email';
        if (raw.includes('emailverified') || raw.includes('email verify status')) th.id = 'adv-col-emailverified';
        if (raw.includes('earnings')) th.id = 'adv-col-earnings';
        if (raw.includes('advisorstatus') || raw.includes('advisor status')) th.id = 'adv-col-status';
    });
};

const relabelAdvisorHeaders = (headers: Element[]) => {
    const sortedKeys = Object.keys(advisorLabelMap).sort((a, b) => b.length - a.length);

    headers.forEach((th) => {
        const raw = (th.textContent || '').trim().toLowerCase();

        // Raw email column is hidden — its data surfaces inside the ADVISOR CONTACT cell
        if (th.id === 'adv-col-email') {
            (th as HTMLElement).style.display = 'none';
            return;
        }

        for (const key of sortedKeys) {
            const label = advisorLabelMap[key];
            if (raw.includes(key.toLowerCase()) || raw.includes(label.toLowerCase())) {
                const slot = (th.querySelector('span') || th) as HTMLElement;
                if (slot.textContent !== label) {
                    // Preserve sort arrow by mutating the text node directly
                    const walker = document.createTreeWalker(slot, NodeFilter.SHOW_TEXT);
                    const firstText = walker.nextNode();
                    if (firstText) firstText.nodeValue = label;
                    else slot.textContent = label;
                }
                // Header styling handled by thead th span rule in CSS
                break;
            }
        }
    });
};

const ensureAdvisorActionsHeader = (headerRow: Element) => {
    if (!document.getElementById('adv-custom-actions-header')) {
        const th = document.createElement('th');
        th.id = 'adv-custom-actions-header';
        th.className = 'adv-actions-header';
        th.innerHTML = '<span class="adv-actions-header-label">ACTIONS</span>';
        headerRow.appendChild(th);
    }
    const existing = headerRow.querySelector('#adv-custom-actions-header');
    if (existing && headerRow.lastElementChild !== existing) headerRow.appendChild(existing);
};

// ─── Row transforms ───────────────────────────────────────────────────────────

const transformAdvisorRow = (row: Element, headerRow: Element) => {
    const cells = Array.from(row.querySelectorAll('td'));
    const currentHeaders = Array.from(headerRow.querySelectorAll('th'));

    const idIdx = currentHeaders.findIndex((th) => th.id === 'adv-col-id');
    const nameIdx = currentHeaders.findIndex((th) => th.id === 'adv-col-name');
    const phoneIdx = currentHeaders.findIndex((th) => th.id === 'adv-col-phone');
    const emailIdx = currentHeaders.findIndex((th) => th.id === 'adv-col-email');
    const emailVerifiedIdx = currentHeaders.findIndex((th) => th.id === 'adv-col-emailverified');
    const earningsIdx = currentHeaders.findIndex((th) => th.id === 'adv-col-earnings');
    const statusIdx = currentHeaders.findIndex((th) => th.id === 'adv-col-status');

    // ADVISOR ID — format as ADVn
    if (idIdx !== -1 && cells[idIdx]) {
        const idCell = cells[idIdx];
        const rawVal = idCell.textContent?.trim() || '';
        if (rawVal && !idCell.querySelector('.custom-adv-id')) {
            const display = /^\d+$/.test(rawVal) ? `ADV${rawVal}` : rawVal;
            idCell.innerHTML = `<span class="custom-adv-id">${display}</span>`;
        }
    }

    // ADVISOR NAME — disable link click (View button handles navigation)
    if (nameIdx !== -1 && cells[nameIdx]) {
        const link = cells[nameIdx].querySelector('a');
        if (link) {
            link.style.pointerEvents = 'none';
            link.style.color = 'inherit';
            link.style.textDecoration = 'none';
        }
    }

    // ADVISOR CONTACT — phone column repurposed: shows phone + email + icons
    if (phoneIdx !== -1 && cells[phoneIdx] && !cells[phoneIdx].querySelector('.adv-contact-container')) {
        const phoneVal = cells[phoneIdx].textContent?.trim() || '';
        const emailVal = emailIdx !== -1 ? cells[emailIdx]?.textContent?.trim() : '';
        cells[phoneIdx].innerHTML = `
            <div class="adv-contact-container">
                ${phoneVal ? `
                <div class="adv-contact-row">
                    <a href="tel:${phoneVal}" onclick="event.stopPropagation()" title="Call: ${phoneVal}" class="adv-contact-link adv-contact-link--phone">📞</a>
                    <span class="adv-contact-phone-text">${phoneVal}</span>
                    <a href="https://wa.me/${phoneVal.replace(/\D/g, '')}" target="_blank" onclick="event.stopPropagation()" title="WhatsApp: ${phoneVal}" class="adv-contact-link adv-contact-link--whatsapp">💬</a>
                </div>` : ''}
                ${emailVal ? `
                <div class="adv-contact-row">
                    <a href="mailto:${emailVal}" onclick="event.stopPropagation()" title="Email: ${emailVal}" class="adv-contact-link adv-contact-link--email">✉️</a>
                    <span class="adv-contact-email-text">${emailVal}</span>
                </div>` : ''}
            </div>`;
    }

    // Hide raw email column
    if (emailIdx !== -1 && cells[emailIdx]) cells[emailIdx].style.display = 'none';

    // EMAIL VERIFY STATUS badge — CSS modifier class
    if (emailVerifiedIdx !== -1 && cells[emailVerifiedIdx] && !cells[emailVerifiedIdx].querySelector('.adv-verified-badge')) {
        const val = cells[emailVerifiedIdx].textContent?.trim().toLowerCase();
        const verified = val === 'true' || val === 'yes' || val === '1';
        cells[emailVerifiedIdx].innerHTML = verified
            ? '<span class="adv-verified-badge adv-verified-badge--verified">VERIFIED</span>'
            : '<span class="adv-verified-badge adv-verified-badge--unverified">UNVERIFIED</span>';
    }

    // EARNINGS formatted as ₹
    if (earningsIdx !== -1 && cells[earningsIdx] && !cells[earningsIdx].querySelector('.adv-earnings')) {
        const raw = parseFloat(cells[earningsIdx].textContent?.trim() || '0') || 0;
        cells[earningsIdx].innerHTML = `<span class="adv-earnings">₹${raw.toLocaleString('en-IN')}</span>`;
    }

    // ADVISOR STATUS badge — CSS modifier class
    if (statusIdx !== -1 && cells[statusIdx]) {
        const statusCell = cells[statusIdx];
        const rowIdCell = cells[idIdx !== -1 ? idIdx : 0];
        const rowId =
            rowIdCell?.querySelector('.custom-adv-id')?.textContent?.replace('ADV', '') ||
            rowIdCell?.textContent?.trim();
        const statusMap = (window as any).advisorStatusMap || {};
        const liveVal = rowId ? statusMap[rowId] : null;
        const val = liveVal || statusCell.textContent?.trim() || '';
        const hasGhost = statusCell.textContent?.toLowerCase().includes('published');

        if (hasGhost || !statusCell.querySelector('.adv-status-badge')) {
            statusCell.innerHTML = '';
            if (val) {
                const isApproved = val === 'Approved';
                statusCell.innerHTML = isApproved
                    ? `<div class="adv-status-badge adv-status-badge--approved">APPROVED</div>`
                    : `<div class="adv-status-badge adv-status-badge--disapproved">DISAPPROVED</div>`;
            }
        }
    }

    // Row navigation is blocked at the history.pushState level (historyPatch.ts),
    // so no tr.onclick is needed here. All React events (including checkbox onChange)
    // flow naturally to React's root listener.

    // Remove Strapi's built-in empty actions td (sc-hZpJae) that misaligns columns on first load
    row.querySelectorAll('td').forEach((td) => {
        if (!td.classList.contains('adv-actions-cell') && td.classList.contains('sc-hZpJae')) {
            td.remove();
        }
    });

    // Action buttons: View + Login
    let actTd = row.querySelector('.adv-actions-cell') as HTMLElement;
    if (!actTd) {
        actTd = document.createElement('td');
        actTd.className = 'adv-actions-cell sc-bdnAzI cbXjmK sc-dkuEPC iJOdyj sc-eQxoQn eUabAw';

        const container = document.createElement('div');
        container.className = 'adv-actions-btn-row';

        // View button — opens Strapi edit page for this advisor
        const viewBtn = document.createElement('button');
        viewBtn.className = 'custom-action-btn adv-view-btn';
        viewBtn.textContent = 'View';
        viewBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const idCell = cells[idIdx !== -1 ? idIdx : 0];
            const advisorCodeText =
                idCell?.querySelector('.custom-adv-id')?.textContent ||
                idCell?.textContent?.trim() ||
                '';
            const numericId = advisorCodeText.replace(/^ADV/i, '').trim();
            const docId = numericId ? ((window as any).advisorDocumentIdMap || {})[numericId] : null;
            const urlId = docId || numericId;
            if (urlId) {
                window.location.href = `/admin/content-manager/collection-types/api::advisor.advisor/${urlId}`;
            }
        };

        // Login button — authenticates as this advisor's admin user
        const loginBtn = document.createElement('button');
        loginBtn.className = 'custom-action-btn adv-login-btn';
        loginBtn.textContent = 'Login';
        loginBtn.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const idCell = cells[idIdx !== -1 ? idIdx : 0];
            const advisorCodeText =
                idCell?.querySelector('.custom-adv-id')?.textContent ||
                idCell?.textContent?.trim() ||
                '';
            const rawId = advisorCodeText.replace(/^ADV/i, '').trim();
            if (!rawId) return;

            try {
                loginBtn.textContent = '...';
                loginBtn.setAttribute('disabled', 'true');

                const token = getStrapiToken();
                const authHeaders: Record<string, string> = token
                    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' }
                    : {};

                // 1. Fetch advisor details
                const docId = ((window as any).advisorDocumentIdMap || {})[rawId];
                const fetchId = docId || rawId;
                const res = await fetch(
                    `/content-manager/collection-types/api::advisor.advisor/${fetchId}`,
                    { headers: authHeaders }
                );
                if (!res.ok) throw new Error('Could not fetch advisor data');
                const advisorDataRaw = await res.json();
                const advisorData = advisorDataRaw.data || advisorDataRaw;
                const advEmail = (advisorData.email || advisorData.attributes?.email || '').toLowerCase();
                const advPassword = advisorData.password || advisorData.attributes?.password;

                if (!advEmail) throw new Error('Advisor email not found in record');
                if (!advPassword) throw new Error('Advisor password not found in record');

                // 2. Verify admin user with matching email + ID
                const adminUsersRes = await fetch(`/admin/users?pageSize=100&_q=${advEmail}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (!adminUsersRes.ok) throw new Error('Could not fetch admin users');
                const adminUsersData = await adminUsersRes.json();
                const adminUsers = adminUsersData.data?.results || adminUsersData.data || [];
                const matchingAdmin = adminUsers.find(
                    (u: any) =>
                        u.email.toLowerCase() === advEmail &&
                        u.id.toString() === rawId.toString()
                );

                if (!matchingAdmin) {
                    alert(`Verification Failed:\n- Advisor ID: ${rawId}\n- Email: ${advEmail}\nNo matching Admin User found with these identical credentials.`);
                    return;
                }

                // 3. Confirm Advisor role
                const hasAdvisorRole = (matchingAdmin.roles || []).some(
                    (r: any) => r.name.toLowerCase() === 'advisor' || r.code?.toLowerCase() === 'advisor'
                );
                if (!hasAdvisorRole) {
                    alert(`Verification Failed:\nAdmin User found (ID: ${matchingAdmin.id}), but they do not have the 'Advisor' role.`);
                    return;
                }

                // 4. Perform admin login
                const loginRes = await fetch('/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: advEmail, password: advPassword }),
                });

                if (loginRes.ok) {
                    const loginData = await loginRes.json();
                    const jwt = loginData.data?.token || loginData.token;
                    if (jwt) {
                        localStorage.setItem('jwtToken', JSON.stringify(jwt));
                        sessionStorage.setItem('jwtToken', jwt);
                        window.location.href = '/admin';
                    } else {
                        alert('Login failed: Token missing from response.');
                    }
                } else {
                    const errorData = await loginRes.json().catch(() => ({}));
                    const errMsg = errorData.error?.message || errorData.message || 'Bad Request';
                    alert(`Login failed (${loginRes.status}): ${errMsg}\nDetails: ${JSON.stringify(errorData)}`);
                }
            } catch (err) {
                console.error('[Login As Advisor]', err);
                alert('Login failed. Check console for details.');
            } finally {
                loginBtn.textContent = 'Login';
                loginBtn.removeAttribute('disabled');
            }
        };

        container.appendChild(viewBtn);
        container.appendChild(loginBtn);
        actTd.appendChild(container);
        row.appendChild(actTd);
    }

    if (row.lastElementChild !== actTd) row.appendChild(actTd);
    actTd.setAttribute('aria-colindex', row.children.length.toString());
};

// ─── Public entry point ───────────────────────────────────────────────────────

export const applyAdvisorTableOverride = () => {
    if (!window.location.pathname.includes('api::advisor.advisor')) {
        unmountAndRemove('advisor-overview-root');
        (window as any)._advisor_status_loaded = false;
        (window as any).advisorDocumentIdMap = {};
        return;
    }

    const table = document.querySelector('table');
    if (!table || !table.querySelector('thead tr')) return;

    // Mount AdvisorOverviewDashboard above the table
    const tableContainer = table.closest('div');
    if (tableContainer?.parentElement && !document.getElementById('advisor-overview-root')) {
        const overviewRoot = document.createElement('div');
        overviewRoot.id = 'advisor-overview-root';
        tableContainer.parentNode?.insertBefore(overviewRoot, tableContainer);
        const root = createRoot(overviewRoot);
        reactRoots.set('advisor-overview-root', root);
        root.render(
            <DesignSystemProvider>
                <AdvisorOverviewDashboard />
            </DesignSystemProvider>
        );
    }

    const headerRow = table.querySelector('thead tr')!;
    const bodyRows = table.querySelectorAll('tbody tr');
    const headers = Array.from(headerRow.querySelectorAll('th'));

    tagAdvisorHeaders(headers);
    relabelAdvisorHeaders(headers);
    ensureAdvisorActionsHeader(headerRow);

    bodyRows.forEach((row) => transformAdvisorRow(row, headerRow));
};
