import {
  bankTransferConfig,
  getPlan,
  getPlanPrice,
  isBankTransferConfigured,
  type BillingInterval,
} from '~/config/billing.config';

import { CopyField } from './_components/copy-field';

export const dynamic = 'force-dynamic';

const CONTACT_EMAIL = 'a.chaibou.tech@gmail.com';

function Shell({ children }: React.PropsWithChildren) {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 dark:bg-gray-950">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-6 flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight">
            Vendor<span className="text-primary">Shield</span>
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

function Notice({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-xl border bg-white p-8 text-center dark:bg-gray-900">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="text-muted-foreground mt-2 text-sm">{message}</p>
    </div>
  );
}

export default async function PayPage({
  searchParams,
}: {
  searchParams: Promise<{
    plan?: string;
    interval?: string;
    email?: string;
  }>;
}) {
  const params = await searchParams;
  const planId = params.plan ?? 'starter';
  const interval: BillingInterval = params.interval === 'year' ? 'year' : 'month';
  const email = params.email?.trim();

  const plan = getPlan(planId);
  const price = plan ? getPlanPrice(planId, interval) : undefined;

  if (!plan || plan.custom || !price) {
    return (
      <Shell>
        <Notice
          title="Lien invalide"
          message={`Ce lien de paiement n'est pas valide. Contactez ${CONTACT_EMAIL} pour obtenir un nouveau lien.`}
        />
      </Shell>
    );
  }

  if (!isBankTransferConfigured()) {
    return (
      <Shell>
        <Notice
          title="Paiement par virement — en cours de configuration"
          message={`Les coordonnées bancaires ne sont pas encore configurées. Contactez ${CONTACT_EMAIL} pour finaliser votre abonnement ${plan.name}.`}
        />
      </Shell>
    );
  }

  const reference = email || 'votre nom d\'entreprise + Avilyre';

  return (
    <Shell>
      <div className="rounded-xl border bg-white p-8 dark:bg-gray-900">
        <h1 className="text-lg font-semibold">
          Abonnement {plan.name} —{' '}
          {price.amount.toLocaleString('fr-FR')} € /{' '}
          {interval === 'month' ? 'mois' : 'an'}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Pour activer votre abonnement, effectuez un virement bancaire avec
          les coordonnées ci-dessous. Votre accès est activé sous 24 à 48h
          ouvrées après réception.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          {bankTransferConfig.accountHolder ? (
            <CopyField label="Bénéficiaire" value={bankTransferConfig.accountHolder} />
          ) : null}
          {bankTransferConfig.iban ? (
            <CopyField label="IBAN" value={bankTransferConfig.iban} />
          ) : null}
          {bankTransferConfig.bic ? (
            <CopyField label="BIC / SWIFT" value={bankTransferConfig.bic} />
          ) : null}
          {bankTransferConfig.bankName ? (
            <CopyField label="Banque" value={bankTransferConfig.bankName} />
          ) : null}
          <CopyField label="Référence à indiquer dans le virement" value={reference} />
        </div>

        <p className="text-muted-foreground mt-6 text-xs">
          Une question ? Écrivez à{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </div>
    </Shell>
  );
}
