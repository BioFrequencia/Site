# BioFrequência — Site (painel web)

Painel web (Next.js/React, App Router, TypeScript) do sistema
BioFrequência (TCC). O sistema registra as **entradas atrasadas** e as
**saídas antecipadas** dos alunos (as faltas ficam na Sala do Futuro) e
avisa as famílias quando viram rotina. No site, a coordenação registra
na portaria, acompanha os alertas, cuida dos alunos e responsáveis,
configura a escola e tira relatórios; a página pública de downloads tem
o app de biometria do tablet.

Consome a `BioFrequenciaApi` (a mesma do app). A tela **Como funciona**
(`/como-funciona`) explica o sistema e cada página para quem usa.

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
(opcional, link do APK na página de downloads) e `NEXT_PUBLIC_DESKTOP_URL`
(opcional, link do `.exe` do software desktop).

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
npm test           # endereço da API, sessão, fuso, preferências, avisos e gráficos (lib/*.test.ts)
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
alunos, abertura de um aluno, geração de código de vínculo biométrico
(hoje substituído pela conta que o aluno cria no app),
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
senão, publique o APK em outro lugar e defina `NEXT_PUBLIC_APK_URL`.

O software desktop só ganha o botão "Baixar para Windows" com
`NEXT_PUBLIC_DESKTOP_URL` definida; sem ela, o card diz "Em breve" (nunca
um link quebrado). O workflow do repositório **SoftwareDesktop** publica o
`BioFrequencia.exe` numa Release a cada tag `v*`; com esse repositório
público, use
`https://github.com/BioFrequencia/SoftwareDesktop/releases/latest/download/BioFrequencia.exe`
(o mesmo endereço fica em `DESKTOP_URL_RELEASES`, em `lib/config.ts`).

Para quem está logado, a barra mostra "Voltar ao painel" (a página é
aberta também pelo menu do painel).

## Gráficos e animações

Os gráficos do dashboard usam [Recharts](https://recharts.org) no estilo
dos exemplos do shadcn/ui ("Area Chart" e "Radial Chart - Shape"), sem
Tailwind: as cores vêm dos tokens `--grafico-*` de `app/globals.css`, que
mudam no tema escuro. O par de cores das séries passou no validador de
paleta (separação para daltonismo, luminosidade e contraste) nos dois
temas. Cada gráfico tem dica ao passar o mouse, legenda e a tabela com
os números ("Ver os números"). As áreas têm degradê e entram desenhando,
o mês atual tem um ponto que pulsa, passar o mouse (ou clicar) numa
legenda destaca a série, e o número no meio do anel conta junto com ele.

As telas entram em cascata e deslizam ao trocar de página
(`app/(painel)/template.tsx`), os números contam até o valor, as barras
das turmas crescem uma depois da outra e os contadores do menu pulsam
quando mudam. Carregando: o símbolo da marca anima (`Carregando`), as
listas mostram o formato do que vem (`Esqueleto`), uma barra fina corre
no topo enquanto a API responde (`BarraProgresso` + `lib/carregamento.ts`)
e os botões mostram um giro enquanto salvam (`aria-busy`). Com "reduzir
movimento" ligado no sistema, nada anima (CSS e `lib/movimento.ts`).

## Estrutura

```
app/
  layout.tsx, globals.css      shell raiz (fontes, tema, AuthProvider, ToastProvider)
  favicon.ico, icon.svg,       ícones da aba e da tela inicial do celular (logo:
  apple-icon.png                moldura de reconhecimento com o check)
  page.tsx                     redireciona para /dashboard ou /login
  login/, cadastro/            telas públicas de autenticação (com o olhinho da senha)
  confirmar-email/             o link que chega por e-mail (cadastro e troca de e-mail)
  downloads/                   página pública de downloads
  (painel)/layout.tsx          guarda de autenticação + Sidebar (telas internas)
  (painel)/dashboard/          pontualidade do mês (anel), entradas e saídas por mês,
                                pontualidade por turma e quem precisa de atenção
  (painel)/registros/          Entradas e saídas: registrar na portaria e ver o dia
  (painel)/alertas/            alunos acima ou perto do limite da escola
  (painel)/turmas/             turmas (com horário) e alunos, com a situação de cada um
  (painel)/turmas/[id]/        ficha do aluno: indicador, entradas e saídas, biometria,
                                responsáveis, acompanhamento
  (painel)/responsaveis/       todos os responsáveis e quem ainda não tem nenhum
  (painel)/escola/             dados do catálogo, horários, calendário, regras de aviso e
                                equipe (só a gestão altera)
  (painel)/admin/              equipe do sistema: contas, escolas e chamados
  (painel)/como-funciona/      o guia do sistema e de cada página
  (painel)/acompanhamento/     timeline global de contatos com responsáveis
  (painel)/relatorios/         exportação de CSV (5 relatórios, mesmos do desktop)
  (painel)/notificacoes/       avisos às famílias: enviados, na fila e com erro
  (painel)/ocorrencias/,       telas do celular do aluno (fluxo anterior), fora do menu
  (painel)/checkins/
  (painel)/conta/              Minha conta: perfil, senha, preferências (tema e
                                sons) e dispositivos conectados
  (painel)/suporte/            perguntas frequentes e chamados para a equipe
components/                    Sidebar, Topbar, Modal, Toast, Icon, Logo,
                               AlternarTema (botão claro/escuro no topo das telas),
                               Preferencias (preferências da conta no site todo),
                               Graficos (área e radial), NumeroAnimado,
                               ModalRegistro (entrada atrasada / saída antecipada),
                               ModalResponsavel (CPF, depois vincular ou cadastrar)
lib/
  tema.ts                      tema claro/escuro: escolha guardada no navegador ou,
                                sem escolha, o do sistema; script do <head> que
                                aplica antes da pintura (testado em tema.test.ts)
  preferencias.ts              preferências da conta (tema e sons) <-> formato da API
  sons.ts                      sons do site (Web Audio): confirmação, notificação e erro
  contadores.ts                quando as filas do menu crescem (som de notificação)
  graficos.ts                  rodapé do gráfico (média por dia de aula) e barras das turmas
  avisos.ts                    o que os avisos aos responsáveis fizeram depois de um registro
  movimento.ts                 "reduzir movimento" do sistema e a contagem animada
  config.ts                    endereço da API e do APK (testado em config.test.ts)
  api.ts                       cliente HTTP (mesmo contrato do clsApiService.cs)
  auth.tsx                     AuthContext (sessão em localStorage, confere o "exp")
  sessao.ts                    leitura da validade do token
  types.ts                     tipos espelhando as respostas da API
  format.ts                    datas no fuso da escola, CPF/telefone, badges, CSV
public/sons/                   daylight, bloom e shrug (React Bits, licença MIT)
```

### Sons e preferências

Todo aviso de sucesso toca o **daylight** (ex.: presença registrada) e todo
aviso de erro, o **shrug** (ex.: entrada atrasada fora do horário da turma),
pelo `components/Toast.tsx`. Quando uma fila do menu cresce (alerta,
notificação, check-in ou ocorrência nova), toca o **bloom**. Os sons só
tocam depois de a pessoa interagir com a página (regra dos navegadores)
e respeitam Minha conta > Preferências: ligar/desligar, volume e quais
tocam. As preferências ficam na conta (migração 007 da API), com uma
cópia no navegador para aplicar ao abrir.

"Lembrar de mim", no login, deixa a sessão valer 30 dias. Cada login
aparece em Minha conta > Dispositivos conectados, de onde pode ser
desconectado; sair também encerra a sessão na API.

## Segurança

- Sessão fica em `localStorage` (token JWT + dados básicos da
  coordenação) — mesmo modelo de token Bearer do desktop/app, sem
  cookies, então não há CSRF clássico. A API libera só as origens de
  `CORS_ORIGENS` (ver `helpers/cors.php` na API).
- Toda tela sob `(painel)` verifica autenticação em
  `(painel)/layout.tsx` e redireciona para `/login` se não houver
  sessão; `/login` e `/cadastro` fazem o inverso. Token vencido (lido do
  "exp") é descartado ao abrir o site e ao voltar para a aba.
- O cadastro é aberto, mas ninguém entra sem confirmar o e-mail (link de
  uso único que chega por e-mail e abre `/confirmar-email`, que tira o
  código da barra de endereço e não o repassa a outros sites) e sem a
  aprovação da gestão da escola ou, numa escola que ainda não usa o
  sistema, da equipe do sistema (`/admin`).
- Cabeçalhos `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy` e
  `Permissions-Policy` em todas as páginas (`next.config.ts`).
