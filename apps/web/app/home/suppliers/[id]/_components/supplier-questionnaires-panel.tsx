'use client';

import { useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { ClipboardList, Copy, Loader2, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';

import {
  type QuestionnaireRequestRow,
  createQuestionnaireRequestAction,
  deleteQuestionnaireRequestAction,
} from '~/lib/vendorshield/actions/questionnaire.actions';

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: 'En attente', cls: 'bg-amber-100 text-amber-800' },
  submitted: { label: 'Reçu', cls: 'bg-green-100 text-green-800' },
  expired: { label: 'Expiré', cls: 'bg-gray-100 text-gray-700' },
};

function portalLink(token: string): string {
  if (typeof window === 'undefined') return `/portal/${token}`;
  return `${window.location.origin}/portal/${token}`;
}

export function SupplierQuestionnairesPanel({
  supplierId,
  requests,
}: {
  supplierId: string;
  requests: QuestionnaireRequestRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const copy = (token: string) => {
    navigator.clipboard.writeText(portalLink(token));
    toast.success('Lien copié — à envoyer au fournisseur');
  };

  const create = () => {
    startTransition(async () => {
      const res = await createQuestionnaireRequestAction(supplierId);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      await navigator.clipboard.writeText(portalLink(res.data.token)).catch(() => {});
      toast.success('Questionnaire créé — lien copié dans le presse-papier');
      router.refresh();
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      const res = await deleteQuestionnaireRequestAction(id, supplierId);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <ClipboardList className="text-primary h-4 w-4" />
          Auto-évaluation fournisseur
        </CardTitle>
        <CardDescription className="text-xs">
          Envoyez un questionnaire à remplir par le fournisseur (lien sécurisé, sans compte).
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {requests.length > 0 ? (
          <ul className="space-y-2">
            {requests.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 rounded-lg border p-2">
                <div className="min-w-0">
                  <div className="text-xs font-medium">
                    Envoyé le {new Date(r.sent_at).toLocaleDateString('fr-FR')}
                    {r.status === 'submitted' && r.score !== null && (
                      <span className="text-muted-foreground"> · score {r.score}/100</span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Badge className={STATUS_META[r.status]?.cls}>{STATUS_META[r.status]?.label}</Badge>
                  {r.status === 'pending' && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => copy(r.token)}
                      title="Copier le lien"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    disabled={isPending}
                    onClick={() => remove(r.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">Aucun questionnaire envoyé.</p>
        )}

        <Button type="button" size="sm" className="w-full" disabled={isPending} onClick={create}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Création...
            </>
          ) : (
            <>
              <Send className="mr-1.5 h-4 w-4" /> Envoyer un questionnaire
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
