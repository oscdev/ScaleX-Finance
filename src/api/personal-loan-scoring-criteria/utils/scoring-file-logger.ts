import {
  appendModuleLogIfEnabled,
  isCodeLevelLoggingEnabled,
  resetModuleLeadLog,
  resolveLoanTypeForLead,
  scoringLogModule,
} from '../../../utils/code-file-logger';
import { buildScoringLenderSummary, formatLenderCriterionSummaryLines } from '../../../utils/lender-run-log-summary';
import type { CriterionScoreResult, LenderScoreResult, RankResult } from './types';

export interface ScoringRunLogger {
  runId: string;
  leadId: number;
  writeHeader(loanType: string): void;
  writeLenderBlock(result: LenderScoreResult): void;
  writeRankSummary(rank: RankResult): void;
  writeRunDone(scored: number, displayed: number): void;
  writeBlocked(code: string, message: string): void;
}

export async function createScoringRunLogger(
  runId: string,
  leadId: number,
  leadName: string | null | undefined,
  strapi?: any,
  opts?: { overwriteLeadLog?: boolean; loanType?: string | null }
): Promise<ScoringRunLogger> {
  const enabled = await isCodeLevelLoggingEnabled(strapi);
  const overwriteLeadLog = opts?.overwriteLeadLog ?? false;
  const loanType = await resolveLoanTypeForLead(strapi, leadId, {
    loanType: opts?.loanType,
  });
  const moduleName = scoringLogModule(loanType);
  const leadCtx = () => ({ leadId, leadName });
  let didReset = false;
  const maybeReset = () => {
    if (overwriteLeadLog && !didReset) {
      resetModuleLeadLog(moduleName, leadCtx());
      didReset = true;
    }
  };
  const appendText = (text: string) =>
    appendModuleLogIfEnabled(moduleName, text, enabled, leadCtx());

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
        loanType,
        totalScore: result.totalScore,
        criteria: result.criteria.map(shapeCriterionForLog),
        summary: result.summary,
      };
      appendText(`lender = ${result.lenderCode} ${JSON.stringify(body, null, 2)}`);
      appendText(
        formatLenderCriterionSummaryLines({
          lenderCode: result.lenderCode,
          lenderName: result.lenderName,
          summary: result.summary,
        }).join('\n')
      );
      appendText('---');
    },

    writeRankSummary(rank: RankResult) {
      const scored = rank.displayed.concat(rank.belowThreshold);
      appendText(
        buildScoringLenderSummary(
          scored.map((l) => ({
            lenderCode: l.lenderCode,
            lenderName: l.lenderName,
            totalScore: l.totalScore,
            rank: l.rank,
            displayed: l.displayed,
            summary: l.summary,
          })),
          rank.minDisplayScore
        )
      );
      appendText('');
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
