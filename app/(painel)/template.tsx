import type { ReactNode } from "react";

/**
 * Cada tela do painel entra com um leve deslizar quando se troca de página
 * pelo menu: o template remonta a cada troca, o layout (com o menu) fica.
 */
export default function TemplatePainel({ children }: { children: ReactNode }) {
  return <div className="transicao-pagina">{children}</div>;
}
