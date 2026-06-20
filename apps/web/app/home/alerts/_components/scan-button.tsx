'use client';

import { useTransition } from 'react';

import { Loader2, RadarIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';

import { runMonitoringScanAction } from '~/lib/vendorshield/actions/monitoring.actions';

export function ScanButton() {
  const [pending, startTransition] = useTransition();

  const onClick = () =>
    startTransition(async () => {
      const res = await runMonitoringScanAction();
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(
        res.created > 0
          ? `${res.created} nouvelle(s) alerte(s) détectée(s)`
          : 'Aucune nouvelle alerte — tout est à jour.',
      );
    });

  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={pending}>
      {pending ? (
        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
      ) : (
        <RadarIcon className="mr-1.5 h-4 w-4" />
      )}
      Scanner maintenant
    </Button>
  );
}
