// Template d'email pour une nouvelle alerte fournisseur.

const SEVERITY_META: Record<
  string,
  { label: string; color: string; emoji: string }
> = {
  critical: { label: 'Critique', color: '#dc2626', emoji: '🔴' },
  warning: { label: 'Avertissement', color: '#d97706', emoji: '🟠' },
  info: { label: 'Information', color: '#2563eb', emoji: '🔵' },
};

function esc(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface AlertEmailParams {
  title: string;
  message: string;
  severity: string;
  supplierName?: string | null;
  alertUrl: string;
}

export function renderAlertEmail(params: AlertEmailParams): {
  subject: string;
  html: string;
} {
  const sev = SEVERITY_META[params.severity] ?? SEVERITY_META.info!;
  const supplierLine = params.supplierName
    ? `Fournisseur : <strong>${esc(params.supplierName)}</strong>`
    : '';

  const subject = `${sev.emoji} [${sev.label}] ${params.title}`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f3f4f6;font-family:-apple-system,'Segoe UI',sans-serif;color:#1f2937;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="font-size:18px;font-weight:700;margin-bottom:16px;">
      Vendor<span style="color:#6366f1;">Shield</span>
    </div>
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <div style="height:6px;background:${sev.color};"></div>
      <div style="padding:24px;">
        <div style="display:inline-block;font-size:11px;font-weight:600;color:#fff;background:${sev.color};padding:3px 10px;border-radius:999px;margin-bottom:12px;">
          ${esc(sev.label)}
        </div>
        <h1 style="font-size:18px;margin:0 0 8px;">${esc(params.title)}</h1>
        ${supplierLine ? `<p style="font-size:13px;color:#6b7280;margin:0 0 12px;">${supplierLine}</p>` : ''}
        <p style="font-size:14px;line-height:1.6;color:#374151;margin:0 0 20px;">${esc(params.message)}</p>
        <a href="${esc(params.alertUrl)}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border-radius:8px;">
          Voir l'alerte →
        </a>
      </div>
    </div>
    <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:16px;">
      VendorShield — Supplier Risk Intelligence Platform<br>
      Vous recevez cet email car une alerte a été déclenchée sur votre portefeuille fournisseurs.
    </p>
  </div>
</body>
</html>`;

  return { subject, html };
}
