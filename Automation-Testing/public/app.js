(function () {
  /** Always prefer configured mount; pathname may be /suite or /suite/ or a report path. */
  function detectBasePath() {
    var p = window.location.pathname || '';
    if (p.indexOf('/suite') === 0) return '/suite';
    return '/suite';
  }

  var BASE = detectBasePath();
  var baseLabel = document.getElementById('basePathLabel');
  if (baseLabel) baseLabel.textContent = BASE;

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Prefer evaluation; else applicant vs threshold → result (disk logs often omit evaluation). */
  function formatStepCondition(s) {
    if (!s) return '';
    if (s.evaluation) return String(s.evaluation);
    var applicant = s.applicant != null ? s.applicant : s.applicantValue;
    if (applicant != null || s.threshold != null) {
      return (
        'applicant=' +
        JSON.stringify(applicant) +
        ' vs threshold=' +
        JSON.stringify(s.threshold) +
        ' → ' +
        (s.result || '')
      );
    }
    return '';
  }

  function formatStepReason(s) {
    if (!s) return '';
    var r = String(s.result || '').toUpperCase();
    if (r === 'FAIL' || r === 'SKIP') {
      return s.reason || s.errorCode || s.reasonDisplay || '—';
    }
    return s.reason || s.errorCode || s.reasonDisplay || '';
  }

  function setJsonPanelVisible(el, btn, show) {
    if (!el) return;
    if (show) {
      el.classList.remove('hidden');
      el.removeAttribute('hidden');
      el.style.display = 'block';
    } else {
      el.classList.add('hidden');
      el.setAttribute('hidden', '');
      el.style.display = 'none';
    }
    if (btn) btn.textContent = show ? 'Hide details' : 'Show details';
  }

  function lenderEligibilityJson(lender) {
    if (lender && lender.eligibility && typeof lender.eligibility === 'object') {
      return lender.eligibility;
    }
    var steps = (lender && (lender.fullSteps || lender.steps)) || [];
    return {
      lenderCode: lender && lender.code,
      lenderName: lender && lender.lenderName,
      eligible: lender && lender.eligible === true,
      failedAt: (lender && lender.failedAt) || null,
      errorCode: (lender && lender.errorCode) || null,
      rules: steps.map(function (s) {
        return {
          step: s.step,
          ruleId: s.ruleId,
          ruleName: s.ruleName,
          formula: s.formula,
          applicant: s.applicant != null ? s.applicant : s.applicantValue,
          threshold: s.threshold,
          result: s.result,
          reason: s.reason != null ? s.reason : null,
          errorCode: s.errorCode != null ? s.errorCode : null,
          evaluation: formatStepCondition(s) || null,
        };
      }),
    };
  }

  function api(path, opts) {
    return fetch(BASE + path, opts).then(function (r) {
      var ct = r.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        return r.text().then(function (t) {
          throw new Error(
            r.ok
              ? 'Unexpected non-JSON response'
              : 'HTTP ' +
                  r.status +
                  (t ? ': ' + t.replace(/<[^>]+>/g, ' ').trim().slice(0, 200) : '') +
                  (r.status === 502 || r.status === 504 || r.status === 500
                    ? ' — if Live Run was in progress, the proxy may have timed out; check reports/runs/{product}/ for a partial report'
                    : '')
          );
        });
      }
      return r.json().then(function (j) {
        if (r.status === 202 && j.accepted) return j;
        if (!r.ok) throw new Error(j.error || r.statusText || 'Request failed');
        return j;
      });
    });
  }

  var activeLiveRunId = null;

  function showLiveRunResult(res) {
    var out = document.getElementById('liveResult');
    if (!out) return;
    var ok = res.ok !== false;
    var entries = Array.isArray(res.entries) && res.entries.length ? res.entries : null;
    if (entries && entries.length > 1) {
      var items = entries
        .map(function (e) {
          var label = 'lead <strong>' + (e.leadId || '—') + '</strong>';
          if (e.cibilFile) label += ' · ' + e.cibilFile;
          var link = e.reportUrl
            ? ' — <a href="' + e.reportUrl + '" target="_blank" rel="noopener">Report</a>'
            : '';
          return '<li>' + (e.ok === false ? 'Issue' : 'OK') + ' · ' + label + link + '</li>';
        })
        .join('');
      out.innerHTML =
        (ok ? 'Completed' : 'Finished with issues') +
        ' · ' +
        entries.length +
        ' leads<ul class="live-batch-list">' +
        items +
        '</ul>';
      if (entries[0] && entries[0].reportUrl) window.open(entries[0].reportUrl, '_blank');
      clearLiveRunUploads();
      return;
    }
    var reportUrl = (entries && entries[0] && entries[0].reportUrl) || res.reportUrl;
    var leadId = (entries && entries[0] && entries[0].leadId) || res.leadId;
    out.innerHTML =
      (ok ? 'Completed' : 'Finished with issues') +
      ' · lead <strong>' +
      (leadId || '—') +
      '</strong> — <a href="' +
      reportUrl +
      '" target="_blank" rel="noopener">Open detailed report</a>';
    if (reportUrl) window.open(reportUrl, '_blank');
    clearLiveRunUploads();
  }

  function pollLiveRunStatus(runId, leadCount) {
    var attempts = 0;
    var count = Math.max(1, Number(leadCount) || 1);
    var maxAttempts = 200 * count;
    var timer = setInterval(function () {
      attempts += 1;
      api('/api/live-run/' + encodeURIComponent(runId))
        .then(function (st) {
          if (!st || st.status === 'running') {
            var outRun = document.getElementById('liveResult');
            if (outRun && st && st.progress) {
              outRun.textContent =
                'Live Run in progress (' +
                st.progress +
                ') — bureau may take a few minutes per lead';
            }
            if (attempts >= maxAttempts) {
              clearInterval(timer);
              activeLiveRunId = null;
              updateLiveRunEnabled();
              var out = document.getElementById('liveResult');
              if (out) {
                out.textContent =
                  'Still running (timed out waiting). Check reports/runs/' +
                  (st.product || 'personal-loan') +
                  '/';
              }
            }
            return;
          }
          clearInterval(timer);
          activeLiveRunId = null;
          updateLiveRunEnabled();
          if (st.status === 'failed') {
            var msg = st.error || 'Live Run failed';
            var outFail = document.getElementById('liveResult');
            if (outFail) outFail.textContent = msg;
            clearLiveRunUploads();
            alert(msg);
            return;
          }
          if (st.result) showLiveRunResult(st.result);
        })
        .catch(function () {
          if (attempts >= maxAttempts) {
            clearInterval(timer);
            activeLiveRunId = null;
            updateLiveRunEnabled();
          }
        });
    }, 3000);
  }

  function refreshHealth() {
    api('/api/health')
      .then(function (h) {
        var el = document.getElementById('strapiStatus');
        var banner = document.getElementById('offlineBanner');
        window.__strapiReachable = !!h.strapiReachable;
        if (!el) return;
        if (h.strapiReachable) {
          el.textContent = 'Strapi online';
          el.className = 'status-pill online';
          if (banner) banner.hidden = true;
        } else {
          el.textContent = 'Strapi offline — offline modes OK';
          el.className = 'status-pill offline';
          if (banner) banner.hidden = false;
        }
        updateLiveRunEnabled();
      })
      .catch(function (err) {
        window.__strapiReachable = false;
        updateLiveRunEnabled();
        var el = document.getElementById('strapiStatus');
        if (el) {
          el.textContent = 'Suite API error';
          el.className = 'status-pill offline';
          el.title = err.message || '';
        }
      });
  }

  function updateLiveRunEnabled() {
    var btn = document.getElementById('runLive');
    var box = document.getElementById('liveConfirm');
    if (!btn || !box) return;
    btn.disabled = !!(activeLiveRunId || !(window.__strapiReachable && box.checked));
  }

  function clearLiveRunUploads() {
    var csvEl = document.getElementById('liveCsv');
    var docsEl = document.getElementById('liveDocs');
    if (csvEl) csvEl.value = '';
    if (docsEl) docsEl.value = '';
  }

  function clearPipelineDocs() {
    var ul = document.getElementById('searchResults');
    var meta = document.getElementById('docsMeta');
    if (meta) meta.textContent = '';
    if (ul) ul.innerHTML = '';
    document.querySelectorAll('[data-docs-section]').forEach(function (b) {
      b.classList.remove('active');
    });
  }

  function loadPipelineDocs(section) {
    var productEl = document.getElementById('docsProduct');
    var product = productEl ? productEl.value : 'personal-loan';
    var ul = document.getElementById('searchResults');
    var meta = document.getElementById('docsMeta');
    if (meta) meta.textContent = 'Loading…';
    if (ul) ul.innerHTML = '';
    document.querySelectorAll('[data-docs-section]').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-docs-section') === section);
    });
    api(
      '/api/pipeline-docs?product=' +
        encodeURIComponent(product) +
        '&section=' +
        encodeURIComponent(section)
    )
      .then(function (res) {
        if (meta) {
          meta.textContent =
            (res.product || product) +
            ' · ' +
            (res.section || section) +
            ' · ' +
            (res.itemCount || (res.items || []).length) +
            ' items — click a row to expand; click the section button again to close';
        }
        if (!ul) return;
        ul.innerHTML =
          (res.items || [])
            .map(function (item) {
              return (
                '<li><details class="search-item">' +
                '<summary><span class="tag">' +
                escapeHtml(item.type || '') +
                '</span><strong>' +
                escapeHtml(item.title || '') +
                '</strong></summary>' +
                '<div class="muted small search-item-body">' +
                escapeHtml(item.description || '') +
                '</div></details></li>'
              );
            })
            .join('') || '<li class="muted">No items</li>';
      })
      .catch(function (err) {
        if (meta) meta.textContent = '';
        if (ul) {
          ul.innerHTML = '<li class="muted">' + escapeHtml(err.message) + '</li>';
        }
      });
  }

  /* —— Journey Demo: funnel checklist (mirrors funnel-fields.js) —— */
  var LEAD_FIELDS = [
    { key: 'fullName', label: 'Full Name' },
    { key: 'email', label: 'Email' },
    { key: 'mobileNumber', label: 'Mobile Number' },
    { key: 'requiredAmount', label: 'Required Amount' },
    { key: 'pinCode', label: 'Pincode' },
    { key: 'selectedProduct', label: 'Selected Product' },
    { key: 'aadharCard', label: 'Aadhaar' },
    { key: 'panCard', label: 'PAN' },
    { key: 'employmentType', label: 'Employment Type' },
    { key: 'leadType', label: 'Lead Type' },
  ];
  var FUNNEL_BY_LOAN_TYPE = {
    'Personal Loan': [
      {
        step: 'Personal',
        title: 'Personal Details',
        fields: [
          { section: 'personalDetails', key: 'dob', label: 'Date of Birth' },
          { section: 'personalDetails', key: 'maritalStatus', label: 'Marital Status' },
          { section: 'personalDetails', key: 'spouseName', label: 'Spouse Name' },
          { section: 'personalDetails', key: 'motherName', label: 'Mother Name' },
          { section: 'personalDetails', key: 'alternateNumber', label: 'Alternate Number' },
          { section: 'personalDetails', key: 'dependents', label: 'Dependents' },
        ],
      },
      {
        step: 'Residence',
        title: 'Residence Details',
        fields: [
          { section: 'addressDetails', key: 'line1', label: 'Address Line 1' },
          { section: 'addressDetails', key: 'line2', label: 'Address Line 2' },
          { section: 'addressDetails', key: 'landmark', label: 'Landmark' },
          { section: 'addressDetails', key: 'state', label: 'State' },
          { section: 'addressDetails', key: 'district', label: 'District' },
          { section: 'addressDetails', key: 'city', label: 'City' },
          { section: 'addressDetails', key: 'residenceType', label: 'Residence Type' },
        ],
      },
      {
        step: 'Income',
        title: 'Income Details',
        fields: [
          { section: 'incomeDetails', key: 'companyName', label: 'Company Name' },
          { section: 'incomeDetails', key: 'designation', label: 'Designation' },
          { section: 'incomeDetails', key: 'companyAddress', label: 'Company Address' },
          { section: 'incomeDetails', key: 'netSalary', label: 'Net Salary (Per Month)' },
          { section: 'incomeDetails', key: 'salaryMode', label: 'Salary Mode' },
          { section: 'incomeDetails', key: 'jobStability', label: 'Current Job Stability (Months)' },
          { section: 'incomeDetails', key: 'pfDeducted', label: 'PF Deducted' },
          { section: 'incomeDetails', key: 'hasOtherIncome', label: 'Other Income' },
          { section: 'incomeDetails', key: 'otherIncomeSource', label: 'Income Source' },
          { section: 'incomeDetails', key: 'otherIncomeAmount', label: 'Income Amount' },
        ],
      },
      {
        step: 'Other',
        title: 'Running Loan (If Any)',
        fields: [{ section: 'otherDetails', key: 'runningLoans', label: 'Running Loans' }],
      },
      { step: 'Docs', title: 'Documents', fields: [] },
    ],
    'Business Loan': [
      {
        step: 'Business',
        title: 'Business Details',
        fields: [
          { section: 'businessDetails', key: 'name', label: 'Business Name' },
          { section: 'businessDetails', key: 'premises', label: 'Business Premises' },
          { section: 'businessDetails', key: 'type', label: 'Business Type' },
          { section: 'businessDetails', key: 'turnover', label: 'Annual Turnover (Lakh)' },
          { section: 'businessDetails', key: 'age', label: 'Business Age (Years)' },
          { section: 'businessDetails', key: 'regProofs', label: 'Business Registration Proof' },
          { section: 'businessDetails', key: 'auditedBooks', label: 'Audited Books' },
          { section: 'businessDetails', key: 'address', label: 'Business Address' },
        ],
      },
      {
        step: 'Personal',
        title: 'Personal Details',
        fields: [
          { section: 'personalDetails', key: 'dob', label: 'Date of Birth' },
          { section: 'personalDetails', key: 'maritalStatus', label: 'Marital Status' },
          { section: 'personalDetails', key: 'spouseName', label: 'Spouse Name' },
          { section: 'personalDetails', key: 'motherName', label: 'Mother Name' },
          { section: 'personalDetails', key: 'alternateNumber', label: 'Alternate Number' },
        ],
      },
      {
        step: 'Residence',
        title: 'Residence Details',
        fields: [
          { section: 'addressDetails', key: 'line1', label: 'Address Line 1' },
          { section: 'addressDetails', key: 'line2', label: 'Address Line 2' },
          { section: 'addressDetails', key: 'landmark', label: 'Landmark' },
          { section: 'addressDetails', key: 'state', label: 'State' },
          { section: 'addressDetails', key: 'district', label: 'District' },
          { section: 'addressDetails', key: 'city', label: 'City' },
          { section: 'addressDetails', key: 'residenceType', label: 'Residence Type' },
        ],
      },
      {
        step: 'Other',
        title: 'Running Loan (If Any)',
        fields: [{ section: 'otherDetails', key: 'runningLoans', label: 'Running Loans' }],
      },
      { step: 'Docs', title: 'Documents', fields: [] },
    ],
  };

  var journeyEligLenders = [];
  var journeyScoreLenders = [];

  /** Same PASS/FAIL rule as Live Run report.html */
  function journeyLenderIsEligible(lender) {
    return lender && lender.eligible === true;
  }

  function normalizeJourneyEligLenders(list) {
    return (list || []).map(function (l) {
      var steps = l.fullSteps || l.steps || [];
      var stepFail = steps.some(function (s) {
        return String(s.result || '').toUpperCase() === 'FAIL';
      });
      var eligible = !(stepFail || l.failedAt) && l.eligible === true;
      return Object.assign({}, l, { eligible: eligible });
    });
  }

  function fillJourneyEligSelect(preferredCode) {
    var sel = document.getElementById('demo-elig-lender');
    var filter = document.getElementById('demo-elig-filter');
    if (!sel) return;
    var mode = filter ? filter.value : 'all';
    var pass = journeyEligLenders.filter(journeyLenderIsEligible);
    var fail = journeyEligLenders.filter(function (l) {
      return !journeyLenderIsEligible(l);
    });
    var list =
      mode === 'pass'
        ? pass
        : mode === 'fail'
          ? fail
          : journeyEligLenders.slice().sort(function (a, b) {
              return (
                Number(journeyLenderIsEligible(b)) - Number(journeyLenderIsEligible(a)) ||
                String(a.code).localeCompare(String(b.code))
              );
            });

    function opt(l) {
      var ok = journeyLenderIsEligible(l);
      var label =
        (l.code || '?') +
        ' — ' +
        (l.lenderName || '') +
        (ok ? ' · PASS' : ' · FAIL' + (l.failedAt ? ' @ ' + l.failedAt : ''));
      var selected =
        preferredCode && String(l.code) === String(preferredCode) ? ' selected' : '';
      return (
        '<option value="' +
        escapeHtml(String(l.code)) +
        '"' +
        selected +
        '>' +
        escapeHtml(label) +
        '</option>'
      );
    }

    if (mode === 'all') {
      sel.innerHTML =
        '<optgroup label="Eligible (PASS) — ' +
        pass.length +
        '">' +
        pass.map(opt).join('') +
        '</optgroup>' +
        '<optgroup label="Not eligible (FAIL) — ' +
        fail.length +
        '">' +
        fail.map(opt).join('') +
        '</optgroup>';
    } else {
      sel.innerHTML =
        list.map(opt).join('') || '<option value="">No lenders in this filter</option>';
    }

    if (
      preferredCode &&
      [].some.call(sel.options, function (o) {
        return o.value === String(preferredCode);
      })
    ) {
      sel.value = String(preferredCode);
    } else if (sel.options.length && sel.options[0].value) {
      sel.selectedIndex = 0;
    }
  }

  function formatDemoVal(v) {
    if (v == null || v === '') return '—';
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  }

  /** Rules / matched band for eligibility steps or scoring criteria. */
  function formatRulesMatched(row) {
    if (!row) return '—';
    if (row.rules != null) {
      return (
        formatDemoVal(row.rules) +
        (row.matchedKey != null ? ' · matched ' + row.matchedKey : '')
      );
    }
    if (row.matchedKey != null) return 'matched ' + row.matchedKey;
    if (row.branchUsed != null || row.matchMode != null) {
      var parts = [];
      if (row.branchUsed != null) parts.push('branch=' + formatDemoVal(row.branchUsed));
      if (row.matchMode != null) parts.push('mode=' + formatDemoVal(row.matchMode));
      return parts.join(' · ');
    }
    return '—';
  }

  function labelValueTable(rows) {
    if (!rows || !rows.length) return '<p class="muted small">No fields</p>';
    return (
      '<div class="table-wrap legacy-table-wrap"><table class="legacy-table"><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>' +
      rows
        .map(function (r) {
          return (
            '<tr><th>' +
            escapeHtml(r.label) +
            '</th><td>' +
            escapeHtml(formatDemoVal(r.value)) +
            '</td></tr>'
          );
        })
        .join('') +
      '</tbody></table></div>'
    );
  }

  function countStepResults(steps) {
    var out = { passed: 0, failed: 0, skipped: 0, notRun: 0 };
    (steps || []).forEach(function (s) {
      var r = String(s.result || '').toUpperCase();
      if (r === 'PASS' || r === 'SCORED') out.passed += 1;
      else if (r === 'FAIL' || r === 'ERROR') out.failed += 1;
      else if (r === 'SKIP') out.skipped += 1;
      else out.notRun += 1;
    });
    return out;
  }

  function runningLoanRows(loans) {
    if (!Array.isArray(loans) || !loans.length) {
      return [{ label: 'Running Loans', value: 'None' }];
    }
    var rows = [];
    loans.forEach(function (loan, i) {
      var prefix = loans.length > 1 ? 'Loan ' + (i + 1) + ' — ' : '';
      rows.push({ label: prefix + 'Loan Type', value: loan && loan.type });
      rows.push({ label: prefix + 'Bank Name', value: loan && loan.bank });
      rows.push({ label: prefix + 'Loan Amount', value: loan && loan.amount });
      rows.push({ label: prefix + 'EMI amount', value: loan && loan.emi });
      rows.push({ label: prefix + 'No of Paid EMI', value: loan && loan.paidEmi });
    });
    return rows;
  }

  var DOC_LABELS = {
    aadharCardFront: 'Aadhaar Card (Front)',
    aadharCardBack: 'Aadhaar Card (Back)',
    panCard: 'PAN Card',
    cibilReport: 'CIBIL Report',
    bankStatement: 'Bank Statement',
    salarySlips: 'Salary Slip 1 year',
    itrYear1: 'ITR (1st Year)',
    proprietorshipDoc: 'Business Type document',
    auditedBooksDoc: 'Audited Books',
    businessRegProofDoc: 'Business Registration Proof',
  };

  function docLabel(key, loanType) {
    if (key === 'bankStatement' && loanType !== 'Business Loan') {
      return '6 Month Bank Statement';
    }
    if (key && DOC_LABELS[key]) return DOC_LABELS[key];
    return key || 'Document';
  }

  function mediaDisplay(val) {
    if (val == null || val === '') return '';
    if (typeof val === 'object') {
      if (val.name) return String(val.name);
      if (val.file) return String(val.file);
      if (val.fileId != null) return 'media #' + val.fileId;
      if (Array.isArray(val.fileIds) && val.fileIds.length) {
        return val.fileIds.map(function (id) {
          return 'media #' + id;
        }).join(', ');
      }
      if (val.id != null) return 'media #' + val.id;
    }
    return String(val);
  }

  function documentRows(formData, fields, loanType) {
    var stubs = formData && Array.isArray(formData.documents) ? formData.documents : [];
    var rows = [];
    if (stubs.length) {
      stubs.forEach(function (d) {
        rows.push({
          label: docLabel(d && d.key, loanType),
          value: (d && d.name) || mediaDisplay(d) || 'None',
        });
      });
      return rows;
    }
    [
      'aadharCardFront',
      'aadharCardBack',
      'panCard',
      'cibilReport',
      'bankStatement',
      'salarySlips',
      'itrYear1',
      'proprietorshipDoc',
      'auditedBooksDoc',
      'businessRegProofDoc',
    ].forEach(function (key) {
      var shown = mediaDisplay(fields && fields[key]);
      if (shown) rows.push({ label: docLabel(key, loanType), value: shown });
    });
    if (!rows.length) return [{ label: 'Documents', value: 'None' }];
    return rows;
  }

  function renderLeadSubmission(data, loanType) {
    if (!data) return '<p class="muted">No lead-submission log</p>';
    var html = '<div class="demo-stage"><h3>Lead Submission</h3>';

    html += '<div class="demo-step-block"><h4>1. Lead</h4>';
    if (data.lead && data.lead.fields) {
      var leadRows = LEAD_FIELDS.map(function (f) {
        return { label: f.label, value: data.lead.fields[f.key] };
      });
      var known = {};
      LEAD_FIELDS.forEach(function (f) {
        known[f.key] = true;
      });
      Object.keys(data.lead.fields).forEach(function (k) {
        if (!known[k]) leadRows.push({ label: k, value: data.lead.fields[k] });
      });
      html += labelValueTable(leadRows);
      if (data.lead.event) {
        html += '<p class="muted small">' + escapeHtml(data.lead.event) + '</p>';
      }
    } else {
      html += '<p class="muted small">No LEAD_SUBMIT_SUCCESS event</p>';
    }
    html += '</div>';

    html += '<div class="demo-step-block"><h4>2. Loan application</h4>';
    if (data.loanApp) {
      var fields = data.loanApp.fields || {};
      var formData = fields.form_data || fields.formData || {};
      var topRows = [
        { label: 'Applicant Name', value: fields.applicantName },
        { label: 'Loan Type', value: fields.loanType || loanType },
        { label: 'Loan Amount', value: fields.loanAmount },
        { label: 'Email', value: fields.email },
        { label: 'Phone', value: fields.phone },
        { label: 'Aadhaar', value: fields.aadharNumber },
        { label: 'PAN', value: fields.panNumber },
      ];
      html += '<h5 class="demo-subh">Top-level</h5>' + labelValueTable(topRows);

      var funnel =
        FUNNEL_BY_LOAN_TYPE[fields.loanType || loanType] || FUNNEL_BY_LOAN_TYPE['Personal Loan'];
      funnel.forEach(function (step) {
        html +=
          '<h5 class="demo-subh">' +
          escapeHtml(step.step) +
          ' — ' +
          escapeHtml(step.title) +
          '</h5>';
        if (step.step === 'Docs') {
          html += labelValueTable(
            documentRows(formData, fields, fields.loanType || loanType)
          );
          return;
        }
        if (!step.fields || !step.fields.length) {
          html += '<p class="muted small">No fields for this step.</p>';
          return;
        }
        var rows = [];
        step.fields.forEach(function (f) {
          var sec = formData[f.section] || {};
          if (f.key === 'runningLoans') {
            rows = rows.concat(runningLoanRows(sec[f.key]));
            return;
          }
          rows.push({ label: f.label, value: sec[f.key] });
        });
        html += labelValueTable(rows);
      });
      if (data.loanApp.event) {
        html += '<p class="muted small">' + escapeHtml(data.loanApp.event) + '</p>';
      }
    } else {
      html += '<p class="muted small">No LOAN_APP_SUBMIT_SUCCESS event</p>';
    }
    html += '</div>';

    if (!data.lead && !data.loanApp) {
      html +=
        '<p class="muted small">' +
        (data.rawLineCount || 0) +
        ' JSON line(s); no LEAD/LOAN_APP success events</p>';
    }
    html += '</div>';
    return html;
  }

  function renderBureau(data) {
    if (!data) return '<p class="muted">No bureau-extraction log</p>';
    var lines = (data.previewLines || []).map(escapeHtml).join('\n');
    return (
      '<div class="demo-stage"><h3>Bureau extraction</h3>' +
      '<p class="muted small">' +
      (data.lineCount || 0) +
      ' lines</p>' +
      '<pre class="demo-pre">' +
      lines +
      '</pre></div>'
    );
  }

  function renderEligibilityShell(data) {
    if (!data) return '<p class="muted">No eligibility log</p>';
    journeyEligLenders = normalizeJourneyEligLenders(data.lenders || []);
    if (!journeyEligLenders.length) {
      return '<div class="demo-stage"><h3>Eligibility</h3><p class="muted">No lenders in log</p></div>';
    }
    var pass = journeyEligLenders.filter(journeyLenderIsEligible).length;
    var fail = journeyEligLenders.length - pass;
    var productLabel =
      (data.meta && (data.meta.loanType || data.meta.product)) || 'selected product';
    return (
      '<div class="demo-stage legacy-panel" id="demo-elig-panel">' +
      '<h3>Eligibility</h3>' +
      '<p class="muted small">source: ' +
      escapeHtml((data.meta && data.meta.source) || '—') +
      ' · ' +
      journeyEligLenders.length +
      ' lender(s)</p>' +
      '<div class="legacy-stats elig-overview" id="demo-elig-overview">' +
      '<div class="legacy-stat pass"><div class="v">' +
      pass +
      '</div><div class="l">Eligible (PASS)</div></div>' +
      '<div class="legacy-stat fail"><div class="v">' +
      fail +
      '</div><div class="l">Not eligible (FAIL)</div></div>' +
      '<div class="legacy-stat"><div class="v">' +
      journeyEligLenders.length +
      '</div><div class="l">Total lenders · ' +
      escapeHtml(String(productLabel)) +
      '</div></div>' +
      '</div>' +
      '<div class="legacy-toolbar">' +
      '<label for="demo-elig-filter"><strong>Show</strong></label>' +
      '<select id="demo-elig-filter" aria-label="Filter lenders by eligibility">' +
      '<option value="all">All lenders</option>' +
      '<option value="pass">Eligible only</option>' +
      '<option value="fail">Failed only</option>' +
      '</select>' +
      '<label for="demo-elig-lender"><strong>Lender</strong></label>' +
      '<select id="demo-elig-lender" aria-label="Select lender for eligibility detail"></select>' +
      '<span id="demo-elig-badge" class="legacy-badge"></span>' +
      '<button type="button" class="btn ghost" id="demo-elig-detail-btn">Show details</button>' +
      '</div>' +
      '<pre class="json-detail hidden" id="demo-elig-json" hidden></pre>' +
      '<p id="demo-elig-callout" class="legacy-callout" hidden></p>' +
      '<div id="demo-elig-stats" class="legacy-stats"></div>' +
      '<div class="legacy-card">' +
      '<div class="legacy-card-h"><span id="demo-elig-card-title">Check order</span></div>' +
      '<div class="table-wrap legacy-table-wrap">' +
      '<table class="legacy-table">' +
      '<thead><tr><th>Rule</th><th>Name</th><th>Threshold</th><th>Applicant</th><th>Rules / matched</th><th>Formula</th><th>Result</th><th>Reason</th></tr></thead>' +
      '<tbody id="demo-elig-tbody"></tbody>' +
      '</table></div></div></div>'
    );
  }

  function paintEligibilityLender() {
    var sel = document.getElementById('demo-elig-lender');
    if (!sel || !journeyEligLenders.length) return;
    if (!sel.value) {
      var emptyBadge = document.getElementById('demo-elig-badge');
      if (emptyBadge) {
        emptyBadge.textContent = '';
        emptyBadge.className = 'legacy-badge';
      }
      var emptyCallout = document.getElementById('demo-elig-callout');
      if (emptyCallout) {
        emptyCallout.hidden = false;
        emptyCallout.className = 'legacy-callout';
        emptyCallout.textContent = 'No lenders in this filter.';
      }
      var emptyTbody = document.getElementById('demo-elig-tbody');
      if (emptyTbody) {
        emptyTbody.innerHTML =
          '<tr><td colspan="8" class="muted">No lenders in this filter</td></tr>';
      }
      var emptyStats = document.getElementById('demo-elig-stats');
      if (emptyStats) emptyStats.innerHTML = '';
      return;
    }
    var lender =
      journeyEligLenders.find(function (l) {
        return String(l.code) === sel.value;
      }) || journeyEligLenders[0];
    if (!lender) return;
    var steps = lender.fullSteps || lender.steps || [];
    var counts = countStepResults(steps);
    var ok = journeyLenderIsEligible(lender);

    var badge = document.getElementById('demo-elig-badge');
    if (badge) {
      badge.textContent = ok ? 'Eligible (PASS)' : 'Not eligible (FAIL)';
      badge.className = 'legacy-badge ' + (ok ? 'yes' : 'no');
    }

    var callout = document.getElementById('demo-elig-callout');
    if (callout) {
      if (ok) {
        callout.hidden = false;
        callout.className = 'legacy-callout ok';
        callout.textContent =
          (lender.lenderName || lender.code) + ' passed eligibility steps in this run.';
      } else if (lender.failedAt || lender.errorCode) {
        var failStep = steps.find(function (s) {
          return String(s.result || '').toUpperCase() === 'FAIL';
        });
        var reason = failStep && failStep.reason ? ' — ' + failStep.reason : '';
        callout.hidden = false;
        callout.className = 'legacy-callout danger';
        callout.textContent =
          (lender.lenderName || lender.code) +
          ' stopped at ' +
          (lender.failedAt || (failStep && failStep.ruleId) || '—') +
          (lender.errorCode ? ' · ' + lender.errorCode : '') +
          reason;
      } else {
        callout.hidden = false;
        callout.className = 'legacy-callout danger';
        callout.textContent = (lender.lenderName || lender.code) + ' is not eligible.';
      }
    }

    var stats = document.getElementById('demo-elig-stats');
    if (stats) {
      stats.innerHTML = [
        ['Eligible', ok ? 'Yes' : 'No', ok ? 'pass' : 'fail'],
        ['Passed', String(counts.passed), 'pass'],
        ['Failed', String(counts.failed), 'fail'],
        ['Skipped', String(counts.skipped), 'skip'],
        ['Not run', String(counts.notRun), ''],
      ]
        .map(function (row) {
          return (
            '<div class="legacy-stat ' +
            row[2] +
            '"><div class="v">' +
            escapeHtml(row[1]) +
            '</div><div class="l">' +
            escapeHtml(row[0]) +
            '</div></div>'
          );
        })
        .join('');
    }

    var title = document.getElementById('demo-elig-card-title');
    if (title) title.textContent = 'Check order — ' + (lender.code || '');

    var tbody = document.getElementById('demo-elig-tbody');
    if (!tbody) return;
    tbody.innerHTML = steps.length
      ? steps
          .map(function (s) {
            var r = String(s.result || '').toUpperCase();
            var reasonCls =
              r === 'FAIL' || r === 'SKIP' ? 'legacy-reason emphasis' : 'muted';
            return (
              '<tr>' +
              '<td><code>' +
              escapeHtml(s.ruleId || '') +
              '</code></td>' +
              '<td>' +
              escapeHtml(s.ruleName || '') +
              '</td>' +
              '<td>' +
              escapeHtml(formatDemoVal(s.threshold)) +
              '</td>' +
              '<td>' +
              escapeHtml(
                formatDemoVal(s.applicant != null ? s.applicant : s.applicantValue)
              ) +
              '</td>' +
              '<td class="muted">' +
              escapeHtml(formatRulesMatched(s)) +
              '</td>' +
              '<td class="muted">' +
              escapeHtml(s.formula || '') +
              '</td>' +
              '<td><span class="r-' +
              escapeHtml(r || 'NOT_RUN') +
              '">' +
              escapeHtml(s.result || '—') +
              '</span></td>' +
              '<td class="' +
              reasonCls +
              '">' +
              escapeHtml(formatStepReason(s)) +
              '</td>' +
              '</tr>'
            );
          })
          .join('')
      : '<tr><td colspan="8" class="muted">No step details</td></tr>';

    var jsonEl = document.getElementById('demo-elig-json');
    var detailBtn = document.getElementById('demo-elig-detail-btn');
    if (jsonEl) {
      try {
        jsonEl.textContent = JSON.stringify(lenderEligibilityJson(lender), null, 2);
      } catch (err) {
        jsonEl.textContent = String(err && err.message ? err.message : err);
      }
      setJsonPanelVisible(jsonEl, detailBtn, false);
    }
  }

  function renderScoringShell(data) {
    if (!data) return '<p class="muted">No scoring log</p>';
    journeyScoreLenders =
      data.scoring && data.scoring.length ? data.scoring : data.lenders || [];
    if (!journeyScoreLenders.length) {
      return '<div class="demo-stage"><h3>Scoring</h3><p class="muted">No scoring blocks in log</p></div>';
    }
    var preferred =
      journeyScoreLenders.find(function (s) {
        return s.displayed || (s.totalScore != null && s.totalScore >= 40);
      }) || journeyScoreLenders[0];
    var options = journeyScoreLenders
      .map(function (s, i) {
        var code = s.code || s.lenderCode || '#' + (i + 1);
        var total = s.totalScore != null ? s.totalScore : s.score;
        var label =
          code +
          ' — ' +
          (s.lenderName || '') +
          ' (' +
          (total != null ? total : '?') +
          ')';
        var sel = preferred && (preferred.code || preferred.lenderCode) === code ? ' selected' : '';
        return (
          '<option value="' +
          escapeHtml(String(code)) +
          '"' +
          sel +
          '>' +
          escapeHtml(label) +
          '</option>'
        );
      })
      .join('');
    return (
      '<div class="demo-stage legacy-panel" id="demo-score-panel">' +
      '<h3>Scoring</h3>' +
      '<p class="muted small">' +
      journeyScoreLenders.length +
      ' lender score block(s)</p>' +
      '<div class="legacy-toolbar">' +
      '<label for="demo-score-lender"><strong>Lender</strong></label>' +
      '<select id="demo-score-lender" aria-label="Select scored lender">' +
      options +
      '</select>' +
      '<span id="demo-score-badge" class="legacy-badge"></span>' +
      '<button type="button" class="btn ghost" id="demo-score-detail-btn">Show details</button>' +
      '</div>' +
      '<pre class="json-detail hidden" id="demo-score-json" hidden></pre>' +
      '<p id="demo-score-meta" class="muted small"></p>' +
      '<div class="legacy-card">' +
      '<div class="legacy-card-h"><span id="demo-score-card-title">Criteria</span></div>' +
      '<div class="table-wrap legacy-table-wrap">' +
      '<table class="legacy-table">' +
      '<thead><tr><th>Criterion</th><th>Weight</th><th>Threshold</th><th>Applicant</th><th>Rules / matched</th><th>Formula</th><th>Points</th><th>Result</th><th>Reason</th></tr></thead>' +
      '<tbody id="demo-score-tbody"></tbody>' +
      '</table></div></div></div>'
    );
  }

  function paintScoringLender() {
    var sel = document.getElementById('demo-score-lender');
    if (!sel || !journeyScoreLenders.length) return;
    var row =
      journeyScoreLenders.find(function (s) {
        return String(s.code || s.lenderCode) === sel.value;
      }) || journeyScoreLenders[0];
    if (!row) return;
    var code = row.code || row.lenderCode || '';
    var total = row.totalScore != null ? row.totalScore : row.score;
    var shown =
      row.displayed === true || (total != null && Number(total) >= 40 && row.displayed !== false);
    var badge = document.getElementById('demo-score-badge');
    if (badge) {
      badge.textContent = shown ? 'Shown (≥40)' : total != null ? 'Below 40' : 'No score';
      badge.className = 'legacy-badge ' + (shown ? 'yes' : 'no');
    }
    var meta = document.getElementById('demo-score-meta');
    if (meta) {
      meta.textContent =
        'Total score ' +
        (total != null ? total : '—') +
        (row.rank != null ? ' · rank #' + row.rank : '') +
        ' · ' +
        (row.lenderName || code);
    }
    var title = document.getElementById('demo-score-card-title');
    if (title) title.textContent = 'Criteria — ' + code;

    var crit = row.criteria || row.criterionScores || (row.summary && row.summary.criterionScores) || [];
    var tbody = document.getElementById('demo-score-tbody');
    if (!tbody) return;
    if (Array.isArray(crit) && crit.length) {
      tbody.innerHTML = crit
        .map(function (c) {
          var r = String(c.result || 'SCORED').toUpperCase();
          var reasonCls =
            r === 'FAIL' || r === 'SKIP' ? 'legacy-reason emphasis' : 'muted';
          return (
            '<tr>' +
            '<td><code>' +
            escapeHtml(c.criterionId || c.id || '') +
            '</code></td>' +
            '<td>' +
            escapeHtml(c.weight != null ? c.weight : '—') +
            '</td>' +
            '<td>' +
            escapeHtml(formatDemoVal(c.threshold)) +
            '</td>' +
            '<td>' +
            escapeHtml(formatDemoVal(c.applicant != null ? c.applicant : c.applicantValue)) +
            '</td>' +
            '<td class="muted">' +
            escapeHtml(formatRulesMatched(c)) +
            '</td>' +
            '<td class="muted">' +
            escapeHtml(c.formula || '') +
            '</td>' +
            '<td>' +
            escapeHtml(c.points != null ? c.points : '—') +
            '</td>' +
            '<td><span class="r-' +
            escapeHtml(r) +
            '">' +
            escapeHtml(c.result || 'SCORED') +
            '</span></td>' +
            '<td class="' +
            reasonCls +
            '">' +
            escapeHtml(c.reason || c.errorCode || '') +
            '</td>' +
            '</tr>'
          );
        })
        .join('');
    } else {
      tbody.innerHTML =
        '<tr><td colspan="9" class="muted">No criterion breakdown in log</td></tr>';
    }

    var jsonEl = document.getElementById('demo-score-json');
    var detailBtn = document.getElementById('demo-score-detail-btn');
    if (jsonEl) {
      try {
        jsonEl.textContent = JSON.stringify(row, null, 2);
      } catch (err) {
        jsonEl.textContent = String(err && err.message ? err.message : err);
      }
      setJsonPanelVisible(jsonEl, detailBtn, false);
    }
  }

  function bindJourneyDemoPanels() {
    var eligSel = document.getElementById('demo-elig-lender');
    var eligFilter = document.getElementById('demo-elig-filter');
    if (eligSel) {
      var preferred =
        journeyEligLenders.find(journeyLenderIsEligible) || journeyEligLenders[0];
      fillJourneyEligSelect(preferred && preferred.code);
      eligSel.addEventListener('change', paintEligibilityLender);
      if (eligFilter) {
        eligFilter.addEventListener('change', function () {
          fillJourneyEligSelect(eligSel.value);
          paintEligibilityLender();
        });
      }
      paintEligibilityLender();
    }
    var eligBtn = document.getElementById('demo-elig-detail-btn');
    var eligJson = document.getElementById('demo-elig-json');
    if (eligBtn && eligJson) {
      eligBtn.addEventListener('click', function () {
        var show = eligJson.classList.contains('hidden') || eligJson.hasAttribute('hidden');
        setJsonPanelVisible(eligJson, eligBtn, show);
      });
    }
    var scoreSel = document.getElementById('demo-score-lender');
    if (scoreSel) {
      scoreSel.addEventListener('change', paintScoringLender);
      paintScoringLender();
    }
    var scoreBtn = document.getElementById('demo-score-detail-btn');
    var scoreJson = document.getElementById('demo-score-json');
    if (scoreBtn && scoreJson) {
      scoreBtn.addEventListener('click', function () {
        var show = scoreJson.classList.contains('hidden') || scoreJson.hasAttribute('hidden');
        setJsonPanelVisible(scoreJson, scoreBtn, show);
      });
    }
  }

  function renderJourneyDemo(data) {
    var root = document.getElementById('demoResults');
    var meta = document.getElementById('demoMeta');
    if (!root) return;
    var files = data.files || {};
    var fileList = Object.keys(files)
      .map(function (k) {
        return k + ': ' + files[k];
      })
      .join(' · ');
    if (meta) {
      meta.textContent =
        'Lead ' +
        data.leadId +
        (data.leadName ? ' — ' + data.leadName : '') +
        ' · ' +
        data.loanType +
        ' · stages=' +
        data.stagesFilter +
        (data.missing && data.missing.length
          ? ' · missing: ' + data.missing.join(', ')
          : '') +
        (fileList ? ' · ' + fileList : '');
    }
    var s = data.stages || {};
    var html = '';
    if (s.leadSubmission !== undefined) {
      html += renderLeadSubmission(s.leadSubmission, data.loanType);
    }
    if (s.bureau !== undefined) html += renderBureau(s.bureau);
    if (s.eligibility !== undefined) html += renderEligibilityShell(s.eligibility);
    if (s.scoring !== undefined) html += renderScoringShell(s.scoring);
    root.innerHTML = html || '<p class="muted">Nothing to display</p>';
    bindJourneyDemoPanels();
  }

  function loadJourneyDemo() {
    var product = document.getElementById('demoProduct').value;
    var stages = document.getElementById('demoStages').value;
    var leadId = document.getElementById('demoLeadId').value.trim();
    var btn = document.getElementById('loadJourneyDemo');
    var root = document.getElementById('demoResults');
    var meta = document.getElementById('demoMeta');
    if (btn) btn.disabled = true;
    if (meta) meta.textContent = 'Loading…';
    if (root) root.innerHTML = '';
    var qs =
      '?product=' +
      encodeURIComponent(product) +
      '&stages=' +
      encodeURIComponent(stages);
    if (leadId) qs += '&leadId=' + encodeURIComponent(leadId);
    api('/api/journey-demo' + qs)
      .then(function (data) {
        renderJourneyDemo(data);
      })
      .catch(function (err) {
        if (meta) meta.textContent = '';
        if (root) root.innerHTML = '<p class="demo-error">' + escapeHtml(err.message) + '</p>';
      })
      .finally(function () {
        if (btn) btn.disabled = false;
      });
  }

  document.querySelectorAll('[data-docs-section]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var section = btn.getAttribute('data-docs-section');
      if (btn.classList.contains('active')) {
        clearPipelineDocs();
        return;
      }
      loadPipelineDocs(section);
    });
  });
  var docsProduct = document.getElementById('docsProduct');
  if (docsProduct) {
    docsProduct.addEventListener('change', function () {
      var active = document.querySelector('[data-docs-section].active');
      if (active) {
        loadPipelineDocs(active.getAttribute('data-docs-section'));
      } else {
        clearPipelineDocs();
      }
    });
  }

  document.getElementById('loadJourneyDemo').addEventListener('click', loadJourneyDemo);
  document.getElementById('demoLeadId').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') loadJourneyDemo();
  });
  document.getElementById('demoProduct').addEventListener('change', function () {
    if (!document.getElementById('demoLeadId').value.trim()) loadJourneyDemo();
  });
  document.getElementById('demoStages').addEventListener('change', function () {
    loadJourneyDemo();
  });

  var liveConfirm = document.getElementById('liveConfirm');
  if (liveConfirm) {
    liveConfirm.addEventListener('change', updateLiveRunEnabled);
  }

  var LIVE_SAMPLES = {
    'personal-loan': {
      pdfs:
        'PDFs to attach: aadhaar_front.pdf, aadhaar_back.pdf, pan.pdf, Ganga_CIBIL_Report.pdf, bank_statement.pdf, salary_slip.pdf',
      csv:
        'fullName,email,mobileNumber,requiredAmount,pinCode,aadharCard,panCard,employmentType,dob,maritalStatus,motherName,line1,landmark,state,district,city,residenceType,companyName,designation,netSalary,salaryMode,jobStability,pfDeducted,hasOtherIncome,aadhaar_front,aadhaar_back,pan,cibil,bank_statement,salary_slip\n' +
        '[SUITE-TEST] Test User,suite.test@example.com,9876543210,500000,560001,123412341234,ABCDE1234F,Salaried,1990-01-15,Single,Mother Name,12 MG Road,Near Park,Karnataka,Bengaluru Urban,Bengaluru,Owned,Acme Pvt Ltd,Engineer,75000,Account Transfer,24,Yes,No,aadhaar_front.pdf,aadhaar_back.pdf,pan.pdf,Ganga_CIBIL_Report.pdf,bank_statement.pdf,salary_slip.pdf',
    },
    'business-loan': {
      pdfs:
        'PDFs to attach: aadhaar_front.pdf, aadhaar_back.pdf, pan.pdf, Ganga_CIBIL_Report.pdf, bank_statement.pdf, proprietorship.pdf, itr_year1.pdf, gst_certificate.pdf (plus audited_books.pdf when Audited Books = Yes)',
      csv:
        'fullName,email,mobileNumber,requiredAmount,pinCode,aadharCard,panCard,employmentType,dob,maritalStatus,motherName,line1,landmark,state,district,city,residenceType,businessName,premises,businessType,turnover,age,regProofs,auditedBooks,businessAddress,aadhaar_front,aadhaar_back,pan,cibil,bank_statement,proprietorship,itr_year1,business_reg_proof,audited_books_doc\n' +
        '[SUITE-TEST] Test Business,suite.biz@example.com,9876543211,800000,560001,123412341235,ABCDE1234G,Self Employed,1985-06-20,Married,Mother Name,12 MG Road,Near Park,Karnataka,Bengaluru Urban,Bengaluru,Owned,Test Traders,Rented,Proprietorship,5000000,5,GST Certificate,No,45 Industrial Layout,aadhaar_front.pdf,aadhaar_back.pdf,pan.pdf,Ganga_CIBIL_Report.pdf,bank_statement.pdf,proprietorship.pdf,itr_year1.pdf,gst_certificate.pdf,',
    },
  };

  function updateLiveSampleFormat() {
    var productEl = document.getElementById('liveProduct');
    var pdfsEl = document.getElementById('liveSamplePdfs');
    var csvEl = document.getElementById('liveSampleCsv');
    var dl = document.getElementById('liveSampleDownload');
    if (!productEl || !pdfsEl || !csvEl) return;
    var product = productEl.value || 'personal-loan';
    var sample = LIVE_SAMPLES[product] || LIVE_SAMPLES['personal-loan'];
    pdfsEl.textContent = sample.pdfs;
    csvEl.textContent = sample.csv;
    if (dl) dl.href = BASE + '/api/live-run/example.csv?product=' + encodeURIComponent(product);
  }

  var liveProduct = document.getElementById('liveProduct');
  if (liveProduct) {
    liveProduct.addEventListener('change', updateLiveSampleFormat);
    updateLiveSampleFormat();
  }

  var runLive = document.getElementById('runLive');
  if (runLive) {
    runLive.addEventListener('click', function () {
      if (!document.getElementById('liveConfirm').checked) {
        return alert('Check the confirm box to allow creating [SUITE-TEST] leads');
      }
      runLive.disabled = true;
      var out = document.getElementById('liveResult');
      var fileEl = document.getElementById('liveCsv');
      var file = fileEl && fileEl.files && fileEl.files[0];
      var docsEl = document.getElementById('liveDocs');
      var docs = docsEl && docsEl.files ? Array.prototype.slice.call(docsEl.files) : [];
      var product = document.getElementById('liveProduct').value;
      var pairError =
        'CSV and Documents must be attached together. Leave both empty to run one lead from the default pool.';
      if (Boolean(file) !== Boolean(docs.length)) {
        out.textContent = pairError;
        alert(pairError);
        updateLiveRunEnabled();
        return;
      }
      out.textContent = file ? 'Live Run CSV starting…' : 'Live Run starting…';

      function postLiveRunJson(body) {
        return api('/api/live-run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      function postLiveRunForm(formData) {
        return api('/api/live-run', {
          method: 'POST',
          body: formData,
        });
      }

      function onAccepted(res) {
        if (res.accepted && res.runId) {
          activeLiveRunId = res.runId;
          var n = res.count || 1;
          out.textContent =
            (n > 1 ? 'Live Run of ' + n + ' leads in progress' : 'Live Run in progress') +
            ' (run ' +
            res.runId.slice(0, 8) +
            '…) — bureau may take a few minutes per lead; this page will update when done';
          pollLiveRunStatus(res.runId, n);
          return;
        }
        showLiveRunResult(res);
        updateLiveRunEnabled();
      }

      function onFail(err) {
        out.textContent = err.message;
        alert(err.message);
        updateLiveRunEnabled();
      }

      if (file) {
        var fd = new FormData();
        fd.append('product', product);
        fd.append('confirm', 'true');
        fd.append('csv', file, file.name);
        docs.forEach(function (pdf) {
          fd.append('documents', pdf, pdf.name);
        });
        postLiveRunForm(fd).then(onAccepted).catch(onFail);
        return;
      }

      postLiveRunJson({ product: product, confirm: true })
        .then(onAccepted)
        .catch(onFail);
    });
  }

  refreshHealth();
  setInterval(refreshHealth, 30000);
})();
