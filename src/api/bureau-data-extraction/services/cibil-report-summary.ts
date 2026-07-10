import { factories } from '@strapi/strapi';
import fs from 'fs/promises';
import path from 'path';
import { runPython } from './python-bridge';

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
  loanApplicationId?: number;
  dataSource: DataSource;
  cibilData: Record<string, unknown>;
  salarySlipData: Record<string, unknown> | null;
};

type ExtractionParams = {
  leadId: number;
  leadName: string;
  loanApplicationId?: number;
  dataSource?: DataSource;
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
    loanApplicationId,
    dataSource,
    cibilData,
    salarySlipData,
  }: SaveParams) {
    const existing = await strapi.db.query(UID).findOne({ where: { leadId } });

    const data: Record<string, unknown> = {
      leadId,
      cibilData,
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
  }: ExtractionParams) {
    const extraction = await runPython(leadId, leadName, strapi.log);
    const { cibilData, salarySlipData } = await this.readExtractionOutputs();
    const database = await this.saveFromExtraction({
      leadId,
      loanApplicationId,
      dataSource,
      cibilData,
      salarySlipData,
    });

    return { extraction, database };
  },
}));
