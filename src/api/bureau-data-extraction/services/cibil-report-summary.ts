import { factories } from '@strapi/strapi';
import fs from 'fs/promises';
import path from 'path';
import { runPython } from './python-bridge';
import {
  buildCibilReportRelPath,
  getCibilPdfMtimeMs,
  withExtractionMeta,
} from '../../loan-application/services/queue-bureau-extraction';

const UID = 'api::bureau-data-extraction.cibil-report-summary';

const OUTPUT_DIR = path.join(
  process.cwd(),
  'src/api/bureau-data-extraction/integrations/python/pdf_extractor/data/outputs'
);

type DataSource =
  | 'MANUAL'
  | 'PDF_EXTRACTION'
  | 'CIBIL_API'
  | 'EXPERIAN'
  | 'EQUIFAX'
  | 'CRIF';

type SaveParams = {
  leadId: number;
  leadName?: string;
  loanApplicationId?: number;
  dataSource: DataSource;
  cibilData: Record<string, unknown>;
  salarySlipData: Record<string, unknown> | null;
  sourcePdfMtimeMs?: number;
  sourcePdfRelPath?: string;
};

type ExtractionParams = {
  leadId: number;
  leadName: string;
  loanApplicationId?: number;
  dataSource?: DataSource;
  loanType?: string | null;
};

export default factories.createCoreService(UID, ({ strapi }) => ({
  async readExtractionOutputs() {
    const cibilPath = path.join(OUTPUT_DIR, 'extracted_fields.json');
    const salaryPath = path.join(OUTPUT_DIR, 'salary_fields.json');

    const cibilData = JSON.parse(await fs.readFile(cibilPath, 'utf8'));

    let salarySlipData: Record<string, unknown> | null = null;
    try {
      salarySlipData = JSON.parse(await fs.readFile(salaryPath, 'utf8'));
    } catch {
      strapi.log.warn('[CIBIL] salary_fields.json missing; saving cibil data only');
    }

    return { cibilData, salarySlipData };
  },

  async saveFromExtraction({
    leadId,
    leadName,
    loanApplicationId,
    dataSource,
    cibilData,
    salarySlipData,
    sourcePdfMtimeMs,
    sourcePdfRelPath,
  }: SaveParams) {
    const existing = await strapi.db.query(UID).findOne({ where: { leadId } });

    let cibilPayload = cibilData;
    if (
      dataSource === 'PDF_EXTRACTION' &&
      sourcePdfMtimeMs != null &&
      sourcePdfRelPath
    ) {
      cibilPayload = withExtractionMeta(cibilData, {
        sourcePdfMtimeMs,
        sourcePdfRelPath,
      });
    }

    const data: Record<string, unknown> = {
      leadId,
      cibilData: cibilPayload,
      salarySlipData,
      dataSource,
    };

    if (loanApplicationId != null) {
      data.loanApplicationId = loanApplicationId;
    }

    if (existing) {
      return strapi.db.query(UID).update({
        where: { id: existing.id },
        data,
      });
    }

    return strapi.db.query(UID).create({ data });
  },

  async runExtraction({
    leadId,
    leadName,
    loanApplicationId,
    dataSource = 'PDF_EXTRACTION',
    loanType,
  }: ExtractionParams) {
    const extraction = await runPython(leadId, leadName, strapi.log, strapi, {
      loanApplicationId,
      loanType,
    });
    const { cibilData, salarySlipData } = await this.readExtractionOutputs();
    const pdfStats = await getCibilPdfMtimeMs(leadId, leadName);
    const database = await this.saveFromExtraction({
      leadId,
      leadName,
      loanApplicationId,
      dataSource,
      cibilData,
      salarySlipData,
      sourcePdfMtimeMs: pdfStats?.mtimeMs,
      sourcePdfRelPath: pdfStats?.relPath ?? buildCibilReportRelPath(leadId, leadName),
    });

    return { extraction, database };
  },
}));
