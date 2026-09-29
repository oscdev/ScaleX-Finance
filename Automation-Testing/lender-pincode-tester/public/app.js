(function () {
  function detectBasePath() {
    var p = window.location.pathname || '';
    if (p.indexOf('/lender-pincode-tester') === 0) return '/lender-pincode-tester';
    return '/lender-pincode-tester';
  }

  var BASE = detectBasePath();

  var productSelect = document.getElementById('productSelect');
  var lenderSelect = document.getElementById('lenderSelect');
  var zipInput = document.getElementById('zipInput');
  var checkBtn = document.getElementById('checkBtn');
  var form = document.getElementById('checkForm');
  var resultBox = document.getElementById('resultBox');
  var productLabel = document.getElementById('productLabel');
  var lenderLabel = document.getElementById('lenderLabel');

  function api(path) {
    return BASE + path;
  }

  function setProductCount(n) {
    productLabel.textContent = 'Product Type (' + Number(n || 0) + ')';
  }

  function setLenderCount(n) {
    lenderLabel.textContent = 'Lenders (' + Number(n || 0) + ')';
  }

  function showResult(kind, title, detail) {
    resultBox.hidden = false;
    resultBox.className = 'result ' + (kind || '');
    resultBox.innerHTML =
      '<span class="title">' +
      escapeHtml(title) +
      '</span>' +
      escapeHtml(detail || '');
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function selectedProduct() {
    var opt = productSelect.options[productSelect.selectedIndex];
    if (!opt || !opt.value) return null;
    return {
      id: opt.value,
      title: opt.textContent,
      loanType: opt.getAttribute('data-loan-type') || '',
      supported: opt.getAttribute('data-supported') === '1',
    };
  }

  function resetLenders(placeholder) {
    lenderSelect.innerHTML = '';
    var o = document.createElement('option');
    o.value = '';
    o.textContent = placeholder || 'Select a lender';
    lenderSelect.appendChild(o);
    lenderSelect.disabled = true;
    zipInput.disabled = true;
    checkBtn.disabled = true;
    setLenderCount(0);
  }

  function updateControls() {
    var p = selectedProduct();
    if (!p) {
      resetLenders('Select a product first');
      return;
    }
    if (!p.supported) {
      resetLenders('PL / BL only — pick Personal or Business Loan');
      showResult(
        'warn',
        'Unsupported product',
        'Pincode check supports Personal Loan (PL) and Business Loan (BL) only.'
      );
      return;
    }
    resultBox.hidden = true;
    loadLenders(p.loanType);
  }

  async function loadProducts() {
    productSelect.innerHTML = '';
    var loading = document.createElement('option');
    loading.value = '';
    loading.textContent = 'Loading products…';
    productSelect.appendChild(loading);

    try {
      var res = await fetch(api('/api/products'));
      var data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load products');

      productSelect.innerHTML = '';
      var blank = document.createElement('option');
      blank.value = '';
      blank.textContent = 'Select product type';
      productSelect.appendChild(blank);

      var products = data.products || [];
      products.forEach(function (p) {
        var o = document.createElement('option');
        o.value = String(p.id);
        o.textContent = p.title || ('Product #' + p.id);
        o.setAttribute('data-loan-type', p.loanType || '');
        o.setAttribute('data-supported', p.supported ? '1' : '0');
        productSelect.appendChild(o);
      });
      setProductCount(products.length);

      if (products.length === 0) {
        showResult('warn', 'No products', 'No active products found in the products table.');
      }
    } catch (err) {
      productSelect.innerHTML = '';
      var fail = document.createElement('option');
      fail.value = '';
      fail.textContent = 'Failed to load products';
      productSelect.appendChild(fail);
      setProductCount(0);
      showResult('bad', 'Error', err.message || String(err));
    }
  }

  async function loadLenders(loanType) {
    resetLenders('Loading lenders…');
    lenderSelect.disabled = true;

    try {
      var res = await fetch(
        api('/api/lenders?loanType=' + encodeURIComponent(loanType))
      );
      var data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load lenders');

      lenderSelect.innerHTML = '';
      var blank = document.createElement('option');
      blank.value = '';
      blank.textContent = 'Select lender';
      lenderSelect.appendChild(blank);

      var lenders = data.lenders || [];
      lenders.forEach(function (l) {
        var o = document.createElement('option');
        o.value = l.lenderCode;
        o.textContent = l.lenderCode + ' — ' + (l.lenderName || l.lenderCode);
        lenderSelect.appendChild(o);
      });
      setLenderCount(lenders.length);

      if (lenders.length === 0) {
        showResult(
          'warn',
          'No lenders',
          'No active lenders found for loan type ' + loanType + '.'
        );
        return;
      }

      lenderSelect.disabled = false;
      zipInput.disabled = false;
      checkBtn.disabled = false;
    } catch (err) {
      resetLenders('Failed to load lenders');
      showResult('bad', 'Error', err.message || String(err));
    }
  }

  productSelect.addEventListener('change', updateControls);

  zipInput.addEventListener('input', function () {
    zipInput.value = zipInput.value.replace(/\D/g, '');
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var p = selectedProduct();
    var lenderCode = lenderSelect.value;
    var zipCode = zipInput.value.trim();

    if (!p || !p.supported) {
      showResult('warn', 'Select product', 'Choose Personal Loan or Business Loan.');
      return;
    }
    if (!lenderCode) {
      showResult('warn', 'Select lender', 'Choose a lender from the list.');
      return;
    }
    if (!/^\d+$/.test(zipCode)) {
      showResult('warn', 'Invalid zip', 'Enter an integer pincode (digits only).');
      return;
    }

    checkBtn.disabled = true;
    showResult('warn', 'Checking…', 'Looking up zip_codes_to_lenders…');

    try {
      var qs =
        'loanType=' +
        encodeURIComponent(p.loanType) +
        '&lenderCode=' +
        encodeURIComponent(lenderCode) +
        '&zipCode=' +
        encodeURIComponent(zipCode);
      var res = await fetch(api('/api/check?' + qs));
      var data = await res.json();
      if (data.available) {
        showResult('ok', 'Available', data.message || 'Pincode is covered.');
      } else {
        showResult(
          res.ok ? 'bad' : 'warn',
          res.ok ? 'Not available' : 'Check failed',
          data.message || 'Pincode is not covered.'
        );
      }
    } catch (err) {
      showResult('bad', 'Error', err.message || String(err));
    } finally {
      checkBtn.disabled = false;
    }
  });

  loadProducts();
})();
