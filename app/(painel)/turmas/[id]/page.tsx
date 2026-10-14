"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Api } from "@/lib/api";
import { Topbar } from "@/components/Topbar";
import { Modal } from "@/components/Modal";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { formatarCpf, formatarData, formatarDataHora, formatarTelefone } from "@/lib/format";
import { CANAIS_ACOMPANHAMENTO, GENEROS_RESPONSAVEL, type Acompanhamento, type HistoricoAluno, type Responsavel } from "@/lib/types";

export default function AlunoDetalhePage() {
  const params = useParams<{ id: string }>();
  const idAluno = Number(params.id);
  const router = useRouter();
  const { mostrarToast } = useToast();

  const [historico, setHistorico] = useState<HistoricoAluno | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([]);
  const [acompanhamentos, setAcompanhamentos] = useState<Acompanhamento[]>([]);

  const [modalFalta, setModalFalta] = useState<"falta" | "atraso" | null>(null);
  const [modalResponsavel, setModalResponsavel] = useState(false);
  const [modalAcompanhamento, setModalAcompanhamento] = useState(false);
  const [codigoVinculo, setCodigoVinculo] = useState<{ codigo: string; expira_em: string } | null>(null);
  const [gerandoCodigo, setGerandoCodigo] = useState(false);
  const [revogando, setRevogando] = useState(false);

  async function carregarTudo() {
    setCarregando(true);
    // Sequencial, não Promise.all - ver o comentário em (painel)/layout.tsx
    // sobre limite de conexões simultâneas do banco.
    const respHistorico = await Api.historicoAluno(idAluno);
    const respResponsaveis = await Api.listarResponsaveis(idAluno);
    const respAcompanhamento = await Api.listarAcompanhamento(idAluno, 1);
    if (respHistorico.sucesso && respHistorico.dados) {
      setHistorico(respHistorico.dados);
      setErro(null);
    } else {
      setErro(respHistorico.mensagem);
    }
    if (respResponsaveis.sucesso && respResponsaveis.dados) setResponsaveis(respResponsaveis.dados);
    if (respAcompanhamento.sucesso && respAcompanhamento.dados) setAcompanhamentos(respAcompanhamento.dados.registros);
    setCarregando(false);
  }

  useEffect(() => {
    if (Number.isFinite(idAluno)) carregarTudo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idAluno]);

  async function gerarCodigo() {
    setGerandoCodigo(true);
    const resposta = await Api.gerarCodigoVinculo(idAluno);
    setGerandoCodigo(false);
    if (!resposta.sucesso || !resposta.dados) {
      mostrarToast(resposta.mensagem, true);
      return;
    }
    setCodigoVinculo(resposta.dados);
  }

  async function revogarDispositivo() {
    setRevogando(true);
    const resposta = await Api.revogarDispositivo(idAluno);
    setRevogando(false);
    if (!resposta.sucesso) {
      mostrarToast(resposta.mensagem, true);
      return;
    }
    mostrarToast(
      resposta.dados && resposta.dados.quantidade > 0
        ? `${resposta.dados.quantidade} dispositivo(s) revogado(s).`
        : "Nenhum dispositivo ativo para revogar."
    );
  }

  if (!Number.isFinite(idAluno)) {
    return <div className="error-block">Aluno inválido.</div>;
  }

  const eventos = historico
    ? [
        ...historico.faltas.map((f) => ({ ...f, tipoEvento: "Falta" as const })),
        ...historico.atrasos.map((a) => ({ ...a, tipoEvento: "Atraso" as const })),
      ].sort((a, b) => (a.data < b.data ? 1 : -1))
    : [];

  return (
    <>
      <button type="button" className="btn-text" onClick={() => router.push("/turmas")} style={{ marginBottom: 10 }}>
        ← Voltar para turmas
      </button>

      {erro && <div className="error-block">{erro}</div>}
      {carregando && !historico && <div className="loading-block">Carregando aluno…</div>}

      {historico && (
        <>
          <Topbar
            titulo={historico.aluno.nome_aluno}
            subtitulo={historico.aluno.nome_sala ?? "Sem turma"}
            acoes={
              <>
                <button type="button" className="btn" onClick={() => setModalFalta("atraso")}>
                  Registrar atraso
                </button>
                <button type="button" className="btn btn-primary" onClick={() => setModalFalta("falta")}>
                  Registrar falta
                </button>
              </>
            }
          />

          <div className="grid-2">
            <div className="panel">
              <div className="panel-head">
                <h2>Histórico ({formatarData(historico.periodo.inicio)} – {formatarData(historico.periodo.fim)})</h2>
              </div>
              {eventos.length === 0 ? (
                <div className="empty-state">
                  <Icon name="check" />
                  <p>Nenhuma falta ou atraso neste período.</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Tipo</th>
                      <th>Motivo</th>
                      <th>Justificado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventos.map((evento) => (
                      <tr key={`${evento.tipoEvento}-${evento.id}`}>
                        <td>{formatarData(evento.data)}</td>
                        <td>
                          <span className={`badge ${evento.tipoEvento === "Falta" ? "badge--alta" : "badge--media"}`}>
                            {evento.tipoEvento}
                          </span>
                        </td>
                        <td>{evento.motivo ?? "-"}</td>
                        <td>{evento.justificado ? "Sim" : "Não"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="panel">
              <div className="panel-head">
                <h2>Biometria digital</h2>
              </div>
              <p className="results-caption">
                Gere um código de vínculo para o app do aluno registrar check-ins biométricos automaticamente.
              </p>
              {codigoVinculo && (
                <div className="modal-summary">
                  Código: <b>{codigoVinculo.codigo}</b>
                  <br />
                  Válido até {formatarDataHora(codigoVinculo.expira_em)}
                </div>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="btn btn-primary btn-sm" onClick={gerarCodigo} disabled={gerandoCodigo}>
                  {gerandoCodigo ? "Gerando…" : "Gerar código"}
                </button>
                <button type="button" className="btn btn-sm" onClick={revogarDispositivo} disabled={revogando}>
                  {revogando ? "Revogando…" : "Revogar dispositivo"}
                </button>
              </div>
              <p className="panel-meta" style={{ marginTop: 14 }}>
                Check-ins pendentes de revisão aparecem em{" "}
                <Link href="/checkins" style={{ color: "var(--indigo)", fontWeight: 700 }}>
                  Check-ins
                </Link>
                .
              </p>
            </div>
          </div>

          <div className="panel" style={{ marginBottom: 20 }}>
            <div className="panel-head">
              <h2>Responsáveis</h2>
              <button type="button" className="btn btn-sm" onClick={() => setModalResponsavel(true)}>
                <Icon name="plus" /> Responsável
              </button>
            </div>
            {responsaveis.length === 0 ? (
              <p className="results-caption">Nenhum responsável vinculado.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>CPF</th>
                    <th>Telefone</th>
                    <th>Email</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {responsaveis.map((responsavel) => (
                    <tr key={responsavel.id_responsavel}>
                      <td>{responsavel.nome_responsavel}</td>
                      <td>{formatarCpf(responsavel.cpf_responsavel)}</td>
                      <td>{formatarTelefone(responsavel.telefone_responsavel)}</td>
                      <td>{responsavel.email_responsavel ?? "-"}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-text"
                          onClick={async () => {
                            const resposta = await Api.removerVinculoResponsavel(idAluno, responsavel.id_responsavel);
                            if (!resposta.sucesso) {
                              mostrarToast(resposta.mensagem, true);
                              return;
                            }
                            mostrarToast("Vínculo removido.");
                            setResponsaveis((atual) => atual.filter((r) => r.id_responsavel !== responsavel.id_responsavel));
                          }}
                        >
                          Remover vínculo
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Acompanhamento</h2>
              <button type="button" className="btn btn-sm" onClick={() => setModalAcompanhamento(true)}>
                <Icon name="plus" /> Registrar contato
              </button>
            </div>
            {acompanhamentos.length === 0 ? (
              <p className="results-caption">Nenhum registro de acompanhamento para este aluno.</p>
            ) : (
              <div className="timeline">
                {acompanhamentos.map((registro) => (
                  <div className="timeline-item" key={registro.id_acompanhamento}>
                    <div className="timeline-date">{formatarDataHora(registro.data_registro)}</div>
                    <div className="timeline-card">
                      <div className="timeline-head">
                        <span className="tag">{registro.canal}</span>
                        <span className="panel-meta">por {registro.nome_coordenacao}</span>
                      </div>
                      {registro.observacao && <p className="timeline-note">{registro.observacao}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <ModalMarcarEvento
        tipo={modalFalta}
        onFechar={() => setModalFalta(null)}
        onConfirmado={() => {
          setModalFalta(null);
          mostrarToast(modalFalta === "falta" ? "Falta registrada." : "Atraso registrado.");
          carregarTudo();
        }}
        idAluno={idAluno}
      />

      <ModalResponsavel
        aberto={modalResponsavel}
        idAluno={idAluno}
        onFechar={() => setModalResponsavel(false)}
        onSalvo={() => {
          setModalResponsavel(false);
          mostrarToast("Responsável salvo.");
          carregarTudo();
        }}
      />

      <ModalAcompanhamento
        aberto={modalAcompanhamento}
        idAluno={idAluno}
        onFechar={() => setModalAcompanhamento(false)}
        onSalvo={() => {
          setModalAcompanhamento(false);
          mostrarToast("Registro salvo.");
          carregarTudo();
        }}
      />
    </>
  );
}

function ModalMarcarEvento({
  tipo,
  idAluno,
  onFechar,
  onConfirmado,
}: {
  tipo: "falta" | "atraso" | null;
  idAluno: number;
  onFechar: () => void;
  onConfirmado: () => void;
}) {
  const { mostrarToast } = useToast();
  const [motivo, setMotivo] = useState("");
  const [observacao, setObservacao] = useState("");
  const [justificado, setJustificado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (tipo) {
      setMotivo("");
      setObservacao("");
      setJustificado(false);
    }
  }, [tipo]);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    const resposta =
      tipo === "falta"
        ? await Api.marcarFalta(idAluno, motivo || null, observacao || null, justificado)
        : await Api.marcarAtraso(idAluno, motivo || null, observacao || null, justificado);
    setEnviando(false);
    if (!resposta.sucesso) {
      mostrarToast(resposta.mensagem, true);
      return;
    }
    onConfirmado();
  }

  return (
    <Modal titulo={tipo === "falta" ? "Registrar falta" : "Registrar atraso"} aberto={!!tipo} onFechar={onFechar}>
      <form onSubmit={aoEnviar}>
        <div className="modal-field">
          <label htmlFor="motivoEvento">Motivo</label>
          <input id="motivoEvento" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Opcional" />
        </div>
        <div className="modal-field">
          <label htmlFor="observacaoEvento">Observação</label>
          <textarea id="observacaoEvento" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </div>
        <div className="modal-field checkbox-field">
          <input
            id="justificadoEvento"
            type="checkbox"
            checked={justificado}
            onChange={(e) => setJustificado(e.target.checked)}
          />
          <label htmlFor="justificadoEvento" style={{ margin: 0 }}>
            Justificado
          </label>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onFechar}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={enviando}>
            {enviando ? "Salvando…" : "Confirmar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ModalResponsavel({
  aberto,
  idAluno,
  onFechar,
  onSalvo,
}: {
  aberto: boolean;
  idAluno: number;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const { mostrarToast } = useToast();
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [genero, setGenero] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    if (aberto) {
      setNome("");
      setCpf("");
      setTelefone("");
      setEmail("");
      setGenero("");
      setErro(null);
    }
  }, [aberto]);

  async function buscarPorCpf() {
    if (!cpf.trim()) return;
    setBuscando(true);
    const resposta = await Api.buscarResponsavelPorCpf(cpf);
    setBuscando(false);
    if (resposta.sucesso && resposta.dados) {
      const vinculo = await Api.vincularResponsavel(idAluno, resposta.dados.id_responsavel);
      if (!vinculo.sucesso) {
        mostrarToast(vinculo.mensagem, true);
        return;
      }
      mostrarToast(`${resposta.dados.nome_responsavel} vinculado(a).`);
      onSalvo();
      return;
    }
    setErro("Nenhum responsável com esse CPF - preencha os dados abaixo para cadastrar um novo.");
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    if (!nome.trim() || !cpf.trim() || !telefone.trim() || !genero) {
      setErro("Preencha nome, CPF, telefone e gênero.");
      return;
    }
    setEnviando(true);
    const resposta = await Api.addResponsavel(idAluno, nome.trim(), cpf, telefone, email.trim() || null, genero);
    setEnviando(false);
    if (!resposta.sucesso) {
      setErro(resposta.mensagem);
      return;
    }
    onSalvo();
  }

  return (
    <Modal titulo="Adicionar responsável" aberto={aberto} onFechar={onFechar}>
      <form onSubmit={aoEnviar}>
        <div className="modal-field">
          <label htmlFor="cpfResponsavel">CPF</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              id="cpfResponsavel"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="Só números"
              maxLength={14}
            />
            <button type="button" className="btn btn-sm" onClick={buscarPorCpf} disabled={buscando}>
              {buscando ? "Buscando…" : "Buscar"}
            </button>
          </div>
        </div>
        <div className="modal-field">
          <label htmlFor="nomeResponsavel">Nome</label>
          <input id="nomeResponsavel" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="modal-field">
          <label htmlFor="telefoneResponsavel">Telefone</label>
          <input id="telefoneResponsavel" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="DDD + número" />
        </div>
        <div className="modal-field">
          <label htmlFor="emailResponsavel">Email</label>
          <input id="emailResponsavel" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Opcional" />
        </div>
        <div className="modal-field">
          <label htmlFor="generoResponsavel">Gênero</label>
          <select id="generoResponsavel" value={genero} onChange={(e) => setGenero(e.target.value)}>
            <option key="" value="">Selecione…</option>
            {GENEROS_RESPONSAVEL.map((g) => (
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
            {enviando ? "Salvando…" : "Cadastrar e vincular"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ModalAcompanhamento({
  aberto,
  idAluno,
  onFechar,
  onSalvo,
}: {
  aberto: boolean;
  idAluno: number;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const [canal, setCanal] = useState("");
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (aberto) {
      setCanal("");
      setObservacao("");
      setErro(null);
    }
  }, [aberto]);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    if (!canal) {
      setErro("Selecione o canal de contato.");
      return;
    }
    setEnviando(true);
    const resposta = await Api.addAcompanhamento(idAluno, canal as (typeof CANAIS_ACOMPANHAMENTO)[number], observacao || null);
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
          <label htmlFor="canalAcompanhamento">Canal de contato</label>
          <select id="canalAcompanhamento" value={canal} onChange={(e) => setCanal(e.target.value)}>
            <option key="" value="">Selecione…</option>
            {CANAIS_ACOMPANHAMENTO.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="modal-field">
          <label htmlFor="observacaoAcompanhamento">Observação</label>
          <textarea id="observacaoAcompanhamento" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
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
