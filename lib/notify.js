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
