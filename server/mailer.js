const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// Basic dev-friendly mailer. If SMTP env is set, use it; otherwise write to data/outbox and log.

let transport = null;
function getTransport() {
  if (transport) return transport;
  const smtpUrl = process.env.SMTP_URL || '';
  if (smtpUrl) {
    transport = nodemailer.createTransport(smtpUrl);
  } else if (process.env.SMTP_HOST) {
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: !!process.env.SMTP_SECURE,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || '' } : undefined,
    });
  } else {
    // Fallback: stream to buffer (no real sending)
    transport = nodemailer.createTransport({ streamTransport: true, newline: 'unix', buffer: true });
  }
  return transport;
}

async function sendMail({ to, subject, text, html }) {
  const from = process.env.MAIL_FROM || 'no-reply@card-bazaar.local';
  const info = await getTransport().sendMail({ from, to, subject, text, html });
  // If using streamTransport, write file to outbox for inspection
  if (info.message) {
    const outDir = path.join(process.cwd(), 'data', 'outbox');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const fname = path.join(outDir, `${ts}-${(String(to).replace(/[^a-zA-Z0-9@._-]/g,'_'))}.eml`);
    fs.writeFileSync(fname, info.message);
    // eslint-disable-next-line no-console
    console.log(`Dev mail written: ${fname}`);
  }
  return info;
}

module.exports = { sendMail };

