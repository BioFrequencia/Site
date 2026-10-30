// Cliente da BioFrequenciaApi para o site. Mesmo contrato de endpoints já
// testado no desktop (clsApiService.cs) e no app (mobile-app/src/api/*) -
// nenhum endpoint novo foi criado para o site, ele consome exatamente a
// mesma API.
//
// Endereço da API: ver lib/config.ts. Em produção vem do build
// (NEXT_PUBLIC_API_URL); só em desenvolvimento é editável na tela de login.

import { apiUrlDoBuild, resolverApiUrl } from "./config";
import type {
  Alerta,
  Ocorrencia,
  CanalAcompanhamento,
  CheckinPendente,
  Coordenacao,
  Dashboard,
  HistoricoAluno,
  ListaAcompanhamento,
  ListaAlertas,
  ListaAlunos,
  ListaNotificacoes,
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
    })
  );
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

/**
 * POST genérico. Diferencia erro de rede/timeout de erro HTTP/de
 * validação, no mesmo espírito de clsApiService.cs - nunca deixa uma
 * exceção crua chegar em quem chamou.
 */
async function post<T>(
  caminho: string,
  corpo: Record<string, unknown>,
  { autenticado = true }: { autenticado?: boolean } = {}
): Promise<RespostaApi<T>> {
  const base = obterBaseUrl();
  if (!base) {
    return { sucesso: false, mensagem: MENSAGEM_SEM_API, dados: null };
  }

  const controlador = new AbortController();
  const timeoutId = setTimeout(() => controlador.abort(), TEMPO_LIMITE_MS);

  const cabecalhos: Record<string, string> = { "Content-Type": "application/json" };
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
      body: JSON.stringify(corpo || {}),
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

export const Api = {
  obterBaseUrl,
  definirBaseUrl,
  urlEditavel,
  aquecerServidor,
  obterToken,
  obterCoordenacao,
  iniciarSessao,
  encerrarSessao,
  definirCallbackSessaoExpirada,

  // Autenticação / coordenação
  login: (email: string, senha: string) =>
    post<Coordenacao & { token: string }>("user/selectCoord.php", { email, senha }, { autenticado: false }),
  emailExiste: (email: string) =>
    post<{ email_coordenacao: string } | null>("user/verificarEmail.php", { email }, { autenticado: false }),
  cadastrarCoordenacao: (nome: string, email: string, senha: string, codigoAcesso: string) =>
    post<null>("user/addCoord.php", { nome, email, senha, codigo_acesso: codigoAcesso }, { autenticado: false }),

  // Alunos / turmas
  listarSalas: () => post<Sala[]>("user/listarSalas.php", {}),
  filtrarAlunos: (busca: string | null, idSala: number | null, status: string | null, pagina: number, porPagina: number) =>
    post<ListaAlunos>("user/filtroAluno.php", { busca, id_sala: idSala, status, pagina, por_pagina: porPagina }),
  cadastrarAluno: (nomeAluno: string, idSala: number, dtaNascAluno: string, generoAluno: string) =>
    post<{ id_aluno: number }>("user/addaluno.php", {
      nome_aluno: nomeAluno,
      id_sala: idSala,
      dta_nasc_aluno: dtaNascAluno,
      genero_aluno: generoAluno,
    }),
  marcarFalta: (idAluno: number, motivo: string | null, observacao: string | null, justificado: boolean) =>
    post<{ id_falta: number; dta_falta: string }>("user/marcarFalta.php", {
      id_aluno: idAluno,
      motivo_falta: motivo,
      observacao_falta: observacao,
      justificado_falta: !!justificado,
    }),
  /** dataLocal (opcional): "AAAA-MM-DD HH:MM" no horário da escola; sem ela, agora. */
  marcarAtraso: (idAluno: number, motivo: string | null, observacao: string | null, justificado: boolean, dataLocal?: string) =>
    post<{ id_atraso: number; dta_atraso: string }>("user/marcarAtraso.php", {
      id_aluno: idAluno,
      motivo_atraso: motivo,
      observacao_atraso: observacao,
      justificado_atraso: !!justificado,
      ...(dataLocal ? { dta_atraso: dataLocal } : {}),
    }),
  historicoAluno: (idAluno: number, dataInicio?: string, dataFim?: string) =>
    post<HistoricoAluno>("user/historicoAluno.php", { id_aluno: idAluno, data_inicio: dataInicio, data_fim: dataFim }),

  // Dashboard / alertas
  dashboard: () => post<Dashboard>("user/dashboard.php", {}),
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
    nome: string,
    cpf: string,
    telefone: string,
    email: string | null,
    genero: string
  ) =>
    post<{ id_responsavel: number }>("responsavel/addResponsavel.php", {
      id_aluno: idAluno,
      nome_responsavel: nome,
      cpf_responsavel: cpf,
      telefone_responsavel: telefone,
      email_responsavel: email,
      genero_responsavel: genero,
    }),
  listarResponsaveis: (idAluno: number) => post<Responsavel[]>("responsavel/listarResponsaveis.php", { id_aluno: idAluno }),
  buscarResponsavelPorCpf: (cpf: string) =>
    post<Responsavel>("responsavel/buscarResponsavelPorCpf.php", { cpf_responsavel: cpf }),
  vincularResponsavel: (idAluno: number, idResponsavel: number) =>
    post<null>("responsavel/vincularResponsavel.php", { id_aluno: idAluno, id_responsavel: idResponsavel }),
  removerVinculoResponsavel: (idAluno: number, idResponsavel: number) =>
    post<null>("responsavel/removerVinculo.php", { id_aluno: idAluno, id_responsavel: idResponsavel }),

  // Notificações
  listarNotificacoes: (status: StatusNotificacao | null, pagina: number) =>
    post<ListaNotificacoes>("notificacao/listarNotificacoes.php", { status, pagina, por_pagina: 20 }),
  marcarNotificacaoEnviada: (idNotificacao: number) =>
    post<null>("notificacao/marcarEnviada.php", { id_notificacao: idNotificacao }),

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
  baixarRelatorioXml: async (
    relatorio: "alertas" | "alunos" | "acompanhamentos" | "ocorrencias"
  ): Promise<{ sucesso: boolean; mensagem: string }> => {
    const token = obterToken();
    if (!token) {
      aoSessaoExpirar?.();
      return { sucesso: false, mensagem: "Sessão expirada. Faça login novamente." };
    }
    const base = obterBaseUrl();
    if (!base) {
      return { sucesso: false, mensagem: MENSAGEM_SEM_API };
    }
    try {
      const resposta = await fetch(base + "relatorio/exportarXml.php", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ relatorio }),
      });
      if (resposta.status === 401) {
        aoSessaoExpirar?.();
        return { sucesso: false, mensagem: "Sessão expirada. Faça login novamente." };
      }
      if (!resposta.ok) {
        return { sucesso: false, mensagem: "Não foi possível gerar o relatório." };
      }
      const blob = await resposta.blob();
      // Usa o nome vindo do Content-Disposition do servidor; sem ele o
      // navegador salvaria com um nome genérico.
      const disposicao = resposta.headers.get("Content-Disposition") ?? "";
      const nome =
        /filename="?([^"]+)"?/.exec(disposicao)?.[1] ??
        `biofrequencia_${relatorio}_${new Date().toISOString().slice(0, 10)}.xml`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = nome;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return { sucesso: true, mensagem: "Relatório XML baixado." };
    } catch {
      return { sucesso: false, mensagem: "Não foi possível conectar ao servidor." };
    }
  },

  // App do aluno: check-ins, celular conectado e conta (o aluno cria a
  // conta no próprio app - não existe mais código de vínculo)
  listarCheckinsPendentes: () => post<CheckinPendente[]>("digital/listarCheckinsPendentes.php", {}),
  confirmarCheckin: (idCheckin: number) => post<null>("digital/confirmarCheckin.php", { id_checkin: idCheckin }),
  revogarDispositivo: (idAluno: number) =>
    post<{ quantidade: number }>("digital/revogarDispositivo.php", { id_aluno: idAluno }),
  removerContaApp: (idAluno: number) =>
    post<{ celulares_desconectados: number }>("aluno/removerConta.php", { id_aluno: idAluno }),
};

export type { Alerta };
