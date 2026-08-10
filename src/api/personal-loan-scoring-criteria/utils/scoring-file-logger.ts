import {
  appendModuleLogIfEnabled,
  isCodeLevelLoggingEnabled,
  resetModuleLeadLog,
} from '../../../utils/code-file-logger';
import type { CriterionScoreResult, LenderScoreResult, RankResult } from './types';

const MODULE = 'pl-scoring';

export interface ScoringRunLogger {
  runId: string;
  leadId: number;
  writeHeader(loanType: string): void;
  writeLenderBlock(result: LenderScoreResult): void;
  writeRankSummary(rank: RankResult): void;
  writeRunDone(scored: number, displayed: number): void;
  writeBlocked(code: string, message: string): void;
}

function formatCriterionScoresInline(
  scores: Partial<Record<string, number>> | undefined
): string {
  if (!scores || !Object.keys(scores).length) return '';
  const parts = Object.entries(scores).map(([id, pts]) => `${id}:${pts}`);
  return ` [${parts.join(', ')}]`;
}

function formatLenderWithScores(l: LenderScoreResult): string {
  return `${l.lenderCode}(${l.totalScore})${formatCriterionScoresInline(l.summary.criterionScores)}`;
}

export async function createScoringRunLogger(
  runId: string,
  leadId: number,
  leadName: string | null | undefined,
  strapi?: any,
  opts?: { overwriteLeadLog?: boolean }
): Promise<ScoringRunLogger> {
  const enabled = await isCodeLevelLoggingEnabled(strapi);
  const overwriteLeadLog = opts?.overwriteLeadLog ?? false;
  const leadCtx = () => ({ leadId, leadName });
  let didReset = false;
  const maybeReset = () => {
    if (overwriteLeadLog && !didReset) {
      resetModuleLeadLog(MODULE, leadCtx());
      didReset = true;
    }
  };
  const appendText = (text: string) =>
    appendModuleLogIfEnabled(MODULE, text, enabled, leadCtx());

  return {
    runId,
    leadId,

    writeHeader(loanType: string) {
      maybeReset();
      const lines = [
        `leadId: ${leadId}`,
        `runId: ${runId.slice(0, 8)}`,
        `loanType: ${loanType}`,
        'phase: SCORING → RANK',
        '---',
      ];
      appendText(lines.join('\n'));
    },

    writeLenderBlock(result: LenderScoreResult) {
      const body = {
        lenderCode: result.lenderCode,
        loanType: 'Personal Loan',
        totalScore: result.totalScore,
        criteria: result.criteria.map(shapeCriterionForLog),
        summary: result.summary,
      };
      appendText(`lender = ${result.lenderCode} ${JSON.stringify(body, null, 2)}`);
      appendText('---');
    },

    writeRankSummary(rank: RankResult) {
      const scored = rank.displayed.concat(rank.belowThreshold);
      const scoredCodes = scored.map((l) => l.lenderCode).join(', ');
      const displayed = rank.displayed.map((l) => formatLenderWithScores(l)).join('; ');

      const lines = [
        'CRITERION_SUMMARY (this run):',
        `  lenders scored: ${scoredCodes || '(none)'}`,
        `  DISPLAYED (>=${rank.minDisplayScore}): ${displayed || '(none)'}`,
        '',
      ];
      appendText(lines.join('\n'));
    },

    writeRunDone(scored: number, displayed: number) {
      appendText(`RUN_DONE: scored=${scored} displayed=${displayed}`);
    },

    writeBlocked(code: string, message: string) {
      maybeReset();
      appendText(`RUN_BLOCKED: ${code} — ${message}`);
    },
  };
}

function shapeCriterionForLog(c: CriterionScoreResult) {
  return {
    criterionId: c.criterionId,
    phase: c.phase,
    result: c.result,
    ruleType: c.ruleType ?? null,
    formula: c.formula ?? null,
    rules: c.rules ?? null,
    matchedKey: c.matchedKey ?? null,
    applicant: c.applicant ?? null,
    threshold: c.threshold ?? null,
    weight: c.weight,
    points: c.points,
    errorCode: c.errorCode ?? null,
  };
}
