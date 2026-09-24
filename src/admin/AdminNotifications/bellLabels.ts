/** Friendly bell badge labels (keep in sync with notifications/bell-actions.ts). */
const BELL_ACTION_LABELS: Record<string, string> = {
  PL_ELIGIBILITY_RUN_COMPLETE: 'Eligibility Created',
  BL_ELIGIBILITY_RUN_COMPLETE: 'Eligibility Created',
  PL_SCORE_RUN_DONE: 'Scoring Created',
  BL_SCORE_RUN_DONE: 'Scoring Created',
  AI_MATCH_GENERATED: 'AI Match generated',
  BUREAU_EXTRACT_COMPLETED: 'Bureau Extracted',
  BUREAU_EXTRACT_FAILED: 'Bureau Extract Failed',
  LEAD_ADVISOR_ASSIGNED: 'Advisor Assigned',
  LOAN_ASSIGNMENT_CHANGED: 'Assignment Changed',
};

function normalizeMeta(raw: unknown): Record<string, unknown> {
  if (raw == null) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // ignore
    }
  }
  return {};
}

function leadLabel(meta: Record<string, unknown>, leadId?: unknown, leadName?: unknown): string {
  const id = meta.leadId ?? leadId;
  const name = String(meta.leadName ?? leadName ?? '').trim();
  const idPart = id != null && String(id).trim() !== '' ? `Lead #${id}` : 'Lead';
  return name ? `${idPart} (${name})` : idPart;
}

export function bellActionLabel(
  action: string | undefined | null,
  metadata?: unknown
): string {
  const key = String(action || '');
  if (key === 'LOAN_ASSIGNMENT_CHANGED') {
    const meta = normalizeMeta(metadata);
    const staffChanged =
      String(meta.oldAssignedStaffId ?? '') !== String(meta.newAssignedStaffId ?? '') &&
      (meta.oldAssignedStaffId != null || meta.newAssignedStaffId != null);
    const bankerChanged =
      String(meta.oldAssignedBankerId ?? '') !== String(meta.newAssignedBankerId ?? '') &&
      (meta.oldAssignedBankerId != null || meta.newAssignedBankerId != null);
    if (staffChanged && !bankerChanged) {
      return meta.newAssignedStaffId ? 'Staff Assigned' : 'Staff Cleared';
    }
    if (bankerChanged && !staffChanged) {
      return meta.newAssignedBankerId ? 'Banker Assigned' : 'Banker Cleared';
    }
  }
  if (key === 'LEAD_ADVISOR_ASSIGNED') {
    const meta = normalizeMeta(metadata);
    if (String(meta.field || '') === 'parentAdvisorId') {
      return meta.newValue ? 'Parent Advisor Assigned' : 'Parent Advisor Cleared';
    }
    return meta.newValue ? 'Advisor Assigned' : 'Advisor Cleared';
  }
  return BELL_ACTION_LABELS[key] || key || 'Event';
}

/** Prefer Lead ID + role wording from metadata; fall back to stored description. */
export function formatBellDescription(notif: {
  action?: string;
  description?: string;
  leadId?: number | string | null;
  leadName?: string | null;
  metadata?: unknown;
}): string {
  const action = String(notif.action || '');
  const meta = normalizeMeta(notif.metadata);
  const who = leadLabel(meta, notif.leadId, notif.leadName);

  if (action === 'LEAD_ADVISOR_ASSIGNED') {
    const field = String(meta.field || '');
    const role =
      field === 'parentAdvisorId' ? 'Parent advisor' : 'Advisor';
    const assigned = meta.newValue != null && String(meta.newValue).trim() !== '';
    return assigned
      ? `${role} assigned to ${who}`
      : `${role} cleared on ${who}`;
  }

  if (action === 'LOAN_ASSIGNMENT_CHANGED') {
    const parts: string[] = [];
    const oldStaff = meta.oldAssignedStaffId;
    const newStaff = meta.newAssignedStaffId;
    const oldBanker = meta.oldAssignedBankerId;
    const newBanker = meta.newAssignedBankerId;
    if (String(oldStaff ?? '') !== String(newStaff ?? '')) {
      parts.push(
        newStaff != null && String(newStaff).trim() !== ''
          ? `Staff assigned to ${who}`
          : `Staff cleared on ${who}`
      );
    }
    if (String(oldBanker ?? '') !== String(newBanker ?? '')) {
      parts.push(
        newBanker != null && String(newBanker).trim() !== ''
          ? `Banker assigned to ${who}`
          : `Banker cleared on ${who}`
      );
    }
    if (parts.length) {
      return parts.join(' · ');
    }
    return `Assignment updated on ${who}`;
  }

  return String(notif.description || '').trim() || 'Activity update';
}
