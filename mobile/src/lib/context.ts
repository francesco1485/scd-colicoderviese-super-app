import { supabase } from './supabase';

export type SCDRole =
  | 'USER_BASE'
  | 'FAMILY'
  | 'ATHLETE'
  | 'MISTER'
  | 'STAFF'
  | 'MANAGER'
  | 'SECRETARIAT'
  | 'REGISTRATION'
  | 'TOURNAMENTS'
  | 'DIRECTION';

export type SCDMembershipContext = {
  user_id: string;
  organization_id: string;
  organization_slug: string;
  role: SCDRole;
  scope: Record<string, unknown>;
  active: boolean;
};

export async function loadMyContext(): Promise<SCDMembershipContext[]> {
  const { data, error } = await supabase.rpc('scd_my_context');
  if (error) throw error;
  return Array.isArray(data) ? (data as SCDMembershipContext[]) : [];
}
