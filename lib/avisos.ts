import type { AvisosDoRegistro, ResumoAviso, TipoRegistro } from "./types";

/**
 * Mensagem que aparece depois de registrar uma entrada atrasada ou saída
 * antecipada: o registro e o que aconteceu com os avisos aos
 * responsáveis (helpers/avisos.php na API). Função pura.
 */
export function mensagemDoRegistro(tipo: TipoRegistro, avisos: AvisosDoRegistro | null | undefined): string {
  const partes = [tipo === "atraso" ? "Entrada atrasada registrada." : "Saída antecipada registrada."];
  const limite = avisos && !Array.isArray(avisos.limite) ? avisos.limite : {};
  const doLimite = Object.values(limite).filter((r): r is ResumoAviso => !!r && !r.ja_avisado);
  if (doLimite.some((r) => r.sem_responsavel)) {
    partes.push("O aluno passou do limite da escola, mas não tem responsável cadastrado para ser avisado.");
  } else if (doLimite.length > 0) {
    partes.push(`O aluno passou do limite da escola: ${descreverEnvio(doLimite)}`);
  }
  if (avisos?.registro) {
    partes.push(`Aviso do registro: ${descreverEnvio([avisos.registro])}`);
  }
  return partes.join(" ");
}

function descreverEnvio(resumos: ResumoAviso[]): string {
  const soma = (campo: keyof ResumoAviso) => resumos.reduce((total, r) => total + (Number(r[campo]) || 0), 0);
  const enviados = soma("enviados");
  const fila = soma("na_fila");
  const falhas = soma("falhas");
  const textos: string[] = [];
  if (enviados > 0) textos.push(enviados === 1 ? "1 mensagem enviada ao responsável" : `${enviados} mensagens enviadas aos responsáveis`);
  if (fila > 0) textos.push(fila === 1 ? "1 mensagem na fila de Notificações" : `${fila} mensagens na fila de Notificações`);
  if (falhas > 0) textos.push(falhas === 1 ? "1 envio falhou (veja Notificações)" : `${falhas} envios falharam (veja Notificações)`);
  if (textos.length === 0) return "nenhum responsável com telefone ou e-mail para avisar.";
  return textos.join(", ") + ".";
}

/** Rótulo do motivo de cada mensagem na fila de Notificações. */
export function rotuloTipoAviso(tipo: string | null | undefined): string {
  switch (tipo) {
    case "registro_atraso":
      return "Entrada atrasada";
    case "registro_saida":
      return "Saída antecipada";
    case "limite_atrasos":
      return "Limite de entradas atrasadas";
    case "limite_saidas":
      return "Limite de saídas antecipadas";
    default:
      return "Aviso";
  }
}
