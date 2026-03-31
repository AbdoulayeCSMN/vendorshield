'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { z } from 'zod';

import type {
  OrgMemberRole,
  Organization,
  OrgMember,
  OrgInvitation,
} from '~/lib/vendorshield/types';

type ActionResult<T = null> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string };

// ─── Créer une organisation ───────────────────────────────────────────────────

const CreateOrgSchema = z.object({
  name:         z.string().min(2).max(255),
  industry:     z.string().max(100).optional().or(z.literal('')).transform(v => v || null),
  company_size: z.string().optional().or(z.literal('')).transform(v => v || null),
  country_code: z.string().length(2).optional().or(z.literal('')).transform(v => v || null),
  website:      z.string().url().optional().or(z.literal('')).transform(v => v || null),
});

export async function createOrganizationAction(
  _prevState: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string; slug: string }>> {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  if (auth.error) return { success: false, error: 'Non authentifié' };

  const raw = Object.fromEntries(formData.entries());
  const parsed = CreateOrgSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map(i => i.message).join(', ') };
  }

  // Générer un slug depuis le nom
  const slug = parsed.data.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
    + '-' + Math.random().toString(36).slice(2, 6);

  // Appel à la fonction SQL create_organization() qui :
  // 1. Crée l'org
  // 2. Ajoute l'user comme owner
  // 3. Crée le weight_profile par défaut
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any).rpc('create_organization', {
    p_name:     parsed.data.name,
    p_slug:     slug,
    p_industry: parsed.data.industry,
  });

  if (error) return { success: false, error: error.message };

  const orgId = data as string;

  // Mettre à jour les infos supplémentaires (company_size, country_code, website)
  if (parsed.data.company_size || parsed.data.country_code || parsed.data.website) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client as any)
      .from('organizations')
      .update({
        company_size: parsed.data.company_size,
        country_code: parsed.data.country_code,
        website:      parsed.data.website,
      })
      .eq('id', orgId);
  }

  revalidatePath('/home');
  redirect('/home');
}

// ─── Récupérer les orgs de l'utilisateur ─────────────────────────────────────

export async function getUserOrganizations(): Promise<
  (Organization & { member_role: OrgMemberRole; member_count: number })[]
> {
  const client = getSupabaseServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (client as any)
    .from('org_members')
    .select(`
      role,
      organization:organizations (
        id, name, slug, logo_url, industry, company_size,
        plan, max_suppliers, max_members, created_at
      )
    `)
    .eq('status', 'active');

  if (!data) return [];

  // Pour chaque org, compter les membres
  const orgs = await Promise.all(
    (data as { role: OrgMemberRole; organization: Organization }[]).map(async (row) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count } = await (client as any)
        .from('org_members')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', row.organization.id)
        .eq('status', 'active');

      return {
        ...row.organization,
        member_role: row.role,
        member_count: count ?? 1,
      };
    })
  );

  return orgs;
}

// ─── Récupérer une organisation par ID ───────────────────────────────────────

export async function getOrganization(orgId: string): Promise<Organization | null> {
  const client = getSupabaseServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (client as any)
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single();

  return (data ?? null) as Organization | null;
}

// ─── Récupérer les membres d'une organisation ─────────────────────────────────

export interface OrgMemberWithEmail extends OrgMember {
  email: string | null;
  display_name: string | null;
}

export async function getOrgMembers(orgId: string): Promise<OrgMemberWithEmail[]> {
  const client = getSupabaseServerClient();

  // Récupérer les membres
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: members } = await (client as any)
    .from('org_members')
    .select('*')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .order('role')
    .order('joined_at');

  if (!members || members.length === 0) return [];

  // Récupérer les infos comptes séparément
  // (org_members.user_id → auth.users.id = public.accounts.id)
  const userIds = members.map((m: OrgMember) => m.user_id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: accounts } = await (client as any)
    .from('accounts')
    .select('id, email, name')
    .in('id', userIds);

  const accountMap = new Map(
    (accounts ?? []).map((a: { id: string; email: string; name: string }) => [a.id, a])
  );

  return members.map((m: OrgMember) => {
    const account = accountMap.get(m.user_id) as { email: string; name: string } | undefined;
    return {
      ...m,
      email:        account?.email ?? null,
      display_name: account?.name ?? null,
    };
  });
}

// ─── Inviter un membre ────────────────────────────────────────────────────────

const InviteSchema = z.object({
  email: z.string().email('Email invalide'),
  role:  z.enum(['admin', 'analyst', 'viewer', 'auditor']).default('viewer'),
});

export async function inviteMemberAction(
  orgId: string,
  formData: FormData,
): Promise<ActionResult<{ token: string }>> {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  if (auth.error) return { success: false, error: 'Non authentifié' };

  const parsed = InviteSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Données invalides' };
  }

  // Vérifier si l'email est déjà membre
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingAccount } = await (client as any)
    .from('accounts')
    .select('id')
    .eq('email', parsed.data.email)
    .maybeSingle();

  if (existingAccount) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingMember } = await (client as any)
      .from('org_members')
      .select('id')
      .eq('org_id', orgId)
      .eq('user_id', existingAccount.id)
      .eq('status', 'active')
      .maybeSingle();

    if (existingMember) {
      return { success: false, error: 'Cet utilisateur est déjà membre de l\'organisation' };
    }
  }

  // Vérifier les limites du plan
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: org } = await (client as any)
    .from('organizations')
    .select('max_members')
    .eq('id', orgId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (client as any)
    .from('org_members')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('status', 'active');

  if (org && count !== null && count >= org.max_members) {
    return {
      success: false,
      error: `Limite atteinte : votre plan autorise ${org.max_members} membre(s) maximum`,
    };
  }

  // Révoquer les invitations en attente pour cet email
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (client as any)
    .from('org_invitations')
    .update({ status: 'revoked' })
    .eq('org_id', orgId)
    .eq('email', parsed.data.email)
    .eq('status', 'pending');

  // Créer la nouvelle invitation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invitation, error } = await (client as any)
    .from('org_invitations')
    .insert({
      org_id:     orgId,
      email:      parsed.data.email,
      role:       parsed.data.role,
      invited_by: auth.data.id,
    })
    .select('token')
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath(`/home/organization/${orgId}/members`);

  return {
    success: true,
    data:    { token: invitation.token },
    message: `Invitation envoyée à ${parsed.data.email}`,
  };
}

// ─── Accepter une invitation ──────────────────────────────────────────────────

export async function acceptInvitationAction(
  token: string,
): Promise<ActionResult<{ org_id: string }>> {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  if (auth.error) return { success: false, error: 'Non authentifié' };

  // Récupérer l'invitation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invitation } = await (client as any)
    .from('org_invitations')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!invitation) {
    return { success: false, error: 'Invitation invalide, expirée ou déjà utilisée' };
  }

  // Ajouter le membre
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: memberError } = await (client as any)
    .from('org_members')
    .insert({
      org_id:     invitation.org_id,
      user_id:    auth.data.id,
      role:       invitation.role,
      invited_by: invitation.invited_by,
      joined_at:  new Date().toISOString(),
    });

  if (memberError) {
    if (memberError.code === '23505') {
      return { success: false, error: 'Vous êtes déjà membre de cette organisation' };
    }
    return { success: false, error: memberError.message };
  }

  // Marquer l'invitation comme acceptée
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (client as any)
    .from('org_invitations')
    .update({
      status:      'accepted',
      accepted_by: auth.data.id,
      accepted_at: new Date().toISOString(),
    })
    .eq('token', token);

  revalidatePath('/home');
  return { success: true, data: { org_id: invitation.org_id } };
}

// ─── Changer le rôle d'un membre ─────────────────────────────────────────────

export async function updateMemberRoleAction(
  orgId: string,
  memberId: string,
  role: OrgMemberRole,
): Promise<ActionResult> {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  if (auth.error) return { success: false, error: 'Non authentifié' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (client as any)
    .from('org_members')
    .update({ role })
    .eq('id', memberId)
    .eq('org_id', orgId)
    .neq('user_id', auth.data.id); // Impossible de changer son propre rôle

  if (error) return { success: false, error: error.message };

  revalidatePath(`/home/organization/${orgId}/members`);
  return { success: true, data: null, message: 'Rôle mis à jour' };
}

// ─── Retirer un membre ────────────────────────────────────────────────────────

export async function removeMemberAction(
  orgId: string,
  memberId: string,
): Promise<ActionResult> {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  if (auth.error) return { success: false, error: 'Non authentifié' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (client as any)
    .from('org_members')
    .update({ status: 'left' })
    .eq('id', memberId)
    .eq('org_id', orgId)
    .neq('user_id', auth.data.id); // Impossible de se retirer soi-même

  if (error) return { success: false, error: error.message };

  revalidatePath(`/home/organization/${orgId}/members`);
  return { success: true, data: null };
}

// ─── Mettre à jour les infos de l'organisation ───────────────────────────────

const UpdateOrgSchema = z.object({
  name:         z.string().min(2).max(255),
  industry:     z.string().max(100).optional().or(z.literal('')).transform(v => v || null),
  company_size: z.string().optional().or(z.literal('')).transform(v => v || null),
  country_code: z.string().length(2).optional().or(z.literal('')).transform(v => v || null),
  website:      z.string().url().optional().or(z.literal('')).transform(v => v || null),
  description:  z.string().max(1000).optional(),
});

export async function updateOrganizationAction(
  orgId: string,
  formData: FormData,
): Promise<ActionResult> {
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  if (auth.error) return { success: false, error: 'Non authentifié' };

  const parsed = UpdateOrgSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { success: false, error: 'Données invalides' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (client as any)
    .from('organizations')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', orgId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/home/organization/${orgId}`);
  return { success: true, data: null, message: 'Organisation mise à jour' };
}

// ─── Récupérer les invitations en attente ────────────────────────────────────

export async function getPendingInvitations(orgId: string): Promise<OrgInvitation[]> {
  const client = getSupabaseServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (client as any)
    .from('org_invitations')
    .select('*')
    .eq('org_id', orgId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  return (data ?? []) as OrgInvitation[];
}
