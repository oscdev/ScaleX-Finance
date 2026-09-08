/**
 * Strapi HTTP helpers for the Automation Suite.
 * GET helpers are always safe. Write helpers (create/upload/extract) are for Live Run only.
 */

import axios from 'axios';
import FormData from 'form-data';
import fs from 'node:fs';
import path from 'node:path';

const client = axios.create({
  timeout: 120000,
  validateStatus: () => true,
  maxBodyLength: Infinity,
  maxContentLength: Infinity,
});

export function getStrapiUrl() {
  return (process.env.STRAPI_URL || 'http://127.0.0.1:1337').replace(/\/$/, '');
}

function redactBody(body) {
  if (body == null) return body;
  if (typeof body !== 'object') return body;
  const clone = JSON.parse(JSON.stringify(body));
  const walk = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    for (const k of Object.keys(obj)) {
      const key = k.toLowerCase();
      if (key.includes('pan') || key.includes('aadhar') || key.includes('aadhaar')) {
        obj[k] = typeof obj[k] === 'string' ? '****' : obj[k];
      } else if (typeof obj[k] === 'object') walk(obj[k]);
    }
  };
  walk(clone);
  return clone;
}

/**
 * @param {Array} capture — push { method, url, status, ms, request, response, error? }
 */
export async function capturedRequest(capture, { method, url, data, headers, params, label }) {
  const started = Date.now();
  const entry = {
    label: label || `${method} ${url}`,
    method,
    url,
    request: redactBody(data) ?? (params ? { params } : null),
    status: null,
    ms: null,
    response: null,
    error: null,
  };
  try {
    const res = await client.request({ method, url, data, headers, params });
    entry.status = res.status;
    entry.ms = Date.now() - started;
    entry.response = redactBody(res.data);
    if (capture) capture.push(entry);
    return res;
  } catch (err) {
    entry.ms = Date.now() - started;
    entry.error = err.message;
    if (capture) capture.push(entry);
    throw err;
  }
}

export async function checkStrapiReachable() {
  const base = getStrapiUrl();
  for (const p of ['/_health', '/admin']) {
    try {
      const res = await client.get(`${base}${p}`, { maxRedirects: 0, timeout: 5000 });
      if (res.status > 0 && res.status < 500) return true;
    } catch {
      /* next */
    }
  }
  return false;
}

export async function getLoanType(leadId, capture) {
  const base = getStrapiUrl();
  const res = await capturedRequest(capture, {
    method: 'GET',
    url: `${base}/api/personal-loan-eligibility/loan-type`,
    params: { leadId: String(leadId) },
    label: 'GET loan-type',
  });
  if (res.status >= 400) {
    throw new Error(res.data?.error?.message || res.data?.error?.code || `loan-type ${res.status}`);
  }
  return res.data;
}

export async function getMatchedLenders(leadId, productApiPath, capture, options = {}) {
  const base = getStrapiUrl();
  const pathPart = productApiPath.startsWith('/') ? productApiPath : `/${productApiPath}`;
  const source = options.source || 'ai-match';
  const res = await capturedRequest(capture, {
    method: 'GET',
    url: `${base}${pathPart}`,
    params: { leadId: String(leadId), source },
    label: `GET matched-lenders (source=${source})`,
  });
  if (res.status >= 400) {
    const msg =
      res.data?.error?.message ||
      res.data?.error?.code ||
      `matched-lenders failed (${res.status})`;
    throw new Error(String(msg));
  }
  return res.data;
}

/** Score one eligible lender (criteria + totalScore). Used when matched-lenders returns null scores. */
export async function scoreLender(leadId, lenderCode, scoreApi, capture) {
  const base = getStrapiUrl();
  const pathPart = scoreApi.startsWith('/') ? scoreApi : `/${scoreApi}`;
  const res = await capturedRequest(capture, {
    method: 'POST',
    url: `${base}${pathPart}`,
    data: { leadId: Number(leadId), lenderCode: String(lenderCode) },
    headers: { 'Content-Type': 'application/json' },
    label: `POST score ${lenderCode}`,
  });
  if (res.status >= 400) {
    const msg =
      res.data?.error?.message ||
      res.data?.error?.code ||
      `score failed (${res.status})`;
    throw new Error(String(msg));
  }
  return res.data;
}

/**
 * Mirror docs to disk and append Document Details ADMIN_UPDATE rows
 * (same path as Lead View Add Document).
 */
export async function syncDocuments(
  { leadId, applicantName, loanApplicationId, fileIds, docType },
  capture
) {
  const base = getStrapiUrl();
  const body = {
    leadId: Number(leadId),
    applicantName: String(applicantName),
    fileIds: (fileIds || []).map((id) => Number(id)),
  };
  if (loanApplicationId != null) body.loanApplicationId = Number(loanApplicationId);
  if (docType) body.docType = String(docType);
  const res = await capturedRequest(capture, {
    method: 'POST',
    url: `${base}/api/loan-applications/sync-documents`,
    data: body,
    headers: { 'Content-Type': 'application/json' },
    label: `POST sync-documents (${docType || 'files'})`,
  });
  if (res.status >= 400) {
    throw new Error(
      res.data?.error?.message ||
        res.data?.message ||
        JSON.stringify(res.data?.error || res.data) ||
        `sync-documents ${res.status}`
    );
  }
  return res.data;
}

export async function createLead(data, capture) {
  const base = getStrapiUrl();
  const res = await capturedRequest(capture, {
    method: 'POST',
    url: `${base}/api/leads`,
    data: { data },
    headers: { 'Content-Type': 'application/json' },
    label: 'POST /api/leads',
  });
  if (res.status >= 400) {
    throw new Error(
      res.data?.error?.message ||
        JSON.stringify(res.data?.error || res.data) ||
        `create lead ${res.status}`
    );
  }
  const id = res.data?.data?.id ?? res.data?.data?.documentId;
  if (id == null) throw new Error('Lead create succeeded but no id in response');
  return { id: Number(id) || id, raw: res.data };
}

export async function createLoanApplication(data, capture) {
  const base = getStrapiUrl();
  const res = await capturedRequest(capture, {
    method: 'POST',
    url: `${base}/api/loan-applications`,
    data: { data },
    headers: { 'Content-Type': 'application/json' },
    label: 'POST /api/loan-applications',
  });
  if (res.status >= 400) {
    const msg =
      res.data?.error?.message ||
      (Array.isArray(res.data?.error?.details?.errors)
        ? res.data.error.details.errors.map((e) => e.message).join('; ')
        : null) ||
      JSON.stringify(res.data?.error || res.data) ||
      `create loan-app ${res.status}`;
    throw new Error(String(msg));
  }
  const id = res.data?.data?.id ?? res.data?.data?.documentId;
  return { id: Number(id) || id, raw: res.data };
}

export async function uploadFile(filePath, capture) {
  const base = getStrapiUrl();
  const form = new FormData();
  form.append('files', fs.createReadStream(filePath), {
    filename: path.basename(filePath),
  });
  const res = await capturedRequest(capture, {
    method: 'POST',
    url: `${base}/api/upload`,
    data: form,
    headers: form.getHeaders(),
    label: `POST /api/upload (${path.basename(filePath)})`,
  });
  if (res.status >= 400) {
    throw new Error(
      res.data?.error?.message || JSON.stringify(res.data) || `upload ${res.status}`
    );
  }
  const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
  const id = list[0]?.id;
  if (id == null) throw new Error(`Upload returned no file id for ${filePath}`);
  return { id: Number(id), name: list[0]?.name || path.basename(filePath), raw: res.data };
}

export async function extractBureau({ leadId, leadName, loanApplicationId }, capture) {
  const base = getStrapiUrl();
  const body = {
    leadId: Number(leadId),
    leadName: String(leadName),
  };
  if (loanApplicationId != null) body.loanApplicationId = Number(loanApplicationId);
  const res = await capturedRequest(capture, {
    method: 'POST',
    url: `${base}/api/cibil-report-summaries/extract`,
    data: body,
    headers: { 'Content-Type': 'application/json' },
    label: 'POST cibil-report-summaries/extract',
  });
  if (res.status >= 400) {
    throw new Error(res.data?.error?.message || res.data?.message || `extract ${res.status}`);
  }
  return res.data;
}

export async function getBureauSummary(leadId, capture) {
  const base = getStrapiUrl();
  const res = await capturedRequest(capture, {
    method: 'GET',
    url: `${base}/api/cibil-report-summaries`,
    params: { 'filters[leadId][$eq]': String(leadId) },
    label: 'GET cibil-report-summaries',
  });
  if (res.status === 403 || res.status === 401) {
    return { forbidden: true, data: null };
  }
  if (res.status >= 400) {
    return { forbidden: false, data: null, error: res.data };
  }
  const rows = res.data?.data || [];
  return { forbidden: false, data: rows[0] || null };
}
