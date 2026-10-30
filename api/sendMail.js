// Busy Order: emails every enquiry and paid order to you.
// Needs two environment variables in Vercel: GMAIL_USER and GMAIL_PASS (a Gmail App Password).
const nodemailer = require('nodemailer');
const multer = require('multer');

// Vercel accepts request bodies up to about 4.5 MB, so keep uploads under that.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 4 * 1024 * 1024, files: 5 },
}).array('attachments');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
});

const clean = (v, max = 2000) => String(v || '').replace(/\r/g, '').trim().slice(0, max);

const emailConfigured = () => Boolean(process.env.GMAIL_USER && process.env.GMAIL_PASS);

module.exports = (req, res) => {
    // Allow the site to call this function from your other domain too (busyorder.co.in and busy-order.com)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(204).end();

    // Health check: open https://YOUR-DOMAIN/api/sendMail in a browser. It shows whether email is set up.
    if (req.method === 'GET') return res.status(200).json({ ok: true, emailConfigured: emailConfigured() });

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    if (!emailConfigured()) {
        console.error('GMAIL_USER / GMAIL_PASS are not set in Vercel environment variables.');
        return res.status(500).json({ error: 'Email is not configured on the server.', code: 'NO_ENV' });
    }

    upload(req, res, async (err) => {
        if (err) {
            console.error('Upload error:', err.message);
            return res.status(400).json({ error: 'File upload failed. Keep files under 4 MB.' });
        }

        const b = req.body || {};
        if (b.company) return res.status(200).json({ message: 'OK' }); // spam trap filled in: pretend success

        const type = b.type === 'enquiry' ? 'enquiry' : 'order';
        const name = clean(b.name, 120);
        const email = clean(b.email, 160);
        const phone = clean(b.phone, 40);
        const message = clean(b.message);

        if (!name || !message || (!email && !phone)) {
            return res.status(400).json({ error: 'Please add your name, a message and an email or phone number.' });
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Invalid email address.' });
        }

        let subject, lines;
        if (type === 'enquiry') {
            subject = `New quote request: ${clean(b.service, 60) || 'Project'} from ${name}`;
            lines = [
                `Name: ${name}`,
                `WhatsApp / Phone: ${phone || 'N/A'}`,
                `Email: ${email || 'N/A'}`,
                `Service: ${clean(b.service, 60) || 'N/A'}`,
                `Budget: ${clean(b.budget, 60) || 'N/A'}`,
                '',
                `Message:\n${message}`,
            ];
        } else {
            subject = `PAID ORDER: ${clean(b.product, 80) || 'Design'} from ${name}`;
            lines = [
                `Product: ${clean(b.product, 80) || 'N/A'}`,
                `Razorpay payment ID: ${clean(b.paymentId, 80) || 'N/A'}`,
                '',
                `Name: ${name}`,
                `Email: ${email || 'N/A'}`,
                `Phone: ${phone || 'N/A'}`,
                `Business name: ${clean(b.businessName, 120) || 'N/A'}`,
                `Preferred style: ${clean(b.style, 40) || 'N/A'}`,
                `Preferred colours: ${clean(b.colors, 120) || 'N/A'}`,
                '',
                `Notes:\n${message}`,
            ];
        }

        const mail = {
            from: process.env.GMAIL_USER,
            to: process.env.GMAIL_USER,
            subject,
            text: lines.join('\n'),
            attachments: (req.files || []).map((f) => ({ filename: f.originalname, content: f.buffer })),
        };
        if (email) mail.replyTo = email;

        try {
            await transporter.sendMail(mail);
            return res.status(200).json({ message: 'Sent' });
        } catch (e) {
            console.error('Mail error:', e.code || '', e.message);
            // EAUTH means Gmail rejected the login: create a new App Password and update GMAIL_PASS in Vercel.
            return res.status(500).json({ error: 'Could not send the email right now.', code: e.code || 'MAIL_FAILED' });
        }
    });
};