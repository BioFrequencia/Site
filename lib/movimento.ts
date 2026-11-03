import { useEffect, useState } from "react";

/**
 * true quando o sistema operacional pede menos movimento (acessibilidade):
 * gráficos e números aparecem prontos, sem animar. As animações de CSS
 * seguem a mesma regra em app/globals.css.
 */
export function useMenosMovimento(): boolean {
  const [menos, setMenos] = useState(false);
  useEffect(() => {
    const consulta = window.matchMedia("(prefers-reduced-motion: reduce)");
    setMenos(consulta.matches);
    const mudar = (evento: MediaQueryListEvent) => setMenos(evento.matches);
    consulta.addEventListener("change", mudar);
    return () => consulta.removeEventListener("change", mudar);
  }, []);
  return menos;
}

/** Valor intermediário da contagem animada (ease-out cúbico), de 0 até o alvo. */
export function valorAnimado(alvo: number, progresso: number): number {
  const p = Math.max(0, Math.min(1, progresso));
  return alvo * (1 - Math.pow(1 - p, 3));
}

/**
 * Número que vai de 0 até o alvo em `duracao` ms (os números do
 * dashboard e o meio do anel de pontualidade, no ritmo do gráfico). Com
 * "menos movimento" no sistema, já começa no valor final.
 */
export function useContagem(alvo: number, duracao: number): number {
  const menosMovimento = useMenosMovimento();
  const [valor, setValor] = useState(0);

  useEffect(() => {
    if (menosMovimento) {
      setValor(alvo);
      return;
    }
    let quadro = 0;
    const inicio = performance.now();
    const passo = (agora: number) => {
      const progresso = (agora - inicio) / duracao;
      setValor(valorAnimado(alvo, progresso));
      if (progresso < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [alvo, duracao, menosMovimento]);

  return valor;
}
