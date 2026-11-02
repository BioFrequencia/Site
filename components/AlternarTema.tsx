"use client";

import { Icon } from "./Icon";
import { CHAVE_TEMA, outroTema, type Tema } from "@/lib/tema";

/**
 * Botão de tema claro/escuro. O tema vive no data-tema do <html> (posto
 * antes da pintura pelo script de lib/tema.ts); a lua aparece no tema
 * claro e o sol no escuro pelo CSS, sem estado no React - o botão nunca
 * mostra o ícone errado enquanto a página carrega.
 */
export function AlternarTema({ className = "icon-btn" }: { className?: string }) {
  function alternar() {
    const atual: Tema = document.documentElement.getAttribute("data-tema") === "escuro" ? "escuro" : "claro";
    const novo = outroTema(atual);
    document.documentElement.setAttribute("data-tema", novo);
    try {
      localStorage.setItem(CHAVE_TEMA, novo);
    } catch {
      // Navegador sem armazenamento: o tema vale até recarregar a página.
    }
  }

  return (
    <button
      type="button"
      className={`${className} alternar-tema`}
      onClick={alternar}
      title="Alternar tema claro/escuro"
      aria-label="Alternar entre tema claro e escuro"
    >
      <Icon name="moon" className="icon tema-lua" />
      <Icon name="sun" className="icon tema-sol" />
    </button>
  );
}
