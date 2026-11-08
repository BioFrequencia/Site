"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Api } from "@/lib/api";
import { Topbar } from "@/components/Topbar";
import { Esqueleto } from "@/components/Esqueleto";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { formatarDataHora, formatarTelefone } from "@/lib/format";
import { rotuloTipoAviso } from "@/lib/avisos";
import { linkWhatsapp, seloDoEnvio } from "@/lib/mensagens";
import type { Notificacao, StatusNotificacao } from "@/lib/types";

type Origem = "" | "manual" | "automatico";

/**
 * Notificações: o histórico do que saiu para os responsáveis - os avisos
 * automáticos e as mensagens da coordenação (quem enviou, quando, por qual
 * canal e a situação). Pendente: sem envio automático, a coordenação manda
 * pelo link e marca como enviada. Erro: dá para tentar de novo ou, se a
 * família foi avisada por fora, marcar como enviada.
 */
export default function NotificacoesPage() {
  const { mostrarToast } = useToast();
  const [status, setStatus] = useState<StatusNotificacao | "">("pendente");
  const [origem, setOrigem] = useState<Origem>("");
  const [pagina, setPagina] = useState(1);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupada, setOcupada] = useState<number | null>(null);

  async function carregar() {
    setCarregando(true);
    const resposta = await Api.listarNotificacoes(status || null, pagina, undefined, origem || null);
    if (resposta.sucesso && resposta.dados) {
      setNotificacoes(resposta.dados.notificacoes);
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
  }, [status, origem, pagina]);

  async function marcarEnviada(notificacao: Notificacao) {
    setOcupada(notificacao.id_notificacao);
    const resposta = await Api.marcarNotificacaoEnviada(notificacao.id_notificacao);
    setOcupada(null);
    if (!resposta.sucesso) {
      mostrarToast(resposta.mensagem, true);
      return;
    }
    mostrarToast("Notificação marcada como enviada.");
    carregar();
  }

  async function tentarDeNovo(notificacao: Notificacao) {
    setOcupada(notificacao.id_notificacao);
    const resposta = await Api.reenviarNotificacao(notificacao.id_notificacao);
    setOcupada(null);
    mostrarToast(resposta.mensagem, !resposta.sucesso || resposta.dados?.status === "erro");
    carregar();
  }

  return (
    <>
      <Topbar
        titulo="Notificações"
        subtitulo={`Avisos automáticos e mensagens da coordenação aos responsáveis · ${totalRegistros} neste filtro.`}
        acoes={
          <Link href="/notificacoes/enviar" className="btn btn-primary">
            <Icon name="send" /> Enviar mensagem
          </Link>
        }
      />
      <div className="filter-bar" style={{ marginBottom: 22 }}>
        <div className="pill-group">
          {[
            { valor: "pendente" as const, rotulo: "Pendentes" },
            { valor: "erro" as const, rotulo: "Com falha no envio" },
            { valor: "enviada" as const, rotulo: "Enviadas" },
            { valor: "" as const, rotulo: "Todas" },
          ].map((opcao) => (
            <button
              key={opcao.valor}
              type="button"
              className={`filter-pill${status === opcao.valor ? " active" : ""}`}
              onClick={() => {
                setStatus(opcao.valor);
                setPagina(1);
              }}
            >
              {opcao.rotulo}
            </button>
          ))}
        </div>
        <select
          className="filter-select"
          aria-label="Origem"
          value={origem}
          onChange={(e) => {
            setOrigem(e.target.value as Origem);
            setPagina(1);
          }}
        >
          <option value="">Automáticas e da coordenação</option>
          <option value="manual">Enviadas pela coordenação</option>
          <option value="automatico">Avisos automáticos</option>
        </select>
      </div>
      {erro && <div className="error-block">{erro}</div>}
      {carregando && <Esqueleto variante="lista" texto="Carregando notificações…" />}
      {!carregando && (
        <div className="panel">
          {notificacoes.length === 0 ? (
            <div className="empty-state">
              <Icon name="bell" />
              <p>Nenhuma notificação neste filtro.</p>
            </div>
          ) : (
            <table className="data-table tabela-cartoes">
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Responsável</th>
                  <th>Mensagem</th>
                  <th>Quem e quando</th>
                  <th>Situação</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {notificacoes.map((notificacao) => {
                  const selo = seloDoEnvio(notificacao.status_notificacao);
                  const quando = notificacao.criado_em ?? notificacao.data_envio_notificacao;
                  const linkManual =
                    notificacao.status_notificacao === "erro" && notificacao.canal === "whatsapp"
                      ? linkWhatsapp(notificacao.telefone_responsavel, notificacao.mensagem)
                      : null;
                  return (
                    <tr key={notificacao.id_notificacao}>
                      <td className="celula-titulo">
                        <Link href={`/turmas/${notificacao.id_aluno}`}>{notificacao.nome_aluno}</Link>
                      </td>
                      <td data-label="Responsável">
                        {notificacao.nome_responsavel}
                        <div className="panel-meta">
                          {formatarTelefone(notificacao.telefone_responsavel)}
                          {notificacao.email_responsavel ? ` · ${notificacao.email_responsavel}` : ""}
                        </div>
                      </td>
                      <td data-label="Mensagem" style={{ maxWidth: 320 }}>
                        <div className="panel-meta">
                          {rotuloTipoAviso(notificacao.tipo_aviso)}
                          {notificacao.canal && notificacao.canal !== "manual" && ` · ${notificacao.canal === "email" ? "e-mail" : "WhatsApp"}`}
                        </div>
                        <MensagemNotificacao mensagem={notificacao.mensagem} />
                      </td>
                      <td data-label="Quem e quando">
                        {notificacao.enviado_por ?? "Automático"}
                        <div className="panel-meta">{quando ? formatarDataHora(quando) : "-"}</div>
                      </td>
                      <td data-label="Situação">
                        <span className={selo.classe}>{selo.texto}</span>
                        {notificacao.status_notificacao === "enviada" && notificacao.data_envio_notificacao && (
                          <div className="panel-meta">{formatarDataHora(notificacao.data_envio_notificacao)}</div>
                        )}
                      </td>
                      <td className="celula-acoes">
                        {notificacao.status_notificacao === "erro" && (
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => tentarDeNovo(notificacao)}
                            disabled={ocupada === notificacao.id_notificacao}
                          >
                            {ocupada === notificacao.id_notificacao ? "…" : "Tentar de novo"}
                          </button>
                        )}
                        {linkManual && (
                          <a className="btn btn-sm" href={linkManual} target="_blank" rel="noopener noreferrer">
                            Abrir no WhatsApp
                          </a>
                        )}
                        {notificacao.status_notificacao !== "enviada" && (
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => marcarEnviada(notificacao)}
                            disabled={ocupada === notificacao.id_notificacao}
                          >
                            {ocupada === notificacao.id_notificacao ? "…" : "Marcar enviada"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
        </div>
      )}
    </>
  );
}

/**
 * Sem provedor de WhatsApp configurado, a API guarda a mensagem como um
 * link wa.me pronto (helpers/contatoResponsavel.php). Mostrar a URL crua
 * na tabela não ajudava ninguém: vira um botão que abre a conversa com o
 * texto já preenchido, e o texto aparece legível embaixo.
 */
function MensagemNotificacao({ mensagem }: { mensagem: string }) {
  if (!mensagem.startsWith("https://wa.me/")) return <>{mensagem}</>;
  let texto = "";
  try {
    texto = new URL(mensagem).searchParams.get("text") ?? "";
  } catch {
    return <>{mensagem}</>;
  }
  return (
    <>
      <a href={mensagem} target="_blank" rel="noopener noreferrer" className="btn btn-sm">
        Abrir no WhatsApp
      </a>
      {texto && <div className="panel-meta" style={{ marginTop: 6 }}>{texto}</div>}
    </>
  );
}
