// Simple notification stubs; replace with a real email/queue provider as needed

export async function notifyAdminNewRequest(type, payload) {
  try {
    // TODO: Integrate with email (Resend, SendGrid, SES) or webhook/Slack here
    console.info(`[notify] New ${type} request`, {
      requesterName: payload?.requesterName,
      requesterEmail: payload?.requesterEmail,
      createdAt: payload?.createdAt,
    });
  } catch (e) {
    console.error('notifyAdminNewRequest failed', e);
  }
}

export async function notifyAdminStatusChange(type, payload) {
  try {
    console.info(`[notify] ${type} status change`, {
      id: payload?.id,
      status: payload?.status,
      notes: payload?.notes,
      at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('notifyAdminStatusChange failed', e);
  }
}

// Notify the requester (via email provider, etc.) about updates to their request
export async function notifyRequesterSchoolRequest(event, payload) {
  try {
    // event: 'STATUS_CHANGE' | 'CONVERTED'
    // payload: { email, name, schoolName, status?, notes?, subdomain? }
    console.info(`[notify-requester] ${event}`, {
      to: payload?.email,
      name: payload?.name,
      schoolName: payload?.schoolName,
      status: payload?.status,
      subdomain: payload?.subdomain,
      notes: payload?.notes,
      at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('notifyRequesterSchoolRequest failed', e);
  }
}

// --- Generic provider helpers (email/push) ---
const EMAIL_FROM = process.env.EMAIL_FROM || 'no-reply@sukuu.app';
const PUSH_PROVIDER = process.env.PUSH_PROVIDER || null; // e.g. 'fcm' | 'onesignal'

async function getEmailTransporter() {
  // Only try to set up transporter if SMTP env is present
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  try {
    const mod = await import('nodemailer');
    const nodemailer = mod.default || mod;
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    return transporter;
  } catch (e) {
    console.warn('nodemailer not available, email send disabled');
    return null;
  }
}

export async function sendEmail({ to, subject, html, text }) {
  try {
    const transporter = await getEmailTransporter();
    if (!transporter) {
      console.warn('Email transporter not configured; skipping sendEmail');
      return { skipped: true };
    }
    const info = await transporter.sendMail({ from: EMAIL_FROM, to, subject, html, text });
    return info;
  } catch (e) {
    console.error('sendEmail failed', e);
    return { ok: false, error: e?.message };
  }
}

export async function sendPush({ toDevices = [], title, body, data }) {
  try {
    if (!PUSH_PROVIDER) {
      console.warn('Push provider not configured; skipping sendPush');
      return { skipped: true };
    }
    // TODO: Implement provider-specific logic (FCM, OneSignal, etc.)
    console.log('sendPush stub', { provider: PUSH_PROVIDER, count: toDevices.length, title, body, data });
    return { ok: true };
  } catch (e) {
    console.error('sendPush failed', e);
    return { ok: false, error: e?.message };
  }
}

// High-level notifier used by assignment creation
export async function notifyParentsNewAssignment({ schoolId, assignment, subject, section, _class, parents, announcement }) {
  const dueStr = new Date(assignment.dueDate).toLocaleDateString();
  const scopeText = section ? `Section ${section.name}` : _class ? `Class ${_class.name}` : subject?.name || 'Subject';
  const title = `New assignment: ${subject?.name || ''} - ${assignment.title}`.trim();
  const body = `A new assignment has been posted for ${scopeText}. Due on ${dueStr}.`;
  const deepLink = `assignment://${assignment.id}`;

  // Collect email list from parents (User email)
  const emails = parents.map((p) => p?.user?.email).filter(Boolean);
  if (emails.length > 0) {
    try {
      await sendEmail({
        to: emails.join(','),
        subject: title,
        text: `${body}\n\nOpen assignment: ${deepLink}`,
        html: `<p>${body}</p><p><a href="${deepLink}">Open assignment</a></p>`
      });
    } catch (e) {
      console.error('notifyParentsNewAssignment: sendEmail failed', e);
    }
  }

  // Push devices: to be wired to real device tokens
  const toDevices = [];
  await sendPush({ toDevices, title, body, data: { deepLink, schoolId, assignmentId: assignment.id, announcementId: announcement?.id } });

  return { ok: true };
}
