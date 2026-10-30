# Busy Order website

Static website plus one serverless function, hosted on Vercel. No login, no Firebase.

## Pages
- `index.html` is the homepage (services, designs, work, FAQ, quote form).
- `custom.html` lists all 16 designs; each has its own order page (`logo.html`, `poster.html`, ...).
- `website.html`, `mobile.html`, `UI Design.html` are the bigger paid order pages.
- `projectdetails.html` lists college project documents.
- `portfolio.html` is the full portfolio. Legal pages: `privacy.html`, `refund.html`, `termcondition.html`.

## Where to edit
- WhatsApp number: search for `918610597402` (index.html, js/home.js, js/order.js text, and the generated pages).
- Prices on order pages: the `data-amount` attribute is in paise (₹500 = 50000).
- Colours and fonts: `css/base.css` (variables at the top).

## Deploy
1. Push to GitHub; Vercel deploys automatically.
2. In Vercel > Project > Settings > Environment Variables add `GMAIL_USER` and `GMAIL_PASS` (a Gmail App Password).
3. Never commit `.env`. It is listed in `.gitignore`.

## Lead tracking
Add Google Analytics 4 or Google Tag Manager to `index.html`. Buttons already send events
(`generate_lead`, `hero_whatsapp`, `form_submit` and more) once `gtag` or `dataLayer` exists.
