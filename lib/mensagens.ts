/**
 * A tela "Enviar mensagem" (/notificacoes/enviar) e o histórico de
 * Notificações: escolhas e textos que não dependem do servidor. Quem monta
 * a mensagem de cada responsável é a API (a prévia mostra exatamente o
 * que vai sair).
 */
import type { CanalMensagem, ComoSaiMensagem, ContatoResponsavel, DestinoMensagem, StatusNotificacao } from "./types.ts";

/** Os destinos que já vêm marcados: o canal preferido de cada responsável (o que a API sugere). */
export function destinosSugeridos(responsaveis: ContatoResponsavel[]): DestinoMensagem[] {
  return responsaveis.flatMap((r) => r.sugeridos.map((canal) => ({ id_responsavel: r.id_responsavel, canal })));
}

export function temDestino(destinos: DestinoMensagem[], idResponsavel: number, canal: CanalMensagem): boolean {
  return destinos.some((d) => d.id_responsavel === idResponsavel && d.canal === canal);
}

/** Liga ou desliga um destino. */
export function alternarDestino(destinos: DestinoMensagem[], destino: DestinoMensagem): DestinoMensagem[] {
  return temDestino(destinos, destino.id_responsavel, destino.canal)
    ? destinos.filter((d) => !(d.id_responsavel === destino.id_responsavel && d.canal === destino.canal))
    : [...destinos, destino];
}

/** Como a mensagem vai sair, em palavras. */
export function rotuloComoSai(canal: CanalMensagem, como: ComoSaiMensagem): string {
  if (como === "automatico") return canal === "whatsapp" ? "Sai pelo WhatsApp da escola" : "Sai por e-mail";
  if (como === "link") return "Sem WhatsApp automático: você manda pelo link, do seu WhatsApp";
  return "Sem e-mail automático: fica na fila de Notificações";
}

/** O selo da situação de um envio. */
export function seloDoEnvio(status: StatusNotificacao): { classe: string; texto: string } {
  if (status === "enviada") return { classe: "badge badge--enviada", texto: "Enviada" };
  if (status === "erro") return { classe: "badge badge--erro", texto: "Erro no envio" };
  return { classe: "badge badge--pendente", texto: "Para mandar" };
}

/** O título do resultado: o que de fato aconteceu com a mensagem. */
export function tituloDoEnvio(resumo: { enviadas: number; pendentes: number; erros: number }): string {
  if (resumo.erros > 0 && resumo.enviadas + resumo.pendentes === 0) return "A mensagem não saiu";
  if (resumo.erros > 0) return "Mensagem enviada, com erro em parte";
  if (resumo.enviadas === 0 && resumo.pendentes > 0) return "Mensagem pronta: falta mandar pelo link";
  return "Mensagem enviada";
}

/** O link do WhatsApp para mandar à mão (como a API faz): DDD + número, com o 55 do Brasil. */
export function linkWhatsapp(telefone: string | null | undefined, mensagem: string): string | null {
  const digitos = (telefone ?? "").replace(/\D/g, "");
  if (digitos.length < 10) return null;
  const internacional = digitos.length <= 11 ? `55${digitos}` : digitos;
  return `https://wa.me/${internacional}?text=${encodeURIComponent(mensagem)}`;
}

/** Uma chave nova por mensagem: o mesmo pedido repetido (clique duplo, conexão que caiu) não manda de novo. */
export function novaChaveDeEnvio(): string {
  return crypto.randomUUID();
}
