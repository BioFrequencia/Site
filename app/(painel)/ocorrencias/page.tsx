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

      <div className="panel">
        <div className="filtros-linha">
          {filtros.map((f) => (
            <button
              key={f.valor}
              type="button"
              className={`btn btn-sm${filtro === f.valor ? " btn-primary" : ""}`}
              onClick={() => setFiltro(f.valor)}
            >
              {f.rotulo}
            </button>
          ))}
        </div>

        {carregando ? (
          <div className="estado-vazio">
            <div className="spinner" aria-label="Carregando" />
            <p>Carregando ocorrências…</p>
          </div>
        ) : ocorrencias.length === 0 ? (
          <div className="estado-vazio">
            <Icon name="inbox" />
            <p>
              {filtro === "pendente"
                ? "Nenhum envio aguardando decisão."
                : "Nenhuma ocorrência nesta situação."}
            </p>
            <span>
              Os alunos enviam por aqui depois de confirmar a biometria no aplicativo.
            </span>
          </div>
        ) : (
          <div className="lista-ocorrencias">
            {ocorrencias.map((o) => (
              <article className="ocorrencia-card" key={o.id_ocorrencia}>
                <header className="ocorrencia-topo">
                  <div>
                    <strong>{o.nome_aluno}</strong>
                    <span className="ocorrencia-turma">{o.turma ?? "sem turma"}</span>
                  </div>
                  <span className={`badge badge--${o.tipo === "falta" ? "em-risco" : "atencao"}`}>
                    {o.tipo === "falta" ? "Falta" : "Atraso"}
                  </span>
                </header>

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
                  <footer className="ocorrencia-acoes">
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => decidir(o, "rejeitar")}
                      disabled={decidindo === o.id_ocorrencia}
                    >
                      Rejeitar
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => decidir(o, "aprovar")}
                      disabled={decidindo === o.id_ocorrencia}
                    >
                      {decidindo === o.id_ocorrencia ? "Registrando…" : "Aprovar e lançar"}
                    </button>
                  </footer>
                ) : (
                  <footer className="ocorrencia-decidida">
                    {o.status === "aprovado" ? "Aprovada" : "Rejeitada"}
                    {o.revisado_por ? ` por ${o.revisado_por}` : ""}
                    {o.revisado_em ? ` em ${formatarDataHora(o.revisado_em)}` : ""}.
                  </footer>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
