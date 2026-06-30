import 'server-only';

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export interface SendEmailResult {
  sent: boolean;
  skipped?: string;
}

/**
 * Envoi d'email via l'API REST Resend.
 *
 * Mode no-op : sans RESEND_API_KEY, on log et on retourne `sent: false`
 * (l'app reste fonctionnelle sans configuration email).
 */
export async function sendEmail({
  to,
  subject,
  html,
}: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? 'Avilyre <onboarding@resend.dev>';

  if (!apiKey) {
    console.warn(
      `[email] RESEND_API_KEY absente — email non envoyé (to=${to}, subject="${subject}")`,
    );
    return { sent: false, skipped: 'no-api-key' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[email] Resend ${res.status}: ${text}`);
      return { sent: false, skipped: `resend-${res.status}` };
    }

    return { sent: true };
  } catch (error) {
    console.error('[email] envoi échoué:', error);
    return { sent: false, skipped: 'network-error' };
  }
}
