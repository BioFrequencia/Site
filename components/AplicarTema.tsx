"use client";

import { useLayoutEffect } from "react";
import { CHAVE_TEMA, temaEscolhido, temaInicial } from "@/lib/tema";

function temaGuardado(): string | null {
  try {
    return localStorage.getItem(CHAVE_TEMA);
  } catch {
    return null;
  }
}

/**
 * Mantém o data-tema do <html> em dia depois do carregamento: reaplica o
 * tema quando o modo de desenvolvimento remonta a página (o React limpa os
 * atributos do <html> que não vêm do JSX), segue o tema do sistema
 * enquanto ninguém escolheu um, e acompanha a troca feita em outra aba.
 */
export function AplicarTema() {
  useLayoutEffect(() => {
    const sistema = window.matchMedia("(prefers-color-scheme: dark)");
    const aplicar = () => document.documentElement.setAttribute("data-tema", temaInicial(temaGuardado(), sistema.matches));
    const aoMudarSistema = () => {
      if (!temaEscolhido(temaGuardado())) aplicar();
    };
    const aoMudarOutraAba = (evento: StorageEvent) => {
      if (evento.key === CHAVE_TEMA) aplicar();
    };

    aplicar();
    sistema.addEventListener("change", aoMudarSistema);
    window.addEventListener("storage", aoMudarOutraAba);
    return () => {
      sistema.removeEventListener("change", aoMudarSistema);
      window.removeEventListener("storage", aoMudarOutraAba);
    };
  }, []);

  return null;
}
