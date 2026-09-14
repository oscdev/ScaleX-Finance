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

const EXT_TO_MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export function extFromMime(mime?: string | null): string | null {
  if (!mime) return null;
  const normalized = mime.toLowerCase().split(';')[0].trim();
  return MIME_TO_EXT[normalized] ?? null;
}

/** Infer MIME from a filename extension when `File.type` is empty. */
export function mimeFromFilename(name?: string | null): string | null {
  if (!name) return null;
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot === name.length - 1) return null;
  const ext = normalizeExtension(name.slice(dot));
  return EXT_TO_MIME[ext] ?? null;
}

/**
 * Blob URL for local Docs-step preview. Ensures a Content-Type so Chrome’s
 * PDF/image viewers can render the file (empty `File.type` otherwise fails).
 */
export function createDocumentPreviewUrl(file: File | Blob, fileName?: string): string {
  const name = fileName || (file instanceof File ? file.name : '');
  const type =
    (file.type && file.type.trim()) ||
    mimeFromFilename(name) ||
    'application/octet-stream';
  if (file.type === type) return URL.createObjectURL(file);
  return URL.createObjectURL(new Blob([file], { type }));
}

export function isImageMimeOrFormat(mimeOrFormat?: string | null): boolean {
  const v = String(mimeOrFormat || '').toLowerCase();
  return (
    v.startsWith('image/') ||
    v === 'png' ||
    v === 'jpg' ||
    v === 'jpeg' ||
    v === 'gif' ||
    v === 'webp'
  );
}

export function isPdfMimeOrFormat(mimeOrFormat?: string | null): boolean {
  const v = String(mimeOrFormat || '').toLowerCase();
  return v === 'application/pdf' || v === 'pdf' || v.includes('pdf');
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Open a staged document in a new tab.
 * Opens the window synchronously (keeps the user-gesture), then writes an
 * embed/image page with a freshly typed blob — Chrome’s PDF plugin often fails
 * on bare `location = blob:` navigation.
 */
export async function openDocumentInNewTab(options: {
  file?: File | Blob | null;
  previewUrl?: string | null;
  fileName?: string | null;
  format?: string | null;
}): Promise<void> {
  if (typeof window === 'undefined') return;

  const file = options.file;
  const name =
    options.fileName ||
    (file instanceof File ? file.name : '') ||
    (options.format ? `document.${String(options.format).toLowerCase()}` : 'document');

  // Must open synchronously inside the click handler or the popup is blocked.
  const win = window.open('', '_blank');

  const resolveBlob = async (): Promise<Blob | null> => {
    const toTypedBlob = async (source: Blob): Promise<Blob> => {
      const buf = await source.arrayBuffer();
      const bytes = new Uint8Array(buf.slice(0, 8));
      const asText = String.fromCharCode(...bytes);
      const looksPdf = asText.startsWith('%PDF');
      const looksPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
      const looksJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
      const looksGif = asText.startsWith('GIF8');
      const looksWebp = asText.startsWith('RIFF') && buf.byteLength >= 12;

      let type =
        (source.type && source.type.trim()) ||
        mimeFromFilename(name) ||
        (isPdfMimeOrFormat(options.format) || isPdfMimeOrFormat(name)
          ? 'application/pdf'
          : null) ||
        'application/octet-stream';

      // Prefer real file magic over wrong extension / empty MIME
      if (looksPdf) type = 'application/pdf';
      else if (looksPng) type = 'image/png';
      else if (looksJpeg) type = 'image/jpeg';
      else if (looksGif) type = 'image/gif';
      else if (looksWebp) type = 'image/webp';

      return new Blob([buf], { type });
    };

    if (file instanceof Blob) {
      return toTypedBlob(file);
    }
    if (options.previewUrl) {
      const res = await fetch(options.previewUrl);
      if (!res.ok) return null;
      return toTypedBlob(await res.blob());
    }
    return null;
  };

  try {
    if (win) {
      win.document.write(
        '<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Loading…</title></head>' +
          '<body style="font-family:sans-serif;padding:2rem;color:#334155">Loading document…</body></html>'
      );
    }

    const blob = await resolveBlob();
    if (!blob) {
      if (win) {
        win.document.open();
        win.document.write(
          '<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem">Unable to open document.</body></html>'
        );
        win.document.close();
      }
      return;
    }

    const url = URL.createObjectURL(blob);
    const title = escapeHtmlAttr(name);
    const isPdf =
      isPdfMimeOrFormat(blob.type) ||
      isPdfMimeOrFormat(options.format) ||
      isPdfMimeOrFormat(name);
    const isImage = isImageMimeOrFormat(blob.type) || isImageMimeOrFormat(options.format);

    if (!win) {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }

    win.document.open();
    if (isPdf) {
      win.document.write(
        `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title>` +
          `<style>html,body{margin:0;height:100%;background:#525659}iframe{border:0;width:100%;height:100%}</style></head>` +
          `<body><iframe src="${url}" title="${title}"></iframe></body></html>`
      );
    } else if (isImage) {
      win.document.write(
        `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title>` +
          `<style>html,body{margin:0;min-height:100%;display:flex;align-items:center;justify-content:center;background:#111}` +
          `img{max-width:100%;max-height:100vh;object-fit:contain}</style></head>` +
          `<body><img src="${url}" alt="${title}" /></body></html>`
      );
    } else {
      win.location.href = url;
      return;
    }
    win.document.close();
  } catch {
    if (win && !win.closed) {
      try {
        win.document.open();
        win.document.write(
          '<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem">Failed to open document.</body></html>'
        );
        win.document.close();
      } catch {
        /* ignore */
      }
    }
  }
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
