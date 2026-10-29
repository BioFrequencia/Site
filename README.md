# BioFrequência — Site (painel web)

Painel web (Next.js/React, App Router, TypeScript) do sistema
BioFrequência (TCC): faz o mesmo que o software desktop (login,
dashboard, alertas, turmas/alunos, acompanhamento, relatórios,
responsáveis, notificações, check-ins biométricos) direto no navegador,
sem instalar nada, mais uma página pública de downloads do software
desktop e do app do aluno.

Consome exatamente a mesma `BioFrequenciaApi` já usada pelo desktop e
pelo app — nenhum endpoint novo foi criado para o site. Ver
`../AUDITORIA.md` (raiz deste repositório) para o histórico completo de
diagnóstico e o que foi testado nesta rodada.

## Dependências

- Node.js 22+ e npm.
- A API (`BioFrequenciaApi`) rodando e acessível — ver o README daquele
  repositório.

## Endereço da API (`NEXT_PUBLIC_API_URL`)

| Situação | Endereço usado |
|---|---|
| Deploy com `NEXT_PUBLIC_API_URL` (Vercel: Settings → Environment Variables, em Production e Preview) | Sempre esse. O que estiver salvo no navegador é ignorado. |
| Build de produção **sem** a variável | Nenhum: o login mostra "Endereço da API não configurado" (nunca cai em localhost). |
| `npm run dev` | O informado em "Endereço da API (desenvolvimento)" na tela de login, ou `http://localhost/BioFrequenciaApi/` (XAMPP). |

A variável é embutida no JavaScript durante o build: depois de mudá-la na
Vercel, faça um novo deploy. A API precisa liberar a origem do site em
`CORS_ORIGENS` (no Render). Outras variáveis: `NEXT_PUBLIC_APK_URL`
(opcional, link do APK na página de downloads).

A API gratuita do Render "dorme" sem uso; o login dispara um aquecimento
ao abrir e espera até 70 s antes de desistir.

## Rodando localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`. Para rodar o build de produção na sua
máquina, defina a variável (ex.: `.env.local` com
`NEXT_PUBLIC_API_URL=http://localhost/BioFrequenciaApi/`).

## Build de produção

```bash
npm run build
npm start
```

## Testes/verificação

```bash
npm test           # regras de endereço da API, sessão expirada e fuso (lib/*.test.ts)
npx tsc --noEmit   # checagem de tipos
npm run lint       # ESLint (eslint-config-next)
npm run build      # build de produção completo
```

Os quatro rodam no CI (`.github/workflows/site.yml`) em todo push. Os
horários vindos da API estão em UTC e são mostrados no fuso da escola
(`lib/format.ts`). Arquitetura geral: `docs/ARQUITETURA.md` no
repositório da API.

Numa rodada anterior, também foi rodado um
smoke test end-to-end de verdade com Playwright + Chromium, contra a API
PHP real (`php -S`) e um Postgres real com dados de teste: login,
dashboard (gauge com frequência real), alertas, listagem/filtro de
alunos, abertura de um aluno, geração de código de vínculo biométrico,
notificações, check-ins, cadastro de acompanhamento (com busca de aluno
e gravação real), exportação de CSV em Relatórios, página pública de
downloads e logout — e também os fluxos de escrita: cadastro de aluno,
registro de falta, cadastro/vínculo de responsável, encerramento de
alerta e cadastro de nova coordenação. Cada gravação foi conferida
direto no banco depois (não só pela resposta da tela). Nenhum erro de
console/página apareceu em nenhum dos dois runs.

**O que não foi testado**: biometria facial pelo navegador (o site não
tem essa tela — biometria facial continua sendo só no desktop, via
webcam) e o fluxo completo do app do aluno gerando um check-in real que
depois aparece em `/checkins` (o endpoint `digital/checkinBiometrico.php`
em si foi testado à parte, mas não de ponta a ponta a partir do app
Expo neste ambiente).

## Downloads (`/downloads`)

Página pública (sem login). O botão "Baixar APK" aponta para
`NEXT_PUBLIC_APK_URL` ou, sem ela, para a release fixa
`app-mais-recente` que o workflow do repositório **App** republica a cada
push na master (`biofrequencia.apk`). Esse link só abre para quem não
está logado no GitHub da equipe se o repositório App for **público**;
senão, publique o APK em outro lugar e defina `NEXT_PUBLIC_APK_URL`. O
instalador do desktop aparece como "Em breve".

Para quem está logado, a barra mostra "Voltar ao painel" (a página é
aberta também pelo menu do painel).

## Estrutura

```
app/
  layout.tsx, globals.css      shell raiz (fontes, AuthProvider, ToastProvider)
  page.tsx                     redireciona para /dashboard ou /login
  login/, cadastro/            telas públicas de autenticação
  downloads/                   página pública de downloads
  (painel)/layout.tsx          guarda de autenticação + Sidebar (telas internas)
  (painel)/dashboard/          gauge de frequência, evolução, turmas, prioridade
  (painel)/alertas/            filtros + lista de alertas + encerrar
  (painel)/turmas/             listagem/filtro de alunos + cadastro
  (painel)/turmas/[id]/        detalhe do aluno: histórico, biometria digital,
                                responsáveis, acompanhamento
  (painel)/acompanhamento/     timeline global de contatos com responsáveis
  (painel)/relatorios/         exportação de CSV (5 relatórios, mesmos do desktop)
  (painel)/notificacoes/       fila de notificações pendentes/enviadas
  (painel)/checkins/           fila de check-ins biométricos pendentes
components/                    Sidebar, Topbar, Modal, Toast, Icon
lib/
  config.ts                    endereço da API e do APK (testado em config.test.ts)
  api.ts                       cliente HTTP (mesmo contrato do clsApiService.cs)
  auth.tsx                     AuthContext (sessão em localStorage, confere o "exp")
  sessao.ts                    leitura da validade do token
  types.ts                     tipos espelhando as respostas da API
  format.ts                    datas no fuso da escola, CPF/telefone, badges, CSV
```

## Segurança

- Sessão fica em `localStorage` (token JWT + dados básicos da
  coordenação) — mesmo modelo de token Bearer do desktop/app, sem
  cookies, então não há CSRF clássico. A API libera só as origens de
  `CORS_ORIGENS` (ver `helpers/cors.php` na API).
- Toda tela sob `(painel)` verifica autenticação em
  `(painel)/layout.tsx` e redireciona para `/login` se não houver
  sessão; `/login` e `/cadastro` fazem o inverso. Token vencido (lido do
  "exp") é descartado ao abrir o site e ao voltar para a aba.
- O cadastro de coordenação exige o código de acesso da escola
  (`CADASTRO_CODIGO_ACESSO` na API).
- Cabeçalhos `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy` e
  `Permissions-Policy` em todas as páginas (`next.config.ts`).
