"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { assinarCarregamento, carregamentosPendentes } from "@/lib/carregamento";

/** Chamadas mais rápidas que isso não mostram a barra (evita o pisca-pisca). */
const ESPERA_MS = 150;

/**
 * Barra fina no topo enquanto alguma chamada à API está em andamento:
 * mostra que a tela está trabalhando, mesmo quando só um pedaço dela muda.
 */
export function BarraProgresso() {
  const pendentes = useSyncExternalStore(assinarCarregamento, carregamentosPendentes, () => 0);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    if (pendentes === 0) {
      setVisivel(false);
      return;
    }
    const espera = setTimeout(() => setVisivel(true), ESPERA_MS);
    return () => clearTimeout(espera);
  }, [pendentes]);

  return (
    <div className={`barra-progresso${visivel ? " ativa" : ""}`} aria-hidden="true">
      <span />
    </div>
  );
}
