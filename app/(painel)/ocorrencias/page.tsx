"use client";

import { useCallback, useEffect, useState } from "react";
import { Api } from "@/lib/api";
import type { Ocorrencia } from "@/lib/types";
import { Topbar } from "@/components/Topbar";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { formatarDataHora } from "@/lib/format";

type Filtro = "pendente" | "aprovado" | "rejeitado" | "todos";

/**
 * Ocorrências que os alunos enviaram pelo aplicativo depois de confirmar
 * a biometria. Nada aqui virou falta ainda: a decisão é desta tela.
 * Aprovar cria a falta/atraso de verdade; rejeitar preserva o registro
 * para o histórico do caso.
 */
export default function OcorrenciasPage() {
  const { mostrarToast } = useToast();
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("pendente");
  const [decidindo, setDecidindo] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const resposta = await Api.listarOcorrencias(filtro);
    setCarregando(false);
    if (!resposta.sucesso || !resposta.dados) {
      if (!resposta.naoAutenticado) mostrarToast(resposta.mensagem, true);
      return;
    }
    setOcorrencias(resposta.dados.ocorrencias);
  }, [filtro, mostrarToast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function decidir(ocorrencia: Ocorrencia, decisao: "aprovar" | "rejeitar") {
    setDecidindo(ocorrencia.id_ocorrencia);
    const resposta = await Api.revisarOcorrencia(ocorrencia.id_ocorrencia, decisao, {
      // Se o aluno diz que o responsável está ciente, a falta entra como
      // justificada por padrão - a coordenação ainda pode mudar depois na
      // ficha do aluno.
      justificado: decisao === "aprovar" && ocorrencia.responsavel_ciente,
    });
    setDecidindo(null);
    if (!resposta.sucesso) {
      mostrarToast(resposta.mensagem, true);
      // Outra pessoa pode ter decidido antes: recarrega para a lista não
      // ficar mostrando algo que já saiu da fila.
      carregar();
      return;
    }
    mostrarToast(
      decisao === "aprovar"
        ? `${ocorrencia.tipo === "falta" ? "Falta" : "Atraso"} lançado para ${ocorrencia.nome_aluno}.`
        : `Envio de ${ocorrencia.nome_aluno} rejeitado.`
    );
    carregar();
  }

  const filtros: { valor: Filtro; rotulo: string }[] = [
    { valor: "pendente", rotulo: "Aguardando" },
    { valor: "aprovado", rotulo: "Aprovadas" },
    { valor: "rejeitado", rotulo: "Rejeitadas" },
    { valor: "todos", rotulo: "Todas" },
  ];

  return (
    <>
      <Topbar
        titulo="Ocorrências do aplicativo"
        subtitulo="Envios dos alunos aguardando sua decisão."
      />

      <div className="filter-bar">
        <div className="filtro" role="group" aria-labelledby="filtro-situacao">
          <span id="filtro-situacao" className="filtro-rotulo">
            Situação
          </span>
          <div className="pill-group">
            {filtros.map((f) => (
              <button
                key={f.valor}
                type="button"
                aria-pressed={filtro === f.valor}
                className={`filter-pill${filtro === f.valor ? " active" : ""}`}
                onClick={() => setFiltro(f.valor)}
              >
                {f.rotulo}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="panel panel-tabela" aria-busy={carregando}>
        {carregando ? (
          <div className="empty-state" role="status">
            <div className="spinner" aria-hidden="true" />
            <p>Carregando ocorrências…</p>
          </div>
        ) : ocorrencias.length === 0 ? (
          <div className="empty-state">
            <Icon name="inbox" />
            <p>
              <strong>
                {filtro === "pendente"
                  ? "Nenhum envio aguardando decisão."
                  : "Nenhuma ocorrência nesta situação."}
              </strong>{" "}
              Os alunos enviam por aqui depois de confirmar a biometria no aplicativo.
            </p>
          </div>
        ) : (
          <ul className="lista-ocorrencias">
            {ocorrencias.map((o) => (
              <li className="ocorrencia-item" key={o.id_ocorrencia}>
                <div className="ocorrencia-topo">
                  <div>
                    <h2>{o.nome_aluno}</h2>
                    <span className="ocorrencia-turma">{o.turma ?? "sem turma"}</span>
                  </div>
                  <span className={`badge badge--${o.tipo === "falta" ? "em-risco" : "atencao"}`}>
                    {o.tipo === "falta" ? "Falta" : "Atraso"}
                  </span>
                </div>

                <dl className="ocorrencia-dados">
                  <div>
                    <dt>Motivo</dt>
                    <dd>{o.motivo ?? "—"}</dd>
                  </div>
                  {o.observacao && (
                    <div>
                      <dt>Observação</dt>
                      <dd>{o.observacao}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Responsável ciente</dt>
                    <dd>{o.responsavel_ciente ? "Sim, segundo o aluno" : "Não"}</dd>
                  </div>
                  <div>
                    <dt>Enviado em</dt>
                    <dd>{formatarDataHora(o.criado_em)}</dd>
                  </div>
                </dl>

                {o.status === "pendente" ? (
                  <div className="ocorrencia-acoes">
                    <button
                      type="button"
                      className="btn"
                      onClick={() => decidir(o, "rejeitar")}
                      disabled={decidindo === o.id_ocorrencia}
                    >
                      Rejeitar<span className="sr-only"> o envio de {o.nome_aluno}</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => decidir(o, "aprovar")}
                      disabled={decidindo === o.id_ocorrencia}
                    >
                      {decidindo === o.id_ocorrencia ? "Registrando…" : "Aprovar e lançar"}
                      <span className="sr-only"> o envio de {o.nome_aluno}</span>
                    </button>
                  </div>
                ) : (
                  <p className="ocorrencia-decidida">
                    {o.status === "aprovado" ? "Aprovada" : "Rejeitada"}
                    {o.revisado_por ? ` por ${o.revisado_por}` : ""}
                    {o.revisado_em ? ` em ${formatarDataHora(o.revisado_em)}` : ""}.
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
