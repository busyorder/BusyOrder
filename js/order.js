/* Busy Order — order pages. Pay with Razorpay, then send the order by email. No login, no Firebase. */
(function () {
  'use strict';

  function start() {
    var BO = window.BUSYORDER;

    var RAZORPAY_KEY_ID = 'rzp_live_N81a7zaGEG0EZn';  // public Key ID (safe in the browser). Never put the Key Secret here.

    var $ = function (s) { return document.querySelector(s); };

    /* ---------- Navigation ---------- */
    var nav = $('#nav'), burger = $('#burger');
    if (nav && burger) {
      var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 24); };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
      burger.addEventListener('click', function () {
        var open = !nav.classList.contains('open');
        nav.classList.toggle('open', open);
        burger.setAttribute('aria-expanded', String(open));
      });
    }

    /* ---------- Order form (design pages, website, mobile, UI/UX) ---------- */
    var form = $('#orderForm');
    if (form) {
      var title = form.getAttribute('data-title');
      var amount = parseInt(form.getAttribute('data-amount'), 10);   // in paise
      var payBtn = $('#payBtn'), submitBtn = $('#submitBtn'), status = $('#payStatus');
      var paymentId = '';

      function details() {
        var g = function (id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; };
        return { name: g('name'), email: g('email'), phone: g('phone'), businessName: g('businessName'), style: g('style'), colors: g('colors'), message: g('description') };
      }
      function valid(d) {
        if (!d.name || !d.email || !d.phone || !d.message) {
          alert('Please fill in your name, email, phone and project notes before paying.');
          return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) { alert('Please enter a valid email address.'); return false; }
        return true;
      }

      payBtn.addEventListener('click', function () {
        var d = details();
        if (!valid(d)) return;
        if (typeof Razorpay === 'undefined') { alert('The payment window could not load. Please check your internet connection and try again.'); return; }

        var rzp = new Razorpay({
          key: RAZORPAY_KEY_ID,
          amount: String(amount),
          currency: 'INR',
          name: 'Busy Order',
          description: title,
          image: location.origin + '/img/icon-192.png',
          prefill: { name: d.name, email: d.email, contact: d.phone },
          theme: { color: '#d4245f' },
          handler: function (res) {
            paymentId = res.razorpay_payment_id || '';
            status.textContent = 'Payment received (ID ' + paymentId + '). Now send your order below.';
            status.classList.add('show');
            payBtn.disabled = true;
            submitBtn.disabled = false;
            submitBtn.focus();
          }
        });
        rzp.on('payment.failed', function (r) {
          alert('Payment failed: ' + (r.error && r.error.description ? r.error.description : 'please try again.'));
        });
        rzp.open();
      });

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!paymentId) { alert('Please complete the payment first.'); return; }

        var d = details();
        var fd = new FormData();
        fd.append('type', 'order');
        fd.append('product', title);
        fd.append('paymentId', paymentId);
        Object.keys(d).forEach(function (k) { fd.append(k, d[k]); });
        var files = $('#file') ? $('#file').files : [];
        for (var i = 0; i < files.length; i++) fd.append('attachments', files[i]);

        submitBtn.disabled = true;
        var label = submitBtn.textContent;
        submitBtn.textContent = 'Sending...';

        BO.post(fd)
          .then(function () {
            window.location.href = 'placedesignsuccess.html';
          })
          .catch(function () {
            submitBtn.disabled = false;
            submitBtn.textContent = label;
            alert('Your payment went through (ID ' + paymentId + ') but the order email failed. Please send this payment ID on WhatsApp to +91 90420 39110 and I will start right away.');
          });
      });
    }

    /* ---------- College project PDFs (pay to view) ---------- */
    var buttons = document.querySelectorAll('.pay-pdf');
    Array.prototype.forEach.call(buttons, function (btn) {
      btn.addEventListener('click', function () {
        if (typeof Razorpay === 'undefined') { alert('The payment window could not load. Please try again.'); return; }
        var pdf = btn.getAttribute('data-pdf');
        var paise = btn.getAttribute('data-amount');
        var label = btn.getAttribute('data-title');
        var rzp = new Razorpay({
          key: RAZORPAY_KEY_ID,
          amount: paise,
          currency: 'INR',
          name: 'Busy Order',
          description: label,
          theme: { color: '#d4245f' },
          handler: function () {
            var box = $('#viewer'), frame = $('#viewerFrame');
            frame.src = pdf;
            box.classList.add('show');
            btn.textContent = 'Paid';
            btn.disabled = true;
            box.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
        rzp.open();
      });
    });
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