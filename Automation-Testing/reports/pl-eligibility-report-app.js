/* PL eligibility report UI — keep beside HTML under Automation-Testing/reports/ */
(function () {
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function loadRun() {
    var el = document.getElementById('run-data');
    if (!el) throw new Error('Missing #run-data JSON island');
    return JSON.parse(el.textContent);
  }

  var RUN = loadRun();

  function render() {
    var sel = document.getElementById('lender');
    var code = sel.value;
    var lender = RUN.lenders.find(function (l) { return l.code === code; }) || RUN.lenders[0];
    if (!lender) return;

    var badge = document.getElementById('eligBadge');
    badge.textContent = lender.eligible ? 'Eligible' : 'Not eligible';
    badge.className = 'badge ' + (lender.eligible ? 'yes' : 'no');

    var failedAt = document.getElementById('failedAt');
    failedAt.textContent = (!lender.eligible && lender.failedAt)
      ? ('failedAt ' + lender.failedAt + (lender.failedStep != null ? ' (step ' + lender.failedStep + ')' : ''))
      : '';

    document.getElementById('stats').innerHTML = [
      ['Eligible', lender.eligible ? 'Yes' : 'No', lender.eligible ? 'pass' : 'fail'],
      ['Passed', String(lender.passed), 'pass'],
      ['Failed', String(lender.failed), 'fail'],
      ['Skipped', String(lender.skipped), 'skip'],
      ['Not run', String(lender.notRun), ''],
    ].map(function (row) {
      var l = row[0], v = row[1], cls = row[2];
      return '<div class="stat ' + cls + '"><div class="v">' + v + '</div><div class="l">' + l + '</div></div>';
    }).join('');

    var callout = document.getElementById('callout');
    if (lender.eligible) {
      callout.className = 'callout ok';
      callout.textContent = lender.lenderName + ' passed all 19 eligibility steps in this run.';
    } else if (lender.errorCode || lender.failedAt) {
      var failStep = (lender.fullSteps || []).find(function (s) { return s.result === 'FAIL'; });
      var reason = failStep && failStep.reason ? ' — ' + failStep.reason : '';
      callout.className = 'callout danger';
      callout.textContent = lender.lenderName + ' stopped at ' + (lender.failedAt || '—')
        + (lender.errorCode ? ' · ' + lender.errorCode : '') + reason;
    } else {
      callout.className = '';
      callout.textContent = '';
    }

    document.getElementById('cardTitle').textContent = 'Check order — ' + lender.code;

    var tbody = document.getElementById('tbody');
    tbody.innerHTML = (lender.fullSteps || []).map(function (s) {
      var reason = s.reasonDisplay || '';
      return '<tr>'
        + '<td class="step">' + s.step + '</td>'
        + '<td><code>' + escapeHtml(s.ruleId) + '</code></td>'
        + '<td>' + escapeHtml(s.ruleName) + '</td>'
        + '<td><span class="dot ' + s.result + '"></span><span class="r-' + s.result + '">'
        + escapeHtml(s.result) + '</span></td>'
        + '<td class="muted">' + escapeHtml(s.formula || '') + '</td>'
        + '<td>' + escapeHtml(s.evaluation || '') + '</td>'
        + '<td class="muted">' + escapeHtml(reason) + '</td>'
        + '</tr>';
    }).join('');
  }

  function init() {
    var sel = document.getElementById('lender');
    sel.innerHTML = RUN.lenders.map(function (l) {
      var label = l.code + ' — ' + l.lenderName + (l.eligible ? ' (eligible)' : '');
      var selected = l.code === 'SBI' ? ' selected' : '';
      return '<option value="' + escapeHtml(l.code) + '"' + selected + '>'
        + escapeHtml(label) + '</option>';
    }).join('');
    if (![].some.call(sel.options, function (o) { return o.selected; }) && sel.options.length) {
      sel.selectedIndex = 0;
    }
    sel.addEventListener('change', render);
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
