# Guia da apresentação

Documento de apoio para a entrega acadêmica do LootScanner. O
[README](../README.md) descreve o produto; aqui fica o mapeamento com os
requisitos e o roteiro da demonstração.

---

## Tecnologias obrigatórias do trabalho

| Requisito | Onde está no projeto |
|---|---|
| **React Native + Expo**, interface e navegação | Expo SDK 57 + **Expo Router** (navegação por arquivos) em [`app/`](app) |
| **Expo SQLite** para armazenamento local | [`src/db/schema.ts`](src/db/schema.ts) (migrações) e [`src/db/lootRepo.ts`](src/db/lootRepo.ts) (todo o SQL) |
| **Supabase / PostgreSQL** para persistência online | [`supabase/schema.sql`](supabase/schema.sql), [`src/services/supabase.ts`](src/services/supabase.ts) e [`src/services/sync.ts`](src/services/sync.ts) |

---

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
