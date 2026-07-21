import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente com service_role — ignora RLS. Uso restrito a rotas de servidor que
 * precisam gravar/ler `channel_youtube_auth` (tokens OAuth) sem depender de uma
 * sessão de usuário autenticado no Supabase.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
