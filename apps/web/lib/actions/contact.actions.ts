'use server';

import { z } from 'zod';

import { sendEmail } from '~/lib/email/resend.server';

const CONTACT_EMAIL = 'a.chaibou.tech@gmail.com';

const ContactSchema = z.object({
  name: z.string().min(2).max(200),
  email: z.string().email(),
  message: z.string().min(10).max(5000),
});

type ActionResult =
  | { success: true }
  | { success: false; error: string };

export async function sendContactMessageAction(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = ContactSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    message: formData.get('message'),
  });

  if (!parsed.success) {
    return { success: false, error: 'Merci de remplir correctement tous les champs.' };
  }

  const { name, email, message } = parsed.data;

  const result = await sendEmail({
    to: CONTACT_EMAIL,
    subject: `[VendorShield] Nouveau message de ${name}`,
    html: `
      <p><strong>De :</strong> ${escapeHtml(name)} (${escapeHtml(email)})</p>
      <p><strong>Message :</strong></p>
      <p>${escapeHtml(message).replace(/\n/g, '<br/>')}</p>
    `,
  });

  if (!result.sent) {
    return {
      success: false,
      error:
        'Le service email n’est pas encore configuré. Écrivez-nous directement à ' +
        CONTACT_EMAIL,
    };
  }

  return { success: true };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
