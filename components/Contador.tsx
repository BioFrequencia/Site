"use client";

import { useEffect, useState } from "react";
import { useMenosMovimento } from "@/lib/movimento";

/**
 * Número que conta de 0 até o valor quando aparece (cerca de 0,7 s,
 * desacelerando no fim). Quem pediu menos animação no sistema vê o número
 * pronto. O leitor de tela recebe sempre o valor final.
 */
export function Contador({ valor, duracao = 700 }: { valor: number; duracao?: number }) {
  const menosMovimento = useMenosMovimento();
  const [atual, setAtual] = useState(menosMovimento ? valor : 0);

  useEffect(() => {
    if (menosMovimento || valor === 0) {
      setAtual(valor);
      return;
    }
    let quadro = 0;
    const inicio = performance.now();
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / duracao);
      const suave = 1 - Math.pow(1 - t, 3);
      setAtual(Math.round(valor * suave));
      if (t < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [valor, duracao, menosMovimento]);

  return (
    <>
      <span aria-hidden="true">{atual.toLocaleString("pt-BR")}</span>
      <span className="sr-only">{valor.toLocaleString("pt-BR")}</span>
    </>
  );
}
