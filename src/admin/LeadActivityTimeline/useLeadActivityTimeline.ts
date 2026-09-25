import { useCallback, useEffect, useState } from 'react';

export type LeadActivityRow = {
  leadId: number;
  leadName: string | null;
  lastActivityAt: string;
  eventCount: number;
  latestSeverity: string;
  categoryCounts: Record<string, number>;
  /** PL | BL when known; HL/LAP/unknown stay null (visible under All only). */
  loanType?: 'PL' | 'BL' | null;
};

export type ActivityEvent = {
  id: number;
  action: string;
  description?: string;
  severity?: string;
  category?: string;
  correlationId?: string | null;
  leadId?: number | null;
  leadName?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type ViewMode = 'lead' | 'email' | 'user-registration' | 'system';

export const DOMAIN_TABS: { id: ViewMode; label: string }[] = [
  { id: 'lead', label: 'Lead' },
  { id: 'email', label: 'Email' },
  { id: 'user-registration', label: 'Users & Auth' },
  { id: 'system', label: 'System' },
];

/** Lead-domain pipeline order (exclude EMAIL / Users / System). */
export const LEAD_JOURNEY_CATEGORY_ORDER: string[] = [
  'LEAD_FORM',
  'LOAN_APPLICATION',
  'BUREAU_EXTRACTION',
  'LENDER_ELIGIBILITY',
  'LENDER_SCORING',
  'STATUS_REMARKS',
];

export const CATEGORY_TABS: { id: string; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'LEAD_FORM', label: 'Lead Form' },
  { id: 'LOAN_APPLICATION', label: 'Loan App' },
  { id: 'BUREAU_EXTRACTION', label: 'Bureau' },
  { id: 'LENDER_ELIGIBILITY', label: 'Eligibility' },
  { id: 'LENDER_SCORING', label: 'Scoring' },
  { id: 'STATUS_REMARKS', label: 'Status / Remarks' },
];

export const EMAIL_ACTION_TABS: { id: string; label: string; action?: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'EMAIL_DISPATCHED', label: 'Dispatched', action: 'EMAIL_DISPATCHED' },
  { id: 'EMAIL_FAILED', label: 'Failed', action: 'EMAIL_FAILED' },
  { id: 'EMAIL_SKIPPED', label: 'Skipped', action: 'EMAIL_SKIPPED' },
];

export const LEAD_PRODUCT_TABS: { id: string; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'PL', label: 'PL' },
  { id: 'BL', label: 'BL' },
];

export const AUTH_ROLE_TABS: { id: string; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'Advisor', label: 'Advisor' },
  { id: 'Staff', label: 'Staff' },
  { id: 'Banker', label: 'Banker' },
  { id: 'Admin', label: 'Super Admin' },
];

const CATEGORY_LABELS: Record<string, string> = {
  LEAD_FORM: 'Lead Form',
  LOAN_APPLICATION: 'Loan App',
  EMAIL: 'Email',
  STATUS_REMARKS: 'Status',
  BUREAU_EXTRACTION: 'Bureau',
  LENDER_ELIGIBILITY: 'Eligibility',
  LENDER_SCORING: 'Scoring',
  USER_REGISTRATION: 'Users & Auth',
  SYSTEM: 'System',
};

const DOMAIN_CATEGORY: Record<'email' | 'user-registration' | 'system', string> = {
  email: 'EMAIL',
  'user-registration': 'USER_REGISTRATION',
  system: 'SYSTEM',
};

export function categoryLabel(code: string): string {
  return CATEGORY_LABELS[code] || code;
}

/** Parse activity metadata that may arrive as a JSON string. */
export function normalizeEventMetadata(raw: unknown): Record<string, unknown> {
  if (raw == null) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return {};
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // ignore
    }
    return { raw: trimmed };
  }
  return {};
}

export type EmailPersonLine = {
  eventId: number;
  roleLabel: string;
  userIdLabel?: string;
  templateLabel?: string;
  recipient: string;
  statusLabel: string;
  reasonShort?: string;
  event: ActivityEvent;
};

export type EmailRunGroup = {
  key: string;
  kind: 'lead' | 'user';
  leadId: number | null;
  leadName: string | null;
  loanApplicationId: string | number | null;
  userRoleLabel?: string;
  userIdLabel?: string;
  userRecipient?: string;
  latestAt: string;
  persons: EmailPersonLine[];
  events: ActivityEvent[];
};

/** Map EMAIL_* metadata.role to Activity Log Email tab label. */
export function formatEmailAuditRoleLabel(roleRaw: unknown): string {
  const role = String(roleRaw || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (!role) return 'Recipient';
  if (role === 'admin' || role === 'super_admin') return 'Super Admin';
  if (role === 'advisor') return 'Advisor';
  if (role === 'parent_advisor') return 'Parent Advisor';
  if (role === 'staff') return 'Staff';
  if (role === 'banker') return 'Banker';
  if (role === 'applicant') return 'Applicant';
  return role
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Friendly label for EMAIL_* metadata.template. */
export function formatEmailTemplateLabel(templateRaw: unknown): string {
  const t = String(templateRaw || '')
    .trim()
    .toLowerCase()
    .replace(/\.html$/i, '');
  if (!t) return '';
  if (t === 'loan-application') return 'Loan Application';
  if (t === 'lead-status-update') return 'Lead Status Update';
  if (t === 'advisor-registration') return 'Advisor Registration';
  if (t === 'registration-welcome') return 'Registration Welcome';
  if (t === 'forgot-password') return 'Forgot Password';
  return t
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function roleLabelFromMeta(meta: Record<string, unknown>, template?: string): string {
  const fromRole = formatEmailAuditRoleLabel(meta.role);
  if (fromRole !== 'Recipient') return fromRole;

  const t = String(template || meta.template || '').toLowerCase();
  if (t.includes('admin')) return 'Super Admin';
  if (t.includes('advisor')) return 'Advisor';
  if (t.includes('staff')) return 'Staff';
  if (t.includes('banker')) return 'Banker';
  if (t.includes('applicant') || t.includes('welcome')) return 'Applicant';
  return 'Recipient';
}

/**
 * Normalize advisors.advisor_id for display/grouping.
 * `56` → `ADV56`; `adv56` / `ADV56` → `ADV56`.
 */
export function normalizeAdvisorDashboardId(raw: unknown): string {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  if (/^\d+$/.test(s)) return `ADV${s}`;
  const m = /^adv[-_]?(.+)$/i.exec(s);
  if (m) {
    const rest = String(m[1] || '').trim();
    return rest ? `ADV${rest}` : '';
  }
  return s;
}

/**
 * Advisor / Parent Advisor → Advisor Dashboard ID (#ADV56).
 * Staff / Banker → Users id (#42).
 * Super Admin → never show an ID.
 */
export function formatEmailUserIdLabel(meta: Record<string, unknown>): string {
  const role = String(meta.role || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (role === 'admin' || role === 'super_admin') {
    return '';
  }
  if (role === 'advisor' || role === 'parent_advisor') {
    const code = normalizeAdvisorDashboardId(
      meta.advisorId ?? meta.regardingAdvisorId
    );
    return code ? `#${code}` : '';
  }
  if (role === 'staff' || role === 'banker') {
    const userId = String(
      meta.adminUserId ?? meta.userId ?? ''
    ).trim();
    return userId ? `#${userId}` : '';
  }
  // Role missing but Users id present (legacy rows)
  const userId = String(meta.adminUserId ?? meta.userId ?? '').trim();
  if (userId && role !== 'applicant') return `#${userId}`;
  const adv = normalizeAdvisorDashboardId(meta.advisorId);
  return adv ? `#${adv}` : '';
}

function advisorThreadKey(advCode: string): string {
  return `user-adv-${advCode.toLowerCase()}-advisor`;
}

/** Resolve Users & Auth event role for filter tabs (Advisor|Staff|Banker|Admin). */
export function resolveAuthRoleKind(event: ActivityEvent): string | null {
  const meta = normalizeEventMetadata(event.metadata);
  const kind = String(meta.roleKind || '').trim();
  if (kind === 'Advisor' || kind === 'Staff' || kind === 'Banker' || kind === 'Admin') {
    return kind;
  }
  if (String(event.action || '').startsWith('ADVISOR_')) return 'Advisor';
  return null;
}

export function eventMatchesAuthRole(
  event: ActivityEvent,
  filter: string
): boolean {
  if (!filter || filter === 'ALL') return true;
  return resolveAuthRoleKind(event) === filter;
}

function statusLabelFromAction(action: string, meta: Record<string, unknown>): string {
  if (action === 'EMAIL_DISPATCHED') return 'Dispatched';
  if (action === 'EMAIL_FAILED') return 'Failed';
  if (action === 'EMAIL_SKIPPED') return 'Skipped';
  const s = String(meta.status || '');
  if (s === 'success') return 'Dispatched';
  if (s === 'failure') return 'Failed';
  if (s === 'skipped') return 'Skipped';
  return action || 'Unknown';
}

function shortError(err: unknown): string | undefined {
  if (err == null || err === '') return undefined;
  const text = String(err).replace(/\s+/g, ' ').trim();
  if (text.length <= 100) return text;
  return `${text.slice(0, 97)}…`;
}

function reasonForEmailEvent(
  event: ActivityEvent,
  meta: Record<string, unknown>
): string | undefined {
  if (event.action === 'EMAIL_FAILED') {
    return shortError(meta.error) || shortError(event.description);
  }
  if (event.action === 'EMAIL_SKIPPED') {
    return (
      shortError(meta.skipReason) ||
      shortError(event.description) ||
      shortError(meta.error)
    );
  }
  return undefined;
}

function dayKey(iso: string): string {
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return 'unknown-day';
  }
}

function preferDisplayName(
  ...candidates: Array<string | null | undefined>
): string {
  for (const c of candidates) {
    const s = String(c || '').trim();
    if (!s || s === '—') continue;
    if (s.includes('@')) continue; // skip bare emails when a name exists later
    return s;
  }
  for (const c of candidates) {
    const s = String(c || '').trim();
    if (s && s !== '—') return s;
  }
  return '—';
}

function buildAdvisorEmailToAdvMap(
  events: ActivityEvent[]
): Map<string, string> {
  const map = new Map<string, string>();
  const remember = (email: string, code: string) => {
    const e = email.trim().toLowerCase();
    if (!e || !code) return;
    if (!map.has(e)) map.set(e, code);
  };

  for (const event of events) {
    const meta = normalizeEventMetadata(event.metadata);
    const code = normalizeAdvisorDashboardId(
      meta.regardingAdvisorId ?? meta.advisorId
    );
    if (!code) continue;

    const role = String(meta.role || '')
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');
    const regardingEmail = String(meta.regardingEmail || '').trim();
    if (regardingEmail) remember(regardingEmail, code);

    if (role === 'advisor' || role === 'parent_advisor') {
      const recipient = String(meta.recipient || '').trim();
      if (recipient) remember(recipient, code);
    }
  }
  return map;
}

export function groupEmailEvents(
  events: ActivityEvent[],
  actionFilter: string
): EmailRunGroup[] {
  const filtered =
    actionFilter && actionFilter !== 'ALL'
      ? events.filter((e) => e.action === actionFilter)
      : events;

  const emailToAdv = buildAdvisorEmailToAdvMap(filtered);
  const map = new Map<string, EmailRunGroup>();

  for (const event of filtered) {
    const meta = normalizeEventMetadata(event.metadata);
    const loanAppId =
      meta.loanApplicationId != null && meta.loanApplicationId !== ''
        ? meta.loanApplicationId
        : null;
    const leadIdRaw =
      event.leadId != null
        ? Number(event.leadId)
        : meta.leadId != null
          ? Number(meta.leadId)
          : null;
    const leadId =
      leadIdRaw != null && Number.isFinite(leadIdRaw) ? leadIdRaw : null;
    const leadName =
      event.leadName ||
      (meta.leadName != null ? String(meta.leadName) : null);

    const roleRaw = String(meta.role || '')
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');
    const roleLabel = roleLabelFromMeta(meta, String(meta.template || ''));
    const roleForId =
      roleRaw ||
      (roleLabel === 'Banker'
        ? 'banker'
        : roleLabel === 'Staff'
          ? 'staff'
          : roleLabel === 'Advisor' || roleLabel === 'Parent Advisor'
            ? 'advisor'
            : roleLabel === 'Super Admin'
              ? 'admin'
              : '');
    const personUserIdLabel =
      formatEmailUserIdLabel(
        roleForId && !meta.role ? { ...meta, role: roleForId } : meta
      ) || undefined;
    const templateLabel = formatEmailTemplateLabel(meta.template) || undefined;
    const recipient = String(meta.recipient || '—');
    const recipientKey = String(meta.recipient || '')
      .trim()
      .toLowerCase();

    const regardingEmail = String(meta.regardingEmail || '')
      .trim()
      .toLowerCase();
    const recipientName = String(meta.recipientName || '').trim();
    const regardingName = String(meta.regardingName || '').trim();

    let advisorCode = normalizeAdvisorDashboardId(
      meta.regardingAdvisorId ?? meta.advisorId
    );
    const isAdvisorRole =
      roleRaw === 'advisor' ||
      roleRaw === 'parent_advisor' ||
      roleForId === 'advisor';
    const isAdminRegardingAdvisor =
      (roleRaw === 'admin' ||
        roleRaw === 'super_admin' ||
        roleForId === 'admin') &&
      Boolean(
        advisorCode ||
          regardingEmail ||
          meta.regardingAdvisorId ||
          meta.advisorId
      );

    if (!advisorCode && (isAdvisorRole || isAdminRegardingAdvisor)) {
      advisorCode =
        (regardingEmail && emailToAdv.get(regardingEmail)) ||
        (isAdvisorRole && recipientKey
          ? emailToAdv.get(recipientKey)
          : undefined) ||
        '';
    }

    const isStaffBanker =
      roleRaw === 'staff' ||
      roleRaw === 'banker' ||
      roleForId === 'staff' ||
      roleForId === 'banker';
    const adminUserId = String(meta.adminUserId ?? meta.userId ?? '').trim();

    let key: string;
    let kind: 'lead' | 'user';
    let headerRoleLabel: string | undefined;
    let headerUserIdLabel: string | undefined;
    let headerRecipient: string | undefined;

    if (loanAppId != null) {
      key = `loan-${loanAppId}`;
      kind = 'lead';
    } else if (leadId != null) {
      key = `lead-${leadId}-${dayKey(event.createdAt)}`;
      kind = 'lead';
    } else if (
      isAdminRegardingAdvisor ||
      (isAdvisorRole && (advisorCode || recipientKey))
    ) {
      kind = 'user';
      headerRoleLabel = 'Advisor';
      headerUserIdLabel = advisorCode ? `#${advisorCode}` : undefined;
      headerRecipient = preferDisplayName(
        regardingName,
        recipientName,
        leadName,
        regardingEmail,
        isAdvisorRole ? recipient : undefined
      );
      if (advisorCode) {
        key = advisorThreadKey(advisorCode);
      } else if (regardingEmail) {
        key = `user-${regardingEmail}-advisor`;
      } else if (recipientKey) {
        key = `user-${recipientKey}-advisor`;
      } else {
        key = `evt-${event.id}`;
      }
    } else if (isStaffBanker) {
      kind = 'user';
      headerRoleLabel =
        roleForId === 'banker' || roleRaw === 'banker' ? 'Banker' : 'Staff';
      headerUserIdLabel = adminUserId ? `#${adminUserId}` : personUserIdLabel;
      headerRecipient = preferDisplayName(
        recipientName,
        regardingName,
        leadName,
        recipient
      );
      if (adminUserId) {
        const rb =
          roleForId === 'banker' || roleRaw === 'banker' ? 'banker' : 'staff';
        key = `user-id-${adminUserId}-${rb}`;
      } else if (recipientKey) {
        key = `user-${recipientKey}-${roleForId || roleRaw || 'unknown'}`;
      } else {
        key = `evt-${event.id}`;
      }
    } else if (recipientKey) {
      key = `user-${recipientKey}-${roleRaw || roleForId || 'unknown'}`;
      kind = 'user';
      headerRoleLabel = roleLabel;
      headerUserIdLabel = personUserIdLabel;
      headerRecipient = preferDisplayName(
        recipientName,
        regardingName,
        leadName,
        recipient
      );
    } else {
      key = `evt-${event.id}`;
      kind = 'user';
      headerRoleLabel = roleLabel;
      headerUserIdLabel = personUserIdLabel;
      headerRecipient = preferDisplayName(
        recipientName,
        regardingName,
        leadName,
        recipient
      );
    }

    let group = map.get(key);
    if (!group) {
      group = {
        key,
        kind,
        leadId: kind === 'lead' ? leadId : null,
        leadName: kind === 'lead' ? leadName : null,
        loanApplicationId: loanAppId,
        userRoleLabel: kind === 'user' ? headerRoleLabel : undefined,
        userIdLabel: kind === 'user' ? headerUserIdLabel : undefined,
        userRecipient: kind === 'user' ? headerRecipient : undefined,
        latestAt: event.createdAt,
        persons: [],
        events: [],
      };
      map.set(key, group);
    }

    if (new Date(event.createdAt) > new Date(group.latestAt)) {
      group.latestAt = event.createdAt;
    }
    if (group.kind === 'lead') {
      if (!group.leadName && leadName) group.leadName = leadName;
      if (group.loanApplicationId == null && loanAppId != null) {
        group.loanApplicationId = loanAppId;
      }
    } else {
      if (!group.userRoleLabel && headerRoleLabel) {
        group.userRoleLabel = headerRoleLabel;
      }
      if (headerUserIdLabel) {
        if (
          !group.userIdLabel ||
          (headerUserIdLabel.startsWith('#ADV') &&
            !String(group.userIdLabel).startsWith('#ADV'))
        ) {
          group.userIdLabel = headerUserIdLabel;
        }
      }
      if (headerRecipient && headerRecipient !== '—') {
        const cur = group.userRecipient || '';
        const curIsEmail = cur.includes('@');
        const nextIsName = !headerRecipient.includes('@');
        if (!cur || cur === '—' || (curIsEmail && nextIsName)) {
          group.userRecipient = headerRecipient;
        }
      }
      if (isAdminRegardingAdvisor || (isAdvisorRole && advisorCode)) {
        group.userRoleLabel = 'Advisor';
        if (advisorCode) group.userIdLabel = `#${advisorCode}`;
      }
      if (isStaffBanker && adminUserId) {
        group.userIdLabel = `#${adminUserId}`;
      }
    }

    group.events.push(event);
    group.persons.push({
      eventId: event.id,
      roleLabel,
      userIdLabel: personUserIdLabel,
      templateLabel,
      recipient,
      statusLabel: statusLabelFromAction(event.action, meta),
      reasonShort: reasonForEmailEvent(event, meta),
      event,
    });
  }

  // Merge leftover email-only advisor cards into ADV threads that share the email
  const groups = [...map.values()];
  const advGroups = groups.filter((g) => g.key.startsWith('user-adv-'));
  const emailAdvisorGroups = groups.filter(
    (g) =>
      g.kind === 'user' &&
      g.key.startsWith('user-') &&
      !g.key.startsWith('user-adv-') &&
      !g.key.startsWith('user-id-') &&
      g.key.endsWith('-advisor')
  );

  for (const emailGroup of emailAdvisorGroups) {
    const emailFromKey = emailGroup.key
      .replace(/^user-/, '')
      .replace(/-advisor$/, '')
      .toLowerCase();
    const emails = new Set<string>();
    if (emailFromKey) emails.add(emailFromKey);
    const hdr = String(emailGroup.userRecipient || '')
      .trim()
      .toLowerCase();
    if (hdr.includes('@')) emails.add(hdr);
    for (const p of emailGroup.persons) {
      const r = String(p.recipient || '')
        .trim()
        .toLowerCase();
      if (r.includes('@')) emails.add(r);
    }

    let target: EmailRunGroup | undefined;
    for (const adv of advGroups) {
      const advEmails = new Set<string>();
      const ah = String(adv.userRecipient || '')
        .trim()
        .toLowerCase();
      if (ah.includes('@')) advEmails.add(ah);
      for (const p of adv.persons) {
        const r = String(p.recipient || '')
          .trim()
          .toLowerCase();
        if (r.includes('@')) advEmails.add(r);
      }
      const advCode = adv.key
        .replace(/^user-adv-/, '')
        .replace(/-advisor$/, '');
      for (const e of emails) {
        if (emailToAdv.get(e)?.toLowerCase() === advCode) {
          target = adv;
          break;
        }
        if (advEmails.has(e)) {
          target = adv;
          break;
        }
      }
      if (target) break;
    }

    if (!target) continue;

    target.events.push(...emailGroup.events);
    target.persons.push(...emailGroup.persons);
    if (new Date(emailGroup.latestAt) > new Date(target.latestAt)) {
      target.latestAt = emailGroup.latestAt;
    }
    if (
      emailGroup.userRecipient &&
      !String(emailGroup.userRecipient).includes('@') &&
      (!target.userRecipient || String(target.userRecipient).includes('@'))
    ) {
      target.userRecipient = emailGroup.userRecipient;
    }
    map.delete(emailGroup.key);
  }

  return [...map.values()].sort(
    (a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime()
  );
}

function authHeaders(): HeadersInit {
  const captured = (window as any)._strapi_last_token as string | undefined;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (captured) {
    headers.Authorization = captured.startsWith('Bearer ')
      ? captured
      : `Bearer ${captured}`;
  }
  return headers;
}

export function useLeadActivityTimeline() {
  const [viewMode, setViewMode] = useState<ViewMode>('lead');
  const [leads, setLeads] = useState<LeadActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedLeadId, setExpandedLeadId] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [activeLenderCodes, setActiveLenderCodes] = useState<string[]>([]);
  const [domainEvents, setDomainEvents] = useState<ActivityEvent[]>([]);
  const [domainLoading, setDomainLoading] = useState(false);
  const [emailActionFilter, setEmailActionFilter] = useState('ALL');
  const [leadProductFilter, setLeadProductFilter] = useState('ALL');
  const [authRoleFilter, setAuthRoleFilter] = useState('ALL');
  const [error, setError] = useState<string | null>(null);

  const loadLeads = useCallback(async (q?: string) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ pageSize: '50' });
      if (q?.trim()) qs.set('search', q.trim());
      const res = await fetch(`/admin/activity-logs/by-lead?${qs}`, {
        headers: authHeaders(),
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      const json = await res.json();
      setLeads(Array.isArray(json.data) ? json.data : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadActiveLenders = useCallback(async (leadId: number) => {
    try {
      const qs = new URLSearchParams({ leadId: String(leadId) });
      const res = await fetch(`/admin/activity-logs/active-lenders?${qs}`, {
        headers: authHeaders(),
        credentials: 'include',
      });
      if (!res.ok) {
        setActiveLenderCodes([]);
        return;
      }
      const json = await res.json();
      setActiveLenderCodes(Array.isArray(json.data) ? json.data.map(String) : []);
    } catch {
      setActiveLenderCodes([]);
    }
  }, []);

  const loadEvents = useCallback(async (leadId: number, category: string) => {
    setEventsLoading(true);
    try {
      const qs = new URLSearchParams({ pageSize: '500' });
      if (category && category !== 'ALL') {
        qs.set('category', category);
      }
      const res = await fetch(`/admin/activity-logs/by-lead/${leadId}?${qs}`, {
        headers: authHeaders(),
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Failed to load events (${res.status})`);
      const json = await res.json();
      setEvents(Array.isArray(json.data) ? json.data : []);
    } catch {
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  const loadDomainEvents = useCallback(
    async (domain: 'email' | 'user-registration' | 'system', q: string) => {
      setDomainLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({
          pageSize: '100',
          category: DOMAIN_CATEGORY[domain],
        });
        const trimmed = q.trim();
        if (trimmed) qs.set('search', trimmed);
        const res = await fetch(`/admin/activity-logs/events?${qs}`, {
          headers: authHeaders(),
          credentials: 'include',
        });
        if (!res.ok) throw new Error(`Failed to load (${res.status})`);
        const json = await res.json();
        setDomainEvents(Array.isArray(json.data) ? json.data : []);
      } catch (err: any) {
        setError(err?.message || 'Failed to load events');
        setDomainEvents([]);
      } finally {
        setDomainLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (viewMode === 'lead') {
      loadLeads();
    }
  }, [viewMode, loadLeads]);

  useEffect(() => {
    if (
      viewMode === 'email' ||
      viewMode === 'user-registration' ||
      viewMode === 'system'
    ) {
      loadDomainEvents(viewMode, search);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- search applies via Search button
  }, [viewMode, loadDomainEvents]);

  useEffect(() => {
    if (viewMode === 'lead' && expandedLeadId != null) {
      loadEvents(expandedLeadId, activeCategory);
      loadActiveLenders(expandedLeadId);
    }
  }, [
    viewMode,
    expandedLeadId,
    activeCategory,
    loadEvents,
    loadActiveLenders,
  ]);

  const toggleLead = (leadId: number) => {
    if (expandedLeadId === leadId) {
      setExpandedLeadId(null);
      setEvents([]);
      setActiveLenderCodes([]);
      return;
    }
    setActiveCategory('ALL');
    setExpandedLeadId(leadId);
  };

  const reload = () => {
    if (
      viewMode === 'email' ||
      viewMode === 'user-registration' ||
      viewMode === 'system'
    ) {
      loadDomainEvents(viewMode, search);
    } else {
      loadLeads(search);
    }
  };

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    setError(null);
    setSearch('');
    setEmailActionFilter('ALL');
    setLeadProductFilter('ALL');
    setAuthRoleFilter('ALL');
    setDomainEvents([]);
    setExpandedLeadId(null);
    setEvents([]);
  };

  return {
    viewMode,
    setViewMode: changeViewMode,
    leads,
    loading,
    search,
    setSearch,
    reload,
    expandedLeadId,
    toggleLead,
    activeCategory,
    setActiveCategory,
    events,
    eventsLoading,
    activeLenderCodes,
    domainEvents,
    domainLoading,
    emailActionFilter,
    setEmailActionFilter,
    leadProductFilter,
    setLeadProductFilter,
    authRoleFilter,
    setAuthRoleFilter,
    error,
  };
}
