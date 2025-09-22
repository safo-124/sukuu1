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
