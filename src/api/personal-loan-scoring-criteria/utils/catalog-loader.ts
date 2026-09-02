import { PlScoreErr, PlScoreError } from './error-codes';
import { isValidDigitKeyRulesMap } from './rules-map';
import type { ScoringCatalogRow, ScoreCriterionId } from './types';

const CATALOG_UID = 'api::lender-master.lender-scoring-criteria';

const CRITERION_ORDER: ScoreCriterionId[] = [
  'CIBIL_SCORE',
  'FOIR_CHECK',
  'DPD_LAST_3M',
  'DPD_LAST_12M',
  'CC_UTILIZATION',
  'ACTIVE_UNSECURED',
  'ENQUIRIES_3M',
  'MONTHLY_INCOME',
  'JOB_EXPERIENCE',
  'ROI_COMPETITIVENESS',
  'MAX_LOAN_ADEQUACY',
];

function mapRow(raw: any): ScoringCatalogRow {
  return {
    id: raw.id,
    criterionCode: raw.criterionCode ?? raw.criterion_code,
    criterionName: raw.criterionName ?? raw.criterion_name,
    category: raw.category,
    loanType: raw.loanType ?? raw.loan_type,
    weight: Number(raw.weight),
    ruleType: raw.ruleType ?? raw.rule_type,
    rules: raw.rules ?? null,
    isActive: raw.isActive ?? raw.is_active ?? true,
  };
}

function validateCatalogRow(row: ScoringCatalogRow): void {
  if (row.ruleType === 'FORMULA' && row.rules != null) {
    throw new PlScoreError(
      PlScoreErr.INVALID_RULES_SHAPE,
      `FORMULA criterion ${row.criterionCode} must have null rules`,
      500,
      { criterionCode: row.criterionCode }
    );
  }
  if (
    (row.ruleType === 'JSON' || row.ruleType === 'JSON+FORMULA') &&
    !isValidDigitKeyRulesMap(row.rules)
  ) {
    throw new PlScoreError(
      PlScoreErr.INVALID_RULES_SHAPE,
      `Invalid rules map for ${row.criterionCode}`,
      500,
      { criterionCode: row.criterionCode }
    );
  }
}

export async function loadActiveCatalog(
  strapi: any,
  loanType = 'Personal Loan'
): Promise<ScoringCatalogRow[]> {
  let rows: any[];
  try {
    rows = await strapi.db.query(CATALOG_UID).findMany({
      where: { isActive: true, loanType },
      orderBy: { id: 'asc' },
    });
  } catch (err: any) {
    throw new PlScoreError(
      PlScoreErr.BLOCKED,
      'Failed to load scoring catalog',
      500,
      { reason: err?.message }
    );
  }

  if (!rows?.length) {
    throw new PlScoreError(
      PlScoreErr.BLOCKED,
      'No active scoring criteria for loan type',
      500,
      { loanType }
    );
  }

  const mapped = rows.map(mapRow);
  for (const row of mapped) {
    validateCatalogRow(row);
  }

  const weightSum = mapped.reduce((s, r) => s + Number(r.weight), 0);
  if (Math.abs(weightSum - 100) > 0.01) {
    throw new PlScoreError(
      PlScoreErr.BLOCKED,
      `Active catalog weights must sum to 100.00 (got ${weightSum})`,
      500,
      { loanType, weightSum }
    );
  }

  const byCode = new Map(mapped.map((r) => [r.criterionCode, r]));
  const ordered: ScoringCatalogRow[] = [];
  for (const code of CRITERION_ORDER) {
    const row = byCode.get(code);
    if (row) ordered.push(row);
  }
  for (const row of mapped) {
    if (!CRITERION_ORDER.includes(row.criterionCode)) {
      ordered.push(row);
    }
  }

  return ordered;
}

export { CRITERION_ORDER };
