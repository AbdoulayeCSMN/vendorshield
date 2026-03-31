'use client';

import { useState, useTransition } from 'react';

import {
  Clock,
  Crown,
  Mail,
  MoreHorizontal,
  Plus,
  Shield,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';

import {
  inviteMemberAction,
  removeMemberAction,
  updateMemberRoleAction,
  type OrgMemberWithEmail,
} from '~/lib/vendorshield/actions/organization.actions';
import {
  PLAN_LABELS,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  type OrgInvitation,
  type OrgMemberRole,
  type Organization,
} from '~/lib/vendorshield/types';

// ─── Role badge ───────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<OrgMemberRole, string> = {
  owner:   'bg-amber-50 text-amber-700 border-amber-200',
  admin:   'bg-blue-50 text-blue-700 border-blue-200',
  analyst: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  viewer:  'bg-gray-50 text-gray-600 border-gray-200',
  auditor: 'bg-purple-50 text-purple-700 border-purple-200',
};

function RoleBadge({ role }: { role: OrgMemberRole }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}

// ─── Dialog invitation ────────────────────────────────────────────────────────

function InviteDialog({
  orgId,
  open,
  onClose,
}: {
  orgId: string;
  open: boolean;
  onClose: (token?: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successToken, setSuccessToken] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await inviteMemberAction(orgId, fd);
      if (!result.success) {
        setError(result.error);
      } else {
        setSuccessToken(result.data.token);
      }
    });
  };

  const inviteUrl = successToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${successToken}`
    : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Inviter un collaborateur</DialogTitle>
          <DialogDescription>
            Un lien d'invitation valide 7 jours sera généré.
          </DialogDescription>
        </DialogHeader>

        {successToken ? (
          <div className="space-y-3">
            <div className="rounded-lg bg-green-50 border border-green-200 p-3">
              <p className="text-sm font-medium text-green-700 mb-2">
                ✓ Invitation créée
              </p>
              <p className="text-xs text-green-600 mb-2">
                Partagez ce lien avec votre collaborateur :
              </p>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={inviteUrl ?? ''}
                  className="text-xs font-mono"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(inviteUrl ?? '')}
                >
                  Copier
                </Button>
              </div>
            </div>
            <Button className="w-full" onClick={() => onClose(successToken)}>
              Terminé
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <Label className="text-sm font-medium">
                Adresse email <span className="text-red-500">*</span>
              </Label>
              <Input
                name="email"
                type="email"
                required
                placeholder="collaborateur@entreprise.com"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Rôle</Label>
              <Select name="role" defaultValue="analyst">
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    ['admin', 'analyst', 'viewer', 'auditor'] as OrgMemberRole[]
                  ).map((role) => (
                    <SelectItem key={role} value={role}>
                      <div>
                        <p className="font-medium">{ROLE_LABELS[role]}</p>
                        <p className="text-xs text-gray-400">
                          {role === 'admin'   && 'Accès complet sauf facturation'}
                          {role === 'analyst' && 'Créer et modifier évaluations'}
                          {role === 'viewer'  && 'Lecture seule'}
                          {role === 'auditor' && 'Lecture + journal d\'audit'}
                        </p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onClose()} disabled={isPending}>
                Annuler
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Génération...' : 'Générer le lien'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface Props {
  org: Organization;
  members: OrgMemberWithEmail[];
  pendingInvitations: OrgInvitation[];
}

export function OrganizationManager({ org, members, pendingInvitations }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showInvite, setShowInvite] = useState(false);

  const handleRoleChange = (memberId: string, role: OrgMemberRole) => {
    startTransition(async () => {
      await updateMemberRoleAction(org.id, memberId, role);
    });
  };

  const handleRemove = (memberId: string) => {
    if (!confirm('Retirer ce membre de l\'organisation ?')) return;
    startTransition(async () => {
      await removeMemberAction(org.id, memberId);
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Info organisation */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base">{org.name}</CardTitle>
              <CardDescription>
                Plan {PLAN_LABELS[org.plan as keyof typeof PLAN_LABELS] ?? org.plan} ·
                {' '}{org.max_suppliers} fournisseurs · {org.max_members} membre{org.max_members > 1 ? 's' : ''}
              </CardDescription>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${
              org.plan === 'enterprise' ? 'bg-amber-50 text-amber-700 border-amber-200' :
              org.plan === 'pro'        ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                         'bg-gray-50 text-gray-600 border-gray-200'
            }`}>
              {PLAN_LABELS[org.plan as keyof typeof PLAN_LABELS] ?? org.plan}
            </span>
          </div>
        </CardHeader>
      </Card>

      {/* Membres */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Membres ({members.length}/{org.max_members})
              </CardTitle>
              <CardDescription>Gérez les accès à votre organisation.</CardDescription>
            </div>
            {members.length < org.max_members && (
              <Button size="sm" onClick={() => setShowInvite(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Inviter
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-800 p-3"
            >
              {/* Avatar */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-sm font-semibold text-gray-600 dark:text-gray-400">
                {(member.display_name ?? member.email ?? '?').charAt(0).toUpperCase()}
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {member.display_name ?? member.email ?? 'Utilisateur'}
                </p>
                {member.email && (
                  <p className="text-xs text-gray-400 truncate">{member.email}</p>
                )}
              </div>

              {/* Rôle */}
              {member.role === 'owner' ? (
                <div className="flex items-center gap-1.5">
                  <Crown className="h-3.5 w-3.5 text-amber-500" />
                  <RoleBadge role="owner" />
                </div>
              ) : (
                <Select
                  value={member.role}
                  onValueChange={(v) => handleRoleChange(member.id, v as OrgMemberRole)}
                  disabled={isPending}
                >
                  <SelectTrigger className="w-32 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['admin', 'analyst', 'viewer', 'auditor'] as OrgMemberRole[]).map((r) => (
                      <SelectItem key={r} value={r} className="text-xs">
                        {ROLE_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Actions */}
              {member.role !== 'owner' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-gray-400 hover:text-red-600 shrink-0"
                  onClick={() => handleRemove(member.id)}
                  disabled={isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}

          {members.length >= org.max_members && (
            <p className="text-xs text-center text-gray-400 pt-2">
              Limite du plan atteinte. Passer à Pro pour inviter plus de membres.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Invitations en attente */}
      {pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Invitations en attente ({pendingInvitations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingInvitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3"
              >
                <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                    {inv.email}
                  </p>
                  <p className="text-xs text-gray-400">
                    Expire le {new Date(inv.expires_at).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'short',
                    })}
                  </p>
                </div>
                <RoleBadge role={inv.role as OrgMemberRole} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <InviteDialog
        orgId={org.id}
        open={showInvite}
        onClose={() => setShowInvite(false)}
      />
    </div>
  );
}
