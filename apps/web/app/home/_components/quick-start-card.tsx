import Link from 'next/link';

import { ArrowRight, Check, Rocket } from 'lucide-react';

import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';

import type { QuickStartStatus } from '~/lib/vendorshield/onboarding.server';

interface Step {
  done: boolean;
  title: string;
  description: string;
  href: string;
  cta: string;
}

export function QuickStartCard({ status }: { status: QuickStartStatus }) {
  const steps: Step[] = [
    {
      done: status.suppliers > 0,
      title: 'Importez vos fournisseurs',
      description:
        'Glissez votre fichier Excel / CSV — scoring automatique en quelques secondes.',
      href: '/home/imports',
      cta: 'Importer un fichier',
    },
    {
      done: status.assessments > 0,
      title: 'Lancez une évaluation de risque',
      description:
        'Notez un fournisseur sur 24 critères (financier, opérationnel, géopolitique, ESG).',
      href: '/home/risk-assessments/new',
      cta: 'Évaluer un fournisseur',
    },
    {
      done: status.alertRules > 0,
      title: 'Configurez vos alertes',
      description:
        'Soyez prévenu par email dès qu’un score critique franchit votre seuil.',
      href: '/home/alerts/rules',
      cta: 'Créer une règle',
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  // Étape active = la première non terminée.
  const activeIndex = steps.findIndex((s) => !s.done);

  return (
    <Card className="border-primary/30 bg-primary/[0.03]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Rocket className="text-primary h-5 w-5" />
          Démarrez en moins de 10 minutes
        </CardTitle>
        <CardDescription>
          {doneCount === 0
            ? 'Bienvenue sur Avilyre 👋 Trois étapes pour voir votre risque fournisseur en temps réel.'
            : `${doneCount}/3 étapes complétées — encore un effort !`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {steps.map((step, i) => {
          const isActive = i === activeIndex;
          return (
            <div
              key={step.title}
              className={`flex items-start gap-3 rounded-lg border p-3 ${
                isActive ? 'border-primary/40 bg-background' : 'border-transparent'
              }`}
            >
              <div
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  step.done
                    ? 'bg-green-500 text-white'
                    : isActive
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {step.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium ${step.done ? 'text-muted-foreground line-through' : ''}`}
                >
                  {step.title}
                </p>
                {!step.done && (
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {step.description}
                  </p>
                )}
              </div>
              {!step.done && (
                <Button
                  asChild
                  size="sm"
                  variant={isActive ? 'default' : 'outline'}
                  className="shrink-0"
                >
                  <Link href={step.href}>
                    {step.cta}
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
