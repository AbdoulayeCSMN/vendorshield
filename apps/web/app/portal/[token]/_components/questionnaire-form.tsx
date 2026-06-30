'use client';

import { useState, useTransition } from 'react';

import { CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';

import { submitQuestionnaireAction } from '~/lib/vendorshield/actions/questionnaire.actions';
import type { Question, Responses } from '~/lib/vendorshield/questionnaires';

export function QuestionnaireForm({
  token,
  title,
  supplierName,
  questions,
}: {
  token: string;
  title: string;
  supplierName: string;
  questions: Question[];
}) {
  const [responses, setResponses] = useState<Responses>({});
  const [done, setDone] = useState<{ score: number } | null>(null);
  const [isPending, startTransition] = useTransition();

  const set = (id: string, value: string | number | boolean) =>
    setResponses((r) => ({ ...r, [id]: value }));

  // Groupement par catégorie.
  const categories = Array.from(new Set(questions.map((q) => q.category)));

  const submit = () => {
    const missing = questions.filter(
      (q) => q.type !== 'text' && (responses[q.id] === undefined || responses[q.id] === null),
    );
    if (missing.length) {
      toast.error(`Merci de répondre à toutes les questions (${missing.length} restante(s)).`);
      return;
    }
    startTransition(async () => {
      const res = await submitQuestionnaireAction(token, responses);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setDone(res.data);
    });
  };

  if (done) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center dark:bg-gray-900">
        <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
        <h1 className="mt-3 text-lg font-semibold">Merci !</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Votre auto-évaluation a été transmise à {supplierName ? `pour ${supplierName}` : 'votre donneur d’ordre'}.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white p-6 dark:bg-gray-900">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Merci de compléter cette auto-évaluation. Vos réponses aident à évaluer notre relation
        fournisseur. Environ 3 minutes.
      </p>

      <div className="mt-6 space-y-6">
        {categories.map((cat) => (
          <div key={cat}>
            <h2 className="text-primary text-xs font-semibold uppercase tracking-wide">{cat}</h2>
            <div className="mt-2 space-y-4">
              {questions
                .filter((q) => q.category === cat)
                .map((q) => (
                  <div key={q.id} className="border-b pb-4 last:border-0">
                    <label className="text-sm font-medium">{q.label}</label>

                    {q.type === 'yes_no' && (
                      <div className="mt-2 flex gap-2">
                        {[
                          ['oui', 'Oui'],
                          ['non', 'Non'],
                        ].map(([val, label]) => (
                          <Button
                            key={val}
                            type="button"
                            size="sm"
                            variant={responses[q.id] === val ? 'default' : 'outline'}
                            onClick={() => set(q.id, val!)}
                          >
                            {label}
                          </Button>
                        ))}
                      </div>
                    )}

                    {q.type === 'scale' && (
                      <div className="mt-2 flex gap-1.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Button
                            key={n}
                            type="button"
                            size="icon"
                            className="h-9 w-9"
                            variant={responses[q.id] === n ? 'default' : 'outline'}
                            onClick={() => set(q.id, n)}
                          >
                            {n}
                          </Button>
                        ))}
                      </div>
                    )}

                    {q.type === 'text' && (
                      <textarea
                        className="border-input bg-background mt-2 w-full rounded-md border px-3 py-2 text-sm"
                        rows={3}
                        value={(responses[q.id] as string) ?? ''}
                        onChange={(e) => set(q.id, e.target.value)}
                      />
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      <Button className="mt-6 w-full" disabled={isPending} onClick={submit}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Envoi...
          </>
        ) : (
          'Envoyer mon auto-évaluation'
        )}
      </Button>
      <p className="text-muted-foreground mt-3 text-center text-[11px]">
        Propulsé par Avilyre — vos données sont traitées de façon confidentielle.
      </p>
    </div>
  );
}
