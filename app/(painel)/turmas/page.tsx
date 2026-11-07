"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Api } from "@/lib/api";
import { Topbar } from "@/components/Topbar";
import { Esqueleto } from "@/components/Esqueleto";
import { Modal } from "@/components/Modal";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { classeBadgeStatus, formatarPercentual } from "@/lib/format";
import { barraPontualidade } from "@/lib/graficos";
import { GENEROS_ALUNO, PERIODOS_SALA, STATUS_ALUNO, type AlunoFiltro, type Dashboard, type Sala } from "@/lib/types";

/** Horário padrão de cada período - o mesmo de helpers/calendario.php na API. */
const HORARIO_PADRAO: Record<string, { inicio: string; fim: string }> = {
  Matutino: { inicio: "07:00", fim: "12:20" },
  Vespertino: { inicio: "13:00", fim: "18:20" },
  Noturno: { inicio: "19:00", fim: "23:00" },
  Integral: { inicio: "07:00", fim: "16:00" },
  Indefinido: { inicio: "07:00", fim: "23:00" },
};

export default function TurmasPage() {
  const router = useRouter();
  const { mostrarToast } = useToast();

  const [salas, setSalas] = useState<Sala[]>([]);
  const [turmasResumo, setTurmasResumo] = useState<Dashboard["turmas"]>([]);
  const [limite, setLimite] = useState(20);
  const [janelaDias, setJanelaDias] = useState(30);
  const [turmaSelecionada, setTurmaSelecionada] = useState<string | null>(null);

  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const [pagina, setPagina] = useState(1);
  const [lista, setLista] = useState<AlunoFiltro[]>([]);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [modalTurma, setModalTurma] = useState(false);

  async function carregarTurmas() {
    // Sequencial, não disparado junto - ver o mesmo comentário em
    // (painel)/layout.tsx sobre limite de conexões simultâneas do banco.
    const salasResp = await Api.listarSalas();
    if (salasResp.sucesso && salasResp.dados) setSalas(salasResp.dados);
    const dashboardResp = await Api.dashboard();
    if (dashboardResp.sucesso && dashboardResp.dados) {
      setTurmasResumo(dashboardResp.dados.turmas);
      setLimite(dashboardResp.dados.limite_alerta);
    }
  }

  useEffect(() => {
    carregarTurmas();
  }, []);

  const idSalaSelecionada = turmaSelecionada
    ? salas.find((s) => s.nome_sala === turmaSelecionada)?.id_sala ?? null
    : null;

  async function carregar() {
    setCarregando(true);
    const resposta = await Api.filtrarAlunos(busca.trim() || null, idSalaSelecionada, status || null, pagina, 10);
    if (resposta.sucesso && resposta.dados) {
      setLista(resposta.dados.alunos);
      setTotalPaginas(resposta.dados.total_paginas);
      setTotalRegistros(resposta.dados.total_registros);
      if (resposta.dados.janela) setJanelaDias(resposta.dados.janela.dias);
      setErro(null);
    } else {
      setErro(resposta.mensagem);
    }
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, status, pagina, idSalaSelecionada]);

  return (
    <>
      <Topbar
        titulo="Turmas e alunos"
        subtitulo={`${totalRegistros} aluno(s) cadastrado(s).`}
        acoes={
          <>
            <Link href="/turmas/importar" className="btn">
              <Icon name="upload" /> Importar planilha
            </Link>
            <button type="button" className="btn" onClick={() => setModalTurma(true)}>
              <Icon name="plus" /> Nova turma
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => (salas.length === 0 ? setModalTurma(true) : setModalAberto(true))}
            >
              <Icon name="plus" /> Novo aluno
            </button>
          </>
        }
      />

      {salas.length === 0 && !carregando && (
        <div className="panel" style={{ marginBottom: 20 }}>
          <p className="results-caption">
            Sua escola ainda não tem turmas. Comece por &quot;Nova turma&quot; e depois cadastre os alunos de cada uma - ou
            cadastre tudo de uma vez com <Link href="/turmas/importar">uma planilha do Excel</Link>.
          </p>
        </div>
      )}

      <div className="turmas-grid">
        <div className="panel">
          <div className="panel-head">
            <h2>Turmas</h2>
          </div>
          <button
            type="button"
            className={`turma-summary-item${turmaSelecionada === null ? " selected" : ""}`}
            onClick={() => {
              setTurmaSelecionada(null);
              setPagina(1);
            }}
          >
            <span className="ts-name">Todas</span>
            <div className="ts-info">
              <div className="ts-count">{totalRegistros} aluno(s)</div>
            </div>
          </button>
          {turmasResumo.map((turma) => {
            const barra = barraPontualidade(turma.pontualidade, limite);
            const sala = salas.find((s) => s.id_sala === turma.id_sala);
            return (
              <button
                type="button"
                key={turma.id_sala}
                className={`turma-summary-item${turmaSelecionada === turma.nome_sala ? " selected" : ""}`}
                onClick={() => {
                  setTurmaSelecionada(turma.nome_sala);
                  setPagina(1);
                }}
                title="Pontualidade no mês: dias de aula sem entrada atrasada"
              >
                <span className="ts-name">{turma.nome_sala}</span>
                <div className="ts-info">
                  <div className="ts-count">
                    {turma.total_alunos} aluno(s)
                    {sala?.horario && ` · ${sala.horario.inicio}–${sala.horario.fim}`}
                  </div>
                  <div className="ts-bar-track">
                    <div className={`ts-bar-fill turma-bar-fill--${barra.classe}`} style={{ width: `${barra.largura}%` }} />
                  </div>
                </div>
                <span className="ts-pct">{formatarPercentual(turma.pontualidade, 0)}</span>
              </button>
            );
          })}
        </div>

        <div className="panel">
          <div className="filter-bar" style={{ marginBottom: 18 }}>
            <div className="search-box busca-estreita">
              <Icon name="search" />
              <input
                placeholder="Buscar por nome ou ID"
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value);
                  setPagina(1);
                }}
              />
            </div>
            <select
              className="filter-select"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPagina(1);
              }}
            >
              <option value="">Todas as situações</option>
              {STATUS_ALUNO.map((situacao) => (
                <option key={situacao} value={situacao}>
                  {situacao}
                </option>
              ))}
            </select>
          </div>
          <p className="results-caption" style={{ marginTop: -8, marginBottom: 14 }}>
            Entradas atrasadas e saídas antecipadas nos últimos {janelaDias} dias, contando só os dias de aula. Limite da escola:{" "}
            {limite}%.
          </p>

          {erro && <div className="error-block">{erro}</div>}
          {carregando && <Esqueleto variante="lista" texto="Carregando alunos…" />}

          {!carregando && (
            <>
              {lista.length === 0 ? (
                <div className="empty-state">
                  <Icon name="users" />
                  <p>Nenhum aluno encontrado com esses filtros.</p>
                </div>
              ) : (
                <table className="data-table tabela-cartoes">
                  <thead>
                    <tr>
                      <th>Aluno</th>
                      <th>Turma</th>
                      <th>Entradas atrasadas</th>
                      <th>Saídas antecipadas</th>
                      <th>Dias de aula</th>
                      <th>Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map((aluno) => (
                      <tr key={aluno.id_aluno} className="clickable" onClick={() => router.push(`/turmas/${aluno.id_aluno}`)}>
                        <td className="celula-titulo">{aluno.nome_aluno}</td>
                        <td data-label="Turma">{aluno.turma ?? "-"}</td>
                        <td className="num" data-label="Entradas atrasadas">
                          {aluno.atrasos}
                          {aluno.taxa_atrasos !== null && aluno.atrasos > 0 && (
                            <span className="taxa"> ({formatarPercentual(aluno.taxa_atrasos, 0)})</span>
                          )}
                        </td>
                        <td className="num" data-label="Saídas antecipadas">
                          {aluno.saidas}
                          {aluno.taxa_saidas !== null && aluno.saidas > 0 && (
                            <span className="taxa"> ({formatarPercentual(aluno.taxa_saidas, 0)})</span>
                          )}
                        </td>
                        <td className="num" data-label="Dias de aula">{aluno.dias_letivos}</td>
                        <td data-label="Situação">
                          <span className={classeBadgeStatus(aluno.status)}>{aluno.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {totalPaginas > 1 && (
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
                  <button type="button" className="btn btn-sm" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
                    Anterior
                  </button>
                  <span className="panel-meta" style={{ alignSelf: "center" }}>
                    Página {pagina} de {totalPaginas}
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={pagina >= totalPaginas}
                    onClick={() => setPagina((p) => p + 1)}
                  >
                    Próxima
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ModalNovoAluno
        aberto={modalAberto}
        salas={salas}
        onFechar={() => setModalAberto(false)}
        onCriado={() => {
          setModalAberto(false);
          mostrarToast("Aluno cadastrado com sucesso.");
          carregar();
        }}
      />

      <ModalNovaTurma
        aberto={modalTurma}
        onFechar={() => setModalTurma(false)}
        onCriada={(nome) => {
          setModalTurma(false);
          mostrarToast(`Turma ${nome} cadastrada.`);
          carregarTurmas();
        }}
      />
    </>
  );
}

/**
 * Cada coordenação cadastra as próprias turmas. O horário decide o que é
 * entrada atrasada e saída antecipada; sem mexer, vale o padrão do
 * período (a gestão ajusta depois em Escola > Turmas e horários).
 */
function ModalNovaTurma({
  aberto,
  onFechar,
  onCriada,
}: {
  aberto: boolean;
  onFechar: () => void;
  onCriada: (nome: string) => void;
}) {
  const [nome, setNome] = useState("");
  const [periodo, setPeriodo] = useState<string>("Matutino");
  const [inicio, setInicio] = useState(HORARIO_PADRAO.Matutino.inicio);
  const [fim, setFim] = useState(HORARIO_PADRAO.Matutino.fim);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (aberto) {
      setNome("");
      setPeriodo("Matutino");
      setInicio(HORARIO_PADRAO.Matutino.inicio);
      setFim(HORARIO_PADRAO.Matutino.fim);
      setErro(null);
    }
  }, [aberto]);

  function trocarPeriodo(novo: string) {
    setPeriodo(novo);
    setInicio(HORARIO_PADRAO[novo]?.inicio ?? "07:00");
    setFim(HORARIO_PADRAO[novo]?.fim ?? "23:00");
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    if (!nome.trim()) {
      setErro("Informe o nome da turma.");
      return;
    }
    if (fim <= inicio) {
      setErro("O fim da aula precisa ser depois do início.");
      return;
    }
    setEnviando(true);
    const padrao = HORARIO_PADRAO[periodo];
    const horarioProprio = !padrao || padrao.inicio !== inicio || padrao.fim !== fim ? { inicio, fim } : undefined;
    const resposta = await Api.cadastrarTurma(nome.trim(), periodo, horarioProprio);
    setEnviando(false);
    if (!resposta.sucesso || !resposta.dados) {
      setErro(resposta.mensagem);
      return;
    }
    onCriada(resposta.dados.nome_sala);
  }

  return (
    <Modal titulo="Nova turma" aberto={aberto} onFechar={onFechar}>
      <form onSubmit={aoEnviar}>
        <div className="modal-field">
          <label htmlFor="nomeTurma">Nome da turma</label>
          <input id="nomeTurma" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: 1º A" maxLength={50} required />
        </div>
        <div className="modal-field">
          <label htmlFor="periodoTurma">Período</label>
          <select id="periodoTurma" value={periodo} onChange={(e) => trocarPeriodo(e.target.value)}>
            {PERIODOS_SALA.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="modal-field-row">
          <div className="modal-field">
            <label htmlFor="inicioTurma">Início da aula</label>
            <input id="inicioTurma" type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} required />
          </div>
          <div className="modal-field">
            <label htmlFor="fimTurma">Fim da aula</label>
            <input id="fimTurma" type="time" value={fim} onChange={(e) => setFim(e.target.value)} required />
          </div>
        </div>
        <p className="results-caption">
          Entrada depois do início (mais a tolerância da escola) é entrada atrasada; saída antes do fim é saída antecipada.
        </p>
        <p className="results-caption">
          Muitas turmas? <Link href="/turmas/importar">Importe de uma planilha do Excel</Link>.
        </p>
        {erro && <p className="field-error show">{erro}</p>}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onFechar}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={enviando} aria-busy={enviando}>
            {enviando ? "Salvando…" : "Cadastrar turma"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ModalNovoAluno({
  aberto,
  salas,
  onFechar,
  onCriado,
}: {
  aberto: boolean;
  salas: Sala[];
  onFechar: () => void;
  onCriado: () => void;
}) {
  const { mostrarToast } = useToast();
  const [nome, setNome] = useState("");
  const [idSala, setIdSala] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [genero, setGenero] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (aberto) {
      setNome("");
      setIdSala("");
      setDataNascimento("");
      setGenero("");
      setErro(null);
    }
  }, [aberto]);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    if (!nome.trim() || !idSala || !dataNascimento || !genero) {
      setErro("Preencha todos os campos.");
      return;
    }
    setEnviando(true);
    const resposta = await Api.cadastrarAluno(nome.trim(), Number(idSala), dataNascimento, genero);
    setEnviando(false);
    if (!resposta.sucesso) {
      setErro(resposta.mensagem);
      mostrarToast(resposta.mensagem, true);
      return;
    }
    onCriado();
  }

  return (
    <Modal titulo="Cadastrar aluno" aberto={aberto} onFechar={onFechar}>
      <form onSubmit={aoEnviar}>
        <div className="modal-field">
          <label htmlFor="nomeAluno">Nome completo</label>
          <input id="nomeAluno" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </div>
        <div className="modal-field">
          <label htmlFor="salaAluno">Turma</label>
          <select id="salaAluno" value={idSala} onChange={(e) => setIdSala(e.target.value)} required>
            <option key="" value="">Selecione…</option>
            {salas.map((sala) => (
              <option key={sala.id_sala} value={sala.id_sala}>
                {sala.nome_sala} ({sala.periodo_sala})
              </option>
            ))}
          </select>
        </div>
        <div className="modal-field">
          <label htmlFor="nascimentoAluno">Data de nascimento</label>
          <input
            id="nascimentoAluno"
            type="date"
            value={dataNascimento}
            onChange={(e) => setDataNascimento(e.target.value)}
            required
          />
        </div>
        <div className="modal-field">
          <label htmlFor="generoAluno">Gênero</label>
          <select id="generoAluno" value={genero} onChange={(e) => setGenero(e.target.value)} required>
            <option key="" value="">Selecione…</option>
            {GENEROS_ALUNO.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <p className="results-caption">
          A turma inteira numa planilha? <Link href="/turmas/importar">Importe os alunos do Excel</Link>, com os responsáveis.
        </p>
        {erro && <p className="field-error show">{erro}</p>}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onFechar}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={enviando} aria-busy={enviando}>
            {enviando ? "Salvando…" : "Cadastrar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
