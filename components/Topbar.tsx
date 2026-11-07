import type { ReactNode } from "react";
import { AlternarTema } from "./AlternarTema";

/**
 * Topo das telas do painel: título, as ações da tela e o botão de tema.
 * O botão de tema é um item do layout (não fica por cima de nada): no
 * computador vem depois das ações, na mesma linha e altura; no celular
 * fica ao lado do título e as ações descem (app/globals.css, .topbar).
 */
export function Topbar({ titulo, subtitulo, acoes }: { titulo: string; subtitulo?: string; acoes?: ReactNode }) {
  return (
    <div className="topbar">
      <div className="greeting">
        <h1>{titulo}</h1>
        {subtitulo && <p>{subtitulo}</p>}
      </div>
      {acoes && <div className="topbar-actions">{acoes}</div>}
      <AlternarTema className="icon-btn topbar-tema" />
    </div>
  );
}
