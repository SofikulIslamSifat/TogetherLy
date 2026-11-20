import { supabase } from '@/lib/supabase';

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error !== null) {
    if ('message' in error && typeof error.message === 'string' && error.message) return error.message;
    if ('details' in error && typeof error.details === 'string' && error.details) return error.details;
    if ('hint' in error && typeof error.hint === 'string' && error.hint) return error.hint;
  }
  return fallback;
}

async function ensureCurrentUserProfile(): Promise<void> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Sign in before creating a space.');

  const metadataName = data.user.user_metadata?.display_name;
  const displayName =
    typeof metadataName === 'string' && metadataName.trim().length >= 2
      ? metadataName.trim().slice(0, 60)
      : 'Togetherly member';
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(
      { id: data.user.id, display_name: displayName },
      { onConflict: 'id', ignoreDuplicates: true },
    );
  if (profileError) throw profileError;
}

export type SpaceMember = {
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
  profile: { display_name: string; avatar_path: string | null } | null;
};

export type TogetherlySpace = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  role: 'owner' | 'member';
  members: SpaceMember[];
};

export async function getMySpace(): Promise<TogetherlySpace | null> {
  const { data: membership, error: membershipError } = await supabase
    .from('space_members')
    .select('space_id, role, spaces(id, name, created_by, created_at)')
    .maybeSingle();
  if (membershipError) throw membershipError;
  if (!membership?.spaces) return null;

  const { data: roster, error: rosterError } = await supabase
    .from('space_members')
    .select('user_id, role, joined_at, profiles(display_name, avatar_path)')
    .eq('space_id', membership.space_id)
    .order('joined_at', { ascending: true });
  if (rosterError) throw rosterError;

  const members: SpaceMember[] = (roster ?? []).map((row: any) => ({
    user_id: row.user_id,
    role: row.role,
    joined_at: row.joined_at,
    profile: Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles ?? null,
  }));
  const space = Array.isArray(membership.spaces) ? membership.spaces[0] : membership.spaces;
  return { ...space, role: membership.role, members } as TogetherlySpace;
}

export async function createSpace(name: string): Promise<string> {
  await ensureCurrentUserProfile();
  const { data, error } = await supabase.rpc('create_space', { p_name: name.trim() });
  if (error) throw new Error(getApiErrorMessage(error, 'The space could not be created.'));
  if (!data) throw new Error('The space could not be created.');
  return data as string;
}

export async function createSpaceInvitation(spaceId: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_space_invitation', { p_space_id: spaceId });
  if (error) throw new Error(getApiErrorMessage(error, 'The invitation could not be created.'));
  if (!data) throw new Error('The invitation could not be created.');
  return data as string;
}

export async function acceptSpaceInvitation(token: string): Promise<string> {
  const { data, error } = await supabase.rpc('accept_space_invitation', { p_token: token.trim().toLowerCase() });
  if (error) throw new Error(getApiErrorMessage(error, 'The invitation could not be accepted.'));
  if (!data) throw new Error('The invitation could not be accepted.');
  return data as string;
}
