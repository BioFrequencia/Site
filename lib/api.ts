// Cliente da BioFrequenciaApi para o site - o mesmo contrato usado pelo
// app da coordenação. Os tipos das respostas estão em lib/types.ts.
//
// Endereço da API: ver lib/config.ts. Em produção vem do build
// (NEXT_PUBLIC_API_URL); só em desenvolvimento é editável na tela de login.

import { apiUrlDoBuild, resolverApiUrl } from "./config";
import { iniciarCarregamento } from "./carregamento";
import type {
  AcaoEquipe,
  Alerta,
  CargoNaEscola,
  PapelConta,
  ContaCriada,
  EmailConfirmado,
  AvisosDoRegistro,
  CanalResponsavel,
  ChamadoAdmin,
  ConfiguracaoEscola,
  ContaAdmin,
  DadosEscola,
  EscolaAdmin,
  EscolaCatalogo,
  ItemCalendario,
  ListaPaginada,
  MembroEquipe,
  Ocorrencia,
  RegistrosDoDia,
  ResponsaveisDaEscola,
  ResponsavelEncontrado,
  ResumoSistema,
  SituacaoConta,
  StatusChamado,
  TipoCalendario,
  TipoRegistro,
  CanalAcompanhamento,
  CategoriaChamado,
  ChamadoSuporte,
  CheckinPendente,
  Coordenacao,
  PerfilConta,
  PreferenciasApi,
  SessaoConectada,
  Dashboard,
  HistoricoAluno,
  ListaAcompanhamento,
  ListaAlertas,
  ListaAlunos,
  ListaNotificacoes,
  ModelosMensagem,
  ContatosDoAluno,
  DestinoMensagem,
  EnvioPrevisto,
  EnvioDeMensagem,
  PresencasDoDia,
  PreviaImportacao,
  PreviaOcorrencias,
  ResultadoImportacao,
  ResultadoOcorrencias,
  Responsavel,
  Sala,
  StatusNotificacao,
} from "./types";

const CHAVE_BASE_URL = "biofreq_api_base_url";
const CHAVE_TOKEN = "biofreq_token";
const CHAVE_COORDENACAO = "biofreq_coordenacao";

// process.env.NEXT_PUBLIC_API_URL escrito por extenso: é assim que o Next
// substitui o valor no build.
const API_URL_DO_BUILD = apiUrlDoBuild(process.env.NEXT_PUBLIC_API_URL);
const PRODUCAO = process.env.NODE_ENV === "production";

// A API gratuita do Render "dorme" sem uso e leva até ~1 minuto para
// acordar: com 15 s de limite, o primeiro login do dia sempre falhava por
// tempo esgotado.
const TEMPO_LIMITE_MS = 70_000;

const MENSAGEM_SEM_API =
  "Endereço da API não configurado neste site (variável NEXT_PUBLIC_API_URL no deploy). Avise quem administra o sistema.";

export interface RespostaApi<T> {
  sucesso: boolean;
  mensagem: string;
  dados: T | null;
  naoAutenticado?: boolean;
  /** Código HTTP quando o servidor respondeu (ex.: 409 = já existe). */
  status?: number;
}

/** URL base efetiva da API, ou null se o deploy não tem NEXT_PUBLIC_API_URL. */
function obterBaseUrl(): string | null {
  const salva = typeof window === "undefined" ? null : localStorage.getItem(CHAVE_BASE_URL);
  return resolverApiUrl(API_URL_DO_BUILD, salva, PRODUCAO);
}

/** Só em desenvolvimento a URL pode ser trocada pela tela de login. */
function urlEditavel(): boolean {
  return API_URL_DO_BUILD === null && !PRODUCAO;
}

function definirBaseUrl(url: string): void {
  if (!urlEditavel()) return;
  localStorage.setItem(CHAVE_BASE_URL, url.trim().replace(/\/+$/, "") + "/");
}

/**
 * Acorda a API (health check) sem esperar a resposta na tela. A tela de
 * login chama isto ao abrir: enquanto a pessoa digita email e senha, o
 * servidor gratuito já está subindo.
 */
function aquecerServidor(): void {
  const base = obterBaseUrl();
  if (!base) return;
  fetch(base + "health.php", { method: "GET", cache: "no-store" }).catch(() => undefined);
}

function obterToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CHAVE_TOKEN);
}

function obterCoordenacao(): Coordenacao | null {
  if (typeof window === "undefined") return null;
  const bruto = localStorage.getItem(CHAVE_COORDENACAO);
  return bruto ? (JSON.parse(bruto) as Coordenacao) : null;
}

function iniciarSessao(dadosCoordenacao: Coordenacao & { token: string }): void {
  localStorage.setItem(CHAVE_TOKEN, dadosCoordenacao.token);
  localStorage.setItem(
    CHAVE_COORDENACAO,
    JSON.stringify({
      id_coordenacao: dadosCoordenacao.id_coordenacao,
      nome_coordenacao: dadosCoordenacao.nome_coordenacao,
      email_coordenacao: dadosCoordenacao.email_coordenacao,
      nome_escola: dadosCoordenacao.nome_escola,
      papel: dadosCoordenacao.papel,
      administrador: dadosCoordenacao.administrador,
      municipio: dadosCoordenacao.municipio,
    })
  );
}

/** Depois de editar o perfil em Minha conta: atualiza o nome/e-mail/escola guardados, sem mexer no token. */
function atualizarCoordenacaoSalva(coordenacao: Coordenacao): void {
  localStorage.setItem(CHAVE_COORDENACAO, JSON.stringify(coordenacao));
}

function encerrarSessao(): void {
  localStorage.removeItem(CHAVE_TOKEN);
  localStorage.removeItem(CHAVE_COORDENACAO);
}

/**
 * Callback registrado pelo AuthProvider para reagir a qualquer resposta
 * "naoAutenticado" (token ausente/expirado/inválido) sem que cada tela
 * precise verificar isso manualmente em toda chamada - sem isso, uma
 * sessão expirada só aparecia como uma mensagem de erro dentro do
 * painel, com o usuário preso lá (bug real: o campo naoAutenticado
 * existia desde o início mas nunca era lido por ninguém).
 */
let aoSessaoExpirar: (() => void) | null = null;

function definirCallbackSessaoExpirada(callback: (() => void) | null): void {
  aoSessaoExpirar = callback;
}

/** Consultas que a tela faz sozinha (contadores do menu): não mostram a barra de carregamento. */
export interface OpcoesChamada {
  segundoPlano?: boolean;
}

/**
 * POST genérico. Diferencia erro de rede/timeout de erro HTTP/de
 * validação, no mesmo espírito de clsApiService.cs - nunca deixa uma
 * exceção crua chegar em quem chamou. Enquanto a chamada anda, a barra
 * do topo (components/BarraProgresso.tsx) aparece.
 */
async function post<T>(
  caminho: string,
  corpo: Record<string, unknown> | FormData,
  { autenticado = true, segundoPlano = false }: { autenticado?: boolean } & OpcoesChamada = {}
): Promise<RespostaApi<T>> {
  const terminar = segundoPlano ? null : iniciarCarregamento();
  try {
    return await enviarPost<T>(caminho, corpo, autenticado);
  } finally {
    terminar?.();
  }
}

async function enviarPost<T>(caminho: string, corpo: Record<string, unknown> | FormData, autenticado: boolean): Promise<RespostaApi<T>> {
  const base = obterBaseUrl();
  if (!base) {
    return { sucesso: false, mensagem: MENSAGEM_SEM_API, dados: null };
  }

  const controlador = new AbortController();
  const timeoutId = setTimeout(() => controlador.abort(), TEMPO_LIMITE_MS);

  // Arquivo (FormData): sem Content-Type aqui - o navegador põe o multipart com o boundary.
  const comArquivo = corpo instanceof FormData;
  const cabecalhos: Record<string, string> = comArquivo ? {} : { "Content-Type": "application/json" };
  if (autenticado) {
    const token = obterToken();
    if (!token) {
      clearTimeout(timeoutId);
      aoSessaoExpirar?.();
      return {
        sucesso: false,
        mensagem: "Sessão expirada. Faça login novamente.",
        dados: null,
        naoAutenticado: true,
      };
    }
    cabecalhos["Authorization"] = `Bearer ${token}`;
  }

  let resposta: Response;
  try {
    resposta = await fetch(base + caminho, {
      method: "POST",
      headers: cabecalhos,
      body: comArquivo ? corpo : JSON.stringify(corpo || {}),
      signal: controlador.signal,
    });
  } catch (erro) {
    clearTimeout(timeoutId);
    if (erro instanceof DOMException && erro.name === "AbortError") {
      return {
        sucesso: false,
        mensagem: "O servidor demorou demais para responder. Verifique sua conexão e tente novamente.",
        dados: null,
      };
    }
    return {
      sucesso: false,
      mensagem: urlEditavel()
        ? "Não foi possível conectar ao servidor. Verifique o endereço da API (abaixo) e sua conexão."
        : "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
      dados: null,
    };
  }
  clearTimeout(timeoutId);

  let json: RespostaApi<T>;
  try {
    json = await resposta.json();
  } catch {
    // Ex.: página HTML de erro do provedor durante um deploy (502/503).
    return {
      sucesso: false,
      mensagem: `O servidor retornou uma resposta em formato inesperado (HTTP ${resposta.status}). Tente de novo em instantes.`,
      dados: null,
    };
  }

  json.status = resposta.status;
  if (resposta.status === 401 && autenticado) {
    json.naoAutenticado = true;
    aoSessaoExpirar?.();
  }
  return json;
}

/**
 * Baixa um arquivo gerado no servidor (relatório XML, modelo da
 * importação) e dispara o download com o nome do Content-Disposition;
 * sem ele, usa o nome padrão (o navegador salvaria com um nome genérico).
 */
async function baixarArquivo(
  caminho: string,
  corpo: Record<string, unknown>,
  nomePadrao: string,
  mensagemOk: string,
  mensagemErro: string
): Promise<{ sucesso: boolean; mensagem: string }> {
  const token = obterToken();
  if (!token) {
    aoSessaoExpirar?.();
    return { sucesso: false, mensagem: "Sessão expirada. Faça login novamente." };
  }
  const base = obterBaseUrl();
  if (!base) {
    return { sucesso: false, mensagem: MENSAGEM_SEM_API };
  }
  const terminar = iniciarCarregamento();
  try {
    const resposta = await fetch(base + caminho, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(corpo),
    });
    if (resposta.status === 401) {
      aoSessaoExpirar?.();
      return { sucesso: false, mensagem: "Sessão expirada. Faça login novamente." };
    }
    if (!resposta.ok) {
      return { sucesso: false, mensagem: mensagemErro };
    }
    const blob = await resposta.blob();
    const disposicao = resposta.headers.get("Content-Disposition") ?? "";
    const nome = /filename="?([^"]+)"?/.exec(disposicao)?.[1] ?? nomePadrao;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nome;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return { sucesso: true, mensagem: mensagemOk };
  } catch {
    return { sucesso: false, mensagem: "Não foi possível conectar ao servidor." };
  } finally {
    terminar();
  }
}

export const Api = {
  obterBaseUrl,
  definirBaseUrl,
  urlEditavel,
  aquecerServidor,
  obterToken,
  obterCoordenacao,
  iniciarSessao,
  encerrarSessao,
  atualizarCoordenacaoSalva,
  definirCallbackSessaoExpirada,

  // Autenticação / coordenação. "lembrar" (Lembrar de mim): sessão de 30 dias.
  login: (email: string, senha: string, lembrar = false) =>
    post<Coordenacao & { token: string }>("user/selectCoord.php", { email, senha, lembrar }, { autenticado: false }),
  emailExiste: (email: string) =>
    post<{ email_coordenacao: string } | null>("user/verificarEmail.php", { email }, { autenticado: false }),
  // Uma escola por conta: a do catálogo (id_escola) ou, fora dele, uma
  // escola nova com nome e município. Toda conta nasce pendente: confirma
  // o e-mail pelo link e espera a gestão da escola (ou a equipe do
  // sistema, numa escola sem gestão) aprovar.
  cadastrarCoordenacao: (
    nome: string,
    email: string,
    senha: string,
    cargo: CargoNaEscola,
    escola: { id_escola: number } | { nome_escola: string; municipio: string }
  ) => post<ContaCriada>("user/addCoord.php", { nome, email, senha, cargo, ...escola }, { autenticado: false }),
  /** "Esqueci minha senha": a resposta é a mesma com ou sem conta para o e-mail. */
  esqueciSenha: (email: string) => post<null>("conta/esqueciSenha.php", { email }, { autenticado: false }),
  /** Cria a senha nova pelo link do e-mail (página /redefinir-senha); todos os aparelhos saem da conta. */
  redefinirSenha: (codigo: string, senhaNova: string) =>
    post<{ sessoes_encerradas: number }>("conta/redefinirSenha.php", { codigo, senha_nova: senhaNova }, { autenticado: false }),
  /** Abre o link do e-mail (página /confirmar-email). */
  confirmarEmail: (codigo: string) => post<EmailConfirmado>("conta/confirmarEmail.php", { codigo }, { autenticado: false }),
  /** Manda outro link de confirmação; pede a senha para ninguém encher a caixa de outra pessoa. */
  reenviarConfirmacao: (email: string, senha: string) =>
    post<{ email_enviado: boolean }>("conta/reenviarConfirmacao.php", { email, senha }, { autenticado: false }),
  /** Busca pública no catálogo de escolas da SEDUC (sem login: é para o cadastro). */
  buscarEscolas: (busca: string) =>
    post<{ escolas: EscolaCatalogo[] }>("escola/buscar.php", { busca }, { autenticado: false }),

  // Alunos / turmas
  listarSalas: () => post<Sala[]>("user/listarSalas.php", {}),
  /** Sem horário, vale o padrão do período. */
  cadastrarTurma: (nomeSala: string, periodoSala: string, horario?: { inicio: string; fim: string }) =>
    post<Sala>("user/addSala.php", {
      nome_sala: nomeSala,
      periodo_sala: periodoSala,
      ...(horario ? { horario_inicio: horario.inicio, horario_fim: horario.fim } : {}),
    }),
  filtrarAlunos: (busca: string | null, idSala: number | null, status: string | null, pagina: number, porPagina: number) =>
    post<ListaAlunos>("user/filtroAluno.php", { busca, id_sala: idSala, status, pagina, por_pagina: porPagina }),
  cadastrarAluno: (nomeAluno: string, idSala: number, dtaNascAluno: string, generoAluno: string) =>
    post<{ id_aluno: number }>("user/addaluno.php", {
      nome_aluno: nomeAluno,
      id_sala: idSala,
      dta_nasc_aluno: dtaNascAluno,
      genero_aluno: generoAluno,
    }),
  /**
   * Entrada atrasada. dataLocal (opcional): "AAAA-MM-DD HH:MM" no horário
   * da escola; sem ela, agora. A API recusa (422) fora do dia de aula, do
   * horário da turma ou dentro da tolerância, explicando o motivo.
   */
  marcarAtraso: (idAluno: number, motivo: string | null, observacao: string | null, justificado: boolean, dataLocal?: string) =>
    post<{ id_atraso: number; dta_atraso: string; avisos: AvisosDoRegistro }>("user/marcarAtraso.php", {
      id_aluno: idAluno,
      motivo_atraso: motivo,
      observacao_atraso: observacao,
      justificado_atraso: !!justificado,
      ...(dataLocal ? { dta_atraso: dataLocal } : {}),
    }),
  /** Saída antecipada: as mesmas regras, mais quem buscou o aluno. */
  marcarSaida: (
    idAluno: number,
    motivo: string | null,
    observacao: string | null,
    justificado: boolean,
    retiradoPor: string | null,
    dataLocal?: string
  ) =>
    post<{ id_saida: number; dta_saida: string; avisos: AvisosDoRegistro }>("user/marcarSaida.php", {
      id_aluno: idAluno,
      motivo_saida: motivo,
      observacao_saida: observacao,
      justificado_saida: !!justificado,
      retirado_por: retiradoPor,
      ...(dataLocal ? { dta_saida: dataLocal } : {}),
    }),
  listarRegistros: (data: string, idSala: number | null) =>
    post<RegistrosDoDia>("registro/listar.php", { data, id_sala: idSala }),
  /** Só a gestão: apaga um registro feito por engano. */
  removerRegistro: (tipo: TipoRegistro, id: number) => post<null>("registro/remover.php", { tipo, id }),
  historicoAluno: (idAluno: number, dataInicio?: string, dataFim?: string) =>
    post<HistoricoAluno>("user/historicoAluno.php", { id_aluno: idAluno, data_inicio: dataInicio, data_fim: dataFim }),

  // Dashboard / alertas
  dashboard: (opcoes?: OpcoesChamada) => post<Dashboard>("user/dashboard.php", {}, opcoes),
  alertas: (idSala: number | null, tipo: string | null, prioridade: string | null) =>
    post<ListaAlertas>("user/alertas.php", { id_sala: idSala, tipo, prioridade }),
  encerrarAlerta: (idAluno: number) => post<null>("user/encerrarAlerta.php", { id_aluno: idAluno }),

  // Acompanhamento
  addAcompanhamento: (idAluno: number, canal: CanalAcompanhamento, observacao: string | null) =>
    post<{ id_acompanhamento: number; data_registro: string }>("acompanhamento/addAcompanhamento.php", {
      id_aluno: idAluno,
      canal,
      observacao,
    }),
  listarAcompanhamento: (idAluno: number | null, pagina: number) =>
    post<ListaAcompanhamento>("acompanhamento/listarAcompanhamento.php", { id_aluno: idAluno, pagina, por_pagina: 20 }),

  // Responsáveis
  addResponsavel: (
    idAluno: number,
    dados: {
      nome: string;
      cpf: string;
      telefone: string;
      email: string | null;
      genero: string;
      canal: CanalResponsavel;
      parentesco: string | null;
    }
  ) =>
    post<{ id_responsavel: number }>("responsavel/addResponsavel.php", {
      id_aluno: idAluno,
      nome_responsavel: dados.nome,
      cpf_responsavel: dados.cpf,
      telefone_responsavel: dados.telefone,
      email_responsavel: dados.email,
      genero_responsavel: dados.genero,
      canal_preferido: dados.canal,
      parentesco: dados.parentesco,
    }),
  listarResponsaveis: (idAluno: number) => post<Responsavel[]>("responsavel/listarResponsaveis.php", { id_aluno: idAluno }),
  /** Todos os responsáveis da escola numa chamada, com os alunos de cada um. */
  listarResponsaveisDaEscola: (busca: string | null) =>
    post<ResponsaveisDaEscola>("responsavel/listarDaEscola.php", { busca }),
  buscarResponsavelPorCpf: (cpf: string) =>
    post<ResponsavelEncontrado>("responsavel/buscarResponsavelPorCpf.php", { cpf_responsavel: cpf }),
  vincularResponsavel: (idAluno: number, idResponsavel: number, parentesco: string | null = null) =>
    post<null>("responsavel/vincularResponsavel.php", { id_aluno: idAluno, id_responsavel: idResponsavel, parentesco }),
  /** Só os campos enviados mudam; parentesco vale para o vínculo com idAluno. */
  atualizarResponsavel: (
    idResponsavel: number,
    mudancas: {
      nome_responsavel?: string;
      telefone_responsavel?: string;
      email_responsavel?: string | null;
      genero_responsavel?: string;
      canal_preferido?: CanalResponsavel;
      id_aluno?: number;
      parentesco?: string | null;
    }
  ) => post<{ id_responsavel: number }>("responsavel/atualizarResponsavel.php", { id_responsavel: idResponsavel, ...mudancas }),
  removerVinculoResponsavel: (idAluno: number, idResponsavel: number) =>
    post<null>("responsavel/removerVinculo.php", { id_aluno: idAluno, id_responsavel: idResponsavel }),

  // Notificações: avisos automáticos e mensagens da coordenação (o histórico).
  listarNotificacoes: (
    status: StatusNotificacao | null,
    pagina: number,
    opcoes?: OpcoesChamada,
    origem: "manual" | "automatico" | null = null
  ) => post<ListaNotificacoes>("notificacao/listarNotificacoes.php", { status, pagina, por_pagina: 20, origem }, opcoes),
  marcarNotificacaoEnviada: (idNotificacao: number) =>
    post<null>("notificacao/marcarEnviada.php", { id_notificacao: idNotificacao }),
  /** "Tentar de novo" numa mensagem que deu erro no envio. */
  reenviarNotificacao: (idNotificacao: number) =>
    post<{ id_notificacao: number; status: StatusNotificacao }>("notificacao/reenviar.php", { id_notificacao: idNotificacao }),

  // Enviar mensagem aos responsáveis (tela /notificacoes/enviar).
  modelosDeMensagem: () => post<ModelosMensagem>("notificacao/modelos.php", {}),
  contatosDoAluno: (idAluno: number) => post<ContatosDoAluno>("notificacao/contatos.php", { id_aluno: idAluno }),
  previaDeMensagem: (idAluno: number, mensagem: string, destinos: DestinoMensagem[]) =>
    post<{ envios: EnvioPrevisto[] }>("notificacao/previa.php", { id_aluno: idAluno, mensagem, destinos }),
  /** "chave": uma por mensagem nova - o mesmo pedido repetido não manda de novo. */
  enviarMensagem: (idAluno: number, mensagem: string, destinos: DestinoMensagem[], chave: string) =>
    post<EnvioDeMensagem>("notificacao/enviar.php", { id_aluno: idAluno, mensagem, destinos, chave }),

  // Ocorrências enviadas pelo app do aluno (aguardando decisão)
  listarOcorrencias: (status: "pendente" | "aprovado" | "rejeitado" | "todos" = "pendente") =>
    post<{ ocorrencias: Ocorrencia[]; total: number }>("ocorrencia/listarPendentes.php", { status }),
  revisarOcorrencia: (
    idOcorrencia: number,
    decisao: "aprovar" | "rejeitar",
    opcoes: { justificado?: boolean; observacaoRevisao?: string } = {}
  ) =>
    post<{ id_ocorrencia: number; status: string }>("ocorrencia/revisarOcorrencia.php", {
      id_ocorrencia: idOcorrencia,
      decisao,
      justificado: !!opcoes.justificado,
      observacao_revisao: opcoes.observacaoRevisao ?? null,
    }),

  /**
   * Baixa um relatório em XML. Diferente dos demais: o XML é montado no
   * servidor (relatorio/exportarXml.php) porque escapar &, < e aspas
   * concatenando string no cliente é exatamente como se produz um
   * arquivo .xml inválido. Aqui só se dispara o download do blob.
   */
  baixarRelatorioXml: (relatorio: "alertas" | "alunos" | "registros" | "acompanhamentos" | "ocorrencias") =>
    baixarArquivo(
      "relatorio/exportarXml.php",
      { relatorio },
      `biofrequencia_${relatorio}_${new Date().toISOString().slice(0, 10)}.xml`,
      "Relatório XML baixado.",
      "Não foi possível gerar o relatório."
    ),

  // Importação de turmas e alunos por planilha: o modelo .xlsx da escola,
  // a prévia (nada é gravado) e a confirmação com o mesmo arquivo.
  baixarModeloImportacao: () =>
    baixarArquivo(
      "importacao/modelo.php",
      {},
      "modelo-turmas-e-alunos.xlsx",
      "Modelo baixado: preencha e volte aqui para importar.",
      "Não foi possível gerar o modelo da planilha."
    ),
  previaImportacao: (arquivo: File) => {
    const corpo = new FormData();
    corpo.append("arquivo", arquivo);
    return post<PreviaImportacao>("importacao/previa.php", corpo);
  },
  confirmarImportacao: (arquivo: File, hash: string) => {
    const corpo = new FormData();
    corpo.append("arquivo", arquivo);
    corpo.append("hash", hash);
    return post<ResultadoImportacao>("importacao/confirmar.php", corpo);
  },

  // Importação das entradas atrasadas e saídas antecipadas anotadas no
  // Excel sem internet: o modelo (com o código de cada aluno), a prévia e
  // a confirmação com o mesmo arquivo.
  baixarModeloOcorrencias: () =>
    baixarArquivo(
      "registro/modeloImportacao.php",
      {},
      "modelo-entradas-e-saidas.xlsx",
      "Modelo baixado: anote nele quando estiver sem internet e importe aqui quando a conexão voltar.",
      "Não foi possível gerar o modelo da planilha."
    ),
  previaOcorrencias: (arquivo: File) => {
    const corpo = new FormData();
    corpo.append("arquivo", arquivo);
    return post<PreviaOcorrencias>("registro/previaImportacao.php", corpo);
  },
  confirmarOcorrencias: (arquivo: File, hash: string) => {
    const corpo = new FormData();
    corpo.append("arquivo", arquivo);
    corpo.append("hash", hash);
    return post<ResultadoOcorrencias>("registro/confirmarImportacao.php", corpo);
  },

  // Check-ins enviados pelo celular do próprio aluno (fluxo anterior ao
  // app da coordenação; aparelhos já conectados continuam aceitos)
  listarCheckinsPendentes: () => post<CheckinPendente[]>("digital/listarCheckinsPendentes.php", {}),
  confirmarCheckin: (idCheckin: number) => post<null>("digital/confirmarCheckin.php", { id_checkin: idCheckin }),

  // Presenças registradas pelo app de biometria da coordenação
  listarPresencas: (data: string, idSala: number | null) =>
    post<PresencasDoDia>("presenca/listar.php", { data, id_sala: idSala }),
  registrarPresencaManual: (idAluno: number) =>
    post<{
      presenca: { nova: boolean; registrada_em: string };
      entrada: { situacao: "no_horario" | "atrasada" | "fora_do_horario" | "sem_aula"; id_atraso: number | null } | null;
    }>("presenca/registrar.php", { id_aluno: idAluno, metodo: "manual" }),

  // Biometria (o cadastro é feito no app; aqui só a consulta e a eliminação - LGPD)
  excluirBiometria: (idAluno: number, tipo: "facial" | "digital" | "todas") =>
    post<{ registros_apagados: number }>("biometria/excluirBiometria.php", { id_aluno: idAluno, tipo }),
  revogarConsentimento: (idAluno: number) => post<null>("biometria/consentimento.php", { id_aluno: idAluno, revogar: true }),

  // Minha conta (migração 007 da API)
  sair: () => post<null>("conta/sair.php", {}),
  perfil: () => post<PerfilConta>("conta/perfil.php", {}),
  atualizarPerfil: (perfil: PerfilConta, senhaAtual?: string) =>
    post<PerfilConta>("conta/atualizarPerfil.php", { ...perfil, ...(senhaAtual ? { senha_atual: senhaAtual } : {}) }),
  alterarSenha: (senhaAtual: string, senhaNova: string) =>
    post<{ sessoes_encerradas: number }>("conta/alterarSenha.php", { senha_atual: senhaAtual, senha_nova: senhaNova }),
  preferencias: () => post<PreferenciasApi>("conta/preferencias.php", {}),
  salvarPreferencias: (mudancas: Partial<PreferenciasApi>) => post<PreferenciasApi>("conta/salvarPreferencias.php", { ...mudancas }),
  listarAparelhos: () => post<SessaoConectada[]>("conta/sessoes.php", {}),
  desconectarAparelho: (idSessao: string) =>
    post<{ encerradas: number; era_este: boolean }>("conta/encerrarSessao.php", { id_sessao: idSessao }),
  desconectarOutrosAparelhos: () => post<{ encerradas: number }>("conta/encerrarSessao.php", { outras: true }),

  // Suporte
  abrirChamado: (categoria: CategoriaChamado, assunto: string, mensagem: string) =>
    post<ChamadoSuporte>("suporte/abrirChamado.php", { categoria, assunto, mensagem }),
  listarChamados: () => post<ChamadoSuporte[]>("suporte/listarChamados.php", {}),

  // Escola (migração 008): toda a equipe vê; só a gestão altera.
  configuracaoEscola: (ano?: number) => post<DadosEscola>("escola/configuracao.php", ano ? { ano } : {}),
  salvarConfiguracaoEscola: (mudancas: Partial<ConfiguracaoEscola>) =>
    post<ConfiguracaoEscola>("escola/salvarConfiguracao.php", { ...mudancas }),
  /** horário null volta ao padrão do período. */
  salvarTurma: (idSala: number, mudancas: { nome_sala?: string; periodo_sala?: string; horario_inicio?: string | null; horario_fim?: string | null }) =>
    post<Sala>("escola/salvarTurma.php", { id_sala: idSala, ...mudancas }),
  adicionarCalendario: (dataInicio: string, dataFim: string, tipo: TipoCalendario, descricao: string) =>
    post<ItemCalendario>("escola/adicionarCalendario.php", { data_inicio: dataInicio, data_fim: dataFim, tipo, descricao }),
  removerCalendario: (idCalendario: number) => post<null>("escola/removerCalendario.php", { id_calendario: idCalendario }),
  equipe: (opcoes?: OpcoesChamada) =>
    post<{ equipe: MembroEquipe[]; pendentes: number; pode_editar: boolean }>("escola/equipe.php", {}, opcoes),
  /** papel: na aprovação, a permissão escolhida (sem ela, vale a sugerida pelo cargo). */
  atualizarMembro: (idCoordenacao: number, acao: AcaoEquipe, papel?: PapelConta) =>
    post<MembroEquipe>("escola/atualizarMembro.php", { id_coordenacao: idCoordenacao, acao, ...(papel ? { papel } : {}) }),

  // Equipe do sistema (tela /admin; a API responde 404 para as outras contas)
  adminResumo: (opcoes?: OpcoesChamada) => post<ResumoSistema>("admin/resumo.php", {}, opcoes),
  adminEscolas: (busca: string, emUso: boolean, pagina: number) =>
    post<ListaPaginada & { escolas: EscolaAdmin[] }>("admin/escolas.php", { busca, em_uso: emUso, pagina }),
  adminContas: (busca: string, situacao: SituacaoConta | null, pagina: number) =>
    post<ListaPaginada & { contas: ContaAdmin[] }>("admin/contas.php", { busca, situacao, pagina }),
  adminAtualizarConta: (
    idCoordenacao: number,
    acao: AcaoEquipe | "mover_escola" | "confirmar_email",
    extra: { idEscola?: number; papel?: PapelConta } = {}
  ) =>
    post<MembroEquipe>("admin/atualizarConta.php", {
      id_coordenacao: idCoordenacao,
      acao,
      ...(extra.idEscola ? { id_escola: extra.idEscola } : {}),
      ...(extra.papel ? { papel: extra.papel } : {}),
    }),
  adminChamados: (status: StatusChamado | null, pagina: number) =>
    post<ListaPaginada & { chamados: ChamadoAdmin[] }>("admin/chamados.php", { status, pagina }),
  adminResponderChamado: (idChamado: number, status: Exclude<StatusChamado, "aberto">, resposta: string | null) =>
    post<null>("admin/responderChamado.php", { id_chamado: idChamado, status, resposta }),
  adminImportarCatalogo: () =>
    post<{ total: number; inseridas: number; atualizadas: number; vinculadas: number }>("admin/importarCatalogo.php", {}),
};

export type { Alerta };
