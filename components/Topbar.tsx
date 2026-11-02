import type { ReactNode } from "react";
import { AlternarTema } from "./AlternarTema";

export function Topbar({ titulo, subtitulo, acoes }: { titulo: string; subtitulo?: string; acoes?: ReactNode }) {
  return (
    <div className="topbar">
      <div className="greeting">
        <h1>{titulo}</h1>
        {subtitulo && <p>{subtitulo}</p>}
      </div>
      {/* O botão de tema fica aqui porque o topo aparece em todas as telas
          do painel, inclusive no celular (onde o menu lateral vira barra). */}
      <div className="topbar-actions">
        {acoes}
        <AlternarTema />
      </div>
    </div>
  );
}
