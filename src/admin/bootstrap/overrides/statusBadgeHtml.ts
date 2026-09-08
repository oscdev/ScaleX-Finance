import { statusBadgeColors, type StatusBadgeColor } from './constants';

/** Cross-OS system UI stack for admin table chips (Chrome / Firefox / Safari). */
export const CHIP_FONT_STACK =
    'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const CHIP_LAYOUT = [
    'display:inline-block',
    'padding:4px 10px',
    'border-radius:6px',
    'font-size:10px',
    'font-weight:800',
    'letter-spacing:0.5px',
    'text-transform:uppercase',
    'white-space:nowrap',
    'min-width:100px',
    'text-align:center',
    'box-sizing:border-box',
    `font-family:${CHIP_FONT_STACK}`,
    '-webkit-font-smoothing:antialiased',
    '-moz-osx-font-smoothing:grayscale',
].join(';');

const NTF_LAYOUT = [
    'display:inline-block',
    'padding:2px 8px',
    'border-radius:4px',
    'font-size:10px',
    'font-weight:700',
    'white-space:nowrap',
    'box-sizing:border-box',
    `font-family:${CHIP_FONT_STACK}`,
    '-webkit-font-smoothing:antialiased',
    '-moz-osx-font-smoothing:grayscale',
].join(';');

const VERIFIED_LAYOUT = [
    'display:inline-block',
    'padding:3px 10px',
    'border-radius:6px',
    'font-size:10px',
    'font-weight:800',
    'white-space:nowrap',
    'box-sizing:border-box',
    `font-family:${CHIP_FONT_STACK}`,
    '-webkit-font-smoothing:antialiased',
    '-moz-osx-font-smoothing:grayscale',
].join(';');

export const normalizeLeadStatusKey = (val: string): string =>
    String(val || '')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '_');

export const formatLeadStatusLabel = (val: string): string =>
    String(val || '')
        .trim()
        .toUpperCase()
        .replace(/_/g, ' ');

export const statusBadgeClass = (val: string): string => {
    const key = normalizeLeadStatusKey(val);
    const map: Record<string, string> = {
        NEW: 'custom-status-badge--new',
        UNDER_PROCESS: 'custom-status-badge--under-process',
        APPROVED: 'custom-status-badge--approved',
        REJECTED: 'custom-status-badge--rejected',
        DISBURSED: 'custom-status-badge--disbursed',
    };
    return map[key] || 'custom-status-badge--new';
};

const resolveLeadColors = (val: string): StatusBadgeColor => {
    const key = normalizeLeadStatusKey(val);
    return statusBadgeColors[key] || statusBadgeColors.NEW;
};

const chipStyle = (colors: StatusBadgeColor, layout = CHIP_LAYOUT): string =>
    [
        layout,
        `background-color:${colors.bg}`,
        `color:${colors.text}`,
        `border:1px solid ${colors.border}`,
    ].join(';');

/** Lead STATUS pill — inline colors so Firefox dark mode cannot drop the background. */
export const buildStatusBadgeHtml = (val: string): string => {
    const colors = resolveLeadColors(val);
    const label = formatLeadStatusLabel(val);
    const cls = `custom-status-badge ${statusBadgeClass(val)}`;
    return `<div class="${cls}" style="${chipStyle(colors)}">${label}</div>`;
};

const advisorApproved: StatusBadgeColor = { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' };
const advisorDisapproved: StatusBadgeColor = { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' };
const verifiedColors: StatusBadgeColor = { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' };
const unverifiedColors: StatusBadgeColor = { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' };
const ntfYes: StatusBadgeColor = { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' };
const ntfNo: StatusBadgeColor = { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0' };

export const buildAdvisorStatusBadgeHtml = (val: string): string => {
    const approved = String(val || '').trim().toLowerCase() === 'approved';
    const colors = approved ? advisorApproved : advisorDisapproved;
    const cls = approved
        ? 'adv-status-badge adv-status-badge--approved'
        : 'adv-status-badge adv-status-badge--disapproved';
    const label = approved ? 'APPROVED' : 'DISAPPROVED';
    return `<div class="${cls}" style="${chipStyle(colors)}">${label}</div>`;
};

export const buildVerifiedBadgeHtml = (verified: boolean): string => {
    const colors = verified ? verifiedColors : unverifiedColors;
    const cls = verified
        ? 'adv-verified-badge adv-verified-badge--verified'
        : 'adv-verified-badge adv-verified-badge--unverified';
    const label = verified ? 'VERIFIED' : 'UNVERIFIED';
    return `<span class="${cls}" style="${chipStyle(colors, VERIFIED_LAYOUT)}">${label}</span>`;
};

export const buildNtfBadgeHtml = (yes: boolean): string => {
    const colors = yes ? ntfYes : ntfNo;
    const cls = yes ? 'custom-ntf-yes' : 'custom-ntf-no';
    const label = yes ? 'YES' : 'NO';
    return `<span class="${cls}" style="${chipStyle(colors, NTF_LAYOUT)}">${label}</span>`;
};

/** True when cell text looks like a lead status (not publish/draft ghost). */
export const looksLikeLeadStatus = (text: string): boolean => {
    const t = String(text || '').trim();
    if (!t) return false;
    const lower = t.toLowerCase();
    if (lower.includes('publish') || lower.includes('draft')) return false;
    const key = normalizeLeadStatusKey(t);
    return (
        key in statusBadgeColors ||
        key === 'NEW' ||
        key === 'UNDER_PROCESS' ||
        key === 'APPROVED' ||
        key === 'REJECTED' ||
        key === 'DISBURSED'
    );
};
