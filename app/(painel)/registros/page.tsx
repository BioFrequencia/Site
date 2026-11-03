"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Topbar } from "@/components/Topbar";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { ModalRegistro } from "@/components/ModalRegistro";
import { formatarData, formatarHora, hojeNaEscola, iniciais, rotuloOrigemAtraso } from "@/lib/format";
import type { AlunoFiltro, RegistrosDoDia, Sala, TipoRegistro } from "@/lib/types";

/**
 * Entradas e saídas: a tela da portaria. Registra a entrada atrasada ou a
 * saída antecipada escolhendo o aluno pelo nome (o horário já vem
 * preenchido com "agora") e mostra o que foi registrado no dia. As
 * presenças do app depois da tolerância aparecem aqui sozinhas, como
 * entrada atrasada "pela presença do app".
 */
export default function RegistrosPage() {
  const { coordenacao } = useAuth();
  const { mostrarToast } = useToast();
  const gestao = coordenacao?.papel === "gestor";

  const [data, setData] = useState(hojeNaEscola());
  const [idSala, setIdSala] = useState<number | null>(null);
  const [salas, setSalas] = useState<Sala[]>([]);
  const [alunos, setAlunos] = useState<AlunoFiltro[]>([]);
  const [dia, setDia] = useState<RegistrosDoDia | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modal, setModal] = useState<TipoRegistro | null>(null);

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
    const resposta = await Api.listarRegistros(data, idSala);
    if (resposta.sucesso && resposta.dados) {
      setDia(resposta.dados);
      setErro(null);
    } else {
      setErro(resposta.mensagem);
    }
    setCarregando(false);
  }, [data, idSala]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function remover(tipo: TipoRegistro, id: number) {
    if (!confirm("Apagar este registro? Use só para registro feito por engano. Avisos que já foram para a família não voltam.")) return;
    const resposta = await Api.removerRegistro(tipo, id);
    if (!resposta.sucesso) {
      mostrarToast(resposta.mensagem, true);
      return;
    }
    mostrarToast("Registro apagado.");
    carregar();
  }

  const hoje = data === hojeNaEscola();

  return (
    <>
      <Topbar
        titulo="Entradas e saídas"
        subtitulo="Entradas atrasadas e saídas antecipadas do dia - o que o BioFrequência registra."
        acoes={
          <>
            <button type="button" className="btn" onClick={() => setModal("saida")} disabled={!dia?.dia.letivo}>
              <Icon name="logout" /> Saída antecipada
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setModal("atraso")} disabled={!dia?.dia.letivo}>
              <Icon name="clock" /> Entrada atrasada
            </button>
          </>
        }
      />

      <div className="filter-bar" style={{ marginBottom: 18 }}>
        <input type="date" className="filter-select" value={data} max={hojeNaEscola()} onChange={(e) => setData(e.target.value || hojeNaEscola())} />
        <select
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
        {!hoje && (
          <button type="button" className="btn btn-sm" onClick={() => setData(hojeNaEscola())}>
            Hoje
          </button>
        )}
      </div>

      {erro && <div className="error-block">{erro}</div>}
      {carregando && !dia && <div className="loading-block skeleton-bloco">Carregando registros…</div>}

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
              <Link href="/presencas" className="panel-meta">
                Ver presenças do app
              </Link>
            </div>
            {dia.registros.length === 0 ? (
              <div className="empty-state">
                <Icon name="check" />
                <p>Nenhuma entrada atrasada ou saída antecipada {hoje ? "hoje" : "neste dia"}.</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Horário</th>
                    <th>Aluno</th>
                    <th>Tipo</th>
                    <th>Motivo</th>
                    <th>Registro</th>
                    {gestao && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {dia.registros.map((registro) => (
                    <tr key={`${registro.tipo}-${registro.id}`}>
                      <td className="num">{formatarHora(registro.momento)}</td>
                      <td>
                        <Link href={`/turmas/${registro.id_aluno}`} className="student-cell">
                          <div className="avatar">{iniciais(registro.nome_aluno)}</div>
                          <div>
                            <div className="student-name">{registro.nome_aluno}</div>
                            <div className="student-turma">{registro.nome_sala}</div>
                          </div>
                        </Link>
                      </td>
                      <td>
                        <span className={`badge ${registro.tipo === "atraso" ? "badge--atraso" : "badge--saida"}`}>
                          {registro.tipo === "atraso" ? "Entrada atrasada" : "Saída antecipada"}
                        </span>
                        {registro.justificado && <span className="badge badge--regular">Justificado</span>}
                      </td>
                      <td>
                        {registro.motivo ?? "-"}
                        {registro.retirado_por && <div className="panel-meta">Buscou: {registro.retirado_por}</div>}
                      </td>
                      <td className="panel-meta">
                        {registro.tipo === "atraso" ? rotuloOrigemAtraso(registro.origem) : "Lançada pela coordenação"}
                        {registro.registrado_por && <div>por {registro.registrado_por}</div>}
                      </td>
                      {gestao && (
                        <td>
                          <button
                            type="button"
                            className="icon-btn"
                            title="Apagar (registro feito por engano)"
                            aria-label="Apagar registro"
                            onClick={() => remover(registro.tipo, registro.id)}
                          >
                            <Icon name="trash" />
                          </button>
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
