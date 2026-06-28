'use client';

import { useActionState } from 'react';

import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';

import { activateSubscriptionManuallyAction } from '~/lib/billing/manual-activation.actions';
import { billingConfig } from '~/config/billing.config';

export function ManualActivationForm() {
  const [state, formAction, isPending] = useActionState(
    activateSubscriptionManuallyAction,
    null,
  );

  return (
    <form action={formAction}>
      <Card>
        <CardHeader>
          <CardTitle>Activer un abonnement après virement</CardTitle>
          <CardDescription>
            Une fois le virement bancaire confirmé sur le compte, active
            l&apos;abonnement du client ici. Le client doit déjà avoir un
            compte VendorShield (même en essai gratuit).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {state && !state.success && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {state.error}
            </div>
          )}
          {state && state.success && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              {state.message}
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="email">Email du client</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="client@entreprise.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="plan">Plan</Label>
              <Select name="plan" defaultValue="starter" required>
                <SelectTrigger id="plan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {billingConfig.plans
                    .filter((p) => !p.custom)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="interval">Période réglée</Label>
              <Select name="interval" defaultValue="month" required>
                <SelectTrigger id="interval">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">1 mois</SelectItem>
                  <SelectItem value="year">1 an</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" disabled={isPending} className="w-fit">
            {isPending ? 'Activation…' : 'Activer l’abonnement'}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
