"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Api } from "@/lib/api";
import { Topbar } from "@/components/Topbar";
import { Modal } from "@/components/Modal";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { classeBadgeStatus } from "@/lib/format";
import { GENEROS_ALUNO, type AlunoFiltro, type Dashboard, type Sala } from "@/lib/types";

export default function TurmasPage() {
  const router = useRouter();
  const { mostrarToast } = useToast();

  const [salas, setSalas] = useState<Sala[]>([]);
  const [turmasResumo, setTurmasResumo] = useState<Dashboard["turmas"]>([]);
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

  useEffect(() => {
    // Sequencial, não disparado junto - ver o mesmo comentário em
    // (painel)/layout.tsx sobre limite de conexões simultâneas do banco.
    (async () => {
      const salasResp = await Api.listarSalas();
      if (salasResp.sucesso && salasResp.dados) setSalas(salasResp.dados);
      const dashboardResp = await Api.dashboard();
      if (dashboardResp.sucesso && dashboardResp.dados) setTurmasResumo(dashboardResp.dados.turmas);
    })();
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
          <button type="button" className="btn btn-primary" onClick={() => setModalAberto(true)}>
            <Icon name="plus" /> Novo aluno
          </button>
        }
      />

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
          {turmasResumo.map((turma) => (
            <button
              type="button"
              key={turma.nome_sala}
              className={`turma-summary-item${turmaSelecionada === turma.nome_sala ? " selected" : ""}`}
              onClick={() => {
                setTurmaSelecionada(turma.nome_sala);
                setPagina(1);
              }}
            >
              <span className="ts-name">{turma.nome_sala}</span>
              <div className="ts-info">
                <div className="ts-count">{turma.total_alunos} aluno(s)</div>
                <div className="ts-bar-track">
                  <div className="ts-bar-fill" style={{ width: `${turma.frequencia}%`, background: "var(--indigo)" }} />
                </div>
              </div>
              <span className="ts-pct">{turma.frequencia}%</span>
            </button>
          ))}
        </div>

        <div className="panel">
          <div className="filter-bar" style={{ marginBottom: 18 }}>
            <div className="search-box" style={{ width: 240 }}>
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
              <option value="">Todos os status</option>
              <option value="Em risco">Em risco</option>
              <option value="Atenção">Atenção</option>
              <option value="Regular">Regular</option>
              <option value="Excelente">Excelente</option>
            </select>
          </div>

          {erro && <div className="error-block">{erro}</div>}
          {carregando && <div className="loading-block">Carregando alunos…</div>}

          {!carregando && (
            <>
              {lista.length === 0 ? (
                <div className="empty-state">
                  <Icon name="users" />
                  <p>Nenhum aluno encontrado com esses filtros.</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Aluno</th>
                      <th>Turma</th>
                      <th>Faltas</th>
                      <th>Atrasos</th>
                      <th>Frequência</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map((aluno) => (
                      <tr key={aluno.id_aluno} className="clickable" onClick={() => router.push(`/turmas/${aluno.id_aluno}`)}>
                        <td>{aluno.nome_aluno}</td>
                        <td>{aluno.turma ?? "-"}</td>
                        <td className="num">{aluno.faltas}</td>
                        <td className="num">{aluno.atrasos}</td>
                        <td className="num">{aluno.frequencia}</td>
                        <td>
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
    </>
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
        {erro && <p className="field-error show">{erro}</p>}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onFechar}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={enviando}>
            {enviando ? "Salvando…" : "Cadastrar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
