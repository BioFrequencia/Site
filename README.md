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

- Node.js 20+ e npm.
- A API (`BioFrequenciaApi`) rodando e acessível — ver o README daquele
  repositório. O endereço é configurável na tela de login (fica salvo
  no `localStorage` do navegador); o padrão é
  `http://localhost/BioFrequenciaApi/`.

## Rodando localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`. Na tela de login, clique em "Endereço da
API" se a sua API não estiver em `http://localhost/BioFrequenciaApi/`.

## Build de produção

```bash
npm run build
npm start
```

## Testes/verificação

```bash
npx tsc --noEmit   # checagem de tipos
npm run lint       # ESLint (eslint-config-next)
npm run build      # build de produção completo
```

Os três passam limpos neste ambiente. Além disso, esta rodada rodou um
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

Página pública (sem login) que oferece dois `.zip` com o **código-fonte**
do desktop e do app do aluno — não existe instalador (.exe) nem build
(.apk) pré-compilado, porque este ambiente de desenvolvimento não tem o
.NET SDK nem uma conta EAS configurada para gerar isso. Os arquivos
ficam em `public/downloads/` e são gerados/atualizados com:

```bash
./scripts/build-downloads.sh
```

Rode esse script de novo sempre que o código do desktop (`../BioFrequencia`)
ou do app (`../mobile-app`) mudar, para os `.zip` não ficarem
desatualizados.

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
  api.ts                       cliente HTTP (mesmo contrato do clsApiService.cs)
  auth.tsx                     AuthContext (sessão em localStorage)
  types.ts                     tipos espelhando as respostas da API
  format.ts                    formatação de data/CPF/telefone, badges, CSV
```

## Segurança

- Sessão fica em `localStorage` (token JWT + dados básicos da
  coordenação) — mesmo modelo de token Bearer do desktop/app, sem
  cookies, então CORS liberado na API (`Access-Control-Allow-Origin: *`)
  não abre brecha de CSRF (ver `helpers/cors.php` na API).
- Toda tela sob `(painel)` verifica autenticação em
  `(painel)/layout.tsx` e redireciona para `/login` se não houver
  sessão; `/login` e `/cadastro` fazem o inverso (redirecionam para
  `/dashboard` se já houver sessão).
