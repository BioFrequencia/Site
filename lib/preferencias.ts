/**
 * Preferências da conta (Minha conta > Preferências): tema e sons.
 * Ficam no banco (conta/preferencias.php) para valer em qualquer
 * computador, com uma cópia no navegador para aplicar na hora ao abrir,
 * antes de a API responder.
 */
import type { ConfiguracaoSons } from "./sons";
import type { PreferenciasApi } from "./types";

export type EscolhaTema = PreferenciasApi["tema"];

export interface Preferencias {
  tema: EscolhaTema;
  sonsAtivos: boolean;
  /** 0 a 100. */
  volumeSons: number;
  somConfirmacao: boolean;
  somNotificacao: boolean;
  somErro: boolean;
}

export const PREFERENCIAS_PADRAO: Preferencias = {
  tema: "sistema",
  sonsAtivos: true,
  volumeSons: 70,
  somConfirmacao: true,
  somNotificacao: true,
  somErro: true,
};

export const CHAVE_PREFERENCIAS = "biofrequencia.preferencias";

const booleano = (valor: unknown, padrao: boolean) => (typeof valor === "boolean" ? valor : padrao);

/** Formato da API -> formato do site; campo ausente ou estranho fica com o padrão. */
export function preferenciasDaApi(dados: Partial<PreferenciasApi> | null | undefined): Preferencias {
  const p = dados ?? {};
  const volume = p.volume_sons;
  return {
    tema: p.tema === "claro" || p.tema === "escuro" || p.tema === "sistema" ? p.tema : PREFERENCIAS_PADRAO.tema,
    sonsAtivos: booleano(p.sons_ativos, PREFERENCIAS_PADRAO.sonsAtivos),
    volumeSons:
      typeof volume === "number" && Number.isInteger(volume) && volume >= 0 && volume <= 100 ? volume : PREFERENCIAS_PADRAO.volumeSons,
    somConfirmacao: booleano(p.som_confirmacao, PREFERENCIAS_PADRAO.somConfirmacao),
    somNotificacao: booleano(p.som_notificacao, PREFERENCIAS_PADRAO.somNotificacao),
    somErro: booleano(p.som_erro, PREFERENCIAS_PADRAO.somErro),
  };
}

/** Só os campos que mudaram, no formato da API (conta/salvarPreferencias.php). */
export function preferenciasParaApi(mudancas: Partial<Preferencias>): Partial<PreferenciasApi> {
  const saida: Partial<PreferenciasApi> = {};
  if (mudancas.tema !== undefined) saida.tema = mudancas.tema;
  if (mudancas.sonsAtivos !== undefined) saida.sons_ativos = mudancas.sonsAtivos;
  if (mudancas.volumeSons !== undefined) saida.volume_sons = Math.min(100, Math.max(0, Math.round(mudancas.volumeSons)));
  if (mudancas.somConfirmacao !== undefined) saida.som_confirmacao = mudancas.somConfirmacao;
  if (mudancas.somNotificacao !== undefined) saida.som_notificacao = mudancas.somNotificacao;
  if (mudancas.somErro !== undefined) saida.som_erro = mudancas.somErro;
  return saida;
}

export function configuracaoDeSons(preferencias: Preferencias): ConfiguracaoSons {
  return {
    ativos: preferencias.sonsAtivos,
    volume: preferencias.volumeSons / 100,
    tipos: {
      confirmacao: preferencias.somConfirmacao,
      notificacao: preferencias.somNotificacao,
      erro: preferencias.somErro,
    },
  };
}

/** Cópia guardada no navegador (JSON no formato da API); qualquer problema vira o padrão. */
export function lerPreferenciasGuardadas(texto: string | null): Preferencias {
  if (!texto) return PREFERENCIAS_PADRAO;
  try {
    return preferenciasDaApi(JSON.parse(texto));
  } catch {
    return PREFERENCIAS_PADRAO;
  }
}
