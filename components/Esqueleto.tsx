/**
 * Esqueletos de carregamento: o formato da tela que vai aparecer, com o
 * brilho passando, em vez de um "Carregando…" solto. O texto continua lá
 * para leitores de tela.
 *
 *   painel   dashboard: anel, números e dois cartões
 *   lista    linhas com avatar (alunos, alertas, registros, contas)
 *   cartoes  grade de cartões (escola, responsáveis)
 *   ficha    cabeçalho de uma pessoa e os blocos abaixo (aluno)
 */
type Variante = "painel" | "lista" | "cartoes" | "ficha";

function Linhas({ quantidade }: { quantidade: number }) {
  return (
    <div className="esq-lista">
      {Array.from({ length: quantidade }, (_, i) => (
        <div className="esq-linha" key={i}>
          <span className="esq esq-avatar" />
          <span className="esq-textos">
            <span className="esq esq-texto" style={{ width: `${62 - (i % 3) * 12}%` }} />
            <span className="esq esq-texto curto" />
          </span>
          <span className="esq esq-selo" />
        </div>
      ))}
    </div>
  );
}

export function Esqueleto({ variante = "lista", texto = "Carregando…" }: { variante?: Variante; texto?: string }) {
  return (
    <div className={`esqueleto esqueleto-${variante}`} role="status" aria-live="polite">
      <span className="sr-only">{texto}</span>
      {variante === "painel" && (
        <>
          <div className="esq-hero">
            <span className="esq esq-anel" />
            <div className="esq-numeros">
              {Array.from({ length: 4 }, (_, i) => (
                <span className="esq esq-numero" key={i} />
              ))}
            </div>
          </div>
          <div className="esq-grade-2">
            <span className="esq esq-grafico" />
            <span className="esq esq-grafico" />
          </div>
        </>
      )}
      {variante === "lista" && (
        <div className="esq-cartao">
          <Linhas quantidade={6} />
        </div>
      )}
      {variante === "cartoes" && (
        <div className="esq-grade-3">
          {Array.from({ length: 6 }, (_, i) => (
            <span className="esq esq-bloco" key={i} />
          ))}
        </div>
      )}
      {variante === "ficha" && (
        <>
          <div className="esq-cartao esq-cabecalho">
            <span className="esq esq-avatar grande" />
            <span className="esq-textos">
              <span className="esq esq-texto" style={{ width: "40%" }} />
              <span className="esq esq-texto curto" />
            </span>
          </div>
          <div className="esq-grade-2">
            <span className="esq esq-bloco" />
            <span className="esq esq-bloco" />
          </div>
          <div className="esq-cartao">
            <Linhas quantidade={3} />
          </div>
        </>
      )}
    </div>
  );
}
