import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * As credenciais vêm do arquivo `.env` na raiz do projeto (veja `.env.example`).
 * A chave `anon` é pública por design — quem protege os dados são as políticas de
 * RLS definidas em `supabase/schema.sql`, não o segredo da chave.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

/**
 * Sem `.env` configurado o app continua inteiramente funcional offline: o
 * inventário local (SQLite) roda normalmente e só o mural fica indisponível.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        // A sessão vive no AsyncStorage para o usuário não precisar entrar de novo.
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // Só faz sentido na web, onde o token volta na URL depois do login.
        detectSessionInUrl: false,
      },
    })
  : null;

/** Lança um erro claro em vez de estourar um `null` em qualquer lugar do app. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase não configurado. Copie .env.example para .env e preencha EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }
  return supabase;
}

/** Traduz os erros mais comuns do Supabase Auth para português. */
export function traduzErro(message: string): string {
  const map: [RegExp, string][] = [
    [/invalid login credentials/i, 'E-mail ou senha incorretos.'],
    [/email not confirmed/i, 'E-mail ainda não confirmado. Confirme pelo link enviado.'],
    [/user already registered/i, 'Já existe uma conta com este e-mail.'],
    [/password should be at least/i, 'A senha precisa ter pelo menos 6 caracteres.'],
    [/unable to validate email/i, 'E-mail inválido.'],
    [/network request failed|fetch failed/i, 'Sem conexão com a internet.'],
    [/rate limit|too many requests/i, 'Muitas tentativas. Aguarde um instante.'],
  ];

  for (const [pattern, texto] of map) {
    if (pattern.test(message)) return texto;
  }
  return message;
}
