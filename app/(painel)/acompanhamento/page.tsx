"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Api } from "@/lib/api";
import { Topbar } from "@/components/Topbar";
import { Modal } from "@/components/Modal";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { formatarDataHora } from "@/lib/format";
import { CANAIS_ACOMPANHAMENTO, type Acompanhamento, type AlunoFiltro } from "@/lib/types";

export default function AcompanhamentoPage() {
  const { mostrarToast } = useToast();
  const [registros, setRegistros] = useState<Acompanhamento[]>([]);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  async function carregar() {
    setCarregando(true);
    const resposta = await Api.listarAcompanhamento(null, pagina);
    if (resposta.sucesso && resposta.dados) {
      setRegistros(resposta.dados.registros);
      setTotalPaginas(resposta.dados.total_paginas);
      setErro(null);
    } else {
      setErro(resposta.mensagem);
    }
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina]);

  return (
    <>
      <Topbar
        titulo="Acompanhamento"
        subtitulo="Histórico de contatos feitos com os responsáveis."
        acoes={
          <button type="button" className="btn btn-primary" onClick={() => setModalAberto(true)}>
            <Icon name="plus" /> Registrar contato
          </button>
        }
      />

      {erro && <div className="error-block">{erro}</div>}
      {carregando && <div className="loading-block">Carregando…</div>}

      {!carregando && (
        <div className="panel">
          {registros.length === 0 ? (
            <div className="empty-state">
              <Icon name="activity" />
              <p>Nenhum registro de acompanhamento ainda.</p>
            </div>
          ) : (
            <div className="timeline">
              {registros.map((registro) => (
                <div className="timeline-item" key={registro.id_acompanhamento}>
                  <div className="timeline-date">{formatarDataHora(registro.data_registro)}</div>
                  <div className="timeline-card">
                    <div className="timeline-head">
                      <Link href={`/turmas/${registro.id_aluno}`} style={{ fontWeight: 700 }}>
                        {registro.nome_aluno}
                      </Link>
                      <span className="tag">{registro.nome_sala ?? "Sem turma"}</span>
                      <span className="tag">{registro.canal}</span>
                      <span className="panel-meta">por {registro.nome_coordenacao}</span>
                    </div>
                    {registro.observacao && <p className="timeline-note">{registro.observacao}</p>}
                  </div>
                </div>
              ))}
            </div>
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
        </div>
      )}

      <ModalNovoRegistro
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        onSalvo={() => {
          setModalAberto(false);
          mostrarToast("Registro salvo.");
          setPagina(1);
          carregar();
        }}
      />
    </>
  );
}

function ModalNovoRegistro({
  aberto,
  onFechar,
  onSalvo,
}: {
  aberto: boolean;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const [busca, setBusca] = useState("");
  const [opcoes, setOpcoes] = useState<AlunoFiltro[]>([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState<AlunoFiltro | null>(null);
  const [canal, setCanal] = useState("");
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (aberto) {
      setBusca("");
      setOpcoes([]);
      setAlunoSelecionado(null);
      setCanal("");
      setObservacao("");
      setErro(null);
    }
  }, [aberto]);

  useEffect(() => {
    if (!busca.trim() || alunoSelecionado) {
      setOpcoes([]);
      return;
    }
    const identificador = setTimeout(async () => {
      const resposta = await Api.filtrarAlunos(busca.trim(), null, null, 1, 6);
      if (resposta.sucesso && resposta.dados) setOpcoes(resposta.dados.alunos);
    }, 300);
    return () => clearTimeout(identificador);
  }, [busca, alunoSelecionado]);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    if (!alunoSelecionado) {
      setErro("Selecione um aluno.");
      return;
    }
    if (!canal) {
      setErro("Selecione o canal de contato.");
      return;
    }
    setEnviando(true);
    const resposta = await Api.addAcompanhamento(
      alunoSelecionado.id_aluno,
      canal as (typeof CANAIS_ACOMPANHAMENTO)[number],
      observacao || null
    );
    setEnviando(false);
    if (!resposta.sucesso) {
      setErro(resposta.mensagem);
      return;
    }
    onSalvo();
  }

  return (
    <Modal titulo="Registrar acompanhamento" aberto={aberto} onFechar={onFechar}>
      <form onSubmit={aoEnviar}>
        <div className="modal-field">
          <label htmlFor="buscaAlunoAcompanhamento">Aluno</label>
          {alunoSelecionado ? (
            <div className="modal-summary" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>
                <b>{alunoSelecionado.nome_aluno}</b> — {alunoSelecionado.turma ?? "Sem turma"}
              </span>
              <button type="button" className="btn-text" onClick={() => setAlunoSelecionado(null)}>
                Trocar
              </button>
            </div>
          ) : (
            <>
              <input
                id="buscaAlunoAcompanhamento"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome ou ID"
              />
              {opcoes.length > 0 && (
                <div style={{ border: "1px solid var(--mist-200)", borderRadius: "var(--radius-sm)", marginTop: 6 }}>
                  {opcoes.map((aluno) => (
                    <button
                      type="button"
                      key={aluno.id_aluno}
                      onClick={() => {
                        setAlunoSelecionado(aluno);
                        setOpcoes([]);
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "8px 12px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 13,
                      }}
                    >
                      {aluno.nome_aluno} — {aluno.turma ?? "Sem turma"}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <div className="modal-field">
          <label htmlFor="canalGlobal">Canal de contato</label>
          <select id="canalGlobal" value={canal} onChange={(e) => setCanal(e.target.value)}>
            <option key="" value="">Selecione…</option>
            {CANAIS_ACOMPANHAMENTO.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="modal-field">
          <label htmlFor="observacaoGlobal">Observação</label>
          <textarea id="observacaoGlobal" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </div>
        {erro && <p className="field-error show">{erro}</p>}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onFechar}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={enviando}>
            {enviando ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
