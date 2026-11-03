/**
 * Sons do site (React Bits): daylight nas confirmações, bloom nas
 * notificações novas e shrug nos erros. Os arquivos ficam em
 * public/sons/ e tocam pela Web Audio, carregados só na primeira vez.
 *
 * Respeitam as preferências da conta (Minha conta > Preferências: ligar,
 * volume e quais tocam - ver lib/preferencias.ts) e a regra dos
 * navegadores: som só depois que a pessoa já interagiu com a página.
 */
export type TipoSom = "confirmacao" | "notificacao" | "erro";

export const ARQUIVOS_SOM: Record<TipoSom, string> = {
  confirmacao: "/sons/daylight.wav",
  notificacao: "/sons/bloom.wav",
  erro: "/sons/shrug.wav",
};

export interface ConfiguracaoSons {
  ativos: boolean;
  /** 0 a 1. */
  volume: number;
  tipos: Record<TipoSom, boolean>;
}

export const SONS_PADRAO: ConfiguracaoSons = {
  ativos: true,
  volume: 0.7,
  tipos: { confirmacao: true, notificacao: true, erro: true },
};

/** Este som pode tocar com esta configuração? */
export function deveTocar(configuracao: ConfiguracaoSons, tipo: TipoSom): boolean {
  return configuracao.ativos && configuracao.volume > 0 && configuracao.tipos[tipo];
}

/**
 * Ganho no volume máximo. Os arquivos já vêm normalizados (pico em
 * -1 dBFS); acima de 1, o limitador de obterSaida() segura os picos para
 * o som sair mais alto sem estourar.
 */
export const GANHO_MAXIMO = 1.6;

/** Volume da preferência (0 a 1) para o ganho aplicado ao som. */
export function ganhoDoVolume(volume: number): number {
  return Math.min(1, Math.max(0, volume)) * GANHO_MAXIMO;
}

let configuracao: ConfiguracaoSons = SONS_PADRAO;
let contexto: AudioContext | null = null;
let saida: AudioNode | null = null;
const buffers = new Map<TipoSom, Promise<AudioBuffer | null>>();

export function configurarSons(nova: ConfiguracaoSons): void {
  configuracao = nova;
}

function obterContexto(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!contexto) {
    const Construtor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Construtor) return null;
    contexto = new Construtor({ latencyHint: "interactive" });
  }
  return contexto;
}

/** Limitador no fim da cadeia: com o ganho acima de 1, nenhum pico passa do teto. */
function obterSaida(audio: AudioContext): AudioNode {
  if (!saida) {
    const limitador = audio.createDynamicsCompressor();
    limitador.threshold.value = -2;
    limitador.knee.value = 0;
    limitador.ratio.value = 20;
    limitador.attack.value = 0.001;
    limitador.release.value = 0.1;
    limitador.connect(audio.destination);
    saida = limitador;
  }
  return saida;
}

/** Sem interação, o navegador não deixa o som tocar (e o resume() fica esperando). */
function jaInteragiu(): boolean {
  return typeof navigator === "undefined" || !navigator.userActivation || navigator.userActivation.hasBeenActive;
}

function carregar(tipo: TipoSom): Promise<AudioBuffer | null> {
  let pendente = buffers.get(tipo);
  if (!pendente) {
    const audio = obterContexto();
    pendente = audio
      ? fetch(ARQUIVOS_SOM[tipo])
          .then((resposta) => resposta.arrayBuffer())
          .then((dados) => audio.decodeAudioData(dados))
          .catch(() => null)
      : Promise.resolve(null);
    // Falhou (ex.: sem rede): tenta de novo na próxima vez.
    pendente.then((buffer) => {
      if (!buffer) buffers.delete(tipo);
    });
    buffers.set(tipo, pendente);
  }
  return pendente;
}

/** Deixa os três sons prontos - chamado na primeira interação com a página. */
export function prepararSons(): void {
  if (!jaInteragiu()) return;
  (Object.keys(ARQUIVOS_SOM) as TipoSom[]).forEach((tipo) => void carregar(tipo));
}

/**
 * Toca o som. `testar` (botões da tela de preferências) toca mesmo com o
 * tipo desligado, no volume informado. Som é enfeite: qualquer falha é
 * ignorada sem atrapalhar a tela.
 */
export async function tocarSom(tipo: TipoSom, { testar = false, volume }: { testar?: boolean; volume?: number } = {}): Promise<void> {
  if (!testar && !deveTocar(configuracao, tipo)) return;
  if (!jaInteragiu()) return;
  const audio = obterContexto();
  if (!audio) return;
  try {
    if (audio.state === "suspended") await audio.resume();
    const buffer = await carregar(tipo);
    if (!buffer) return;
    const fonte = audio.createBufferSource();
    fonte.buffer = buffer;
    const ganho = audio.createGain();
    ganho.gain.value = ganhoDoVolume(volume ?? configuracao.volume);
    fonte.connect(ganho).connect(obterSaida(audio));
    fonte.start();
  } catch {
    // Navegador sem Web Audio ou arquivo indisponível: segue sem som.
  }
}
