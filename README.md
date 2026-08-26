# 💚 Juventude — plataforma de gestão

Sistema interno da Juventude da Igreja. Centraliza eventos, retiros, financeiro geral,
arrecadações, compras, equipe e histórico — tudo rodando no Firebase (Firestore +
Authentication + Hosting), com deploy automático via GitHub Actions.

## Arquitetura

```
retiro-sistema/
├── client/
│   └── src/
│       ├── components/
│       │   ├── Layout.jsx          Shell da PLATAFORMA (nav principal)
│       │   └── RetreatLayout.jsx   Shell do módulo RETIRO (nav aninhado, por edição)
│       ├── pages/
│       │   ├── platform/           Dashboard geral, Eventos, Financeiro geral,
│       │   │                       Arrecadações/Compras consolidadas, Equipe,
│       │   │                       Relatórios, Histórico global
│       │   └── retiro/             Módulo de Retiro (independente, como antes:
│       │                           Dashboard, Participantes, Acomodações,
│       │                           Financeiro, Arrecadações, Programação,
│       │                           Gincana, Compras, Configurações da edição)
│       └── lib/                    Camada de dados (Firestore)
├── firebase/
│   ├── firestore.rules
│   └── scripts/seed.js
└── .github/workflows/               Deploy automático
```

### Como o Retiro continua independente, mas integrado

- O módulo de Retiro vive em `/retiros/:editionId/...` com seu próprio menu lateral,
  intacto desde a primeira versão (Dashboard, Participantes, Acomodações, Financeiro,
  Arrecadações, Programação, Gincana, Compras). Nada foi removido.
- Toda movimentação financeira (retiro, evento ou avulsa) grava, no mesmo documento,
  de onde ela veio: `origem_tipo` (`retiro` | `evento` | `geral`), `origem_id` e
  `origem_label`. O **Financeiro Geral** lê essas mesmas movimentações — não copia
  nada — e cada linha tem um link que volta direto para a origem (o retiro ou o
  evento). Arrecadações e Compras seguem o mesmo princípio.
- Isso cumpre a regra central pedida: **cadastrar uma vez, usar em todos os lugares**.

## Novos módulos desta etapa

- **📊 Dashboard Geral** — panorama de financeiro, retiro atual, próximos eventos e equipe.
- **📅 Eventos** — cultos, luaus, evangelismos etc., com tipos personalizáveis, status
  e lançamentos financeiros próprios que já aparecem no Financeiro Geral.
- **💰 Financeiro Geral** — consolidado de todas as origens, com filtro por origem e
  link de volta para o retiro/evento.
- **🎪 Arrecadações** e **🛒 Compras** — versões consolidadas (o cadastro específico
  de cada retiro continua dentro do módulo do retiro).
- **👥 Equipe e Responsáveis** — diretório de pessoas, áreas personalizáveis.
- **📈 Relatórios** — relatório anual simplificado + comparativo entre edições do retiro
  (antes chamado de "Comparativo" no Histórico).
- **📜 Histórico** — auditoria global (não fica mais restrita a uma edição).

## ⏭️ Próxima etapa (ainda não implementado)

Estes módulos aparecem no menu como "em construção" — são grandes o suficiente para
merecer uma rodada própria de desenvolvimento:

- **Checklists** com seções, prioridades e progresso.
- **Estoque** com localização física hierárquica (Igreja → Sala → Armário → Prateleira)
  e reserva de itens por evento.
- **Importar/Exportar** planilhas (Excel/CSV) com mapeamento de colunas, prévia e
  detecção de duplicidade.
- Relatório anual completo (a versão atual é simplificada) e parcelamento de cartão de
  crédito / controle de caixa em espécie no financeiro.

## Módulos construídos até agora

- 📊 Dashboard Geral · 📅 Eventos (com reserva de estoque vinculada) ·
  🏕️ Retiros (módulo independente e completo) · 💰 Financeiro Geral consolidado
  (entradas, saídas, parcelamentos de cartão de crédito, caixa em espécie) ·
  🎪 Arrecadações e 🛒 Compras consolidadas · 👥 Equipe e Responsáveis ·
  ✅ Checklists · 📦 Estoque · 📈 Relatórios (anual completo + comparativo) ·
  📜 Histórico global · 📥 Importar/Exportar (todos os módulos) ·
  🎨 Identidade visual customizável · 🔐 **Perfis de acesso configuráveis**.

### Perfis de acesso com 3 níveis

Em **Configurações → Perfis de acesso**, agora dá para criar quantos perfis
quiser, com controle total:

- **Administrador** — acesso total (perfil padrão do sistema, não pode ser
  editado nem excluído).
- **Perfis intermediários** — crie perfis personalizados (ex: "Recepção",
  "Comunicação") e escolha, por checkbox, exatamente quais módulos essa pessoa
  pode criar/editar/excluir: Participantes, Acomodações, Financeiro,
  Arrecadações, Programação, Gincana, Compras, Eventos, Checklists, Equipe,
  Estoque. Dashboard, Relatórios e Histórico ficam sempre visíveis para
  leitura.
- **Visualizador** — marque a opção "Somente visualização" ao criar um perfil:
  a pessoa navega e vê todos os módulos, mas não consegue criar, editar ou
  excluir nada em lugar nenhum. Um perfil "Visualizador" pronto já vem
  configurado se você rodar o script de seed novamente — ou você mesmo pode
  criar um agora mesmo pela própria interface, em Configurações → Perfis de
  acesso → Novo perfil → marcar "Somente visualização".

A restrição é aplicada nas regras de segurança do Firestore — ou seja, é real,
não só visual. Mesmo que alguém tente burlar a interface, o banco recusa a
gravação.

## ⏭️ Ainda não implementado

- Nada ficou pendente da lista original. Próximos passos são refinamentos e
  itens que você trouxer do uso real do sistema.

## Setup

Esta etapa **alterou as regras de segurança do Firestore** (novo conceito de
perfil "somente visualização" e restrição de Checklists/Equipe/Estoque por
módulo, que antes eram liberados para qualquer usuário ativo). É necessário
publicar as regras atualizadas:

1. Copie o conteúdo de `firebase/firestore.rules`
2. Firebase Console → Firestore Database → aba **Rules** → cole e publique

Depois, atualize os arquivos no GitHub (upload manual da pasta `client/`) — a
Vercel publica automaticamente. Não é necessário rodar `npm run seed`.

**Atenção:** usuários com perfis personalizados que você já tinha criado antes
continuam funcionando normalmente — a mudança só adiciona a possibilidade de
marcar um perfil como "somente visualização" e restringe mais três módulos
(Checklists, Equipe, Estoque) que antes qualquer pessoa logada podia editar.
Se você quer que os perfis existentes continuem editando esses três módulos,
edite cada perfil em Configurações → Perfis de acesso e marque as caixinhas
correspondentes.

Se este for um projeto novo, siga o passo a passo completo: criar projeto no Firebase,
rodar `cd firebase && npm run seed`, preencher `client/.env`, publicar as regras e
conectar ao GitHub Actions para deploy automático.
