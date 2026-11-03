"use client";

import { useContagem } from "@/lib/movimento";

/**
 * Número que "conta" até o valor quando aparece (os cartões do dashboard).
 * Com "menos movimento" no sistema, aparece direto no valor final.
 */
export function NumeroAnimado({ valor, duracao = 700 }: { valor: number; duracao?: number }) {
  const mostrado = Math.round(useContagem(valor, duracao));
  return <>{mostrado.toLocaleString("pt-BR")}</>;
}
