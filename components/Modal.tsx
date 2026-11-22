"use client";

import { useEffect, useId, type ReactNode } from "react";
import { Icon } from "./Icon";

export function Modal({
  titulo,
  aberto,
  onFechar,
  children,
  footer,
}: {
  titulo: string;
  aberto: boolean;
  onFechar: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const idTitulo = useId();
  useEffect(() => {
    if (!aberto) return;
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") onFechar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberto, onFechar]);

  if (!aberto) return null;

  return (
    <div className="modal-overlay open" onClick={onFechar}>
      {/* Leitores de tela anunciam como janela de diálogo, com o título. */}
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={idTitulo} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3 id={idTitulo}>{titulo}</h3>
          <button type="button" className="modal-close" onClick={onFechar} aria-label="Fechar">
            <Icon name="x" />
          </button>
        </div>
        {children}
        {footer && <div className="modal-actions">{footer}</div>}
      </div>
    </div>
  );
}
