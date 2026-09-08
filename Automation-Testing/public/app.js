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
                    ? ' — if Live Run was in progress, the proxy may have timed out; check reports/runs/ for a partial report'
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
    out.innerHTML =
      (ok ? 'Completed' : 'Finished with issues') +
      ' · lead <strong>' +
      (res.leadId || '—') +
      '</strong> — <a href="' +
      res.reportUrl +
      '" target="_blank" rel="noopener">Open detailed report</a>';
    if (res.reportUrl) window.open(res.reportUrl, '_blank');
  }

  function pollLiveRunStatus(runId) {
    var attempts = 0;
    var maxAttempts = 200;
    var timer = setInterval(function () {
      attempts += 1;
      api('/api/live-run/' + encodeURIComponent(runId))
        .then(function (st) {
          if (!st || st.status === 'running') {
            if (attempts >= maxAttempts) {
              clearInterval(timer);
              activeLiveRunId = null;
              updateLiveRunEnabled();
              var out = document.getElementById('liveResult');
              if (out) {
                out.textContent =
                  'Still running (timed out waiting). Check reports/runs/' + runId;
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
        if (!step.fields || !step.fields.length) {
          html += '<p class="muted small">Document uploads (see disk / Media Library)</p>';
          return;
        }
        var rows = step.fields.map(function (f) {
          var sec = formData[f.section] || {};
          return { label: f.label, value: sec[f.key] };
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
    journeyEligLenders = data.lenders || [];
    if (!journeyEligLenders.length) {
      return '<div class="demo-stage"><h3>Eligibility</h3><p class="muted">No lenders in log</p></div>';
    }
    var preferred =
      journeyEligLenders.find(function (l) {
        return l.eligible;
      }) || journeyEligLenders[0];
    var options = journeyEligLenders
      .map(function (l) {
        var ok = l.eligible === true;
        var label =
          (l.code || '?') +
          ' — ' +
          (l.lenderName || '') +
          (ok ? ' · PASS' : ' · FAIL' + (l.failedAt ? ' @ ' + l.failedAt : ''));
        var sel = preferred && l.code === preferred.code ? ' selected' : '';
        return (
          '<option value="' +
          escapeHtml(String(l.code)) +
          '"' +
          sel +
          '>' +
          escapeHtml(label) +
          '</option>'
        );
      })
      .join('');
    return (
      '<div class="demo-stage legacy-panel" id="demo-elig-panel">' +
      '<h3>Eligibility</h3>' +
      '<p class="muted small">source: ' +
      escapeHtml((data.meta && data.meta.source) || '—') +
      ' · ' +
      journeyEligLenders.length +
      ' lender(s)</p>' +
      '<div class="legacy-toolbar">' +
      '<label for="demo-elig-lender"><strong>Lender</strong></label>' +
      '<select id="demo-elig-lender" aria-label="Select lender">' +
      options +
      '</select>' +
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
    var lender =
      journeyEligLenders.find(function (l) {
        return String(l.code) === sel.value;
      }) || journeyEligLenders[0];
    if (!lender) return;
    var steps = lender.fullSteps || lender.steps || [];
    var counts = countStepResults(steps);
    var ok = lender.eligible === true;

    var badge = document.getElementById('demo-elig-badge');
    if (badge) {
      badge.textContent = ok ? 'Eligible' : 'Not eligible';
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
    if (eligSel) {
      eligSel.addEventListener('change', paintEligibilityLender);
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
  var runLive = document.getElementById('runLive');
  if (runLive) {
    runLive.addEventListener('click', function () {
      if (!document.getElementById('liveConfirm').checked) {
        return alert('Check the confirm box to allow creating [SUITE-TEST] leads');
      }
      runLive.disabled = true;
      var out = document.getElementById('liveResult');
      out.textContent = 'Live Run starting…';
      api('/api/live-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: document.getElementById('liveProduct').value,
          confirm: true,
        }),
      })
        .then(function (res) {
          if (res.accepted && res.runId) {
            activeLiveRunId = res.runId;
            out.textContent =
              'Live Run in progress (run ' +
              res.runId.slice(0, 8) +
              '…) — bureau may take a few minutes; this page will update when done';
            pollLiveRunStatus(res.runId);
            return;
          }
          showLiveRunResult(res);
          updateLiveRunEnabled();
        })
        .catch(function (err) {
          out.textContent = err.message;
          alert(err.message);
          updateLiveRunEnabled();
        });
    });
  }

  refreshHealth();
  setInterval(refreshHealth, 30000);
})();
