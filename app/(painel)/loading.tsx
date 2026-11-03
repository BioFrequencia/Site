import { Esqueleto } from "@/components/Esqueleto";

/** Aparece na hora ao trocar de página, enquanto a próxima tela termina de carregar. */
export default function CarregandoPagina() {
  return (
    <>
      <div className="esq-topo" aria-hidden="true">
        <span className="esq esq-titulo" />
        <span className="esq esq-subtitulo" />
      </div>
      <Esqueleto variante="lista" texto="Abrindo a página…" />
    </>
  );
}
