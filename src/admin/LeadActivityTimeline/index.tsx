import { useState, type CSSProperties } from 'react';
import {
  CATEGORY_TABS,
  DOMAIN_TABS,
  SEVERITY_FILTERS,
  categoryLabel,
  useLeadActivityTimeline,
  type ActivityEvent,
} from './useLeadActivityTimeline';
import { styles } from './styles';

function formatTime(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function severityStyle(sev?: string): CSSProperties {
  if (sev === 'error' || sev === 'critical') {
    return { background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' };
  }
  if (sev === 'warning') {
    return { background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' };
  }
  return { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' };
}

function categoryBadgeStyle(cat: string): CSSProperties {
  const map: Record<string, CSSProperties> = {
    LEAD_FORM: { background: '#ecfeff', color: '#0e7490', borderColor: '#a5f3fc' },
    LOAN_APPLICATION: { background: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0' },
    EMAIL: { background: '#fff7ed', color: '#c2410c', borderColor: '#fed7aa' },
    STATUS_REMARKS: { background: '#f5f3ff', color: '#6d28d9', borderColor: '#ddd6fe' },
    BUREAU_EXTRACTION: { background: '#fdf2f8', color: '#be185d', borderColor: '#fbcfe8' },
    LENDER_ELIGIBILITY: { background: '#eef2ff', color: '#3730a3', borderColor: '#c7d2fe' },
    LENDER_SCORING: { background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' },
    USER_REGISTRATION: { background: '#fef3c7', color: '#b45309', borderColor: '#fde68a' },
    SYSTEM: { background: '#f1f5f9', color: '#475569', borderColor: '#e2e8f0' },
  };
  return map[cat] || {};
}

function EventRow({
  event,
  showLeadChip,
}: {
  event: ActivityEvent;
  showLeadChip?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={styles.eventRow}>
      <span style={styles.eventDot} />
      <div style={styles.eventMeta}>
        <span style={styles.eventTime}>{formatTime(event.createdAt)}</span>
        <span
          style={{
            ...styles.severityPill,
            ...severityStyle(event.severity),
          }}
        >
          {event.severity || 'info'}
        </span>
        {event.category && (
          <span
            style={{
              ...styles.badge,
              ...categoryBadgeStyle(event.category),
            }}
          >
            {categoryLabel(event.category)}
          </span>
        )}
        {showLeadChip && event.leadId != null && (
          <span style={styles.leadIdPill}>
            #{event.leadId}
            {event.leadName ? ` · ${event.leadName}` : ''}
          </span>
        )}
        <span style={styles.eventAction}>{event.action}</span>
      </div>
      <div style={styles.eventDesc}>{event.description}</div>
      {event.correlationId && (
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
          Run {String(event.correlationId).slice(0, 8)}
        </div>
      )}
      {event.metadata && Object.keys(event.metadata).length > 0 && (
        <div style={{ marginTop: 6 }}>
          <button type="button" style={styles.linkBtn} onClick={() => setOpen((v) => !v)}>
            {open ? 'Hide details' : 'Show details'}
          </button>
        </div>
      )}
      {open && (
        <pre
          style={{
            marginTop: 8,
            marginBottom: 0,
            fontSize: 11,
            background: '#0f172a',
            color: '#e2e8f0',
            padding: 10,
            borderRadius: 8,
            overflowX: 'auto',
          }}
        >
          {JSON.stringify(event.metadata, null, 2)}
        </pre>
      )}
    </div>
  );
}

export const LeadActivityTimeline = () => {
  const {
    viewMode,
    setViewMode,
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
  } = useLeadActivityTimeline();

  const isDomainView = viewMode === 'user-registration' || viewMode === 'system';

  return (
    <div style={styles.root} id="lead-activity-timeline-root-inner">
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Activity Logs</h1>
          <p style={styles.subtitle}>
            Project-wide audit trail by domain: Lead, Users & Auth, System.
          </p>
        </div>
        <div style={styles.headerActions}>
          <a
            href="/admin/content-manager/collection-types/api::activity-log.activity-log?sort=createdAt:DESC&raw=1"
            style={{ ...styles.ghostBtn, textDecoration: 'none' }}
          >
            Raw dump
          </a>
        </div>
      </div>

      <div style={styles.viewTabs}>
        {DOMAIN_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            style={{
              ...styles.viewTab,
              ...(viewMode === tab.id ? styles.viewTabActive : {}),
            }}
            onClick={() => setViewMode(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {viewMode === 'lead' ? (
        <div style={styles.toolbar}>
          <input
            style={styles.search}
            placeholder="Search by lead ID or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') reload();
            }}
          />
          <button type="button" onClick={reload} style={styles.primaryBtn}>
            Search
          </button>
        </div>
      ) : (
        <div style={styles.toolbar}>
          <input
            style={styles.search}
            placeholder="Search action, description, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') reload();
            }}
          />
          <select
            style={styles.select}
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            aria-label="Filter by severity"
          >
            {SEVERITY_FILTERS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <button type="button" onClick={reload} style={styles.primaryBtn}>
            Search
          </button>
        </div>
      )}

      {error && <div style={styles.errorBanner}>{error}</div>}

      {isDomainView ? (
        domainLoading ? (
          <div style={styles.emptyCard}>Loading events…</div>
        ) : domainEvents.length === 0 ? (
          <div style={styles.emptyCard}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
              No matching events
            </div>
            <div>
              {viewMode === 'user-registration'
                ? 'Login, registration, approvals, and admin/staff/banker account creates appear here.'
                : 'Maintenance and log cleanup events appear here.'}
            </div>
          </div>
        ) : (
          <div style={styles.allEventsPanel}>
            <div style={{ ...styles.eventList, marginLeft: 18, maxHeight: 'none' }}>
              {domainEvents.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </div>
          </div>
        )
      ) : loading ? (
        <div style={styles.emptyCard}>Loading activity…</div>
      ) : leads.length === 0 ? (
        <div style={styles.emptyCard}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
            No lead activity yet
          </div>
          <div>
            Lead-tied events appear here after lead create, loan submit, or AI Match. Use Users &
            Auth or System for account and ops logs.
          </div>
        </div>
      ) : (
        leads.map((lead) => {
          const open = expandedLeadId === lead.leadId;
          const hasError =
            lead.latestSeverity === 'error' || lead.latestSeverity === 'critical';
          return (
            <div
              key={lead.leadId}
              style={{
                ...styles.card,
                ...(open ? styles.cardOpen : {}),
              }}
            >
              <div
                style={styles.cardHeader}
                onClick={() => toggleLead(lead.leadId)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') toggleLead(lead.leadId);
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: 0 }}>
                  <span style={styles.chevron}>{open ? '▾' : '▸'}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={styles.leadTitle}>
                      <span style={styles.leadIdPill}>#{lead.leadId}</span>
                      <span>{lead.leadName || 'Unknown lead'}</span>
                    </div>
                    <div style={styles.metaRow}>
                      <span style={styles.metaStat}>
                        Last {formatTime(lead.lastActivityAt)}
                      </span>
                      <span style={styles.metaStat}>{lead.eventCount} events</span>
                      <span
                        style={{
                          ...styles.severityPill,
                          ...severityStyle(hasError ? lead.latestSeverity : 'info'),
                        }}
                      >
                        {hasError ? lead.latestSeverity : 'ok'}
                      </span>
                    </div>
                    <div style={styles.badges}>
                      {Object.entries(lead.categoryCounts || {}).map(([cat, count]) => (
                        <span
                          key={cat}
                          style={{
                            ...styles.badge,
                            ...categoryBadgeStyle(cat),
                          }}
                        >
                          {categoryLabel(cat)} · {count}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {open && (
                <>
                  <div style={styles.tabs}>
                    {CATEGORY_TABS.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        style={{
                          ...styles.tab,
                          ...(activeCategory === tab.id ? styles.tabActive : {}),
                        }}
                        onClick={() => setActiveCategory(tab.id)}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <div style={styles.eventList}>
                    {eventsLoading ? (
                      <div style={styles.empty}>Loading events…</div>
                    ) : events.length === 0 ? (
                      <div style={styles.empty}>No events in this category</div>
                    ) : (
                      events.map((event) => <EventRow key={event.id} event={event} />)
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};
