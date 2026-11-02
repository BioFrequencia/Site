"use client";

import { Icon } from "./Icon";
import { usePreferencias } from "./Preferencias";
import { useToast } from "./Toast";
import { outroTema, type Tema } from "@/lib/tema";

/**
 * Botão de tema claro/escuro. O tema vive no data-tema do <html> (posto
 * antes da pintura pelo script de lib/tema.ts); a lua aparece no tema
 * claro e o sol no escuro pelo CSS, sem estado no React - o botão nunca
 * mostra o ícone errado enquanto a página carrega. Com a sessão aberta,
 * a escolha também fica salva na conta (Minha conta > Preferências).
 */
export function AlternarTema({ className = "icon-btn" }: { className?: string }) {
  const { salvar } = usePreferencias();
  const { mostrarToast } = useToast();

  async function alternar() {
    const atual: Tema = document.documentElement.getAttribute("data-tema") === "escuro" ? "escuro" : "claro";
    const erro = await salvar({ tema: outroTema(atual) });
    if (erro) mostrarToast(erro, true);
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
