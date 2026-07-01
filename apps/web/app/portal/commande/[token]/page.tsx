import { getDeliveryRequestByToken } from '~/lib/vendorshield/actions/delivery-report.actions';

import { DeliveryForm } from './_components/delivery-form';

export const dynamic = 'force-dynamic';

function Shell({ children }: React.PropsWithChildren) {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 dark:bg-gray-950">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-6 flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight">
            Avi<span className="text-primary">lyre</span>
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

export default async function DeliveryPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const req = await getDeliveryRequestByToken(token);

  if (!req) {
    return (
      <Shell>
        <Notice
          title="Invalid link / Lien invalide"
          message="This delivery report link does not exist or has been deleted. / Ce lien n'existe pas ou a été supprimé."
        />
      </Shell>
    );
  }

  if (req.status === 'expired') {
    return (
      <Shell>
        <Notice
          title="Link expired / Lien expiré"
          message="This link is no longer active. Please contact your buyer. / Ce lien n'est plus actif. Contactez votre donneur d'ordre."
        />
      </Shell>
    );
  }

  if (req.status === 'submitted') {
    return (
      <Shell>
        <Notice
          title="Already submitted / Déjà soumis ✅"
          message="Thank you, your delivery report has been recorded. / Merci, votre rapport de livraison a bien été enregistré."
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <DeliveryForm
        token={token}
        supplierName={req.supplierName}
        periodLabel={req.periodLabel}
        defaultOrderRef={req.orderRef}
      />
    </Shell>
  );
}
