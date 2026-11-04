"use client";

import { useCallback, useEffect, useState } from "react";
import { Api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Topbar } from "@/components/Topbar";
import { Esqueleto } from "@/components/Esqueleto";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { ModalAprovacao } from "@/components/ModalAprovacao";
import { useToast } from "@/components/Toast";
import { formatarDataHora } from "@/lib/format";
import {
  ROTULOS_CARGO,
  ROTULOS_CATEGORIA_CHAMADO,
  ROTULOS_PAPEL,
  ROTULOS_STATUS_CHAMADO,
  type AcaoEquipe,
  type ChamadoAdmin,
  type ContaAdmin,
  type EscolaAdmin,
  type EscolaCatalogo,
  type PapelConta,
  type ResumoSistema,
  type SituacaoConta,
  type StatusChamado,
} from "@/lib/types";

type Aba = "geral" | "contas" | "escolas" | "chamados";

const ABAS: { id: Aba; rotulo: string; icone: string }[] = [
  { id: "geral", rotulo: "Visão geral", icone: "home" },
  { id: "contas", rotulo: "Contas", icone: "users" },
  { id: "escolas", rotulo: "Escolas", icone: "building" },
  { id: "chamados", rotulo: "Chamados de suporte", icone: "lifeBuoy" },
];

const ROTULOS_SITUACAO: Record<SituacaoConta, string> = {
  pendente: "Aguardando aprovação",
  ativo: "Ativa",
  recusado: "Recusada",
  desativado: "Desativada",
};

/** O que o aviso diz depois de cada ação (quem pediu o acesso recebe e-mail ao ser aprovado ou recusado). */
const MENSAGENS_ACAO: Partial<Record<AcaoEquipe | "confirmar_email", string>> = {
  aprovar: "Conta aprovada: a pessoa recebe um e-mail e já pode entrar.",
  recusar: "Pedido recusado: a pessoa recebe um e-mail avisando.",
  confirmar_email: "E-mail confirmado. Agora a conta pode ser aprovada.",
};

/**
 * Administração do sistema, para a equipe do BioFrequência (os e-mails de
 * ADMIN_EMAILS na API). Contas de todas as escolas, o catálogo e os
 * chamados de suporte. Para qualquer outra conta a API responde 404 e o
 * menu nem mostra esta tela.
 */
export default function AdminPage() {
  const { coordenacao } = useAuth();
  const [aba, setAba] = useState<Aba>("geral");

  // ?aba=contas abre direto na aba (o link do e-mail de pedido de acesso).
  useEffect(() => {
    const pedida = new URLSearchParams(window.location.search).get("aba");
    if (ABAS.some((item) => item.id === pedida)) setAba(pedida as Aba);
  }, []);

  function trocarAba(nova: Aba) {
    setAba(nova);
    window.history.replaceState(null, "", nova === "geral" ? "/admin" : `/admin?aba=${nova}`);
  }

  if (!coordenacao?.administrador) {
    return (
      <div className="empty-state">
        <Icon name="shield" />
        <p>Página não encontrada.</p>
      </div>
    );
  }

  return (
    <>
      <Topbar titulo="Administração" subtitulo="Equipe do sistema: contas, escolas e chamados de suporte de todas as escolas." />
      <div className="abas-conta" role="tablist" aria-label="Seções da administração">
        {ABAS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={aba === item.id}
            className={`filter-pill${aba === item.id ? " active" : ""}`}
            onClick={() => trocarAba(item.id)}
          >
            <Icon name={item.icone} />
            {item.rotulo}
          </button>
        ))}
      </div>
      <div className="entrada-em-cascata" key={aba}>
        {aba === "geral" && <AbaGeral irPara={trocarAba} />}
        {aba === "contas" && <AbaContas />}
        {aba === "escolas" && <AbaEscolas />}
        {aba === "chamados" && <AbaChamados />}
      </div>
    </>
  );
}

function AbaGeral({ irPara }: { irPara: (aba: Aba) => void }) {
  const { mostrarToast } = useToast();
  const [resumo, setResumo] = useState<ResumoSistema | null>(null);
  const [importando, setImportando] = useState(false);

  const carregar = useCallback(async () => {
    const resposta = await Api.adminResumo();
    if (resposta.sucesso && resposta.dados) setResumo(resposta.dados);
    else mostrarToast(resposta.mensagem, true);
  }, [mostrarToast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function importar() {
    if (!confirm("Importar de novo o catálogo de escolas da SEDUC? Nada é apagado: escolas novas entram e as existentes têm os dados oficiais atualizados.")) return;
    setImportando(true);
    const resposta = await Api.adminImportarCatalogo();
    setImportando(false);
    mostrarToast(resposta.mensagem, !resposta.sucesso);
    carregar();
  }

  if (!resumo) return <Esqueleto variante="cartoes" />;

  const cartoes: { rotulo: string; valor: number; detalhe?: string; aba?: Aba }[] = [
    {
      rotulo: "Contas aguardando aprovação",
      valor: resumo.contas_pendentes,
      detalhe: resumo.contas_sem_email > 0 ? `+ ${resumo.contas_sem_email} esperando confirmar o e-mail` : "e-mail já confirmado",
      aba: "contas",
    },
    { rotulo: "Chamados abertos", valor: resumo.chamados_abertos, aba: "chamados" },
    { rotulo: "Escolas usando o sistema", valor: resumo.escolas_em_uso, detalhe: `de ${resumo.escolas_catalogo.toLocaleString("pt-BR")} no catálogo`, aba: "escolas" },
    { rotulo: "Contas ativas", valor: resumo.contas_ativas, aba: "contas" },
    { rotulo: "Alunos", valor: resumo.alunos, detalhe: `${resumo.turmas} turmas` },
    { rotulo: "Entradas atrasadas no mês", valor: resumo.atrasos_mes, detalhe: `${resumo.saidas_mes} saídas antecipadas` },
    { rotulo: "Presenças pelo app no mês", valor: resumo.presencas_mes },
    { rotulo: "Avisos na fila", valor: resumo.avisos_pendentes, detalhe: "sem envio automático configurado" },
  ];

  return (
    <>
      <div className="cards-resumo cards-resumo--grade">
        {cartoes.map((cartao) => (
          <button
            type="button"
            key={cartao.rotulo}
            className="card-resumo"
            onClick={() => cartao.aba && irPara(cartao.aba)}
            disabled={!cartao.aba}
          >
            <span className="card-resumo-rotulo">{cartao.rotulo}</span>
            <span className="card-resumo-valor">{cartao.valor.toLocaleString("pt-BR")}</span>
            {cartao.detalhe && <span className="panel-meta">{cartao.detalhe}</span>}
          </button>
        ))}
      </div>
      <div className="panel">
        <div className="panel-head">
          <h2>Catálogo de escolas</h2>
          <button type="button" className="btn btn-sm" onClick={importar} disabled={importando}>
            {importando ? "Importando…" : "Importar de novo"}
          </button>
        </div>
        <p className="results-caption">
          {resumo.catalogo
            ? `Versão ${resumo.catalogo.versao}: ${resumo.catalogo.total.toLocaleString("pt-BR")} escolas, importado em ${formatarDataHora(resumo.catalogo.importado_em)}.`
            : "O catálogo ainda não foi importado neste banco."}{" "}
          A API importa sozinha ao iniciar quando a versão muda (atual: {resumo.catalogo_versao_atual}).{" "}
          {resumo.escolas_fora_catalogo > 0 && `${resumo.escolas_fora_catalogo} escola(s) foram criadas fora do catálogo.`}
        </p>
      </div>
    </>
  );
}

function AbaContas() {
  const { mostrarToast } = useToast();
  const [contas, setContas] = useState<ContaAdmin[]>([]);
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState<SituacaoConta | "">("");
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [movendo, setMovendo] = useState<ContaAdmin | null>(null);
  const [aprovando, setAprovando] = useState<ContaAdmin | null>(null);

  const carregar = useCallback(async () => {
    const resposta = await Api.adminContas(busca.trim(), situacao || null, pagina);
    if (resposta.sucesso && resposta.dados) {
      setContas(resposta.dados.contas);
      setTotalPaginas(Math.max(1, resposta.dados.total_paginas));
    } else {
      mostrarToast(resposta.mensagem, true);
    }
  }, [busca, situacao, pagina, mostrarToast]);

  useEffect(() => {
    const espera = setTimeout(carregar, 250);
    return () => clearTimeout(espera);
  }, [carregar]);

  async function aplicar(conta: ContaAdmin, acao: AcaoEquipe | "confirmar_email", papel?: PapelConta) {
    const resposta = await Api.adminAtualizarConta(conta.id_coordenacao, acao, { papel });
    if (!resposta.sucesso) {
      mostrarToast(resposta.mensagem, true);
      return;
    }
    setAprovando(null);
    mostrarToast(
      acao === "aprovar" && resposta.dados
        ? `Conta aprovada como ${ROTULOS_PAPEL[resposta.dados.papel]}: a pessoa recebe um e-mail e já pode entrar.`
        : (MENSAGENS_ACAO[acao] ?? "Conta atualizada.")
    );
    carregar();
  }

  // Sem provedor de e-mail o link não chega: a equipe confirma no lugar
  // da pessoa, depois de conferir que o endereço é dela.
  function confirmarEmail(conta: ContaAdmin) {
    const aviso =
      `Confirmar o e-mail ${conta.email_coordenacao} sem o link?\n\n` +
      "Faça isso só se você já conferiu com a pessoa que o endereço é dela - normalmente ela confirma sozinha, pelo link que recebeu.";
    if (confirm(aviso)) aplicar(conta, "confirmar_email");
  }

  return (
    <div className="panel">
      <div className="filter-bar" style={{ marginBottom: 18 }}>
        <div className="search-box" style={{ width: 260 }}>
          <Icon name="search" />
          <input
            placeholder="Nome, e-mail ou escola"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(1);
            }}
          />
        </div>
        <select
          className="filter-select"
          value={situacao}
          onChange={(e) => {
            setSituacao(e.target.value as SituacaoConta | "");
            setPagina(1);
          }}
        >
          <option value="">Todas as situações</option>
          {(Object.keys(ROTULOS_SITUACAO) as SituacaoConta[]).map((s) => (
            <option key={s} value={s}>
              {ROTULOS_SITUACAO[s]}
            </option>
          ))}
        </select>
      </div>
      <div className="tabela-rolavel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Conta</th>
              <th>Escola</th>
              <th>Papel</th>
              <th>Situação</th>
              <th>Último acesso</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {contas.map((conta) => (
              <tr key={conta.id_coordenacao}>
                <td>
                  <b>{conta.nome_coordenacao}</b>
                  {conta.administrador && <span className="badge badge--media">equipe</span>}
                  <div className="panel-meta">{conta.email_coordenacao}</div>
                  {!conta.email_verificado && <span className="selo-email">e-mail não confirmado</span>}
                </td>
                <td>
                  {conta.nome_escola}
                  {conta.municipio && <div className="panel-meta">{conta.municipio}</div>}
                </td>
                <td>
                  {/* Pendente: a permissão ainda vai ser escolhida por quem aprova. */}
                  {conta.situacao === "pendente" ? <span className="panel-meta">a definir</span> : ROTULOS_PAPEL[conta.papel]}
                  {conta.cargo && <div className="panel-meta">{ROTULOS_CARGO[conta.cargo]}</div>}
                </td>
                <td>
                  <span className={`badge ${conta.situacao === "ativo" ? "badge--regular" : conta.situacao === "pendente" ? "badge--atencao" : "badge--neutral"}`}>
                    {ROTULOS_SITUACAO[conta.situacao]}
                  </span>
                </td>
                <td className="panel-meta">{conta.ultimo_acesso ? formatarDataHora(conta.ultimo_acesso) : "-"}</td>
                <td className="acoes-linha">
                  {conta.situacao === "pendente" && (
                    <>
                      {conta.email_verificado ? (
                        <button type="button" className="btn btn-sm btn-primary" onClick={() => setAprovando(conta)}>
                          Aprovar
                        </button>
                      ) : (
                        <button type="button" className="btn btn-sm" onClick={() => confirmarEmail(conta)} title="A aprovação fica liberada depois da confirmação">
                          Confirmar e-mail
                        </button>
                      )}
                      <button type="button" className="btn btn-sm" onClick={() => aplicar(conta, "recusar")}>
                        Recusar
                      </button>
                    </>
                  )}
                  {conta.situacao === "ativo" && (
                    <>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => aplicar(conta, conta.papel === "gestor" ? "tornar_coordenador" : "tornar_gestor")}
                      >
                        {conta.papel === "gestor" ? "Tirar da gestão" : "Tornar gestão"}
                      </button>
                      <button type="button" className="btn btn-sm" onClick={() => confirm(`Desativar ${conta.nome_coordenacao}?`) && aplicar(conta, "desativar")}>
                        Desativar
                      </button>
                    </>
                  )}
                  {(conta.situacao === "desativado" || conta.situacao === "recusado") && (
                    <button type="button" className="btn btn-sm" onClick={() => aplicar(conta, "reativar")}>
                      Reativar
                    </button>
                  )}
                  <button type="button" className="btn btn-sm" onClick={() => setMovendo(conta)}>
                    Mudar escola
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Paginacao pagina={pagina} totalPaginas={totalPaginas} onMudar={setPagina} />
      <ModalMoverEscola
        conta={movendo}
        onFechar={() => setMovendo(null)}
        onMovida={() => {
          setMovendo(null);
          mostrarToast("Conta movida para a nova escola.");
          carregar();
        }}
      />
      <ModalAprovacao
        key={aprovando?.id_coordenacao ?? "nenhum"}
        pedido={
          aprovando && {
            nome: aprovando.nome_coordenacao,
            cargo: aprovando.cargo,
            escolaSemGestao: aprovando.escola_tem_gestao === false,
          }
        }
        onFechar={() => setAprovando(null)}
        onAprovar={(papel) => (aprovando ? aplicar(aprovando, "aprovar", papel) : Promise.resolve())}
      />
    </div>
  );
}

/** A conta escolheu a escola errada no cadastro: a equipe muda para a certa (do catálogo). */
function ModalMoverEscola({ conta, onFechar, onMovida }: { conta: ContaAdmin | null; onFechar: () => void; onMovida: () => void }) {
  const { mostrarToast } = useToast();
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<EscolaCatalogo[]>([]);

  useEffect(() => {
    if (!conta) {
      setBusca("");
      setResultados([]);
    }
  }, [conta]);

  useEffect(() => {
    if (busca.trim().length < 3) {
      setResultados([]);
      return;
    }
    let ativo = true;
    const espera = setTimeout(async () => {
      const resposta = await Api.buscarEscolas(busca.trim());
      if (ativo) setResultados(resposta.dados?.escolas ?? []);
    }, 300);
    return () => {
      ativo = false;
      clearTimeout(espera);
    };
  }, [busca]);

  async function mover(escola: EscolaCatalogo) {
    if (!conta) return;
    if (!confirm(`Mover ${conta.nome_coordenacao} para ${escola.nome_escola}? Ela passa a ver só os alunos da escola nova.`)) return;
    const resposta = await Api.adminAtualizarConta(conta.id_coordenacao, "mover_escola", { idEscola: escola.id_escola });
    if (!resposta.sucesso) {
      mostrarToast(resposta.mensagem, true);
      return;
    }
    onMovida();
  }

  return (
    <Modal titulo="Mudar a escola da conta" aberto={!!conta} onFechar={onFechar}>
      <div className="modal-summary">
        {conta?.nome_coordenacao} · hoje em <b>{conta?.nome_escola}</b>
      </div>
      <div className="modal-field">
        <label htmlFor="buscaEscolaAdmin">Escola de destino</label>
        <input id="buscaEscolaAdmin" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome, município ou código CIE" autoFocus />
      </div>
      <div className="lista-escolha" role="listbox" aria-label="Escolas">
        {resultados.map((e) => (
          <button type="button" role="option" aria-selected={false} key={e.id_escola} onClick={() => mover(e)}>
            <span>{e.nome_escola}</span>
            <span className="panel-meta">
              {e.municipio}
              {e.tem_gestao ? " · já tem gestão (entra como coordenação)" : " · sem gestão (entra como gestão)"}
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

function AbaEscolas() {
  const { mostrarToast } = useToast();
  const [escolas, setEscolas] = useState<EscolaAdmin[]>([]);
  const [busca, setBusca] = useState("");
  const [emUso, setEmUso] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [total, setTotal] = useState(0);

  const carregar = useCallback(async () => {
    const resposta = await Api.adminEscolas(busca.trim(), emUso, pagina);
    if (resposta.sucesso && resposta.dados) {
      setEscolas(resposta.dados.escolas);
      setTotalPaginas(Math.max(1, resposta.dados.total_paginas));
      setTotal(resposta.dados.total_registros);
    } else {
      mostrarToast(resposta.mensagem, true);
    }
  }, [busca, emUso, pagina, mostrarToast]);

  useEffect(() => {
    const espera = setTimeout(carregar, 250);
    return () => clearTimeout(espera);
  }, [carregar]);

  return (
    <div className="panel">
      <div className="filter-bar" style={{ marginBottom: 18 }}>
        <div className="search-box" style={{ width: 260 }}>
          <Icon name="search" />
          <input
            placeholder="Nome, município ou código CIE"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(1);
            }}
          />
        </div>
        <div className="pill-group">
          <button type="button" className={`filter-pill${emUso ? " active" : ""}`} onClick={() => { setEmUso(true); setPagina(1); }}>
            Usando o sistema
          </button>
          <button type="button" className={`filter-pill${!emUso ? " active" : ""}`} onClick={() => { setEmUso(false); setPagina(1); }}>
            Catálogo inteiro
          </button>
        </div>
        <span className="panel-meta">{total.toLocaleString("pt-BR")} escola(s)</span>
      </div>
      <div className="tabela-rolavel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Escola</th>
              <th>Município</th>
              <th>Contas</th>
              <th>Turmas</th>
              <th>Alunos</th>
            </tr>
          </thead>
          <tbody>
            {escolas.map((escola) => (
              <tr key={escola.id_escola}>
                <td>
                  <b>{escola.nome_escola}</b>
                  <div className="panel-meta">{escola.codigo_cie ? `CIE ${escola.codigo_cie} · ${escola.diretoria_ensino ?? ""}` : "Fora do catálogo"}</div>
                </td>
                <td>{escola.municipio ?? "-"}</td>
                <td className="num">
                  {escola.contas_ativas}
                  {escola.contas_pendentes > 0 && <span className="badge badge--atencao">{escola.contas_pendentes} pendente(s)</span>}
                </td>
                <td className="num">{escola.turmas}</td>
                <td className="num">{escola.alunos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Paginacao pagina={pagina} totalPaginas={totalPaginas} onMudar={setPagina} />
    </div>
  );
}

function AbaChamados() {
  const { mostrarToast } = useToast();
  const [chamados, setChamados] = useState<ChamadoAdmin[]>([]);
  const [status, setStatus] = useState<StatusChamado | "">("aberto");
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [respostas, setRespostas] = useState<Record<number, string>>({});
  const [salvando, setSalvando] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    const resposta = await Api.adminChamados(status || null, pagina);
    if (resposta.sucesso && resposta.dados) {
      setChamados(resposta.dados.chamados);
      setTotalPaginas(Math.max(1, resposta.dados.total_paginas));
    } else {
      mostrarToast(resposta.mensagem, true);
    }
  }, [status, pagina, mostrarToast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function atualizar(chamado: ChamadoAdmin, novo: Exclude<StatusChamado, "aberto">) {
    const texto = (respostas[chamado.id_chamado] ?? "").trim();
    if (novo === "respondido" && !texto) {
      mostrarToast("Escreva a resposta antes de responder.", true);
      return;
    }
    setSalvando(chamado.id_chamado);
    const resposta = await Api.adminResponderChamado(chamado.id_chamado, novo, texto || null);
    setSalvando(null);
    if (!resposta.sucesso) {
      mostrarToast(resposta.mensagem, true);
      return;
    }
    mostrarToast(resposta.mensagem);
    carregar();
  }

  return (
    <div className="panel">
      <div className="filter-bar" style={{ marginBottom: 18 }}>
        <div className="pill-group">
          {(["aberto", "em_andamento", "respondido", "fechado", ""] as (StatusChamado | "")[]).map((s) => (
            <button
              key={s || "todos"}
              type="button"
              className={`filter-pill${status === s ? " active" : ""}`}
              onClick={() => {
                setStatus(s);
                setPagina(1);
              }}
            >
              {s ? ROTULOS_STATUS_CHAMADO[s] : "Todos"}
            </button>
          ))}
        </div>
      </div>
      {chamados.length === 0 ? (
        <div className="empty-state">
          <Icon name="check" />
          <p>Nenhum chamado com esse filtro.</p>
        </div>
      ) : (
        <ul className="lista-chamados">
          {chamados.map((chamado) => (
            <li key={chamado.id_chamado} className="chamado-admin">
              <div className="chamado-cabecalho">
                <span className="tag">{ROTULOS_CATEGORIA_CHAMADO[chamado.categoria]}</span>
                <b>{chamado.assunto}</b>
                <span className="panel-meta">
                  {chamado.nome_coordenacao} · {chamado.nome_escola} · {formatarDataHora(chamado.criado_em)}
                </span>
                <span className="badge badge--neutral">{ROTULOS_STATUS_CHAMADO[chamado.status]}</span>
              </div>
              <p className="chamado-mensagem">{chamado.mensagem}</p>
              {chamado.resposta && (
                <p className="chamado-resposta">
                  <b>Resposta:</b> {chamado.resposta}
                </p>
              )}
              {chamado.status !== "fechado" && (
                <div className="chamado-responder">
                  <textarea
                    aria-label={`Resposta ao chamado ${chamado.assunto}`}
                    placeholder="Resposta para a coordenação (aparece em Suporte > Meus chamados)"
                    value={respostas[chamado.id_chamado] ?? ""}
                    onChange={(e) => setRespostas({ ...respostas, [chamado.id_chamado]: e.target.value })}
                  />
                  <div className="acoes-linha">
                    {chamado.status === "aberto" && (
                      <button type="button" className="btn btn-sm" onClick={() => atualizar(chamado, "em_andamento")} disabled={salvando !== null}>
                        Em andamento
                      </button>
                    )}
                    <button type="button" className="btn btn-sm" onClick={() => atualizar(chamado, "fechado")} disabled={salvando !== null}>
                      Fechar
                    </button>
                    <button type="button" className="btn btn-sm btn-primary" onClick={() => atualizar(chamado, "respondido")} disabled={salvando !== null}>
                      <Icon name="send" /> Responder
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <Paginacao pagina={pagina} totalPaginas={totalPaginas} onMudar={setPagina} />
    </div>
  );
}

function Paginacao({ pagina, totalPaginas, onMudar }: { pagina: number; totalPaginas: number; onMudar: (pagina: number) => void }) {
  if (totalPaginas <= 1) return null;
  return (
    <div className="paginacao">
      <button type="button" className="btn btn-sm" disabled={pagina <= 1} onClick={() => onMudar(pagina - 1)}>
        Anterior
      </button>
      <span className="panel-meta">
        Página {pagina} de {totalPaginas}
      </span>
      <button type="button" className="btn btn-sm" disabled={pagina >= totalPaginas} onClick={() => onMudar(pagina + 1)}>
        Próxima
      </button>
    </div>
  );
}
