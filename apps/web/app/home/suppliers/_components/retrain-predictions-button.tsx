'use client';

import { useTransition } from 'react';

import { BrainCircuit, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';

import { retrainPredictionsAction } from '~/lib/vendorshield/actions/ml-retrain.actions';

export function RetrainPredictionsButton() {
  const [pending, startTransition] = useTransition();

  const onClick = () =>
    startTransition(async () => {
      const res = await retrainPredictionsAction();
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(
        res.updated > 0
          ? `Prédictions recalculées pour ${res.updated} fournisseur(s)`
          : "Aucune livraison à analyser — importez d'abord un historique.",
      );
    });

  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={pending}>
      {pending ? (
        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
      ) : (
        <BrainCircuit className="mr-1.5 h-4 w-4" />
      )}
      Recalculer les prédictions
    </Button>
  );
}
