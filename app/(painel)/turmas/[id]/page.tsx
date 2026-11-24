"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Api } from "@/lib/api";
import { Topbar } from "@/components/Topbar";
import { Esqueleto } from "@/components/Esqueleto";
import { Modal } from "@/components/Modal";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { ModalRegistro } from "@/components/ModalRegistro";
import { ModalCorrecaoRegistro, type AlvoCorrecao } from "@/components/ModalCorrecaoRegistro";
import { ModalEditarResponsavel, ModalResponsavel } from "@/components/ModalResponsavel";
import {
  classeBadgeStatus,
  formatarCpf,
  formatarData,
  formatarDataHora,
  formatarHora,
  formatarPercentual,
  formatarTelefone,
  plural,
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

/** Quantas entradas e saídas a ficha mostra antes de "Ver todos". */
const EVENTOS_VISIVEIS = 5;

export default function AlunoDetalhePage() {
  const params = useParams<{ id: string }>();
  const idAluno = Number(params.id);
  const { mostrarToast } = useToast();

  // A lista de entradas e saídas cresce o ano inteiro: abre com as mais
  // recentes e pode ser recolhida a uma linha de resumo.
  const [verTodosEventos, setVerTodosEventos] = useState(false);
  const [eventosRecolhidos, setEventosRecolhidos] = useState(false);

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
  const [alvo, setAlvo] = useState<AlvoCorrecao | null>(null);

  async function carregarTudo() {
    setCarregando(true);
    // Sequencial, não Promise.all - ver o comentário em (painel)/layout.tsx
    // sobre limite de conexões simultâneas do banco. Histórico dos últimos
    // 90 dias, com os cancelados (marcados): o histórico não perde nada.
    const inicio = new Date(Date.now() - 89 * 86400000).toISOString().slice(0, 10);
    const respHistorico = await Api.historicoAluno(idAluno, inicio, undefined, true);
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

  /** "Ana Lima · entrada atrasada às 07:31 de 19/11/2026" (no modal e para o leitor de tela). */
  function descreverEvento(tipo: TipoRegistro, data: string): string {
    const nome = tipo === "atraso" ? "entrada atrasada" : "saída antecipada";
    return `${historico?.aluno.nome_aluno ?? "Aluno"} · ${nome} às ${formatarHora(data)} de ${formatarData(data)}`;
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
  const eventosVisiveis = verTodosEventos ? eventos : eventos.slice(0, EVENTOS_VISIVEIS);
  const temAcoes = eventosVisiveis.some((e) => e.pode_cancelar || (e.cancelado && historico?.pode_restaurar));
  const validos = eventos.filter((e) => !e.cancelado);
  const cancelados = eventos.length - validos.length;
  const resumoEventos =
    `${plural(validos.filter((e) => e.tipo === "atraso").length, "entrada atrasada", "entradas atrasadas")} e ` +
    `${plural(validos.filter((e) => e.tipo === "saida").length, "saída antecipada", "saídas antecipadas")} no período` +
    (cancelados > 0 ? ` (${plural(cancelados, "registro cancelado", "registros cancelados")} à parte).` : ".");
  const indicador = historico?.indicador ?? null;
  const horario =
    historico?.aluno.horario_inicio && historico.aluno.horario_fim
      ? `${historico.aluno.horario_inicio}–${historico.aluno.horario_fim}`
      : null;
  const alunoDoModal = historico ? { id_aluno: idAluno, nome_aluno: historico.aluno.nome_aluno, turma: historico.aluno.nome_sala } : undefined;

  return (
    <>
      <Link href="/turmas" className="link-voltar">
        <Icon name="chevronLeft" />
        Turmas e alunos
      </Link>

      {erro && <div className="error-block">{erro}</div>}
      {carregando && !historico && <Esqueleto variante="ficha" texto="Carregando o aluno…" />}

      {historico && (
        <div className="entrada-em-cascata">
          <Topbar
            titulo={historico.aluno.nome_aluno}
            subtitulo={[historico.aluno.nome_sala ?? "Sem turma", historico.aluno.periodo_sala, horario].filter(Boolean).join(" · ")}
            acoes={
              <>
                <Link href={`/notificacoes/enviar?aluno=${idAluno}`} className="btn">
                  <Icon name="send" /> Mensagem aos responsáveis
                </Link>
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
                <div className="indicador-aluno-titulo">Últimos {indicador.janela_dias} dias</div>
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

          <div className="panel panel-tabela secao">
            <div className="panel-head">
              <h2>Entradas e saídas</h2>
              <span className="panel-links">
                <span className="panel-meta">
                  {formatarData(historico.periodo.inicio)} – {formatarData(historico.periodo.fim)}
                </span>
                {historico.pode_restaurar && (
                  <Link href={`/registros/correcoes?aluno=${idAluno}`} className="panel-meta">
                    Correções deste aluno
                  </Link>
                )}
                {eventos.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-sm btn-text btn-recolher"
                    aria-expanded={!eventosRecolhidos}
                    aria-controls="eventos-do-aluno"
                    onClick={() => setEventosRecolhidos((atual) => !atual)}
                  >
                    <Icon name="chevronDown" />
                    {eventosRecolhidos ? "Mostrar" : "Recolher"}
                    <span className="sr-only"> as entradas e saídas</span>
                  </button>
                )}
              </span>
            </div>
            {eventos.length === 0 ? (
              <div className="empty-state">
                <Icon name="check" />
                <p>Nenhuma entrada atrasada ou saída antecipada nos últimos 90 dias.</p>
              </div>
            ) : eventosRecolhidos ? (
              <p className="historico-resumo" id="eventos-do-aluno">
                {resumoEventos}
              </p>
            ) : (
              <div id="eventos-do-aluno">
                <table className="data-table tabela-cartoes">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Tipo</th>
                      <th>Motivo</th>
                      <th>Registro</th>
                      {temAcoes && <th><span className="sr-only">Ações</span></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {eventosVisiveis.map((evento) => (
                      <tr key={`${evento.tipo}-${evento.id}`} className={evento.cancelado ? "linha-cancelada" : undefined}>
                        <td className="celula-titulo">
                          {formatarData(evento.data)} <span className="panel-meta">{formatarHora(evento.data)}</span>
                        </td>
                        <td data-label="Tipo">
                          <span className={`badge ${evento.tipo === "atraso" ? "badge--atraso" : "badge--saida"}`}>
                            {evento.tipo === "atraso" ? "Entrada atrasada" : "Saída antecipada"}
                          </span>
                          {evento.justificado && <span className="badge badge--regular">Justificado</span>}
                          {evento.cancelado && <span className="badge badge--cancelado">Cancelado</span>}
                        </td>
                        <td data-label="Motivo">
                          {evento.motivo ?? "-"}
                          {evento.retirado_por && <div className="panel-meta">Buscou: {evento.retirado_por}</div>}
                        </td>
                        <td data-label="Registro" className="panel-meta">
                          {evento.tipo === "atraso" ? rotuloOrigemAtraso(evento.origem) : "Lançada pela coordenação"}
                          {evento.registrado_por && <div>por {evento.registrado_por}</div>}
                          {evento.cancelado && (
                            <div className="info-cancelamento">
                              Cancelado{evento.cancelado_por ? ` por ${evento.cancelado_por}` : ""}
                              {evento.cancelado_em ? ` em ${formatarDataHora(evento.cancelado_em)}` : ""}
                              {evento.motivo_cancelamento ? `: ${evento.motivo_cancelamento}` : ""}
                            </div>
                          )}
                        </td>
                        {temAcoes && (
                          <td className="celula-acoes">
                            {evento.pode_cancelar && (
                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                onClick={() => setAlvo({ acao: "cancelar", tipo: evento.tipo, id: evento.id, descricao: descreverEvento(evento.tipo, evento.data) })}
                              >
                                <Icon name="x" />
                                Cancelar<span className="sr-only"> {descreverEvento(evento.tipo, evento.data)}</span>
                              </button>
                            )}
                            {evento.cancelado && historico.pode_restaurar && (
                              <button
                                type="button"
                                className="btn btn-sm"
                                onClick={() => setAlvo({ acao: "restaurar", tipo: evento.tipo, id: evento.id, descricao: descreverEvento(evento.tipo, evento.data) })}
                              >
                                <Icon name="refresh" />
                                Restaurar<span className="sr-only"> {descreverEvento(evento.tipo, evento.data)}</span>
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {eventos.length > EVENTOS_VISIVEIS && (
                  <div className="historico-rodape">
                    <span>
                      {verTodosEventos
                        ? `Todos os ${eventos.length} registros do período.`
                        : `Os ${EVENTOS_VISIVEIS} mais recentes de ${eventos.length}.`}
                    </span>
                    <button type="button" className="btn btn-sm" onClick={() => setVerTodosEventos((atual) => !atual)}>
                      {verTodosEventos ? `Mostrar só os ${EVENTOS_VISIVEIS} mais recentes` : `Ver todos os ${eventos.length}`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="panel panel-tabela secao">
            <div className="panel-head">
              <h2>Responsáveis</h2>
              <button type="button" className="btn btn-sm" onClick={() => setModalResponsavel(true)}>
                <Icon name="plus" /> Adicionar responsável
              </button>
            </div>
            {responsaveis.length === 0 ? (
              <div className="aviso-dia">
                <Icon name="alert" />
                <span>Sem responsável cadastrado: a escola não consegue avisar a família quando o aluno passar do limite.</span>
              </div>
            ) : (
              <table className="data-table tabela-cartoes">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Parentesco</th>
                    <th>Contato</th>
                    <th>Avisos por</th>
                    <th><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody>
                  {responsaveis.map((responsavel) => (
                    <tr key={responsavel.id_responsavel}>
                      <td className="celula-titulo">
                        {responsavel.nome_responsavel}
                        <div className="panel-meta">CPF {formatarCpf(responsavel.cpf_responsavel)}</div>
                      </td>
                      <td data-label="Parentesco">{responsavel.parentesco ?? "-"}</td>
                      <td data-label="Contato">
                        {formatarTelefone(responsavel.telefone_responsavel)}
                        {responsavel.email_responsavel && <div className="panel-meta">{responsavel.email_responsavel}</div>}
                      </td>
                      <td data-label="Avisos por">{ROTULOS_CANAL_RESPONSAVEL[responsavel.canal_preferido ?? "whatsapp"]}</td>
                      <td className="acoes-linha celula-acoes">
                        <button type="button" className="btn-text" onClick={() => setEditando(responsavel)}>
                          Editar<span className="sr-only"> {responsavel.nome_responsavel}</span>
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
                          Remover vínculo<span className="sr-only"> de {responsavel.nome_responsavel}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="grid-2 grid-iguais">
            <div className="panel">
              <div className="panel-head">
                <h2>Biometria</h2>
              </div>
              <dl className="lista-dados">
                <div>
                  <dt>Consentimento do responsável</dt>
                  <dd>
                    {historico.aluno.consentimento_responsavel
                      ? `${historico.aluno.consentimento_responsavel}, em ${formatarData(historico.aluno.consentimento_em)}`
                      : "Não registrado"}
                  </dd>
                </div>
                <div>
                  <dt>Biometria facial</dt>
                  <dd>
                    {historico.aluno.facial_atualizada_em
                      ? `Cadastrada (${plural(historico.aluno.facial_amostras ?? 1, "foto", "fotos")}), em ${formatarData(historico.aluno.facial_atualizada_em)}`
                      : "Não cadastrada"}
                  </dd>
                </div>
                <div>
                  <dt>Digital</dt>
                  <dd>{historico.aluno.digitais > 0 ? plural(historico.aluno.digitais, "cadastrada", "cadastradas") : "Não cadastrada"}</dd>
                </div>
              </dl>
              <p className="results-caption">
                O consentimento e as fotos são registrados pelo app de biometria, no tablet da coordenação. A biometria fica
                cifrada; as fotos não são guardadas. A presença registrada pelo app depois da tolerância já vira entrada
                atrasada.
              </p>
              <div className="ficha-acoes">
                {historico.aluno.facial_atualizada_em && (
                  <button type="button" className="btn btn-sm btn-danger" onClick={apagarFacial} disabled={apagandoBiometria !== null}>
                    {apagandoBiometria === "facial" ? "Apagando…" : "Apagar biometria facial"}
                  </button>
                )}
                {historico.aluno.consentimento_responsavel && (
                  <button type="button" className="btn btn-sm btn-danger" onClick={revogarConsentimento} disabled={apagandoBiometria !== null}>
                    {apagandoBiometria === "consentimento" ? "Revogando…" : "Revogar consentimento"}
                  </button>
                )}
              </div>
              <p className="panel-meta ficha-nota">
                As presenças registradas pelo app aparecem em{" "}
                <Link href="/presencas" className="link-texto">
                  Presenças
                </Link>
                .
              </p>
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
        </div>
      )}

      <ModalCorrecaoRegistro
        alvo={alvo}
        onFechar={() => setAlvo(null)}
        onConcluido={(mensagem) => {
          setAlvo(null);
          mostrarToast(mensagem);
          carregarTudo();
        }}
      />

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
