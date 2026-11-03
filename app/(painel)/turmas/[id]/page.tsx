"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Topbar } from "@/components/Topbar";
import { Esqueleto } from "@/components/Esqueleto";
import { Modal } from "@/components/Modal";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { ModalRegistro } from "@/components/ModalRegistro";
import { ModalEditarResponsavel, ModalResponsavel } from "@/components/ModalResponsavel";
import {
  classeBadgeStatus,
  formatarCpf,
  formatarData,
  formatarDataHora,
  formatarHora,
  formatarPercentual,
  formatarTelefone,
  rotuloOrigemAtraso,
} from "@/lib/format";
import {
  CANAIS_ACOMPANHAMENTO,
  ROTULOS_CANAL_RESPONSAVEL,
  type Acompanhamento,
  type HistoricoAluno,
  type Responsavel,
  type TipoRegistro,
} from "@/lib/types";

export default function AlunoDetalhePage() {
  const params = useParams<{ id: string }>();
  const idAluno = Number(params.id);
  const router = useRouter();
  const { coordenacao } = useAuth();
  const { mostrarToast } = useToast();
  const gestao = coordenacao?.papel === "gestor";

  const [historico, setHistorico] = useState<HistoricoAluno | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([]);
  const [acompanhamentos, setAcompanhamentos] = useState<Acompanhamento[]>([]);

  const [modalRegistro, setModalRegistro] = useState<TipoRegistro | null>(null);
  const [modalResponsavel, setModalResponsavel] = useState(false);
  const [editando, setEditando] = useState<Responsavel | null>(null);
  const [modalAcompanhamento, setModalAcompanhamento] = useState(false);
  const [apagandoBiometria, setApagandoBiometria] = useState<"facial" | "consentimento" | null>(null);

  async function carregarTudo() {
    setCarregando(true);
    // Sequencial, não Promise.all - ver o comentário em (painel)/layout.tsx
    // sobre limite de conexões simultâneas do banco. Histórico dos últimos
    // 90 dias.
    const inicio = new Date(Date.now() - 89 * 86400000).toISOString().slice(0, 10);
    const respHistorico = await Api.historicoAluno(idAluno, inicio);
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

  // LGPD: a coordenação pode apagar a biometria a pedido da família, ou
  // revogar o consentimento (apaga tudo). O cadastro é feito no app.
  async function apagarFacial() {
    if (!confirm("Apagar a biometria facial deste aluno? Ele deixa de ser reconhecido até um novo cadastro pelo app.")) return;
    setApagandoBiometria("facial");
    const resposta = await Api.excluirBiometria(idAluno, "facial");
    setApagandoBiometria(null);
    if (!resposta.sucesso) {
      mostrarToast(resposta.mensagem, true);
      return;
    }
    mostrarToast("Biometria facial apagada.");
    setHistorico((atual) => (atual ? { ...atual, aluno: { ...atual.aluno, facial_atualizada_em: null, facial_amostras: null } } : atual));
  }

  async function revogarConsentimento() {
    if (!confirm("Revogar o consentimento? Toda a biometria deste aluno será apagada. As presenças já registradas continuam.")) return;
    setApagandoBiometria("consentimento");
    const resposta = await Api.revogarConsentimento(idAluno);
    setApagandoBiometria(null);
    if (!resposta.sucesso) {
      mostrarToast(resposta.mensagem, true);
      return;
    }
    mostrarToast("Consentimento revogado e biometria apagada.");
    setHistorico((atual) =>
      atual
        ? {
            ...atual,
            aluno: {
              ...atual.aluno,
              consentimento_responsavel: null,
              consentimento_em: null,
              facial_atualizada_em: null,
              facial_amostras: null,
              digitais: 0,
            },
          }
        : atual
    );
  }

  async function removerRegistro(tipo: TipoRegistro, id: number) {
    const nome = tipo === "atraso" ? "esta entrada atrasada" : "esta saída antecipada";
    if (!confirm(`Apagar ${nome}? Use só para registro feito por engano. Avisos que já foram para a família não voltam.`)) return;
    const resposta = await Api.removerRegistro(tipo, id);
    if (!resposta.sucesso) {
      mostrarToast(resposta.mensagem, true);
      return;
    }
    mostrarToast(tipo === "atraso" ? "Entrada atrasada apagada." : "Saída antecipada apagada.");
    carregarTudo();
  }

  if (!Number.isFinite(idAluno)) {
    return <div className="error-block">Aluno inválido.</div>;
  }

  const eventos = historico
    ? [
        ...historico.atrasos.map((a) => ({ ...a, tipo: "atraso" as const })),
        ...historico.saidas.map((s) => ({ ...s, tipo: "saida" as const })),
      ].sort((a, b) => (a.data < b.data ? 1 : -1))
    : [];
  const indicador = historico?.indicador ?? null;
  const horario =
    historico?.aluno.horario_inicio && historico.aluno.horario_fim
      ? `${historico.aluno.horario_inicio}–${historico.aluno.horario_fim}`
      : null;
  const alunoDoModal = historico ? { id_aluno: idAluno, nome_aluno: historico.aluno.nome_aluno, turma: historico.aluno.nome_sala } : undefined;

  return (
    <>
      <button type="button" className="btn-text" onClick={() => router.push("/turmas")} style={{ marginBottom: 10 }}>
        ← Voltar para turmas
      </button>

      {erro && <div className="error-block">{erro}</div>}
      {carregando && !historico && <Esqueleto variante="ficha" texto="Carregando o aluno…" />}

      {historico && (
        <div className="entrada-em-cascata">
          <Topbar
            titulo={historico.aluno.nome_aluno}
            subtitulo={[historico.aluno.nome_sala ?? "Sem turma", historico.aluno.periodo_sala, horario].filter(Boolean).join(" · ")}
            acoes={
              <>
                <button type="button" className="btn" onClick={() => setModalRegistro("saida")}>
                  <Icon name="logout" /> Saída antecipada
                </button>
                <button type="button" className="btn btn-primary" onClick={() => setModalRegistro("atraso")}>
                  <Icon name="clock" /> Entrada atrasada
                </button>
              </>
            }
          />

          {indicador && (
            <div className="indicador-aluno">
              <div>
                <div className="stat-label">Últimos {indicador.janela_dias} dias</div>
                <div className="indicador-numeros">
                  <span>
                    <b>{indicador.atrasos}</b> {indicador.atrasos === 1 ? "entrada atrasada" : "entradas atrasadas"} (
                    {formatarPercentual(indicador.taxa_atrasos)})
                  </span>
                  <span>
                    <b>{indicador.saidas}</b> {indicador.saidas === 1 ? "saída antecipada" : "saídas antecipadas"} (
                    {formatarPercentual(indicador.taxa_saidas)})
                  </span>
                  <span>
                    em <b>{indicador.dias_letivos}</b> {indicador.dias_letivos === 1 ? "dia de aula" : "dias de aula"}
                  </span>
                </div>
              </div>
              <div className="indicador-situacao">
                <span className={classeBadgeStatus(indicador.situacao)}>{indicador.situacao}</span>
                <span className="panel-meta">
                  A família é avisada a partir de {indicador.limite}% (mínimo de {indicador.minimo})
                </span>
              </div>
            </div>
          )}

          <div className="grid-2">
            <div className="panel">
              <div className="panel-head">
                <h2>Entradas e saídas</h2>
                <span className="panel-meta">
                  {formatarData(historico.periodo.inicio)} – {formatarData(historico.periodo.fim)}
                </span>
              </div>
              {eventos.length === 0 ? (
                <div className="empty-state">
                  <Icon name="check" />
                  <p>Nenhuma entrada atrasada ou saída antecipada nos últimos 90 dias.</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Tipo</th>
                      <th>Motivo</th>
                      <th>Registro</th>
                      {gestao && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {eventos.map((evento) => (
                      <tr key={`${evento.tipo}-${evento.id}`}>
                        <td>
                          {formatarData(evento.data)} <span className="panel-meta">{formatarHora(evento.data)}</span>
                        </td>
                        <td>
                          <span className={`badge ${evento.tipo === "atraso" ? "badge--atraso" : "badge--saida"}`}>
                            {evento.tipo === "atraso" ? "Entrada atrasada" : "Saída antecipada"}
                          </span>
                          {evento.justificado && <span className="badge badge--regular">Justificado</span>}
                        </td>
                        <td>
                          {evento.motivo ?? "-"}
                          {evento.retirado_por && <div className="panel-meta">Buscou: {evento.retirado_por}</div>}
                        </td>
                        <td className="panel-meta">
                          {evento.tipo === "atraso" ? rotuloOrigemAtraso(evento.origem) : "Lançada pela coordenação"}
                          {evento.registrado_por && <div>por {evento.registrado_por}</div>}
                        </td>
                        {gestao && (
                          <td>
                            <button
                              type="button"
                              className="icon-btn"
                              title="Apagar (registro feito por engano)"
                              aria-label="Apagar registro"
                              onClick={() => removerRegistro(evento.tipo, evento.id)}
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

            <div className="panel">
              <div className="panel-head">
                <h2>Biometria</h2>
              </div>
              <div className="modal-summary">
                Consentimento do responsável:{" "}
                {historico.aluno.consentimento_responsavel ? (
                  <>
                    <b>{historico.aluno.consentimento_responsavel}</b>, em {formatarData(historico.aluno.consentimento_em)}
                  </>
                ) : (
                  <b>não registrado</b>
                )}
                <br />
                Facial:{" "}
                {historico.aluno.facial_atualizada_em ? (
                  <b>
                    cadastrada ({historico.aluno.facial_amostras ?? 1} foto(s)), em {formatarData(historico.aluno.facial_atualizada_em)}
                  </b>
                ) : (
                  <b>não cadastrada</b>
                )}
                <br />
                Digital: <b>{historico.aluno.digitais > 0 ? `${historico.aluno.digitais} cadastrada(s)` : "não cadastrada"}</b>
              </div>
              <p className="results-caption">
                O consentimento e as fotos são registrados pelo app de biometria, no tablet da coordenação. A biometria fica
                cifrada; as fotos não são guardadas. A presença registrada pelo app depois da tolerância já vira entrada
                atrasada.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {historico.aluno.facial_atualizada_em && (
                  <button type="button" className="btn btn-sm" onClick={apagarFacial} disabled={apagandoBiometria !== null}>
                    {apagandoBiometria === "facial" ? "Apagando…" : "Apagar biometria facial"}
                  </button>
                )}
                {historico.aluno.consentimento_responsavel && (
                  <button type="button" className="btn btn-sm" onClick={revogarConsentimento} disabled={apagandoBiometria !== null}>
                    {apagandoBiometria === "consentimento" ? "Revogando…" : "Revogar consentimento"}
                  </button>
                )}
              </div>
              <p className="panel-meta" style={{ marginTop: 14 }}>
                As presenças registradas pelo app aparecem em{" "}
                <Link href="/presencas" style={{ color: "var(--indigo-texto)", fontWeight: 700 }}>
                  Presenças
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
              <div className="aviso-dia">
                <Icon name="alert" />
                <span>Sem responsável cadastrado: a escola não consegue avisar a família quando o aluno passar do limite.</span>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Parentesco</th>
                    <th>Contato</th>
                    <th>Avisos por</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {responsaveis.map((responsavel) => (
                    <tr key={responsavel.id_responsavel}>
                      <td>
                        {responsavel.nome_responsavel}
                        <div className="panel-meta">CPF {formatarCpf(responsavel.cpf_responsavel)}</div>
                      </td>
                      <td>{responsavel.parentesco ?? "-"}</td>
                      <td>
                        {formatarTelefone(responsavel.telefone_responsavel)}
                        {responsavel.email_responsavel && <div className="panel-meta">{responsavel.email_responsavel}</div>}
                      </td>
                      <td>{ROTULOS_CANAL_RESPONSAVEL[responsavel.canal_preferido ?? "whatsapp"]}</td>
                      <td className="acoes-linha">
                        <button type="button" className="btn-text" onClick={() => setEditando(responsavel)}>
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn-text"
                          onClick={async () => {
                            // Um clique sem querer desfazia o vínculo e a família
                            // deixava de receber os avisos deste aluno.
                            if (!confirm(`Remover ${responsavel.nome_responsavel} dos responsáveis deste aluno?`)) return;
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
        </div>
      )}

      <ModalRegistro
        tipo={modalRegistro}
        aluno={alunoDoModal}
        onFechar={() => setModalRegistro(null)}
        onConfirmado={(mensagem) => {
          setModalRegistro(null);
          mostrarToast(mensagem);
          carregarTudo();
        }}
      />

      <ModalResponsavel
        aberto={modalResponsavel}
        aluno={alunoDoModal}
        onFechar={() => setModalResponsavel(false)}
        onSalvo={(mensagem) => {
          setModalResponsavel(false);
          mostrarToast(mensagem);
          carregarTudo();
        }}
      />

      <ModalEditarResponsavel
        responsavel={editando}
        idAluno={idAluno}
        nomeAluno={historico?.aluno.nome_aluno}
        onFechar={() => setEditando(null)}
        onSalvo={(mensagem) => {
          setEditando(null);
          mostrarToast(mensagem);
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
          <button type="submit" className="btn btn-primary" disabled={enviando} aria-busy={enviando}>
            {enviando ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
