'use client';

import { useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { ClipboardList, Copy, Loader2, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

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

const STATUS_CLS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  submitted: 'bg-green-100 text-green-800',
  expired: 'bg-gray-100 text-gray-700',
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
  const { t, i18n } = useTranslation('vendorshield');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const copy = (token: string) => {
    navigator.clipboard.writeText(portalLink(token));
    toast.success(t('questionnaire.linkCopied'));
  };

  const create = () => {
    startTransition(async () => {
      const res = await createQuestionnaireRequestAction(supplierId);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      await navigator.clipboard.writeText(portalLink(res.data.token)).catch(() => {});
      toast.success(t('questionnaire.created'));
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
          {t('questionnaire.title')}
        </CardTitle>
        <CardDescription className="text-xs">
          {t('questionnaire.desc')}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {requests.length > 0 ? (
          <ul className="space-y-2">
            {requests.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 rounded-lg border p-2">
                <div className="min-w-0">
                  <div className="text-xs font-medium">
                    {t('questionnaire.sentOn', { date: new Date(r.sent_at).toLocaleDateString(i18n.language) })}
                    {r.status === 'submitted' && r.score !== null && (
                      <span className="text-muted-foreground"> · {t('questionnaire.score', { score: r.score })}</span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Badge className={STATUS_CLS[r.status]}>{t(`questionnaire.status.${r.status}`)}</Badge>
                  {r.status === 'pending' && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => copy(r.token)}
                      title={t('questionnaire.copyLink')}
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
          <p className="text-muted-foreground text-sm">{t('questionnaire.empty')}</p>
        )}

        <Button type="button" size="sm" className="w-full" disabled={isPending} onClick={create}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('questionnaire.creating')}
            </>
          ) : (
            <>
              <Send className="mr-1.5 h-4 w-4" /> {t('questionnaire.send')}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
