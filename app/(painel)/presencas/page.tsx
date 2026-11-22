"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Api } from "@/lib/api";
import { Topbar } from "@/components/Topbar";
import { Esqueleto } from "@/components/Esqueleto";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { ModalCorrecaoRegistro, type AlvoCorrecao } from "@/components/ModalCorrecaoRegistro";
import { formatarData, formatarHora, hojeNaEscola, iniciais, plural } from "@/lib/format";
import { ROTULOS_METODO_PRESENCA, type PresencasDoDia, type Sala } from "@/lib/types";

/**
 * Presenças registradas pelo app de biometria da coordenação: o aluno é
 * reconhecido na entrada e a presença aparece aqui na hora, sem ninguém
 * lançar à mão. Quem ainda não foi registrado pode ser marcado
 * manualmente (reconhecimento falhou, aluno sem biometria).
 */
export default function PresencasPage() {
  const { mostrarToast } = useToast();
  const hoje = hojeNaEscola();
  const [data, setData] = useState(hoje);
  const [salas, setSalas] = useState<Sala[]>([]);
  const [idSala, setIdSala] = useState<number | null>(null);
  const [dia, setDia] = useState<PresencasDoDia | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [registrando, setRegistrando] = useState<number | null>(null);
  const [alvo, setAlvo] = useState<AlvoCorrecao | null>(null);

  useEffect(() => {
    Api.listarSalas().then((resposta) => {
      if (resposta.sucesso && resposta.dados) setSalas(resposta.dados);
    });
  }, []);

  async function carregar() {
    setCarregando(true);
    const resposta = await Api.listarPresencas(data, idSala);
    if (resposta.sucesso && resposta.dados) {
      setDia(resposta.dados);
      setErro(null);
    } else {
      setErro(resposta.mensagem);
    }
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, idSala]);

  async function registrar(idAluno: number, nome: string) {
    if (!confirm(`Registrar a presença de ${nome} hoje, sem biometria?`)) return;
    setRegistrando(idAluno);
    const resposta = await Api.registrarPresencaManual(idAluno);
    setRegistrando(null);
    if (!resposta.sucesso) {
      mostrarToast(resposta.mensagem, true);
      return;
    }
    // A API já diz se a presença virou entrada atrasada (depois da tolerância).
    mostrarToast(resposta.dados?.presenca.nova === false ? "A presença já estava registrada." : resposta.mensagem);
    carregar();
  }

  const ehHoje = data === hoje;
  const podeCancelarAlguma = !!dia?.presentes.some((p) => p.pode_cancelar);

  return (
    <>
      <Topbar
        titulo="Presenças"
        subtitulo={
          dia
            ? `${dia.presentes.length} de ${plural(dia.total_alunos, "aluno presente", "alunos presentes")} em ${formatarData(data)}.`
            : "Registradas pelo app de biometria da coordenação."
        }
      />

      <div className="filter-bar">
        <div className="filtro">
          <label htmlFor="presencas-dia" className="filtro-rotulo">
            Dia
          </label>
          <input
            id="presencas-dia"
            type="date"
            className="filter-select"
            value={data}
            max={hoje}
            onChange={(e) => e.target.value && setData(e.target.value)}
          />
        </div>
        <div className="filtro">
          <label htmlFor="presencas-turma" className="filtro-rotulo">
            Turma
          </label>
          <select
            id="presencas-turma"
            className="filter-select"
            value={idSala ?? ""}
            onChange={(e) => setIdSala(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Todas as turmas</option>
            {salas.map((sala) => (
              <option key={sala.id_sala} value={sala.id_sala}>
                {sala.nome_sala}
              </option>
            ))}
          </select>
        </div>
      </div>

      {erro && <div className="error-block">{erro}</div>}
      {carregando && !dia && <Esqueleto variante="lista" texto="Carregando presenças…" />}

      {dia && (
        <div className="grid-2">
          <div className="panel panel-tabela">
            <div className="panel-head">
              <h2>Presentes ({dia.presentes.length})</h2>
            </div>
            {dia.presentes.length === 0 ? (
              <div className="empty-state">
                <Icon name="userCheck" />
                <p>
                  {ehHoje
                    ? "Nenhuma presença registrada ainda hoje. Os alunos reconhecidos pelo app aparecem aqui na hora."
                    : "Nenhuma presença registrada neste dia."}
                </p>
              </div>
            ) : (
              <table className="data-table tabela-cartoes">
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Aluno</th>
                    <th>Turma</th>
                    <th>Registro</th>
                    {podeCancelarAlguma && <th><span className="sr-only">Ações</span></th>}
                  </tr>
                </thead>
                <tbody>
                  {dia.presentes.map((presenca) => (
                    <tr key={presenca.id_presenca}>
                      <td data-label="Hora" className="tabular">{formatarHora(presenca.registrada_em)}</td>
                      <td className="celula-titulo">
                        <div className="student-cell">
                          <div className="avatar" aria-hidden="true">{iniciais(presenca.nome_aluno)}</div>
                          <Link href={`/turmas/${presenca.id_aluno}`} className="student-name">
                            {presenca.nome_aluno}
                          </Link>
                        </div>
                      </td>
                      <td data-label="Turma">{presenca.nome_sala}</td>
                      <td data-label="Registro">
                        <span className={`badge ${presenca.metodo === "manual" ? "badge--neutral" : "badge--regular"}`}>
                          {ROTULOS_METODO_PRESENCA[presenca.metodo]}
                        </span>
                        {presenca.registrado_por && <div className="panel-meta">por {presenca.registrado_por}</div>}
                      </td>
                      {podeCancelarAlguma && (
                        <td className="celula-acoes">
                          {presenca.pode_cancelar && (
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() =>
                                setAlvo({
                                  acao: "cancelar",
                                  tipo: "presenca",
                                  id: presenca.id_presenca,
                                  descricao: `${presenca.nome_aluno} (${presenca.nome_sala}) · presença às ${formatarHora(presenca.registrada_em)} de ${formatarData(presenca.registrada_em)}`,
                                })
                              }
                            >
                              <Icon name="x" />
                              Cancelar<span className="sr-only"> a presença de {presenca.nome_aluno}</span>
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="panel panel-tabela">
            <div className="panel-head">
              <h2>
                {ehHoje ? "Ainda não registrados" : "Sem presença"} ({dia.ausentes.length})
              </h2>
            </div>
            {dia.ausentes.length === 0 ? (
              <div className="empty-state">
                <Icon name="check" />
                <p>Todos os alunos foram registrados.</p>
              </div>
            ) : (
              <table className="data-table tabela-cartoes">
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>Turma</th>
                    <th>
                      <span className="sr-only">Ação</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dia.ausentes.map((aluno) => (
                    <tr key={aluno.id_aluno}>
                      <td className="celula-titulo">
                        <div className="student-cell">
                          <div className="avatar" aria-hidden="true">{iniciais(aluno.nome_aluno)}</div>
                          <Link href={`/turmas/${aluno.id_aluno}`} className="student-name">
                            {aluno.nome_aluno}
                          </Link>
                        </div>
                      </td>
                      <td data-label="Turma">{aluno.nome_sala}</td>
                      <td className="celula-acoes" style={{ textAlign: "right" }}>
                        {ehHoje && (
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => registrar(aluno.id_aluno, aluno.nome_aluno)}
                            disabled={registrando !== null}
                          >
                            {registrando === aluno.id_aluno ? "Registrando…" : "Registrar presença"}
                            <span className="sr-only"> de {aluno.nome_aluno}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <ModalCorrecaoRegistro
        alvo={alvo}
        onFechar={() => setAlvo(null)}
        onConcluido={(mensagem) => {
          setAlvo(null);
          mostrarToast(mensagem);
          carregar();
        }}
      />
    </>
  );
}
