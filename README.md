# 🎒 LootScanner

Aplicativo mobile de **achados e perdidos** com casca de RPG, feito em **React Native + Expo**.

---

## O problema real

Em escolas, faculdades, empresas e eventos, os objetos perdidos vão parar numa caixa no balcão da
recepção — sem registro nenhum. Quem perdeu não tem como saber se o objeto foi achado, e quem achou
não tem como avisar o dono. O resultado é sempre o mesmo: uma pilha de casacos, garrafas e
carregadores que ninguém reclama.

O **LootScanner** resolve isso em duas partes:

1. **Catalogar é rápido.** Quem acha o objeto fotografa, o app sugere nome e categoria, e o registro
   fica salvo com o local onde foi encontrado.
2. **Quem perdeu consegue procurar.** Todo item publicado vai para um **mural coletivo** online,
   pesquisável por nome, local ou observação.

A camada de gamificação — raridade, inventário, XP, coleção — não muda a função prática do app.
Ela existe para tornar o ato de registrar mais engajante, o que aumenta a chance de as pessoas
realmente cadastrarem o que encontram.

> A identificação por **IA de visão** já está implementada — veja
> [Identificação por IA](#identificação-por-ia-opcional). Sem ela configurada, o app usa um
> provedor simulado determinístico (a mesma foto sempre devolve o mesmo item), então o fluxo
> funciona de ponta a ponta offline.

---

## Tecnologias obrigatórias do trabalho

| Requisito | Onde está no projeto |
|---|---|
| **React Native + Expo**, interface e navegação | Expo SDK 57 + **Expo Router** (navegação por arquivos) em [`app/`](app) |
| **Expo SQLite** para armazenamento local | [`src/db/schema.ts`](src/db/schema.ts) (migrações) e [`src/db/lootRepo.ts`](src/db/lootRepo.ts) (todo o SQL) |
| **Supabase / PostgreSQL** para persistência online | [`supabase/schema.sql`](supabase/schema.sql), [`src/services/supabase.ts`](src/services/supabase.ts) e [`src/services/sync.ts`](src/services/sync.ts) |

---

## Como rodar

### 1. Instalar as dependências

```bash
npm install
```

### 2. Criar o projeto no Supabase

1. Crie uma conta em [supabase.com](https://supabase.com) e um projeto novo (o plano gratuito basta).
2. No painel, vá em **SQL Editor ▸ New query**, cole todo o conteúdo de
   [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.
   Isso cria as tabelas `profiles` e `loot_items`, os gatilhos, a view `mural_view` e as políticas
   de segurança (RLS).
3. Vá em **Authentication ▸ Providers ▸ Email** e **desative "Confirm email"**.
   Sem isso, cada cadastro exige clicar num link no e-mail antes de conseguir entrar — o que
   costuma travar a apresentação.

### 3. Preencher as credenciais

```bash
cp .env.example .env
```

No painel do Supabase, em **Project Settings**, copie:

- **Data API ▸ Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
- **API Keys ▸ anon / publishable** → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

> A chave `anon` é pública por design — ela vai dentro do app de qualquer forma. Quem protege os
> dados são as políticas de RLS do `schema.sql`: qualquer pessoa logada **lê** o mural (essa é a
> função dele), mas só o dono **escreve** nos próprios itens.

### 4. Conferir se deu certo

```bash
npm run check:supabase
```

Esse comando testa a configuração sem precisar abrir o app: valida o `.env`, confirma que o
projeto responde e aceita a chave, verifica se o `schema.sql` criou as tabelas, a view e as
políticas de RLS, e avisa se o **"Confirm email"** ainda estiver ligado. Cada falha vem com o
caminho exato no painel para corrigir.

### 5. Iniciar

```bash
npx expo start --clear
```

Abra no **Expo Go** (Android/iOS) ou num emulador. O `--clear` é necessário na primeira vez depois
de editar o `.env`.

**O app funciona sem o Supabase configurado**: o inventário local (SQLite) roda por completo,
apenas o mural fica desativado com um aviso explicando o que falta.

---

## Telas

| Aba | O que faz |
|---|---|
| 🎒 **Inventário** | Lista tudo que você catalogou, com busca por texto e filtros por raridade e situação. Lê direto do SQLite. |
| 📷 **Escanear** | Câmera (ou galeria) → identificação → tela de confirmação com nome, local, observação e a opção de publicar no mural. |
| 📜 **Mural** | Itens publicados por todo mundo. Busca por item, local ou pessoa; puxar para baixo sincroniza. |
| 🛡️ **Perfil** | Nível, XP, progresso da coleção, contagem por raridade, conta e botão de sincronizar. |

Tocar num item do inventário abre a **ficha**, onde dá para editar, marcar como devolvido
(+30 XP), publicar/despublicar no mural e excluir.

---

## Como os dados são guardados

O **SQLite é a fonte da verdade**. Tudo é gravado localmente primeiro, então o app funciona
inteiro sem internet — inclusive escanear e registrar. O Supabase é a camada de compartilhamento.

```
Escanear → identificar → grava no SQLite  ──push──▶  Supabase (PostgreSQL)
                              ▲                             │
                              └────────  pull (cache)  ──────┘
```

### Local — SQLite (`lootscanner.db`)

| Tabela | Para quê |
|---|---|
| `loot_items` | O inventário do usuário. Colunas `shared`, `sync_state`, `remote_id` e `deleted` controlam o que ainda falta enviar. |
| `mural_cache` | Cópia local do mural, para que ele abra offline e instantaneamente. |
| `sync_meta` | Chave/valor de controle (data do último sync). |

O esquema é versionado com `PRAGMA user_version` em [`src/db/schema.ts`](src/db/schema.ts).
Todo SQL fica em [`src/db/lootRepo.ts`](src/db/lootRepo.ts) e usa **sempre parâmetros `?`**.

### Online — Supabase / PostgreSQL

| Objeto | Para quê |
|---|---|
| `profiles` | Nome de caçador de cada usuário (criado por gatilho no cadastro). |
| `loot_items` | Os itens publicados. `unique (owner_id, local_id)` faz o envio ser **idempotente**: reenviar o mesmo item atualiza, nunca duplica. |
| `mural_view` | Junta itens + perfis para o app receber o nome de quem achou já pronto. |

A sincronização ([`src/services/sync.ts`](src/services/sync.ts)) faz, nesta ordem: envia os itens
publicados pendentes, remove do servidor os que foram despublicados, apaga os excluídos (usando
"lápides", para nada sumir antes de o servidor confirmar) e, por fim, baixa o mural para o cache.
Ela **nunca lança exceção** — sem rede ou sem login, devolve o motivo e o app segue offline.

---

## Identificação por IA (opcional)

O app aponta a câmera para o objeto e a IA diz **o que é** e **quão raro parece**. Sem isso
configurado, nada quebra: o provedor simulado assume e o fluxo continua idêntico.

### Por que uma Edge Function

A chave da IA **não pode ficar no app**. Qualquer coisa em `EXPO_PUBLIC_*` vai dentro do bundle, e
quem tiver o APK consegue extrair — com a conta correndo por sua parte. Por isso a chamada passa
por [`supabase/functions/identificar-loot`](supabase/functions/identificar-loot/index.ts): a chave
vive lá como secret do projeto, e o Supabase só aceita chamadas com um JWT válido, então apenas
quem está logado no app consegue gastá-la.

```
app  ──foto (base64) + JWT──▶  Edge Function  ──chave no servidor──▶  OpenRouter
                                     │
                                     └──▶  { item, confiança, raridade, frase }
```

### Configurar

1. Crie uma chave em [openrouter.ai](https://openrouter.ai) e ponha alguns dólares de crédito
   (cada escaneamento custa por volta de **US$ 0,006** no modelo padrão).
2. Faça login no CLI do Supabase e ligue ao seu projeto:

   ```bash
   npx supabase login
   npx supabase link --project-ref SEU_PROJECT_REF
   ```

3. Guarde a chave como secret e publique a função:

   ```bash
   npx supabase secrets set OPENROUTER_API_KEY=sk-or-...
   npx supabase functions deploy identificar-loot
   ```

Pronto — o app passa a usar a IA automaticamente assim que você estiver logado. Para trocar de
modelo, use outro slug com visão do OpenRouter:

```bash
npx supabase secrets set OPENROUTER_MODEL=google/gemini-2.5-flash-lite
```

### Como a raridade é decidida

A IA **opina**, mas não manda sozinha. A raridade base vem da categoria do item no catálogo, e a
sugestão da IA só pode movê-la **um degrau** para cima ou para baixo
([`clampRarity`](src/domain/rarity.ts)).

O motivo: a IA enxerga o estado real do objeto — um notebook surrado não é a mesma coisa que um
lacrado — e deixá-la opinar é o que torna o escaneamento divertido. Mas com controle total, o mesmo
tipo de item viria com raridades diferentes a cada foto: a coleção deixaria de ser consistente e o
XP viraria sorteio. O limite de um degrau mantém as duas pontas.

### Detalhes que importam

- **Nada do modelo entra sem validação.** O id do item é conferido contra a lista do catálogo, a
  confiança é presa entre 0 e 1 e a raridade precisa ser um dos cinco valores conhecidos. Resposta
  fora do formato vira "item misterioso", não um erro na tela.
- **Falha suave.** Sem internet, sem login ou com a função fora do ar, o app cai no provedor
  simulado — a demonstração nunca trava por causa da rede.
- **O catálogo da função é gerado**, não copiado na mão: `npm run gen:catalogo` extrai os 36 itens
  de `src/domain/catalog.ts`. Rode depois de mexer no catálogo.

---

## Roteiro da apresentação (10 minutos)

| Tempo | O quê | Critério da rubrica |
|---|---|---|
| ~1 min | **O problema.** A caixa de achados e perdidos da recepção, sem registro nenhum. | Proposta coerente (2,0) |
| ~3 min | **Demo.** Escanear um objeto → confirmar → item cai no inventário → abrir a ficha → marcar como devolvido. Circular pelas 4 abas. | React Native + Expo (2,0) |
| ~2 min | **SQLite.** Fechar o app por completo e reabrir: os itens continuam lá. Mostrar `src/db/schema.ts` e `lootRepo.ts` — as tabelas, as migrações e o SQL parametrizado. | Expo SQLite (3,0) |
| ~3 min | **Supabase.** Tocar em "Sincronizar agora" no Perfil e, ao lado, abrir o painel do Supabase em **Table Editor ▸ loot_items** com a linha nova aparecendo. Mostrar o mural num segundo aparelho/conta vendo o item do primeiro. | Supabase/PostgreSQL (3,0) |
| ~1 min | **Próximo passo.** A visão computacional real entra no 2º bimestre, encaixando em `VisionProvider` sem mexer nas telas. | — |

**Dica para a demo:** deixe dois aparelhos com contas diferentes já logados e um item publicado
antes de começar. Assim o mural coletivo aparece populado e a troca entre os dois é imediata.

---

## Estrutura do projeto

```
app/                        rotas (Expo Router)
  _layout.tsx               SQLiteProvider > AuthProvider > InventoryProvider > Stack
  (tabs)/                   inventário, escanear, mural, perfil
  item/[id].tsx             ficha do item
  login.tsx                 entrar / criar conta

src/
  db/                       schema (migrações) e lootRepo (SQL)
  domain/                   tipos, raridades, catálogo de 35 itens
  hooks/                    useInventory (SQLite), useAuth (Supabase)
  services/                 supabase, sync, vision (mock), photos
  components/               ui, form, icons, LootCard
  theme/                    paleta escura estilo menu de RPG

supabase/schema.sql         script para rodar no SQL Editor do Supabase
```

---

## Problemas comuns

Antes de investigar na mão, rode `npm run check:supabase` — ele costuma apontar a causa direto.

| Sintoma | Causa provável |
|---|---|
| Mural diz "Supabase não configurado" | Falta o `.env`, ou o bundler não foi reiniciado com `npx expo start --clear`. |
| "Conta criada! Confirme o e-mail…" | O **Confirm email** ainda está ligado no painel do Supabase. |
| Login OK, mas o mural fica vazio | O `supabase/schema.sql` não foi rodado, ou rodou pela metade. Rode o script inteiro de novo. |
| Sincronização acusa erro de permissão | As políticas de RLS não foram criadas. Rode a seção 4 do `schema.sql`. |
