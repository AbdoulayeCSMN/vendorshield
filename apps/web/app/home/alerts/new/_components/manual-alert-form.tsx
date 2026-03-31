'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
import { Textarea } from '@kit/ui/textarea';

import { createManualAlertAction } from '~/lib/vendorshield/actions/alert.actions';
import { CATEGORY_LABELS, type Supplier } from '~/lib/vendorshield/types';
import { useActionState } from 'react';

type FormState = { success?: boolean; error?: string } | null;

interface Props {
  suppliers: Pick<Supplier, 'id' | 'name' | 'country_code' | 'category'>[];
}

export function ManualAlertForm({ suppliers }: Props) {
  const [state, formAction, isPending] = useActionState(
    createManualAlertAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alerte manuelle</CardTitle>
          <CardDescription>
            Créez une alerte contextuelle non liée à une évaluation automatique.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state && !state.success && state.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {state.error}
            </div>
          )}

          {/* Fournisseur */}
          <div>
            <Label className="text-sm font-medium">Fournisseur concerné (optionnel)</Label>
            <Select name="supplier_id">
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Aucun fournisseur spécifique" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Aucun fournisseur</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.country_code && countryFlag(s.country_code)} {s.name}
                    <span className="ml-1 text-xs text-gray-400">— {CATEGORY_LABELS[s.category]}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Titre */}
          <div>
            <Label className="text-sm font-medium">Titre <span className="text-red-500">*</span></Label>
            <Input name="title" required placeholder="Ex: Grève logistique prévue" className="mt-1.5" />
          </div>

          {/* Message */}
          <div>
            <Label className="text-sm font-medium">Description <span className="text-red-500">*</span></Label>
            <Textarea name="message" required placeholder="Décrivez la situation et son impact potentiel..." className="mt-1.5 resize-none" rows={3} />
          </div>

          {/* Sévérité */}
          <div>
            <Label className="text-sm font-medium">Sévérité</Label>
            <Select name="severity" defaultValue="warning">
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Information</SelectItem>
                <SelectItem value="warning">Avertissement</SelectItem>
                <SelectItem value="critical">Critique</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" asChild disabled={isPending}>
          <Link href="/home/alerts">Annuler</Link>
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Création...' : 'Créer l\'alerte'}
        </Button>
      </div>
    </form>
  );
}

function countryFlag(code: string): string {
  return code.toUpperCase().split('').map((c) =>
    String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)
  ).join('');
}
