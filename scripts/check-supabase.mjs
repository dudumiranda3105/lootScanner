/**
 * Confere se o Supabase está configurado corretamente, sem precisar abrir o app.
 *
 *   npm run check:supabase
 *
 * Verifica, nesta ordem: o .env, se o projeto responde, se o schema.sql foi
 * rodado (tabelas, view e RLS) e se o "Confirm email" está desligado.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

const VERDE = '\x1b[32m';
const VERMELHO = '\x1b[31m';
const AMARELO = '\x1b[33m';
const CINZA = '\x1b[90m';
const RESET = '\x1b[0m';

let problemas = 0;

const ok = (texto) => console.log(`${VERDE}  OK${RESET}    ${texto}`);

const falha = (texto, dica) => {
  console.log(`${VERMELHO}  FALHA${RESET} ${texto}`);
  if (dica) console.log(`${CINZA}        → ${dica}${RESET}`);
  problemas += 1;
};

const alerta = (texto, dica) => {
  console.log(`${AMARELO}  AVISO${RESET} ${texto}`);
  if (dica) console.log(`${CINZA}        → ${dica}${RESET}`);
};

/** Interrompe a verificação quando não faz sentido continuar. */
class Parar extends Error {}
const parar = () => {
  throw new Parar();
};

async function verificar() {
  /* ---------------------------------------------------------------- *
   * 1. Ler o .env
   * ---------------------------------------------------------------- */

  let conteudo;
  try {
    conteudo = readFileSync(join(raiz, '.env'), 'utf8');
  } catch {
    falha('arquivo .env não encontrado', 'copie o .env.example para .env e preencha os dois valores');
    parar();
  }

  const env = {};
  for (const linha of conteudo.split(/\r?\n/)) {
    const igual = linha.indexOf('=');
    if (linha.trim().startsWith('#') || igual === -1) continue;
    env[linha.slice(0, igual).trim()] = linha
      .slice(igual + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
  }

  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  const chave = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    falha('EXPO_PUBLIC_SUPABASE_URL está vazia', 'Supabase ▸ Settings ▸ Data API ▸ Project URL');
  }
  if (!chave) {
    falha(
      'EXPO_PUBLIC_SUPABASE_ANON_KEY está vazia',
      'Supabase ▸ Settings ▸ API Keys ▸ anon (ou publishable)',
    );
  }
  if (!url || !chave) parar();

  // Erro comum: colar o endereço do painel em vez da URL do projeto.
  const doPainel = /supabase\.com\/dashboard\/project\/([a-z0-9]+)/.exec(url);
  if (doPainel) {
    falha(
      'a URL é a do painel, não a do projeto',
      `troque por https://${doPainel[1]}.supabase.co (Settings ▸ Data API ▸ Project URL)`,
    );
    parar();
  }

  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)) {
    alerta(
      `a URL "${url}" não tem o formato https://xxxx.supabase.co`,
      'confira se não colou junto algum caminho a mais',
    );
  } else {
    ok('URL do projeto tem o formato esperado');
  }

  const base = url.replace(/\/$/, '');

  // Só o cabeçalho `apikey`. As chaves novas (sb_publishable_...) não são JWT,
  // então mandá-las em `Authorization: Bearer` faz o servidor devolver 401.
  const cabecalhos = { apikey: chave };

  /* ---------------------------------------------------------------- *
   * 2. O projeto responde e aceita a chave?
   * ---------------------------------------------------------------- */

  let resposta;
  try {
    resposta = await fetch(`${base}/auth/v1/settings`, { headers: cabecalhos });
  } catch (erro) {
    falha(`não foi possível alcançar ${base}`, `sem internet, ou a URL está errada (${erro.message})`);
    parar();
  }

  if (resposta.status === 401) {
    falha(
      'o projeto respondeu, mas recusou a chave',
      'a chave anon/publishable está errada ou é de outro projeto',
    );
    parar();
  }
  if (!resposta.ok) {
    falha(`o projeto respondeu ${resposta.status}`, 'confira a URL no painel do Supabase');
    parar();
  }

  const configAuth = await resposta.json().catch(() => null);
  ok('projeto alcançado e chave aceita');

  /* ---------------------------------------------------------------- *
   * 3. O schema.sql foi rodado?
   * ---------------------------------------------------------------- */

  /** Sonda uma tabela/view. RLS bloqueando vira 200 com lista vazia, não erro. */
  async function existe(nome) {
    const r = await fetch(`${base}/rest/v1/${nome}?select=*&limit=1`, { headers: cabecalhos });
    if (r.ok) return { existe: true, linhas: (await r.json()).length };
    const corpo = await r.json().catch(() => ({}));
    return { existe: false, status: r.status, mensagem: corpo.message ?? corpo.hint ?? '' };
  }

  const faltando = [];
  for (const nome of ['profiles', 'loot_items', 'mural_view']) {
    const r = await existe(nome);
    if (r.existe) {
      ok(`${nome} existe e está exposta na API`);
    } else {
      faltando.push(nome);
      falha(
        `${nome} não encontrada (${r.status})`,
        r.mensagem || 'rode o supabase/schema.sql no SQL Editor',
      );
    }
  }

  if (faltando.length === 0) {
    // Sem login, as políticas "to authenticated" devem devolver zero linhas.
    const anonimo = await existe('loot_items');
    if (anonimo.linhas === 0) {
      ok('RLS ativo: sem login, o mural não devolve nada');
    } else {
      alerta(
        'sem login o mural devolveu linhas',
        'as políticas de RLS podem não ter sido criadas — rode a seção 4 do schema.sql',
      );
    }
  }

  /* ---------------------------------------------------------------- *
   * 4. "Confirm email" está desligado?
   * ---------------------------------------------------------------- */

  if (!configAuth) {
    alerta(
      'não deu para ler as configurações de autenticação',
      'confira manualmente em Authentication ▸ Providers ▸ Email',
    );
  } else if (configAuth.external?.email === false) {
    falha(
      'o login por e-mail está desativado',
      'Authentication ▸ Sign In / Providers ▸ Email ▸ Enable',
    );
  } else if (configAuth.disable_signup) {
    falha(
      'o cadastro de novos usuários está desativado',
      'Authentication ▸ Sign In / Providers ▸ Allow new users to sign up',
    );
  } else if (configAuth.mailer_autoconfirm === false) {
    alerta(
      '"Confirm email" está LIGADO',
      'cada cadastro vai exigir clicar num link no e-mail — desligue em Authentication ▸ Providers ▸ Email antes da apresentação',
    );
  } else {
    ok('login por e-mail liberado e "Confirm email" desligado');
  }
}

console.log('\nVerificando a configuração do Supabase...\n');

try {
  await verificar();
} catch (erro) {
  if (!(erro instanceof Parar)) throw erro;
}

if (problemas === 0) {
  console.log(`\n${VERDE}Tudo pronto.${RESET} Rode: npx expo start --clear\n`);
} else {
  console.log(`\n${VERMELHO}${problemas} problema(s).${RESET} Veja o passo a passo no README.md\n`);
}

// `process.exitCode` em vez de `process.exit()`: sair à força enquanto o fetch
// ainda tem soquetes abertos derruba o Node no Windows com uma asserção do libuv.
process.exitCode = problemas === 0 ? 0 : 1;
