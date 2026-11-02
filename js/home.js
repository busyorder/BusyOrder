/* Busy Order — homepage behaviour. No login, no Firebase. */
(function () {
  'use strict';

  function start() {
    var BO = window.BUSYORDER;

    var WA_NUMBER = BO.waNumber;             // set in js/config.js

    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

    /* ---------- Simple event tracking (works once Google Analytics / GTM is added) ---------- */
    function track(name, params) {
      try {
        if (window.gtag) window.gtag('event', name, params || {});
        if (window.dataLayer) window.dataLayer.push({ event: name });
      } catch (e) { /* tracking must never break the page */ }
    }
    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-track]');
      if (t) track(t.getAttribute('data-track'));
    });

    /* ---------- Navigation ---------- */
    var nav = $('#nav'), burger = $('#burger');
    function onScroll() { nav.classList.toggle('scrolled', window.scrollY > 24); }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    function setMenu(open) {
      nav.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
    burger.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
    $$('#navlinks a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

    /* Highlight the current section in the menu */
    if ('IntersectionObserver' in window) {
      var links = $$('#navlinks a');
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          links.forEach(function (l) {
            if (l.getAttribute('href') === '#' + en.target.id) l.setAttribute('aria-current', 'true');
            else l.removeAttribute('aria-current');
          });
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      $$('main section[id]').forEach(function (s) { io.observe(s); });
    }

    /* ---------- Hero brief -> WhatsApp ---------- */
    var brief = $('#brief');
    if (brief) {
      brief.addEventListener('submit', function (e) {
        e.preventDefault();
        var svc = (brief.querySelector('input[name="svc"]:checked') || {}).value || 'a project';
        var idea = ($('#idea').value || '').trim();
        var text = 'Hi Krithiga, I need ' + svc + '.' + (idea ? ' ' + idea : '') + ' Can you share a quote?';
        track('generate_lead', { method: 'hero_brief_whatsapp' });
        window.open('https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
      });
    }

    /* ---------- "Get a quote" links preselect the service ---------- */
    $$('[data-service]').forEach(function (a) {
      a.addEventListener('click', function () {
        var sel = $('#f-service');
        if (!sel) return;
        var want = a.getAttribute('data-service');
        for (var i = 0; i < sel.options.length; i++) {
          if (sel.options[i].text === want) { sel.selectedIndex = i; break; }
        }
      });
    });

    /* ---------- Lead form ---------- */
    var form = $('#lead'), msg = $('#msg'), btn = $('#send');

    function show(type, html) {
      msg.className = 'msg ' + type;
      msg.innerHTML = html;
    }
    function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }

    function waLink(d) {
      var t = 'Hi Krithiga, I am ' + d.name + '. I need ' + d.service.toLowerCase() + '. ' + d.message;
      return 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(t);
    }

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var d = {
          name: form.name.value.trim(),
          phone: form.phone.value.trim(),
          email: form.email.value.trim(),
          service: form.service.value,
          budget: form.budget.value,
          message: form.message.value.trim()
        };

        if (form.company.value) return;                       // spam trap filled in: do nothing
        if (!d.name) { show('err', 'Please enter your name.'); form.name.focus(); return; }
        if (!d.phone && !d.email) { show('err', 'Please add a WhatsApp number or an email so I can reply.'); form.phone.focus(); return; }
        if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) { show('err', 'That email address does not look right.'); form.email.focus(); return; }
        if (d.phone && d.phone.replace(/\D/g, '').length < 8) { show('err', 'That phone number looks too short.'); form.phone.focus(); return; }
        if (d.message.length < 10) { show('err', 'Please tell me a little more about your project (at least a sentence).'); form.message.focus(); return; }

        var fd = new FormData();
        fd.append('type', 'enquiry');
        Object.keys(d).forEach(function (k) { fd.append(k, d[k]); });
        fd.append('company', form.company.value);

        btn.disabled = true;
        var label = btn.lastChild.textContent;
        btn.lastChild.textContent = 'Sending...';
        show('', '');

        BO.post(fd)
          .then(function () {
            track('generate_lead', { method: 'contact_form' });
            show('ok', 'Thank you, ' + esc(d.name.split(' ')[0]) + '! Your request is in. I will reply within 24 hours.');
            form.reset();
          })
          .catch(function (err) {
            var why = err ? esc(err.message || err.code || 'unknown') : 'unknown';
            show('err', 'Sorry, that did not go through. <a href="' + waLink(d) + '" target="_blank" rel="noopener">Send the same message on WhatsApp</a> or email busyorderofficial@gmail.com.<br><small style="font-weight:500;opacity:.85">Technical reason: ' + why + '</small>');
          })
          .then(function () {
            btn.disabled = false;
            btn.lastChild.textContent = label;
          });
      });
    }
  }

  // js/config.js normally loads first (see the script tags in each page). If it did not, load it here so nothing breaks.
  if (window.BUSYORDER) { start(); return; }
  var s = document.createElement('script');
  s.src = 'js/config.js?v=4';
  s.onload = start;
  s.onerror = function () {
    window.BUSYORDER = { waNumber: '919042039110', post: function () { return Promise.reject(new Error('js/config.js was not uploaded')); } };
    start();
  };
  document.head.appendChild(s);
})();