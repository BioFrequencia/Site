import { Icon } from "./Icon";

/**
 * "Anterior · Página 2 de 5 · Próxima" no fim das listas paginadas
 * (Notificações, Turmas, Acompanhamento, Administração). Some quando há uma
 * página só. A posição é anunciada ao leitor de tela quando a página muda.
 */
export function Paginacao({
  pagina,
  totalPaginas,
  onMudar,
}: {
  pagina: number;
  totalPaginas: number;
  onMudar: (pagina: number) => void;
}) {
  if (totalPaginas <= 1) return null;
  return (
    <nav className="paginacao" aria-label="Páginas da lista">
      <button type="button" className="btn btn-sm" disabled={pagina <= 1} onClick={() => onMudar(pagina - 1)}>
        <Icon name="chevronLeft" />
        Anterior
      </button>
      <span className="paginacao-posicao" aria-live="polite">
        Página {pagina} de {totalPaginas}
      </span>
      <button type="button" className="btn btn-sm" disabled={pagina >= totalPaginas} onClick={() => onMudar(pagina + 1)}>
        Próxima
        <Icon name="chevronRight" />
      </button>
    </nav>
  );
}
