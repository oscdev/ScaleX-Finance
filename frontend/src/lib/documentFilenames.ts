/** Browser-safe mirror of src/shared/loan-form/document-filenames.ts */

export const MULTI_FILE_DOCUMENT_FIELDS = new Set([
  'salarySlips',
  'otherDocs',
  'businessRegProofDoc',
]);

export const FIELD_DOCUMENT_BASENAMES: Record<string, string> = {
  panCard: 'pan',
  cibilReport: 'cibil_report',
  aadharCardFront: 'aadhaar_front',
  aadharCardBack: 'aadhaar_back',
  bankStatement: 'bank_statement',
  proprietorshipDoc: 'business_type',
  auditedBooksDoc: 'audited_books',
  propertyPapers: 'property_papers',
  coAppPan: 'co_app_pan',
  coAppAadharFront: 'co_app_aadhaar_front',
  coAppAadharBack: 'co_app_aadhaar_back',
  itrYear1: 'itr_year_1',
  itrYear2: 'itr_year_2',
  itrYear3: 'itr_year_3',
  salarySlips: 'salary_slip',
  otherDocs: 'other_document',
  businessRegProofDoc: 'business_reg_proof',
};

const FIELD_LEGACY_FILENAME_PATTERNS: Record<string, RegExp[]> = {
  panCard: [/^pan\s*card(\.[^.]+)?$/i],
  aadharCardFront: [/^aadha?r\s*card\s*front(\.[^.]+)?$/i],
  aadharCardBack: [/^aadha?r\s*card\s*back(\.[^.]+)?$/i],
  bankStatement: [/^bank\s*statement(\.[^.]+)?$/i],
  cibilReport: [/^cibil\s*report(\.[^.]+)?$/i],
};

const MIME_TO_EXT: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
};

export function extFromMime(mime?: string | null): string | null {
  if (!mime) return null;
  const normalized = mime.toLowerCase().split(';')[0].trim();
  return MIME_TO_EXT[normalized] ?? null;
}

export function normalizeExtension(ext: string): string {
  const lower = ext.toLowerCase();
  if (lower === '.jpeg') return '.jpg';
  return lower.startsWith('.') ? lower : `.${lower}`;
}

export function combineUploadName(
  name?: string | null,
  ext?: string | null,
  mime?: string | null
): string {
  const baseName = String(name ?? '').trim() || 'file';
  if (baseName.includes('.')) return baseName;

  if (ext) {
    const extPart = normalizeExtension(ext.startsWith('.') ? ext : `.${ext}`);
    return `${baseName}${extPart}`;
  }

  const mimeExt = extFromMime(mime);
  return mimeExt ? `${baseName}${mimeExt}` : baseName;
}

function extFromDocumentFilename(name: string, fallback = '.pdf'): string {
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot === name.length - 1) return fallback;
  return normalizeExtension(name.slice(dot));
}

function resolveDocumentExtension(
  originalName: string,
  mime?: string | null,
  fallback = '.pdf'
): string {
  const mimeExt = extFromMime(mime);
  if (mimeExt) return mimeExt;
  return extFromDocumentFilename(originalName, fallback);
}

function basename(name: string): string {
  const parts = name.split(/[/\\]/);
  return parts[parts.length - 1] || name;
}

export function isSingleFileDocumentField(fieldKey?: string): boolean {
  if (!fieldKey) return false;
  if (MULTI_FILE_DOCUMENT_FIELDS.has(fieldKey)) return false;
  return Boolean(FIELD_DOCUMENT_BASENAMES[fieldKey]);
}

export function fieldBasenamePrefix(fieldKey: string): string | null {
  return FIELD_DOCUMENT_BASENAMES[fieldKey] ?? null;
}

export function fieldBasenameFilenameRegex(fieldKey: string): RegExp | null {
  const prefix = fieldBasenamePrefix(fieldKey);
  if (!prefix) return null;
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped}(\\.[^.]+)?$`, 'i');
}

export function fieldNumberedBasenameFilenameRegex(fieldKey: string): RegExp | null {
  const prefix = fieldBasenamePrefix(fieldKey);
  if (!prefix) return null;
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped}_\\d+(\\.[^.]+)?$`, 'i');
}

export function fieldCleanupFilenamePatterns(fieldKey: string): RegExp[] {
  const patterns: RegExp[] = [];
  const canonical = fieldBasenameFilenameRegex(fieldKey);
  if (canonical) patterns.push(canonical);
  const numbered = fieldNumberedBasenameFilenameRegex(fieldKey);
  if (numbered) patterns.push(numbered);
  const legacy = FIELD_LEGACY_FILENAME_PATTERNS[fieldKey];
  if (legacy) patterns.push(...legacy);
  return patterns;
}

export function matchesFieldCleanupFilename(fieldKey: string, filename: string): boolean {
  return fieldCleanupFilenamePatterns(fieldKey).some((pattern) => pattern.test(filename));
}

export function resolveCanonicalDocumentFilename(
  fieldKey: string | undefined,
  originalName: string,
  multiIndex?: number,
  mime?: string | null
): string | null {
  if (!fieldKey) return null;
  const base = FIELD_DOCUMENT_BASENAMES[fieldKey];
  if (!base) return null;

  const ext = resolveDocumentExtension(originalName, mime);
  const fileBase = basename(originalName);

  if (fieldKey === 'businessRegProofDoc') {
    if (fileBase.toLowerCase().startsWith('business_reg_proof_')) {
      return fileBase;
    }
    if (multiIndex != null && multiIndex > 0) {
      return `${base}_${multiIndex}${ext}`;
    }
  }

  if (MULTI_FILE_DOCUMENT_FIELDS.has(fieldKey)) {
    const idx = multiIndex != null && multiIndex > 0 ? multiIndex : 1;
    return `${base}_${idx}${ext}`;
  }

  return `${base}${ext}`;
}

export function resolveRegProofDocumentFilename(
  proofType: string,
  originalName: string,
  mime?: string | null
): string {
  const slug = String(proofType)
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
  const ext = resolveDocumentExtension(originalName, mime);
  return `business_reg_proof_${slug || 'unknown'}${ext}`;
}

export function renameFileForDocumentField(
  file: File,
  fieldKey: string,
  multiIndex?: number
): File {
  const canonical = resolveCanonicalDocumentFilename(
    fieldKey,
    file.name,
    multiIndex,
    file.type
  );
  if (!canonical || file.name === canonical) return file;
  return new File([file], canonical, { type: file.type, lastModified: file.lastModified });
}

export function renameRegProofDocumentFile(proofType: string, file: File): File {
  const canonical = resolveRegProofDocumentFilename(proofType, file.name, file.type);
  if (file.name === canonical) return file;
  return new File([file], canonical, { type: file.type, lastModified: file.lastModified });
}
