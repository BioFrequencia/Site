"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Api } from "@/lib/api";
import { Topbar } from "@/components/Topbar";
import { Esqueleto } from "@/components/Esqueleto";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { classeBadgePrioridade, formatarData, formatarPercentual, rotuloPrioridade, rotuloTipoAlerta } from "@/lib/format";
import type { Alerta, Sala } from "@/lib/types";

export default function AlertasPage() {
  const { mostrarToast } = useToast();
  const [salas, setSalas] = useState<Sala[]>([]);
  const [idSala, setIdSala] = useState<string>("");
  const [tipo, setTipo] = useState<string>("");
  const [prioridade, setPrioridade] = useState<string>("");
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [encerrando, setEncerrando] = useState<number | null>(null);
  const [limite, setLimite] = useState<number | null>(null);
  const [janelaDias, setJanelaDias] = useState<number | null>(null);

  useEffect(() => {
    Api.listarSalas().then((resposta) => {
      if (resposta.sucesso && resposta.dados) setSalas(resposta.dados);
    });
  }, []);

  async function carregar() {
    setCarregando(true);
    const resposta = await Api.alertas(idSala ? Number(idSala) : null, tipo || null, prioridade || null);
    if (resposta.sucesso && resposta.dados) {
      setAlertas(resposta.dados.alertas);
      setLimite(resposta.dados.limite ?? null);
      setJanelaDias(resposta.dados.janela?.dias ?? null);
      setErro(null);
    } else {
      setErro(resposta.mensagem);
    }
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idSala, tipo, prioridade]);

  async function encerrar(alerta: Alerta) {
    if (
      !confirm(
        `Encerrar os alertas de ${alerta.nome_aluno}? Eles saem desta lista e só voltam se houver uma nova entrada atrasada ou saída antecipada.`,
      )
    )
      return;
    setEncerrando(alerta.id_aluno);
    const resposta = await Api.encerrarAlerta(alerta.id_aluno);
    setEncerrando(null);
    if (!resposta.sucesso) {
      mostrarToast(resposta.mensagem, true);
      return;
    }
    mostrarToast(`Alertas de ${alerta.nome_aluno} encerrados até o próximo registro.`);
    setAlertas((atual) => atual.filter((a) => a.id_aluno !== alerta.id_aluno));
  }

  return (
    <>
      <Topbar
        titulo="Alertas"
        subtitulo="Alunos com muitas entradas atrasadas ou saídas antecipadas, contando só os dias de aula."
      />

      <div className="filter-bar">
        <div className="filtro">
          <label htmlFor="filtro-turma" className="filtro-rotulo">
            Turma
          </label>
          <select id="filtro-turma" className="filter-select" value={idSala} onChange={(e) => setIdSala(e.target.value)}>
            <option key="" value="">
              Todas as turmas
            </option>
            {salas.map((sala) => (
              <option key={sala.id_sala} value={sala.id_sala}>
                {sala.nome_sala}
              </option>
            ))}
          </select>
        </div>

        <div className="filtro" role="group" aria-labelledby="filtro-tipo">
          <span id="filtro-tipo" className="filtro-rotulo">
            Tipo
          </span>
          <div className="pill-group">
            {[
              { valor: "", rotulo: "Todos" },
              { valor: "atrasos", rotulo: "Entradas atrasadas" },
              { valor: "saidas", rotulo: "Saídas antecipadas" },
            ].map((opcao) => (
              <button
                key={opcao.valor}
                type="button"
                aria-pressed={tipo === opcao.valor}
                className={`filter-pill${tipo === opcao.valor ? " active" : ""}`}
                onClick={() => setTipo(opcao.valor)}
              >
                {opcao.rotulo}
              </button>
            ))}
          </div>
        </div>

        <div className="filtro" role="group" aria-labelledby="filtro-prioridade">
          <span id="filtro-prioridade" className="filtro-rotulo">
            Prioridade
          </span>
          <div className="pill-group">
            {[
              { valor: "", rotulo: "Todas" },
              { valor: "alta", rotulo: "Alta" },
              { valor: "media", rotulo: "Média" },
              { valor: "baixa", rotulo: "Baixa" },
            ].map((opcao) => (
              <button
                key={opcao.valor}
                type="button"
                aria-pressed={prioridade === opcao.valor}
                className={`filter-pill${prioridade === opcao.valor ? " active" : ""}`}
                onClick={() => setPrioridade(opcao.valor)}
              >
                {opcao.rotulo}
              </button>
            ))}
          </div>
        </div>
      </div>

      {erro && (
        <div className="error-block" role="alert">
          {erro}
        </div>
      )}
      {carregando && <Esqueleto variante="lista" texto="Carregando alertas…" />}

      {!carregando && (
        <>
          <p className="results-caption" aria-live="polite">
            <strong>
              {alertas.length} {alertas.length === 1 ? "alerta encontrado" : "alertas encontrados"}.
            </strong>
            {limite !== null && janelaDias !== null && (
              <>
                {" "}
                Prioridade baixa a partir de {limite / 2}% dos dias de aula, média a partir de {limite}% (a família é avisada
                automaticamente) e alta a partir de {Math.min(100, limite * 2)}%, nos últimos {janelaDias} dias.
              </>
            )}
          </p>

          {alertas.length === 0 ? (
            <div className="panel">
              <div className="empty-state">
                <Icon name="checkCircle" />
                <p>Nenhum alerta ativo com esses filtros. Quando um aluno chegar perto do limite, ele aparece aqui.</p>
              </div>
            </div>
          ) : (
            <div className="panel panel-tabela">
              <table className="tabela tabela-cartoes">
                <caption className="sr-only">Alertas ativos</caption>
                <thead>
                  <tr>
                    <th scope="col">Aluno</th>
                    <th scope="col">Tipo</th>
                    <th scope="col">Ocorrências</th>
                    <th scope="col">Taxa</th>
                    <th scope="col">Prioridade</th>
                    <th scope="col">Último registro</th>
                    <th scope="col">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {alertas.map((alerta) => (
                    <tr key={alerta.id_alerta}>
                      <td className="celula-titulo">
                        <Link href={`/turmas/${alerta.id_aluno}`} className="link-aluno">
                          {alerta.nome_aluno}
                        </Link>
                        <div className="student-turma">{alerta.turma ?? "Sem turma"}</div>
                      </td>
                      <td data-label="Tipo">{rotuloTipoAlerta(alerta.tipo)}</td>
                      <td data-label="Ocorrências">
                        {alerta.ocorrencias} em {alerta.dias_letivos} {alerta.dias_letivos === 1 ? "dia de aula" : "dias de aula"}
                      </td>
                      <td data-label="Taxa">
                        <div className="medidor medidor-curto">
                          <div className="medidor-trilha" aria-hidden="true">
                            <div className={`medidor-tipo--${alerta.tipo}`} style={{ width: `${Math.min(100, alerta.taxa ?? 0)}%` }} />
                            {limite !== null && <span className="medidor-limite" style={{ left: `${Math.min(100, limite)}%` }} />}
                          </div>
                          <span className="medidor-valor">{formatarPercentual(alerta.taxa)}</span>
                        </div>
                      </td>
                      <td data-label="Prioridade">
                        <span className={classeBadgePrioridade(alerta.prioridade)}>{rotuloPrioridade(alerta.prioridade)}</span>
                      </td>
                      <td data-label="Último registro">
                        {formatarData(alerta.dta_referencia)}
                        {alerta.nivel_rotulo && alerta.nivel ? <div className="student-turma">Situação: {alerta.nivel_rotulo}</div> : null}
                      </td>
                      <td className="acoes celula-acoes">
                        <div className="acoes-grupo">
                          <Link href={`/turmas/${alerta.id_aluno}`} className="btn btn-sm" aria-label={`Ver o aluno ${alerta.nome_aluno}`}>
                            Ver aluno
                          </Link>
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => encerrar(alerta)}
                            disabled={encerrando === alerta.id_aluno}
                            aria-label={`Encerrar os alertas de ${alerta.nome_aluno}`}
                          >
                            {encerrando === alerta.id_aluno ? "Encerrando…" : "Encerrar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
