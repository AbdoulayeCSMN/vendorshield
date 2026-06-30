'use client';

import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Check, Shield, Users } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';

import { BrandMark } from '~/components/brand-mark';
import { acceptInvitationAction } from '~/lib/vendorshield/actions/organization.actions';
import { ROLE_LABELS, type OrgMemberRole } from '~/lib/vendorshield/types';

interface InviteAcceptCardProps {
  token: string;
  invitation: {
    email: string;
    role: OrgMemberRole;
    expires_at: string;
    organization: {
      id: string;
      name: string;
      industry: string | null;
      plan: string;
    } | null;
  };
}

export function InviteAcceptCard({ invitation, token }: InviteAcceptCardProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleAccept = () => {
    startTransition(async () => {
      const result = await acceptInvitationAction(token);
      if (result.success) {
        router.push('/home');
      } else {
        setError(result.error);
      }
    });
  };

  const org = invitation.organization;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 justify-center mb-8">
          <BrandMark className="h-8 w-8" />
          <span className="text-xl font-bold">Vendor<span className="text-primary">Shield</span></span>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Vous êtes invité</CardTitle>
            <CardDescription>
              Rejoignez l'organisation {org?.name ?? 'Avilyre'} en tant que{' '}
              <strong>{ROLE_LABELS[invitation.role as OrgMemberRole]}</strong>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {org && (
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Organisation</span>
                  <span className="font-medium text-gray-900 dark:text-white">{org.name}</span>
                </div>
                {org.industry && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Secteur</span>
                    <span className="text-gray-600 dark:text-gray-400">{org.industry}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Votre rôle</span>
                  <span className="font-medium text-primary">{ROLE_LABELS[invitation.role as OrgMemberRole]}</span>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button className="w-full" size="lg" onClick={handleAccept} disabled={isPending}>
              {isPending ? 'Acceptation...' : '✓ Rejoindre l\'organisation'}
            </Button>

            <p className="text-center text-xs text-gray-400">
              Invitation valide jusqu'au{' '}
              {new Date(invitation.expires_at).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'long',
              })}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
