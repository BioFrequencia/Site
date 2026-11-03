"use client";

import { useEffect, useRef, useState } from "react";
import { useMenosMovimento, valorAnimado } from "@/lib/movimento";

/**
 * Número que "conta" até o valor quando aparece (os cartões do dashboard).
 * Com "menos movimento" no sistema, aparece direto no valor final.
 */
export function NumeroAnimado({ valor, duracao = 700 }: { valor: number; duracao?: number }) {
  const menosMovimento = useMenosMovimento();
  const [mostrado, setMostrado] = useState(menosMovimento ? valor : 0);
  const quadro = useRef<number | null>(null);

  useEffect(() => {
    if (menosMovimento) {
      setMostrado(valor);
      return;
    }
    const inicio = performance.now();
    const passo = (agora: number) => {
      const progresso = (agora - inicio) / duracao;
      setMostrado(Math.round(valorAnimado(valor, progresso)));
      if (progresso < 1) quadro.current = requestAnimationFrame(passo);
    };
    quadro.current = requestAnimationFrame(passo);
    return () => {
      if (quadro.current !== null) cancelAnimationFrame(quadro.current);
    };
  }, [valor, duracao, menosMovimento]);

  return <>{mostrado.toLocaleString("pt-BR")}</>;
}
