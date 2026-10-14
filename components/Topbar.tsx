import type { ReactNode } from "react";

export function Topbar({ titulo, subtitulo, acoes }: { titulo: string; subtitulo?: string; acoes?: ReactNode }) {
  return (
    <div className="topbar">
      <div className="greeting">
        <h1>{titulo}</h1>
        {subtitulo && <p>{subtitulo}</p>}
      </div>
      {acoes && <div className="topbar-actions">{acoes}</div>}
    </div>
  );
}
