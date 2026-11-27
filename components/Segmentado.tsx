/**
 * Botões lado a lado para escolher uma opção de filtro (período, tipo...),
 * no visual das abas pequenas. São botões com aria-pressed num grupo com
 * nome: dá para usar com Tab e Enter, e o leitor de tela anuncia qual está
 * escolhido. A contagem, quando vem, aparece ao lado do rótulo.
 */
export interface OpcaoSegmentada<T extends string> {
  valor: T;
  rotulo: string;
  contagem?: number;
}

export function Segmentado<T extends string>({
  rotulo,
  opcoes,
  valor,
  onMudar,
}: {
  rotulo: string;
  opcoes: readonly OpcaoSegmentada<T>[];
  valor: T;
  onMudar: (valor: T) => void;
}) {
  return (
    <div className="abas-mini segmentado" role="group" aria-label={rotulo}>
      {opcoes.map((opcao) => (
        <button
          key={opcao.valor}
          type="button"
          aria-pressed={valor === opcao.valor}
          className={valor === opcao.valor ? "ativa" : ""}
          onClick={() => onMudar(opcao.valor)}
        >
          {opcao.rotulo}
          {opcao.contagem !== undefined && <span className="segmentado-contagem">{opcao.contagem}</span>}
        </button>
      ))}
    </div>
  );
}
