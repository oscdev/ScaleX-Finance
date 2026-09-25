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
  recipient: string;
  statusLabel: string;
  reasonShort?: string;
  event: ActivityEvent;
};

export type EmailRunGroup = {
  key: string;
  leadId: number | null;
  leadName: string | null;
  loanApplicationId: string | number | null;
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

export function groupEmailEvents(
  events: ActivityEvent[],
  actionFilter: string
): EmailRunGroup[] {
  const filtered =
    actionFilter && actionFilter !== 'ALL'
      ? events.filter((e) => e.action === actionFilter)
      : events;

  const map = new Map<string, EmailRunGroup>();

  for (const event of filtered) {
    const meta = normalizeEventMetadata(event.metadata);
    const loanAppId =
      meta.loanApplicationId != null && meta.loanApplicationId !== ''
        ? meta.loanApplicationId
        : null;
    const leadId =
      event.leadId != null
        ? Number(event.leadId)
        : meta.leadId != null
          ? Number(meta.leadId)
          : null;
    const leadName =
      event.leadName ||
      (meta.leadName != null ? String(meta.leadName) : null);

    const key =
      loanAppId != null
        ? `loan-${loanAppId}`
        : leadId != null
          ? `lead-${leadId}-${dayKey(event.createdAt)}`
          : `evt-${event.id}`;

    let group = map.get(key);
    if (!group) {
      group = {
        key,
        leadId: Number.isFinite(leadId as number) ? (leadId as number) : null,
        leadName,
        loanApplicationId: loanAppId,
        latestAt: event.createdAt,
        persons: [],
        events: [],
      };
      map.set(key, group);
    }

    if (new Date(event.createdAt) > new Date(group.latestAt)) {
      group.latestAt = event.createdAt;
    }
    if (!group.leadName && leadName) group.leadName = leadName;
    if (group.loanApplicationId == null && loanAppId != null) {
      group.loanApplicationId = loanAppId;
    }

    group.events.push(event);
    group.persons.push({
      eventId: event.id,
      roleLabel: roleLabelFromMeta(meta, String(meta.template || '')),
      recipient: String(meta.recipient || '—'),
      statusLabel: statusLabelFromAction(event.action, meta),
      reasonShort: reasonForEmailEvent(event, meta),
      event,
    });
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
