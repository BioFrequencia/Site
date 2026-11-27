"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Topbar } from "@/components/Topbar";
import { Esqueleto } from "@/components/Esqueleto";
import { Modal } from "@/components/Modal";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { ModalRegistro, useAvisoDoRegistro } from "@/components/ModalRegistro";
import { ModalCorrecaoRegistro, type AlvoCorrecao } from "@/components/ModalCorrecaoRegistro";
import { ModalEditarResponsavel, ModalResponsavel } from "@/components/ModalResponsavel";
import { EntradasESaidasDoAluno } from "@/components/EntradasESaidasDoAluno";
import { classeBadgeStatus, formatarCpf, formatarData, formatarDataHora, formatarPercentual, formatarTelefone, plural } from "@/lib/format";
import { inicioDoPeriodo, type PeriodoDaLista } from "@/lib/listas";
import {
  CANAIS_ACOMPANHAMENTO,
  ROTULOS_CANAL_RESPONSAVEL,
  type Acompanhamento,
  type HistoricoAluno,
  type Responsavel,
  type TipoRegistro,
  ROTULOS_SITUACAO_ALUNO,
  type SituacaoAluno,
} from "@/lib/types";

export default function AlunoDetalhePage() {
  const params = useParams<{ id: string }>();
  const idAluno = Number(params.id);
  const { mostrarToast } = useToast();

  // Entradas e saídas do ano, paginadas (components/EntradasESaidasDoAluno).
  const [periodo, setPeriodo] = useState<PeriodoDaLista>("ano");
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
  const avisoDoRegistro = useAvisoDoRegistro(() => void carregarTudo());
  const { coordenacao } = useAuth();
  const gestao = coordenacao?.papel === "gestor";
  const [retirando, setRetirando] = useState(false);
  const [mudandoSituacao, setMudandoSituacao] = useState(false);

  /** O histórico do período, com os cancelados (a lista os mostra à parte): o histórico não perde nada. */
  async function carregarHistorico(periodoDoHistorico: PeriodoDaLista = periodo) {
    setCarregando(true);
    const resposta = await Api.historicoAluno(idAluno, inicioDoPeriodo(periodoDoHistorico), undefined, true);
    if (resposta.sucesso && resposta.dados) {
      setHistorico(resposta.dados);
      setErro(null);
    } else {
      setErro(resposta.mensagem);
    }
    setCarregando(false);
  }

  async function carregarTudo() {
    // Sequencial, não Promise.all - ver o comentário em (painel)/layout.tsx
    // sobre limite de conexões simultâneas do banco.
    await carregarHistorico();
    const respResponsaveis = await Api.listarResponsaveis(idAluno);
    const respAcompanhamento = await Api.listarAcompanhamento(idAluno, 1);
    if (respResponsaveis.sucesso && respResponsaveis.dados) setResponsaveis(respResponsaveis.dados);
    if (respAcompanhamento.sucesso && respAcompanhamento.dados) setAcompanhamentos(respAcompanhamento.dados.registros);
  }

  useEffect(() => {
    if (Number.isFinite(idAluno)) carregarTudo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idAluno]);

  function mudarPeriodo(novo: PeriodoDaLista) {
    setPeriodo(novo);
    void carregarHistorico(novo);
  }

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

  if (!Number.isFinite(idAluno)) {
    return <div className="error-block">Aluno inválido.</div>;
  }

  const indicador = historico?.indicador ?? null;
  const horario =
    historico?.aluno.horario_inicio && historico.aluno.horario_fim
      ? `${historico.aluno.horario_inicio}–${historico.aluno.horario_fim}`
      : null;
  const alunoDoModal = historico ? { id_aluno: idAluno, nome_aluno: historico.aluno.nome_aluno, turma: historico.aluno.nome_sala } : undefined;

  async function mudarSituacao(situacao: SituacaoAluno) {
    setMudandoSituacao(true);
    const resposta = await Api.mudarSituacaoAluno(idAluno, situacao);
    setMudandoSituacao(false);
    setRetirando(false);
    mostrarToast(resposta.mensagem || (resposta.sucesso ? "Situação do aluno atualizada." : "Não foi possível mudar."), !resposta.sucesso);
    if (resposta.sucesso) carregarTudo();
  }

  const saiuDaEscola = !!historico?.aluno.situacao_aluno && historico.aluno.situacao_aluno !== "ativo";

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
              saiuDaEscola ? undefined : (
                <>
                  {gestao && (
                    <button type="button" className="btn btn-text" onClick={() => setRetirando(true)}>
                      <Icon name="logout" /> Retirar da escola
                    </button>
                  )}
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
              )
            }
          />

          {saiuDaEscola && historico.aluno.situacao_aluno && (
            <div className="aviso-saiu" role="status">
              <Icon name="info" />
              <span>
                <b>{ROTULOS_SITUACAO_ALUNO[historico.aluno.situacao_aluno]}</b>
                {historico.aluno.saiu_em && <> em {formatarData(historico.aluno.saiu_em)}</>}. Este aluno saiu da escola: não
                aparece nas listas nem no app, e o histórico abaixo continua guardado.
              </span>
              {gestao && (
                <button type="button" className="btn btn-sm" onClick={() => mudarSituacao("ativo")} disabled={mudandoSituacao}>
                  <Icon name="refresh" /> Trazer de volta
                </button>
              )}
            </div>
          )}

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

          <EntradasESaidasDoAluno
            historico={historico}
            periodo={periodo}
            onMudarPeriodo={mudarPeriodo}
            carregando={carregando}
            onCorrigir={setAlvo}
          />

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

      <Modal titulo="Retirar o aluno da escola?" aberto={retirando} onFechar={() => setRetirando(false)}>
        <p>
          <b>{historico?.aluno.nome_aluno}</b> sai das listas, do app de biometria e dos alertas. O histórico continua guardado e a
          biometria dele é apagada. Dá para trazer de volta depois, por esta ficha.
        </p>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={() => setRetirando(false)}>
            Voltar
          </button>
          <button type="button" className="btn" onClick={() => mudarSituacao("concluiu")} disabled={mudandoSituacao}>
            Concluiu
          </button>
          <button type="button" className="btn btn-primary" onClick={() => mudarSituacao("transferido")} disabled={mudandoSituacao}>
            Foi transferido(a)
          </button>
        </div>
      </Modal>

      <ModalRegistro
        tipo={modalRegistro}
        aluno={alunoDoModal}
        onFechar={() => setModalRegistro(null)}
        onConfirmado={(mensagem, registro) => {
          setModalRegistro(null);
          avisoDoRegistro(mensagem, registro);
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
