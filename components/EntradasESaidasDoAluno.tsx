"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "./Icon";
import { Paginacao } from "./Paginacao";
import { Segmentado } from "./Segmentado";
import type { AlvoCorrecao } from "./ModalCorrecaoRegistro";
import { formatarData, formatarDataHora, formatarHora, plural, rotuloOrigemAtraso } from "@/lib/format";
import { agruparPorMes, ITENS_POR_PAGINA, paginar, PERIODOS_DA_LISTA, type PeriodoDaLista } from "@/lib/listas";
import type { HistoricoAluno, RegistroEvento, TipoRegistro } from "@/lib/types";

type EventoDaFicha = RegistroEvento & { tipo: TipoRegistro };
type FiltroTipo = "todos" | TipoRegistro;

/**
 * Entradas atrasadas e saídas antecipadas da ficha do aluno. Um aluno com
 * muitas ocorrências deixava a tela enorme: agora a lista mostra um resumo
 * do período, filtra por tipo, separa por mês e vai de 10 em 10 (páginas),
 * então a altura fica sempre parecida. Os cancelados ficam de fora até
 * alguém pedir, marcados.
 */
export function EntradasESaidasDoAluno({
  historico,
  periodo,
  onMudarPeriodo,
  carregando,
  onCorrigir,
}: {
  historico: HistoricoAluno;
  periodo: PeriodoDaLista;
  onMudarPeriodo: (periodo: PeriodoDaLista) => void;
  carregando: boolean;
  onCorrigir: (alvo: AlvoCorrecao) => void;
}) {
  const [tipo, setTipo] = useState<FiltroTipo>("todos");
  const [comCancelados, setComCancelados] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [recolhida, setRecolhida] = useState(false);

  const todos: EventoDaFicha[] = [
    ...historico.atrasos.map((a) => ({ ...a, tipo: "atraso" as const })),
    ...historico.saidas.map((s) => ({ ...s, tipo: "saida" as const })),
  ].sort((a, b) => (a.data < b.data ? 1 : -1));
  const validos = todos.filter((e) => !e.cancelado);
  const cancelados = todos.length - validos.length;
  const base = comCancelados ? todos : validos;
  const doTipo = tipo === "todos" ? base : base.filter((e) => e.tipo === tipo);
  const pag = paginar(doTipo, pagina);
  const grupos = agruparPorMes(pag.itens, (e) => e.data);
  const temAcoes = pag.itens.some((e) => e.pode_cancelar || (e.cancelado && historico.pode_restaurar));

  const atrasos = validos.filter((e) => e.tipo === "atraso").length;
  const saidas = validos.length - atrasos;
  const justificados = validos.filter((e) => e.justificado).length;
  const nomeDoPeriodo = PERIODOS_DA_LISTA.find((p) => p.valor === periodo)?.rotulo.toLowerCase() ?? "";
  const resumo =
    `${plural(atrasos, "entrada atrasada", "entradas atrasadas")} e ${plural(saidas, "saída antecipada", "saídas antecipadas")}` +
    (periodo === "tudo" ? " desde o início" : ` (${nomeDoPeriodo})`) +
    (justificados > 0 ? `, ${plural(justificados, "justificada", "justificadas")}` : "") +
    (cancelados > 0 ? `. ${plural(cancelados, "registro cancelado", "registros cancelados")} à parte.` : ".");

  function descrever(evento: EventoDaFicha): string {
    const nome = evento.tipo === "atraso" ? "entrada atrasada" : "saída antecipada";
    return `${historico.aluno.nome_aluno} · ${nome} às ${formatarHora(evento.data)} de ${formatarData(evento.data)}`;
  }

  function mudar<T>(definir: (valor: T) => void) {
    return (valor: T) => {
      definir(valor);
      setPagina(1);
    };
  }

  return (
    <div className="panel panel-tabela secao">
      <div className="panel-head">
        <h2>Entradas e saídas</h2>
        <span className="panel-links">
          {historico.pode_restaurar && (
            <Link href={`/registros/correcoes?aluno=${historico.aluno.id_aluno}`} className="panel-meta">
              Correções deste aluno
            </Link>
          )}
          <button
            type="button"
            className="btn btn-sm btn-text btn-recolher"
            aria-expanded={!recolhida}
            aria-controls="eventos-do-aluno"
            onClick={() => setRecolhida((atual) => !atual)}
          >
            <Icon name="chevronDown" />
            {recolhida ? "Mostrar a lista" : "Recolher"}
            <span className="sr-only"> as entradas e saídas</span>
          </button>
        </span>
      </div>

      <div className="historico-filtros">
        <Segmentado rotulo="Período" opcoes={PERIODOS_DA_LISTA} valor={periodo} onMudar={mudar(onMudarPeriodo)} />
        <Segmentado
          rotulo="Tipo de registro"
          opcoes={[
            { valor: "todos", rotulo: "Todos", contagem: validos.length },
            { valor: "atraso", rotulo: "Entradas atrasadas", rotuloCurto: "Entradas", contagem: atrasos },
            { valor: "saida", rotulo: "Saídas antecipadas", rotuloCurto: "Saídas", contagem: saidas },
          ]}
          valor={tipo}
          onMudar={mudar(setTipo)}
        />
      </div>
      <p className="historico-resumo" aria-live="polite">
        {carregando ? "Atualizando…" : resumo}{" "}
        <span className="panel-meta">
          {formatarData(historico.periodo.inicio)} – {formatarData(historico.periodo.fim)}
        </span>
      </p>

      <div id="eventos-do-aluno" hidden={recolhida}>
        {doTipo.length === 0 ? (
          <div className="empty-state">
            <Icon name="check" />
            <p>
              {tipo === "todos"
                ? "Nenhuma entrada atrasada ou saída antecipada neste período."
                : `Nenhuma ${tipo === "atraso" ? "entrada atrasada" : "saída antecipada"} neste período.`}
            </p>
          </div>
        ) : (
          <table className="data-table tabela-cartoes tabela-agrupada">
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Motivo</th>
                <th>Registro</th>
                {temAcoes && (
                  <th>
                    <span className="sr-only">Ações</span>
                  </th>
                )}
              </tr>
            </thead>
            {grupos.map((grupo) => (
              <tbody key={grupo.chave}>
                <tr className="linha-grupo">
                  <th colSpan={temAcoes ? 5 : 4} scope="colgroup">
                    {grupo.rotulo}
                  </th>
                </tr>
                {grupo.itens.map((evento) => (
                  <tr key={`${evento.tipo}-${evento.id}`} className={evento.cancelado ? "linha-cancelada" : undefined}>
                    <td className="celula-titulo">
                      {formatarData(evento.data)} <span className="panel-meta">{formatarHora(evento.data)}</span>
                    </td>
                    <td data-label="Tipo">
                      <span className={`badge ${evento.tipo === "atraso" ? "badge--atraso" : "badge--saida"}`}>
                        {evento.tipo === "atraso" ? "Entrada atrasada" : "Saída antecipada"}
                      </span>
                      {evento.justificado && <span className="badge badge--regular">Justificado</span>}
                      {evento.cancelado && <span className="badge badge--cancelado">Cancelado</span>}
                    </td>
                    <td data-label="Motivo">
                      {evento.motivo ?? "-"}
                      {evento.retirado_por && <div className="panel-meta">Buscou: {evento.retirado_por}</div>}
                    </td>
                    <td data-label="Registro" className="panel-meta">
                      {evento.tipo === "atraso" ? rotuloOrigemAtraso(evento.origem) : "Lançada pela coordenação"}
                      {evento.registrado_por && <div>por {evento.registrado_por}</div>}
                      {evento.cancelado && (
                        <div className="info-cancelamento">
                          Cancelado{evento.cancelado_por ? ` por ${evento.cancelado_por}` : ""}
                          {evento.cancelado_em ? ` em ${formatarDataHora(evento.cancelado_em)}` : ""}
                          {evento.motivo_cancelamento ? `: ${evento.motivo_cancelamento}` : ""}
                        </div>
                      )}
                    </td>
                    {temAcoes && (
                      <td className="celula-acoes">
                        {evento.pode_cancelar && (
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() => onCorrigir({ acao: "cancelar", tipo: evento.tipo, id: evento.id, descricao: descrever(evento) })}
                          >
                            <Icon name="x" />
                            Cancelar<span className="sr-only"> {descrever(evento)}</span>
                          </button>
                        )}
                        {evento.cancelado && historico.pode_restaurar && (
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => onCorrigir({ acao: "restaurar", tipo: evento.tipo, id: evento.id, descricao: descrever(evento) })}
                          >
                            <Icon name="refresh" />
                            Restaurar<span className="sr-only"> {descrever(evento)}</span>
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        )}
        <div className="historico-rodape">
          <span>
            {doTipo.length > 0 &&
              (pag.totalPaginas === 1
                ? plural(doTipo.length, "registro", "registros")
                : `${(pag.pagina - 1) * ITENS_POR_PAGINA + 1}–${(pag.pagina - 1) * ITENS_POR_PAGINA + pag.itens.length} de ${doTipo.length} registros`)}
          </span>
          {cancelados > 0 && (
            <button type="button" className="btn btn-sm btn-text" aria-pressed={comCancelados} onClick={() => mudar(setComCancelados)(!comCancelados)}>
              {comCancelados ? "Esconder os cancelados" : `Mostrar os ${plural(cancelados, "cancelado", "cancelados")}`}
            </button>
          )}
        </div>
        <Paginacao pagina={pag.pagina} totalPaginas={pag.totalPaginas} onMudar={setPagina} />
      </div>
    </div>
  );
}
