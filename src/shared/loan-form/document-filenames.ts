/** Fields that allow multiple files — basename gets `_1`, `_2`, … suffix. */
export const MULTI_FILE_DOCUMENT_FIELDS = new Set([
  'salarySlips',
  'otherDocs',
  'businessRegProofDoc',
]);

/**
 * Canonical disk / Media Library basename (no extension) per loan-app media field.
 * Aligned with PL_LeadSubmittionScript DOCUMENT_MAP where applicable.
 */
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

/** Legacy ML / disk names from pre-canonical uploads (display labels, etc.). */
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

/** Build a full filename when Strapi stores name and ext separately. */
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

export function extFromDocumentFilename(name: string, fallback = '.pdf'): string {
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

function basenameFromFilename(name: string): string {
  const parts = name.split(/[/\\]/);
  return parts[parts.length - 1] || name;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function isSingleFileDocumentField(fieldKey?: string): boolean {
  if (!fieldKey) return false;
  if (MULTI_FILE_DOCUMENT_FIELDS.has(fieldKey)) return false;
  return Boolean(FIELD_DOCUMENT_BASENAMES[fieldKey]);
}

export function fieldBasenamePrefix(fieldKey: string): string | null {
  return FIELD_DOCUMENT_BASENAMES[fieldKey] ?? null;
}

/** Match single-file field filenames like pan.jpg, pan.pdf — not pan_extra.pdf */
export function fieldBasenameFilenameRegex(fieldKey: string): RegExp | null {
  const prefix = fieldBasenamePrefix(fieldKey);
  if (!prefix) return null;
  return new RegExp(`^${escapeRegExp(prefix)}(\\.[^.]+)?$`, 'i');
}

/** Match Strapi ML conflict suffixes: pan_1.jpg, pan_2.png */
export function fieldNumberedBasenameFilenameRegex(fieldKey: string): RegExp | null {
  const prefix = fieldBasenamePrefix(fieldKey);
  if (!prefix) return null;
  return new RegExp(`^${escapeRegExp(prefix)}_\\d+(\\.[^.]+)?$`, 'i');
}

/** All filename patterns that should be removed on single-file field re-upload. */
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

/** True for canonical slot only (pan.jpg) — not numbered archives (pan_1.jpg). */
export function isCanonicalFieldSlotFilename(fieldKey: string, filename: string): boolean {
  const canonical = fieldBasenameFilenameRegex(fieldKey);
  if (!canonical?.test(filename)) return false;
  return !fieldNumberedBasenameFilenameRegex(fieldKey)?.test(filename);
}

export function parseFieldArchiveIndex(fieldKey: string, filename: string): number | null {
  const numbered = fieldNumberedBasenameFilenameRegex(fieldKey);
  if (!numbered) return null;
  const prefix = fieldBasenamePrefix(fieldKey);
  if (!prefix) return null;
  const re = new RegExp(`^${escapeRegExp(prefix)}_(\\d+)(?:\\.[^.]+)?$`, 'i');
  const match = filename.match(re);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Next archive name when moving pan.jpg → pan_1.jpg, pan_2.jpg, … */
export function resolveNextFieldArchiveFilename(
  fieldKey: string,
  sourceFilename: string,
  existingNames: string[]
): string | null {
  const prefix = fieldBasenamePrefix(fieldKey);
  if (!prefix) return null;

  const ext = extFromDocumentFilename(sourceFilename, '');
  const dotExt = ext || '';

  let maxN = 0;
  for (const name of existingNames) {
    const idx = parseFieldArchiveIndex(fieldKey, name);
    if (idx != null) maxN = Math.max(maxN, idx);
  }

  return `${prefix}_${maxN + 1}${dotExt}`;
}

/** Files occupying the canonical slot that should be archived on re-upload. */
export function shouldArchiveFieldOccupier(fieldKey: string, filename: string): boolean {
  if (fieldNumberedBasenameFilenameRegex(fieldKey)?.test(filename)) return false;
  return isCanonicalFieldSlotFilename(fieldKey, filename) || matchesFieldCleanupFilename(fieldKey, filename);
}

/**
 * Resolve canonical filename for a loan-app document field.
 * Returns null when fieldKey is unknown — caller should fall back to sanitized original name.
 */
export function resolveCanonicalDocumentFilename(
  fieldKey: string | undefined,
  originalName: string,
  multiIndex?: number,
  mime?: string | null
): string | null {
  if (!fieldKey) return null;

  const basename = FIELD_DOCUMENT_BASENAMES[fieldKey];
  if (!basename) return null;

  const ext = resolveDocumentExtension(originalName, mime);

  if (fieldKey === 'businessRegProofDoc') {
    const fileBase = basenameFromFilename(originalName);
    if (fileBase.toLowerCase().startsWith('business_reg_proof_')) {
      return fileBase;
    }
    if (multiIndex != null && multiIndex > 0) {
      return `${basename}_${multiIndex}${ext}`;
    }
  }

  if (MULTI_FILE_DOCUMENT_FIELDS.has(fieldKey)) {
    const idx = multiIndex != null && multiIndex > 0 ? multiIndex : 1;
    return `${basename}_${idx}${ext}`;
  }

  return `${basename}${ext}`;
}

/** Business Loan registration proof — one file per proof type. */
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

/** Rename a browser File before upload so ML + disk use the field canonical name. */
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
