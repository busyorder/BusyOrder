/* Busy Order — site settings and the one function that sends enquiries/orders. Edit the three values below. */
(function () {
  'use strict';

  var cfg = window.BUSYORDER = {
    // WhatsApp number: country code + number, no plus sign.
    waNumber: '919042039110',

    // Address of the Vercel project that runs api/sendMail.js. Needed when this website is NOT hosted on Vercel
    // (for example GitHub Pages). Example: 'https://busyorder.vercel.app/api/sendMail'. Leave '' if the site runs on Vercel.
    apiUrl: '',

    // Free backup that works from any host (recommended if your site is not on Vercel):
    // get a key at https://web3forms.com (enter your email, they send the key), then paste it between the quotes.
    web3formsKey: 'a1b22495-92a9-4821-850e-025ca2c85619',

    // Optional extra backup: FormSubmit (no key). It needs an "Activate Form" email that did not arrive in tests, so it is off.
    // To try it, set to 'busyorderofficial@gmail.com'.
    formsubmitEmail: ''
  };

  // fetch() with a time limit, so a service that is down cannot leave the form spinning.
  function timedFetch(url, opts, ms) {
    if (!window.AbortController) return fetch(url, opts);
    var ctl = new AbortController();
    var t = setTimeout(function () { ctl.abort(); }, ms || 10000);
    opts = opts || {}; opts.signal = ctl.signal;
    return fetch(url, opts).then(function (r) { clearTimeout(t); return r; }, function (e) {
      clearTimeout(t);
      throw (e && e.name === 'AbortError') ? new Error('timed out (service not responding)') : e;
    });
  }

  function entries(fd) {
    var out = {}, files = 0;
    fd.forEach(function (v, k) { if (v instanceof File) { files++; } else { out[k] = v; } });
    return { fields: out, files: files };
  }

  // Backup route (only used if a Web3Forms key is set above).
  function viaWeb3Forms(fd) {
    var e = entries(fd), f = e.fields, isOrder = f.type === 'order';
    var lines = [];
    ['product', 'paymentId', 'name', 'phone', 'email', 'service', 'budget', 'businessName', 'style', 'colors'].forEach(function (k) {
      if (f[k]) lines.push(k + ': ' + f[k]);
    });
    lines.push('', 'Message: ' + (f.message || ''));
    if (e.files) lines.push('', 'Note: the customer attached ' + e.files + ' file(s) that could not be sent. Ask for them on WhatsApp.');
    var body = {
      access_key: cfg.web3formsKey,
      subject: isOrder ? 'PAID ORDER: ' + (f.product || 'Design') + ' from ' + f.name : 'New quote request: ' + (f.service || 'Project') + ' from ' + f.name,
      from_name: 'Busy Order website',
      name: f.name,
      message: lines.join('\n')
    };
    if (f.email) body.email = f.email;
    return timedFetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok || j.success === false) throw new Error((j && j.message) || ('HTTP ' + r.status));
        return j;
      });
    });
  }

  // Backup route with no key: FormSubmit (formsubmit.co). Files are sent along when there are any.
  function viaFormSubmit(fd) {
    var e = entries(fd), f = e.fields, isOrder = f.type === 'order';
    var out = new FormData();
    ['name', 'email', 'phone', 'service', 'budget', 'product', 'paymentId', 'businessName', 'style', 'colors', 'message'].forEach(function (k) {
      if (f[k]) out.append(k, f[k]);
    });
    out.append('_subject', isOrder ? 'PAID ORDER: ' + (f.product || 'Design') + ' from ' + f.name : 'New quote request: ' + (f.service || 'Project') + ' from ' + f.name);
    out.append('_template', 'table');
    out.append('_captcha', 'false');
    if (f.email) out.append('_replyto', f.email);
    fd.forEach(function (v, k) { if (v instanceof File) out.append('attachment', v, v.name); });
    return timedFetch('https://formsubmit.co/ajax/' + encodeURIComponent(cfg.formsubmitEmail), {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: out
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok || String(j.success) === 'false') throw new Error((j && j.message) || ('HTTP ' + r.status));
        return j;
      });
    });
  }

  // Tries this site's function, then your Vercel address (if set), then the free backups (if set).
  cfg.post = function (fd) {
    var urls = [{ label: 'this site', url: '/api/sendMail' }];
    if (cfg.apiUrl) urls.push({ label: 'vercel', url: cfg.apiUrl });
    var errs = [];

    function fail() {
      var local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
      if (local) errs.push('note: a local preview server cannot run the mail function, so test on your live website');
      throw new Error(errs.join(' | '));
    }
    function runBackups(fd2, n) {
      var list = [];
      if (cfg.web3formsKey) list.push(['web3forms', viaWeb3Forms]);
      if (cfg.formsubmitEmail) list.push(['formsubmit', viaFormSubmit]);
      if (n >= list.length) fail();
      return list[n][1](fd2).catch(function (e) {
        console.error('[Busy Order] ' + list[n][0] + ' failed:', e.message);
        errs.push(list[n][0] + ': ' + e.message);
        return runBackups(fd2, n + 1);
      });
    }
    function attempt(i) {
      if (i >= urls.length) return runBackups(fd, 0);
      return timedFetch(urls[i].url, { method: 'POST', body: fd }, 15000)
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (j) {
            if (r.ok) return j;
            var err = new Error((j && j.error) || ('HTTP ' + r.status));
            err.status = r.status; err.code = j && j.code;
            throw err;
          });
        })
        .catch(function (err) {
          console.error('[Busy Order] ' + urls[i].url + ' failed:', err.status || '', err.code || '', err.message);
          if (err.status === 400) throw err;                     // bad input: do not retry
          errs.push(urls[i].label + ': ' + (err.code || err.message));
          return attempt(i + 1);
        });
    }
    return attempt(0);
  };
})();