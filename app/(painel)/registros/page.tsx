"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Api } from "@/lib/api";
import { Topbar } from "@/components/Topbar";
import { Esqueleto } from "@/components/Esqueleto";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { ModalRegistro } from "@/components/ModalRegistro";
import { ModalCorrecaoRegistro, type AlvoCorrecao } from "@/components/ModalCorrecaoRegistro";
import { formatarData, formatarHora, hojeNaEscola, iniciais, rotuloOrigemAtraso } from "@/lib/format";
import type { AlunoFiltro, RegistrosDoDia, Sala, TipoRegistro } from "@/lib/types";

/**
 * Entradas e saídas: a tela da portaria. Registra a entrada atrasada ou a
 * saída antecipada escolhendo o aluno pelo nome (o horário já vem
 * preenchido com "agora") e mostra o que foi registrado no dia. As
 * presenças do app depois da tolerância aparecem aqui sozinhas, como
 * entrada atrasada "pela presença do app".
 *
 * Registro feito por engano é CANCELADO, com motivo (migração 012): não
 * some, sai das contas e fica no histórico de correções. Cancela a gestão,
 * ou quem registrou nos primeiros minutos (a API diz em pode_cancelar).
 */
export default function RegistrosPage() {
  const { mostrarToast } = useToast();

  const [data, setData] = useState(hojeNaEscola());
  const [idSala, setIdSala] = useState<number | null>(null);
  const [salas, setSalas] = useState<Sala[]>([]);
  const [alunos, setAlunos] = useState<AlunoFiltro[]>([]);
  const [dia, setDia] = useState<RegistrosDoDia | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modal, setModal] = useState<TipoRegistro | null>(null);
  const [mostrarCancelados, setMostrarCancelados] = useState(false);
  const [alvo, setAlvo] = useState<AlvoCorrecao | null>(null);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const respSalas = await Api.listarSalas();
      if (!ativo) return;
      if (respSalas.sucesso && respSalas.dados) setSalas(respSalas.dados);
      const respAlunos = await Api.filtrarAlunos(null, null, null, 1, 500);
      if (ativo && respAlunos.sucesso && respAlunos.dados) setAlunos(respAlunos.dados.alunos);
    })();
    return () => {
      ativo = false;
    };
  }, []);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const resposta = await Api.listarRegistros(data, idSala, mostrarCancelados);
    if (resposta.sucesso && resposta.dados) {
      setDia(resposta.dados);
      setErro(null);
    } else {
      setErro(resposta.mensagem);
    }
    setCarregando(false);
  }, [data, idSala, mostrarCancelados]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Atalho do Painel: /registros?registrar=atraso (ou saida) já abre o
  // formulário, se hoje tem aula. O endereço volta a ser /registros.
  const atalhoVisto = useRef(false);
  useEffect(() => {
    if (atalhoVisto.current || !dia) return;
    atalhoVisto.current = true;
    const pedido = new URLSearchParams(window.location.search).get("registrar");
    if (pedido !== "atraso" && pedido !== "saida") return;
    window.history.replaceState(null, "", window.location.pathname);
    if (dia.dia.letivo) setModal(pedido);
  }, [dia]);

  /** "Ana Lima (6º A) · entrada atrasada às 07:31 de 19/11/2026" */
  function descrever(registro: RegistrosDoDia["registros"][number]): string {
    const tipo = registro.tipo === "atraso" ? "entrada atrasada" : "saída antecipada";
    return `${registro.nome_aluno} (${registro.nome_sala}) · ${tipo} às ${formatarHora(registro.momento)} de ${formatarData(registro.momento)}`;
  }

  const hoje = data === hojeNaEscola();
  const temAcoes = !!dia?.registros.some((r) => r.pode_cancelar || (r.cancelado && dia.pode_restaurar));

  return (
    <>
      <Topbar
        titulo="Entradas e saídas"
        subtitulo="Entradas atrasadas e saídas antecipadas do dia - o que o BioFrequência registra."
        acoes={
          <>
            <Link href="/registros/importar" className="btn">
              <Icon name="upload" /> Importar planilha
            </Link>
            <button type="button" className="btn" onClick={() => setModal("saida")} disabled={!dia?.dia.letivo}>
              <Icon name="logout" /> Saída antecipada
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setModal("atraso")} disabled={!dia?.dia.letivo}>
              <Icon name="clock" /> Entrada atrasada
            </button>
          </>
        }
      />

      <div className="filter-bar">
        <div className="filtro">
          <label htmlFor="registros-dia" className="filtro-rotulo">
            Dia
          </label>
          <input
            id="registros-dia"
            type="date"
            className="filter-select"
            value={data}
            max={hojeNaEscola()}
            onChange={(e) => setData(e.target.value || hojeNaEscola())}
          />
        </div>
        <div className="filtro">
          <label htmlFor="registros-turma" className="filtro-rotulo">
            Turma
          </label>
          <select
            id="registros-turma"
            className="filter-select"
            value={idSala ?? ""}
            onChange={(e) => setIdSala(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Todas as turmas</option>
            {salas.map((sala) => (
              <option key={sala.id_sala} value={sala.id_sala}>
                {sala.nome_sala} ({sala.horario ? `${sala.horario.inicio}–${sala.horario.fim}` : sala.periodo_sala})
              </option>
            ))}
          </select>
        </div>
        <label className="filtro-marcar">
          <input type="checkbox" checked={mostrarCancelados} onChange={(e) => setMostrarCancelados(e.target.checked)} />
          Mostrar cancelados
        </label>
        {!hoje && (
          <button type="button" className="btn" onClick={() => setData(hojeNaEscola())}>
            Voltar para hoje
          </button>
        )}
      </div>

      {erro && <div className="error-block">{erro}</div>}
      {carregando && !dia && <Esqueleto variante="lista" texto="Carregando registros…" />}

      {dia && (
        <div className="entrada-em-cascata">
          {!dia.dia.letivo && (
            <div className="aviso-dia">
              <Icon name="calendar" />
              <span>
                {formatarData(dia.data)} não tem aula (<b>{dia.dia.motivo}</b>): não dá para registrar entrada atrasada nem saída
                antecipada nesse dia. Se houve aula (sábado letivo, reposição), a gestão marca o dia em{" "}
                <Link href="/escola?aba=calendario" className="link-forte">
                  Escola &gt; Calendário
                </Link>
                .
              </span>
            </div>
          )}

          <div className="cards-resumo">
            <div className="card-resumo">
              <span className="card-resumo-rotulo">Entradas atrasadas</span>
              <span className="card-resumo-valor cor-atraso">{dia.atrasos}</span>
            </div>
            <div className="card-resumo">
              <span className="card-resumo-rotulo">Saídas antecipadas</span>
              <span className="card-resumo-valor cor-saida">{dia.saidas}</span>
            </div>
            <div className="card-resumo">
              <span className="card-resumo-rotulo">Presenças pelo app</span>
              <span className="card-resumo-valor">
                {dia.presentes}
                <small> de {dia.total_alunos}</small>
              </span>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>{hoje ? "Hoje" : formatarData(dia.data)}</h2>
              <span className="panel-links">
                {/* pode_restaurar: gestão, numa API com a migração 012 (o histórico existe). */}
                {dia.pode_restaurar && (
                  <Link href="/registros/correcoes" className="panel-meta">
                    Histórico de correções
                  </Link>
                )}
                <Link href="/presencas" className="panel-meta">
                  Ver presenças do app
                </Link>
              </span>
            </div>
            {dia.registros.length === 0 ? (
              <div className="empty-state">
                <Icon name="check" />
                <p>Nenhuma entrada atrasada ou saída antecipada {hoje ? "hoje" : "neste dia"}.</p>
              </div>
            ) : (
              <table className="data-table tabela-cartoes">
                <thead>
                  <tr>
                    <th>Horário</th>
                    <th>Aluno</th>
                    <th>Tipo</th>
                    <th>Motivo</th>
                    <th>Registro</th>
                    {temAcoes && <th><span className="sr-only">Ações</span></th>}
                  </tr>
                </thead>
                <tbody>
                  {dia.registros.map((registro) => (
                    <tr key={`${registro.tipo}-${registro.id}`} className={registro.cancelado ? "linha-cancelada" : undefined}>
                      <td data-label="Horário" className="tabular">{formatarHora(registro.momento)}</td>
                      <td className="celula-titulo">
                        <Link href={`/turmas/${registro.id_aluno}`} className="student-cell">
                          <div className="avatar">{iniciais(registro.nome_aluno)}</div>
                          <div>
                            <div className="student-name">{registro.nome_aluno}</div>
                            <div className="student-turma">{registro.nome_sala}</div>
                          </div>
                        </Link>
                      </td>
                      <td data-label="Tipo">
                        <span className={`badge ${registro.tipo === "atraso" ? "badge--atraso" : "badge--saida"}`}>
                          {registro.tipo === "atraso" ? "Entrada atrasada" : "Saída antecipada"}
                        </span>
                        {registro.justificado && <span className="badge badge--regular">Justificado</span>}
                        {registro.cancelado && <span className="badge badge--cancelado">Cancelado</span>}
                      </td>
                      <td data-label="Motivo">
                        {registro.motivo ?? "-"}
                        {registro.retirado_por && <div className="panel-meta">Buscou: {registro.retirado_por}</div>}
                      </td>
                      <td data-label="Registro" className="panel-meta">
                        {registro.tipo === "atraso" ? rotuloOrigemAtraso(registro.origem) : "Lançada pela coordenação"}
                        {registro.registrado_por && <div>por {registro.registrado_por}</div>}
                        {registro.cancelado && (
                          <div className="info-cancelamento">
                            Cancelado{registro.cancelado_por ? ` por ${registro.cancelado_por}` : ""}
                            {registro.motivo_cancelamento ? `: ${registro.motivo_cancelamento}` : ""}
                          </div>
                        )}
                      </td>
                      {temAcoes && (
                        <td className="celula-acoes">
                          {registro.pode_cancelar && (
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => setAlvo({ acao: "cancelar", tipo: registro.tipo, id: registro.id, descricao: descrever(registro) })}
                            >
                              <Icon name="x" />
                              Cancelar<span className="sr-only"> {descrever(registro)}</span>
                            </button>
                          )}
                          {registro.cancelado && dia.pode_restaurar && (
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() => setAlvo({ acao: "restaurar", tipo: registro.tipo, id: registro.id, descricao: descrever(registro) })}
                            >
                              <Icon name="refresh" />
                              Restaurar<span className="sr-only"> {descrever(registro)}</span>
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

      <ModalRegistro
        tipo={modal}
        alunos={alunos.filter((a) => idSala === null || a.id_sala === idSala).map((a) => ({ id_aluno: a.id_aluno, nome_aluno: a.nome_aluno, turma: a.turma }))}
        onFechar={() => setModal(null)}
        onConfirmado={(mensagem) => {
          setModal(null);
          mostrarToast(mensagem);
          carregar();
        }}
      />
    </>
  );
}
