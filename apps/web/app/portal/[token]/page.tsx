import { getRequestByToken } from '~/lib/vendorshield/actions/questionnaire.actions';

import { QuestionnaireForm } from './_components/questionnaire-form';

export const dynamic = 'force-dynamic';

function Shell({ children }: React.PropsWithChildren) {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 dark:bg-gray-950">
      <div className="mx-auto w-full max-w-2xl">
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

export default async function PortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const req = await getRequestByToken(token);

  if (!req) {
    return (
      <Shell>
        <Notice title="Lien invalide" message="Ce questionnaire n'existe pas ou a été supprimé." />
      </Shell>
    );
  }

  if (req.status === 'expired') {
    return (
      <Shell>
        <Notice
          title="Lien expiré"
          message="Ce questionnaire n'est plus accessible. Contactez votre donneur d'ordre pour un nouveau lien."
        />
      </Shell>
    );
  }

  if (req.status === 'submitted') {
    return (
      <Shell>
        <Notice
          title="Questionnaire déjà soumis ✅"
          message="Merci, votre auto-évaluation a bien été enregistrée."
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <QuestionnaireForm
        token={token}
        title={req.title}
        supplierName={req.supplier_name}
        questions={req.questions}
      />
    </Shell>
  );
}
