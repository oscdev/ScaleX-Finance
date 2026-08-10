import { useCallback, useEffect, useState } from 'react';

export type LeadActivityRow = {
  leadId: number;
  leadName: string | null;
  lastActivityAt: string;
  eventCount: number;
  latestSeverity: string;
  categoryCounts: Record<string, number>;
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

export type ViewMode = 'lead' | 'user-registration' | 'system';

export const DOMAIN_TABS: { id: ViewMode; label: string }[] = [
  { id: 'lead', label: 'Lead' },
  { id: 'user-registration', label: 'Users & Auth' },
  { id: 'system', label: 'System' },
];

export const CATEGORY_TABS: { id: string; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'LEAD_FORM', label: 'Lead Form' },
  { id: 'LOAN_APPLICATION', label: 'Loan App' },
  { id: 'EMAIL', label: 'Email' },
  { id: 'STATUS_REMARKS', label: 'Status / Remarks' },
  { id: 'BUREAU_EXTRACTION', label: 'Bureau' },
  { id: 'LENDER_ELIGIBILITY', label: 'Eligibility' },
  { id: 'LENDER_SCORING', label: 'Scoring' },
];

export const SEVERITY_FILTERS: { id: string; label: string }[] = [
  { id: 'ALL', label: 'All severities' },
  { id: 'info', label: 'Info' },
  { id: 'warning', label: 'Warning' },
  { id: 'error', label: 'Error' },
  { id: 'critical', label: 'Critical' },
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

const DOMAIN_CATEGORY: Record<'user-registration' | 'system', string> = {
  'user-registration': 'USER_REGISTRATION',
  system: 'SYSTEM',
};

export function categoryLabel(code: string): string {
  return CATEGORY_LABELS[code] || code;
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
  const [domainEvents, setDomainEvents] = useState<ActivityEvent[]>([]);
  const [domainLoading, setDomainLoading] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState('ALL');
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

  const loadEvents = useCallback(async (leadId: number, category: string) => {
    setEventsLoading(true);
    try {
      const qs = new URLSearchParams({ pageSize: '100' });
      if (category && category !== 'ALL') qs.set('category', category);
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
    async (domain: 'user-registration' | 'system', q: string, severity: string) => {
      setDomainLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({
          pageSize: '100',
          category: DOMAIN_CATEGORY[domain],
        });
        const trimmed = q.trim();
        if (trimmed) qs.set('search', trimmed);
        if (severity && severity !== 'ALL') qs.set('severity', severity);
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
    if (viewMode === 'user-registration' || viewMode === 'system') {
      loadDomainEvents(viewMode, search, filterSeverity);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- search applies via Search button
  }, [viewMode, filterSeverity, loadDomainEvents]);

  useEffect(() => {
    if (viewMode === 'lead' && expandedLeadId != null) {
      loadEvents(expandedLeadId, activeCategory);
    }
  }, [viewMode, expandedLeadId, activeCategory, loadEvents]);

  const toggleLead = (leadId: number) => {
    if (expandedLeadId === leadId) {
      setExpandedLeadId(null);
      setEvents([]);
      return;
    }
    setActiveCategory('ALL');
    setExpandedLeadId(leadId);
  };

  const reload = () => {
    if (viewMode === 'user-registration' || viewMode === 'system') {
      loadDomainEvents(viewMode, search, filterSeverity);
    } else {
      loadLeads(search);
    }
  };

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    setError(null);
    setSearch('');
    setFilterSeverity('ALL');
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
    domainEvents,
    domainLoading,
    filterSeverity,
    setFilterSeverity,
    error,
  };
}
